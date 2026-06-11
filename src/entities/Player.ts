import Phaser from 'phaser';
import { CFG, CharacterDef } from '../config';
import type { Weapon } from '../weapons/Weapon';
import { Sfx } from '../utils/Sfx';

export interface PlayerStats {
  speed:        number;
  maxHp:        number;
  hp:           number;
  pickupRadius: number;
  damageMult:   number;
  cooldownMult: number;
  regen:        number; // HP por segundo
}

// =============================================================
//  Player — RF01 (movimento), RF09 (XP/nível), RF11 (upgrades)
//  + personagem selecionável com habilidade própria
// =============================================================
export class Player extends Phaser.Physics.Arcade.Sprite {
  stats: PlayerStats;
  charDef: CharacterDef;
  level   = 1;
  xp      = 0;
  xpToNext: number;
  weapons: Weapon[] = [];
  alive   = true;

  // Habilidade (ms restantes até poder usar de novo)
  abilityReadyIn = 0;
  abilityLevel   = 1;

  // Suprema (tecla Q) — começa descarregada
  ultReadyIn = 0;

  // Buffs temporários de itens (id → estado)
  private buffs = new Map<string, { until: number; revert: () => void }>();

  // Janela de invulnerabilidade / escudo / dash (timestamps)
  private invulnUntil = 0;
  shieldUntil  = 0;
  private dashUntil   = 0;
  private lastDir     = { x: 1, y: 0 };

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene, x: number, y: number, charId: string) {
    const def = CFG.CHARACTERS[charId] ?? CFG.CHARACTERS['KNIGHT'];
    super(scene, x, y, def.texture);
    this.charDef = def;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(10);
    this.setCollideWorldBounds(true);

    // Hitbox circular (RF16)
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(13, 1, 1);

    this.stats = {
      speed:        def.speed,
      maxHp:        def.maxHp,
      hp:           def.maxHp,
      pickupRadius: def.pickupRadius,
      damageMult:   def.damageMult,
      cooldownMult: def.cooldownMult,
      regen:        0,
    };

    this.xpToNext = CFG.XP_TABLE[0];
    this.ultReadyIn = def.ultimate.cooldownMs;

    // Input (RF01)
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  // ── Animação procedural (caminhada / respiração) ──────────
  protected preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.alive) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const moving = body.velocity.lengthSq() > 100;

    if (moving) {
      // Balanço de caminhada: leve squash vertical + inclinação
      this.scaleY   = 1 + Math.sin(time * 0.022) * 0.07;
      this.rotation = Math.sin(time * 0.014) * 0.06;
    } else {
      // Respiração em repouso
      this.scaleY   = 1 + Math.sin(time * 0.004) * 0.025;
      this.rotation = 0;
    }
  }

  // ── Movimentação bidirecional (RF01) ──────────────────────
  handleInput(): void {
    if (!this.alive) {
      this.setVelocity(0, 0);
      return;
    }

    // Durante o dash, mantém a direção com velocidade ampliada
    if (this.scene.time.now < this.dashUntil) {
      this.setVelocity(
        this.lastDir.x * this.stats.speed * 3.4,
        this.lastDir.y * this.stats.speed * 3.4,
      );
      return;
    }

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown  || this.wasd['left'].isDown)  vx -= 1;
    if (this.cursors.right.isDown || this.wasd['right'].isDown) vx += 1;
    if (this.cursors.up.isDown    || this.wasd['up'].isDown)    vy -= 1;
    if (this.cursors.down.isDown  || this.wasd['down'].isDown)  vy += 1;

    // Normalização diagonal
    if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }

    if (vx !== 0 || vy !== 0) this.lastDir = { x: vx, y: vy };

    this.setVelocity(vx * this.stats.speed, vy * this.stats.speed);

    if (vx < 0)      this.setFlipX(true);
    else if (vx > 0) this.setFlipX(false);
  }

  /** Direção do último movimento (para armas direcionais). */
  getFacing(): { x: number; y: number } {
    return { x: this.lastDir.x, y: this.lastDir.y };
  }

  // ── Habilidade do personagem ──────────────────────────────
  updateAbility(delta: number): void {
    this.abilityReadyIn = Math.max(0, this.abilityReadyIn - delta);
    this.ultReadyIn     = Math.max(0, this.ultReadyIn - delta);
    this.updateBuffs();
  }

  /** Tenta consumir a suprema. Retorna true se ela disparou. */
  tryUseUltimate(): boolean {
    if (!this.alive || this.ultReadyIn > 0) return false;
    this.ultReadyIn = this.charDef.ultimate.cooldownMs;
    return true;
  }

  /** Recarga efetiva — cai 12% por nível, até 45% da base. */
  getAbilityCooldown(): number {
    const base    = this.charDef.ability.cooldownMs;
    const reduced = base * Math.pow(0.88, this.abilityLevel - 1);
    return Math.max(base * 0.45, reduced);
  }

  upgradeAbility(): void {
    this.abilityLevel++;
  }

  /** Tenta consumir a habilidade. Retorna true se ela disparou. */
  tryUseAbility(): boolean {
    if (!this.alive || this.abilityReadyIn > 0) return false;
    this.abilityReadyIn = this.getAbilityCooldown();
    return true;
  }

  // ── Buffs temporários (itens) ─────────────────────────────
  /** Aplica um buff temporário; se já ativo, apenas estende a duração. */
  applyTimedBuff(id: string, durationMs: number, apply: () => void, revert: () => void): void {
    const now      = this.scene.time.now;
    const existing = this.buffs.get(id);

    if (existing && existing.until > now) {
      existing.until = now + durationMs;
      return;
    }

    apply();
    this.buffs.set(id, { until: now + durationMs, revert });
  }

  hasBuff(id: string): boolean {
    const buff = this.buffs.get(id);
    return !!buff && buff.until > this.scene.time.now;
  }

  private updateBuffs(): void {
    if (this.buffs.size === 0) return;
    const now = this.scene.time.now;
    this.buffs.forEach((buff, id) => {
      if (now >= buff.until) {
        buff.revert();
        this.buffs.delete(id);
      }
    });
  }

  /** Invulnerabilidade extra (escudo, dash). Não encurta janelas ativas. */
  setInvulnerable(ms: number): void {
    this.invulnUntil = Math.max(this.invulnUntil, this.scene.time.now + ms);
  }

  startDash(durationMs: number): void {
    this.dashUntil = this.scene.time.now + durationMs;
    this.setInvulnerable(durationMs + 250);
  }

  isDashing(): boolean {
    return this.scene.time.now < this.dashUntil;
  }

  // ── Dano com invulnerabilidade (RF16) ─────────────────────
  takeDamage(amount: number): void {
    const now = this.scene.time.now;
    if (!this.alive || now < this.invulnUntil) return;

    this.stats.hp   = Math.max(0, this.stats.hp - amount);
    this.invulnUntil = now + CFG.PLAYER.INVULN_MS;
    Sfx.playerHit(this.scene);

    // Flash vermelho (RF15)
    this.setTint(0xff2222);
    this.scene.time.delayedCall(CFG.PLAYER.INVULN_MS, () => {
      if (this.alive) this.clearTint();
    });

    this.scene.events.emit('playerHpChanged', this.stats.hp, this.stats.maxHp);

    if (this.stats.hp <= 0) {
      this.alive = false;
      Sfx.playerDie(this.scene);
      this.scene.events.emit('playerDied');
    }
  }

  /** Dano direto (zona / PvP) — ignora a janela de invulnerabilidade. */
  applyTrueDamage(amount: number): void {
    if (!this.alive) return;

    this.stats.hp = Math.max(0, this.stats.hp - amount);

    this.setTint(0xff2222);
    this.scene.time.delayedCall(150, () => {
      if (this.alive) this.clearTint();
    });

    this.scene.events.emit('playerHpChanged', this.stats.hp, this.stats.maxHp);

    if (this.stats.hp <= 0) {
      this.alive = false;
      Sfx.playerDie(this.scene);
      this.scene.events.emit('playerDied');
    }
  }

  heal(amount: number): void {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
    this.scene.events.emit('playerHpChanged', this.stats.hp, this.stats.maxHp);
  }

  // ── Regeneração passiva (upgrade REGEN) ───────────────────
  applyRegen(delta: number): void {
    if (this.stats.regen <= 0 || !this.alive) return;
    if (this.stats.hp >= this.stats.maxHp) return;
    this.stats.hp = Math.min(
      this.stats.maxHp,
      this.stats.hp + (this.stats.regen * delta) / 1000,
    );
    this.scene.events.emit('playerHpChanged', this.stats.hp, this.stats.maxHp);
  }

  // ── XP e progressão de nível (RF09) ───────────────────────
  gainXP(amount: number): void {
    this.xp += amount;
    while (this.xpToNext > 0 && this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.doLevelUp();
    }
    this.scene.events.emit('playerXPChanged', this.xp, this.xpToNext, this.level);
  }

  private doLevelUp(): void {
    this.level++;
    const idx     = Math.min(this.level - 2, CFG.XP_TABLE.length - 1);
    this.xpToNext = CFG.XP_TABLE[idx];
    Sfx.levelUp(this.scene);
    this.scene.events.emit('playerLevelUp', this.level);
  }

  // ── Upgrades passivos (RF11) ──────────────────────────────
  applyUpgrade(id: string): void {
    const s = this.stats;
    switch (id) {
      case 'MAX_HP':
        s.maxHp += 25;
        this.heal(s.maxHp);
        break;
      case 'SPEED':
        s.speed = Math.round(s.speed * 1.15);
        break;
      case 'DAMAGE':
        s.damageMult *= 1.20;
        break;
      case 'PICKUP_RADIUS':
        s.pickupRadius += 40;
        break;
      case 'COOLDOWN':
        s.cooldownMult *= 0.85;
        this.weapons.forEach(w => w.applySpeedMult(s.cooldownMult));
        break;
      case 'REGEN':
        s.regen += 0.8;
        break;
    }
  }

  addWeapon(weapon: Weapon): void { this.weapons.push(weapon); }

  getWeapon(type: string): Weapon | undefined {
    return this.weapons.find(w => w.type === type);
  }
}
