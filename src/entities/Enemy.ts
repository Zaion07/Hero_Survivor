import Phaser from 'phaser';
import { CFG, EnemyTypeDef } from '../config';
import { floatingText } from '../utils/floatingText';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  Enemy — RF06 (IA de rastreamento), RF07 (hierarquia),
//           RF16 (hitbox/dano), RF15 (feedback visual)
// =============================================================
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  typeDef!:  EnemyTypeDef;
  typeName!: string;
  hp!:       number;
  maxHp!:    number;
  alive      = true;
  stunnedUntil = 0;
  isElite    = false;
  xpValue    = 0;
  baseScale  = 1;
  nextSlamAt = 0;       // ataque telegrafado (subboss/boss)
  nextShotAt = 0;       // disparo à distância (SHOOTER)
  casting    = false;   // executando ataque telegrafado
  private bornAt = 0;
  private strafeSign = 1;
  private animPhase  = 0;
  private hitBlinkTween?: Phaser.Tweens.Tween;

  // ── Factory: pega do pool e configura (RF05) ───────────────
  static spawn(
    scene:    Phaser.Scene,
    group:    Phaser.Physics.Arcade.Group,
    typeName: string,
    x: number,
    y: number,
  ): Enemy | null {
    const def = CFG.ENEMY_TYPES[typeName];
    if (!def) {
      console.error(`[Enemy.ts] Tipo de inimigo não encontrado no CFG: ${typeName}`);
      return null;
    }

    // 1. Tenta pegar o primeiro inimigo inativo (morto) INDEPENDENTE da textura dele
    let e = group.getFirstDead(false) as Enemy | null;

    // 2. Se não achou nenhum inativo, e o grupo ainda permite crescer, cria um novo
    if (!e && (!group.maxSize || group.getLength() < group.maxSize)) {
      e = group.create(x, y) as Enemy;
    }

    // 3. Se ainda assim for null, significa que o grupo atingiu o limite máximo de entidades
    if (!e) return null;

    // 4. FORÇA a troca da textura e atualiza as dimensões (CRUCIAL para Bosses nascerem no lugar de minions)
    e.setTexture(`enemy_${typeName}`);
    e.updateDisplayOrigin();

    // 5. Configura os status base
    e.typeDef  = def;
    e.typeName = typeName;
    e.hp       = def.hp;
    e.maxHp    = def.hp;
    e.alive    = true;
    e.bornAt   = scene.time.now;
    e.stunnedUntil = 0;
    e.isElite    = false;
    e.xpValue    = def.xp;
    e.baseScale  = 1;
    e.casting    = false;
    e.nextSlamAt = scene.time.now + 3500 + Math.random() * 2000;
    e.nextShotAt = scene.time.now + 1200 + Math.random() * 1200;
    e.strafeSign = Math.random() < 0.5 ? -1 : 1;
    e.animPhase  = Math.random() * Math.PI * 2;
    e.setScale(1).setRotation(0);

    // 6. Reseta efeitos visuais de vidas passadas
    e.hitBlinkTween?.stop();
    e.hitBlinkTween = undefined;
    e.setActive(true).setVisible(true).setDepth(5).setAlpha(1).clearTint();

    // 7. Configura a colisão com base nas dimensões da nova textura
    const body   = e.body as Phaser.Physics.Arcade.Body;
    const offset = def.r;
    body.setCircle(offset, e.width / 2 - offset, e.height / 2 - offset);
    body.reset(x, y);

    return e;
  }

  // ── Variante elite: dourada, mais forte, dropa item ───────
  makeElite(): void {
    this.isElite   = true;
    this.hp        = Math.round(this.hp * CFG.ELITE.HP_MULT);
    this.maxHp     = this.hp;
    this.xpValue   = Math.round(this.typeDef.xp * CFG.ELITE.XP_MULT);
    this.baseScale = CFG.ELITE.SCALE;
    this.setScale(this.baseScale);
    this.setTint(CFG.ELITE.TINT);
  }

  /** Dano de contato (elites batem mais forte). */
  get contactDamage(): number {
    return this.isElite
      ? Math.round(this.typeDef.dmg * CFG.ELITE.DMG_MULT)
      : this.typeDef.dmg;
  }

  // ── IA de perseguição (RF06) ──────────────────────────────
  chase(px: number, py: number, pvx = 0, pvy = 0): void {
    if (!this.alive || !this.active) return;

    this.animate();

    // Atordoado (knockback de habilidades) — mantém a velocidade imposta
    if (this.scene.time.now < this.stunnedUntil) return;

    const angle = Phaser.Math.Angle.Between(this.x, this.y, px, py);

    // Otimização: Cache da trigonometria para poupar processamento em hordas
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    if (this.typeDef.kind === 'normal') {
      // Olho Maldito: mantém distância para atirar
      if (this.typeName === 'SHOOTER') {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);
        if (dist < 230) {
          this.setVelocity(-cosA * this.typeDef.speed, -sinA * this.typeDef.speed);
        } else if (dist > 400) {
          this.setVelocity(cosA * this.typeDef.speed, sinA * this.typeDef.speed);
        } else {
          // Orbita lateralmente
          this.setVelocity(
            -sinA * this.typeDef.speed * 0.8 * this.strafeSign,
            cosA * this.typeDef.speed * 0.8 * this.strafeSign,
          );
        }
        return;
      }

      // Sombra Caçadora: intercepta o caminho do jogador para encurralar
      if (this.typeName === 'FLANKER') {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);
        if (dist > 190) {
          const ix = px + pvx * 0.75;
          const iy = py + pvy * 0.75;
          const ia = Phaser.Math.Angle.Between(this.x, this.y, ix, iy);
          this.setVelocity(
            Math.cos(ia) * this.typeDef.speed,
            Math.sin(ia) * this.typeDef.speed,
          );
        } else {
          // Bote final, mais rápido
          this.setVelocity(cosA * this.typeDef.speed * 1.45, sinA * this.typeDef.speed * 1.45);
        }
        return;
      }

      this.setVelocity(
        cosA * this.typeDef.speed,
        sinA * this.typeDef.speed,
      );
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);
    const aliveFor = (this.scene.time.now - this.bornAt) / 1000;
    const hpRatio = Math.max(0.18, this.hp / this.maxHp);
    const isBoss = this.typeDef.kind === 'boss';

    const phase = aliveFor * (isBoss ? 1.95 : 1.55);
    const strafe = Math.sin(phase) * (isBoss ? 0.42 : 0.28) * this.strafeSign;
    const dashWindow = Math.sin(aliveFor * (isBoss ? 1.08 : 1.24)) > (isBoss ? 0.74 : 0.84);
    const rageBoost = 1 + (1 - hpRatio) * (isBoss ? 0.34 : 0.22);
    const dashBoost = dashWindow ? (isBoss ? 1.72 : 1.46) : 1;

    let forward = this.typeDef.speed * rageBoost * dashBoost;
    if (dist < (isBoss ? 155 : 120) && !dashWindow) forward *= 0.82;

    const vx = cosA * forward - sinA * (forward * strafe);
    const vy = sinA * forward + cosA * (forward * strafe);
    this.setVelocity(vx, vy);
  }

  // ── Animação procedural por tipo de inimigo ────────────────
  private animate(): void {
    const t = this.scene.time.now;
    const p = this.animPhase;
    const b = this.baseScale;

    switch (this.typeName) {
      case 'COMMON': {
        // Morcego: bater de asas (abre/fecha horizontal)
        const flap = Math.abs(Math.sin(t * 0.018 + p));
        this.scaleX = b * (1 + flap * 0.22);
        this.scaleY = b * (1 - flap * 0.12);
        break;
      }
      case 'FAST': {
        // Espírito: flutuação ondulante
        this.scaleY   = b * (1 + Math.sin(t * 0.012 + p) * 0.14);
        this.rotation = Math.sin(t * 0.008 + p) * 0.14;
        break;
      }
      case 'SHOOTER': {
        // Olho: pulsação nervosa
        const pulse = Math.sin(t * 0.01 + p);
        this.setScale(b * (1 + pulse * 0.08));
        break;
      }
      case 'FLANKER': {
        // Sombra: tremulação espectral
        this.scaleX   = b * (1 + Math.sin(t * 0.016 + p) * 0.08);
        this.rotation = Math.sin(t * 0.011 + p) * 0.1;
        break;
      }
      case 'TANK':
      case 'BRUTE': {
        // Pisada pesada: balanço lento lado a lado
        this.rotation = Math.sin(t * 0.007 + p) * 0.05;
        this.scaleY   = b * (1 + Math.sin(t * 0.014 + p) * 0.03);
        break;
      }
      default: {
        // Subchefes e chefes: respiração ameaçadora
        const breathe = Math.sin(t * 0.004 + p);
        this.setScale(b * (1 + breathe * 0.04));
        this.rotation = Math.sin(t * 0.0025 + p) * 0.03;
        break;
      }
    }
  }

  /** Restaura a cor padrão (elites mantêm o dourado). */
  restoreTint(): void {
    if (this.isElite) this.setTint(CFG.ELITE.TINT);
    else this.clearTint();
  }

  // ── Recebe dano (RF16, RF15) ───────────────────────────────
  takeDamage(amount: number, damageMult = 1): boolean {
    if (!this.alive || !this.active) return false;

    const dmg = Math.ceil(amount * damageMult);
    this.hp  -= dmg;
    Sfx.enemyHit(this.scene);

    // Piscar rápido ao receber hit (RF15)
    this.hitBlinkTween?.stop();
    this.setAlpha(1).setTint(0xffffff);
    this.hitBlinkTween = this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 40,
      repeat: 2,
      yoyo: true,
      onComplete: () => {
        this.setAlpha(1);
        if (this.alive && !this.casting) this.restoreTint();
      },
    });

    // Número flutuante de dano (RF15)
    floatingText(this.scene, this.x, this.y - this.displayHeight / 2, `-${dmg}`);

    if (this.hp <= 0) { this.die(); return true; }
    return false;
  }

  private die(): void {
    this.alive = false;
    this.hitBlinkTween?.stop();
    this.hitBlinkTween = undefined;
    Sfx.enemyDie(this.scene);
    this.setVelocity(0, 0).setActive(false).setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).stop();
    this.scene.events.emit('enemyDied', this.x, this.y, this.xpValue, this.typeName, this.isElite);
  }
}