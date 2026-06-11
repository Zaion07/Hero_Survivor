import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Player } from '../entities/Player';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  MagicOrb — projéteis em leque ao redor do jogador (RF02, RF12)
// =============================================================
export class MagicOrb extends Weapon {
  readonly type  = 'WEAPON_ORB';
  readonly label = '🔮 Orbe Mágico';

  private projectileSpeed = 380;
  private projectileLife  = 1200;
  private numShots        = 4;

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, 1400, 14);
  }

  override upgrade(): void {
    super.upgrade();
    this.numShots = Math.min(8, this.numShots + 1);
  }

  protected override evolve(): void {
    this.numShots = Math.min(10, this.numShots + 2);
    this.projectileSpeed += 90;
    this.projectileLife  += 250;
    this.damage *= 1.3;
  }

  protected fire(
    _enemies:     Phaser.Physics.Arcade.Group,
    projectiles?: Phaser.Physics.Arcade.Group,
  ): void {
    if (!projectiles) return;
    Sfx.weaponFire(this.scene, this.type);

    const { player, numShots, projectileSpeed, projectileLife, damage } = this;
    const mult      = player.stats.damageMult;
    const angleStep = (Math.PI * 2) / numShots;

    for (let i = 0; i < numShots; i++) {
      const p = this.acquireProjectile(projectiles, player.x, player.y, 'proj_orb');
      if (!p) break;

      p.setData('damage', damage * mult);
      p.setData('pierce', this.evolved ? 1 : 0);
      if (this.evolved) p.setScale(1.5).setTint(0xff99ff);

      const angle = angleStep * i;
      p.setVelocity(
        Math.cos(angle) * projectileSpeed,
        Math.sin(angle) * projectileSpeed,
      );

      this.expireProjectile(p, projectileLife);
    }
  }
}
