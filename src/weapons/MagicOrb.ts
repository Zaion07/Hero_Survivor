import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Player } from '../entities/Player';

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

  protected fire(
    _enemies:     Phaser.Physics.Arcade.Group,
    projectiles?: Phaser.Physics.Arcade.Group,
  ): void {
    if (!projectiles) return;

    const { player, numShots, projectileSpeed, projectileLife, damage } = this;
    const mult      = player.stats.damageMult;
    const angleStep = (Math.PI * 2) / numShots;

    for (let i = 0; i < numShots; i++) {
      const p = projectiles.get(player.x, player.y, 'proj_orb') as Phaser.Physics.Arcade.Sprite | null;
      if (!p) break;

      p.setActive(true).setVisible(true).setDepth(7);
      p.setData('damage', damage * mult);
      p.setData('type', 'orb');

      const angle = angleStep * i;
      (p.body as Phaser.Physics.Arcade.Body).reset(player.x, player.y);
      p.setVelocity(
        Math.cos(angle) * projectileSpeed,
        Math.sin(angle) * projectileSpeed,
      );

      this.scene.time.delayedCall(projectileLife, () => {
        if (p.active) {
          p.setActive(false).setVisible(false);
          (p.body as Phaser.Physics.Arcade.Body).stop();
        }
      });
    }
  }
}
