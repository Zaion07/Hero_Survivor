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
  private bornAt = 0;
  private strafeSign = 1;
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
    e.strafeSign = Math.random() < 0.5 ? -1 : 1;

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

  // ── IA de perseguição (RF06) ──────────────────────────────
  chase(px: number, py: number): void {
    if (!this.alive || !this.active) return;
    
    const angle = Phaser.Math.Angle.Between(this.x, this.y, px, py);
    
    // Otimização: Cache da trigonometria para poupar processamento em hordas
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    if (this.typeDef.kind === 'normal') {
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
        if (this.alive) this.clearTint();
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
    this.scene.events.emit('enemyDied', this.x, this.y, this.typeDef.xp, this.typeName);
  }
}