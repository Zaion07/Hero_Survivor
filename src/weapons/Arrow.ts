import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Player } from '../entities/Player';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  Arrow — flecha no inimigo mais próximo (arma da Caçadora)
//  Ganha perfuração, alcance e flechas extras por nível
//  Evolui para Flecha Fantasma: atravessa tudo
// =============================================================
export class Arrow extends Weapon {
  readonly type  = 'WEAPON_ARROW';
  readonly label = '🏹 Flecha';

  private projectileSpeed = 560;
  private projectileLife  = 1400;
  private pierce          = 0;
  private arrows          = 1;

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, 1400, 28);
  }

  override upgrade(): void {
    super.upgrade();
    // Progressão da Caçadora: velocidade, alcance, perfuração, flechas extras
    this.projectileSpeed += 60;
    this.projectileLife  += 140;
    if (this.level === 3) this.pierce = 1;
    if (this.level === 4) this.arrows = 2;
  }

  protected override evolve(): void {
    this.pierce  = Infinity;
    this.arrows += 1;
    this.damage *= 1.3;
    this.projectileSpeed += 120;
  }

  protected fire(
    enemies:      Phaser.Physics.Arcade.Group,
    projectiles?: Phaser.Physics.Arcade.Group,
  ): void {
    if (!projectiles) return;

    const nearest = this.nearestEnemy(enemies);
    if (!nearest) return;

    Sfx.weaponFire(this.scene, this.type);

    const mult = this.player.stats.damageMult;
    const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, nearest.x, nearest.y);

    for (let i = 0; i < this.arrows; i++) {
      const p = this.acquireProjectile(projectiles, this.player.x, this.player.y, 'proj_arrow');
      if (!p) break;

      // Leque sutil quando há múltiplas flechas
      const offset = this.arrows > 1 ? (i - (this.arrows - 1) / 2) * 0.14 : 0;
      const angle  = baseAngle + offset;

      p.setData('damage', this.damage * mult);
      p.setData('pierce', this.pierce);
      p.setRotation(angle);

      if (this.evolved) {
        p.setTint(0x88ffee).setAlpha(0.85);
      }

      p.setVelocity(
        Math.cos(angle) * this.projectileSpeed,
        Math.sin(angle) * this.projectileSpeed,
      );

      this.expireProjectile(p, this.projectileLife);
    }
  }
}
