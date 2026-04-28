import Phaser from 'phaser';
import { CFG } from '../config';
import type { Weapon } from '../weapons/Weapon';

export interface PlayerStats {
  speed:        number;
  maxHp:        number;
  hp:           number;
  pickupRadius: number;
  damageMult:   number;
  cooldownMult: number;
}

// =============================================================
//  Player — RF01 (movimento), RF09 (XP/nível), RF11 (upgrades)
// =============================================================
export class Player extends Phaser.Physics.Arcade.Sprite {
  stats: PlayerStats;
  level   = 1;
  xp      = 0;
  xpToNext: number;
  weapons: Weapon[] = [];
  alive   = true;

  private invuln = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(10);
    this.setCollideWorldBounds(true);

    // Hitbox circular (RF16)
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(13, 1, 1);

    this.stats = {
      speed:        CFG.PLAYER.SPEED,
      maxHp:        CFG.PLAYER.MAX_HP,
      hp:           CFG.PLAYER.MAX_HP,
      pickupRadius: CFG.PLAYER.PICKUP_RADIUS,
      damageMult:   CFG.PLAYER.DAMAGE_MULT,
      cooldownMult: CFG.PLAYER.COOLDOWN_MULT,
    };

    this.xpToNext = CFG.XP_TABLE[0];

    // Input (RF01)
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  // ── Movimentação bidirecional (RF01) ──────────────────────
  handleInput(): void {
    if (!this.alive) {
      this.setVelocity(0, 0);
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

    this.setVelocity(vx * this.stats.speed, vy * this.stats.speed);

    if (vx < 0)      this.setFlipX(true);
    else if (vx > 0) this.setFlipX(false);
  }

  // ── Dano com invulnerabilidade (RF16) ─────────────────────
  takeDamage(amount: number): void {
    if (!this.alive || this.invuln) return;

    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.invuln   = true;

    // Flash vermelho (RF15)
    this.setTint(0xff2222);
    this.scene.time.delayedCall(CFG.PLAYER.INVULN_MS, () => {
      if (this.alive) { this.clearTint(); this.invuln = false; }
    });

    this.scene.events.emit('playerHpChanged', this.stats.hp, this.stats.maxHp);

    if (this.stats.hp <= 0) {
      this.alive = false;
      this.scene.events.emit('playerDied');
    }
  }

  heal(amount: number): void {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
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
    }
  }

  addWeapon(weapon: Weapon): void { this.weapons.push(weapon); }

  getWeapon(type: string): Weapon | undefined {
    return this.weapons.find(w => w.type === type);
  }
}
