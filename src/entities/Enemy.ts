import Phaser from 'phaser';
import { CFG, EnemyTypeDef } from '../config';
import { floatingText } from '../utils/floatingText';

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

  // ── Factory: pega do pool e configura (RF05) ───────────────
  static spawn(
    scene:    Phaser.Scene,
    group:    Phaser.Physics.Arcade.Group,
    typeName: string,
    x: number,
    y: number,
  ): Enemy | null {
    const e = group.get(x, y, `enemy_${typeName}`) as Enemy | null;
    if (!e) return null;

    const def = CFG.ENEMY_TYPES[typeName];
    e.typeDef  = def;
    e.typeName = typeName;
    e.hp       = def.hp;
    e.maxHp    = def.hp;
    e.alive    = true;

    e.setActive(true).setVisible(true).setDepth(5).clearTint();

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
    this.setVelocity(
      Math.cos(angle) * this.typeDef.speed,
      Math.sin(angle) * this.typeDef.speed,
    );
  }

  // ── Recebe dano (RF16, RF15) ───────────────────────────────
  takeDamage(amount: number, damageMult = 1): boolean {
    if (!this.alive || !this.active) return false;

    const dmg = Math.ceil(amount * damageMult);
    this.hp  -= dmg;

    // Flash branco (RF15)
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => { if (this.alive) this.clearTint(); });

    // Número flutuante de dano (RF15)
    floatingText(this.scene, this.x, this.y - this.displayHeight / 2, `-${dmg}`);

    if (this.hp <= 0) { this.die(); return true; }
    return false;
  }

  private die(): void {
    this.alive = false;
    this.setVelocity(0, 0).setActive(false).setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).stop();
    this.scene.events.emit('enemyDied', this.x, this.y, this.typeDef.xp, this.typeName);
  }
}
