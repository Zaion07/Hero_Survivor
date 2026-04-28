import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

// =============================================================
//  Arrow — flecha no inimigo mais próximo (RF02, RF12)
// =============================================================
export class Arrow extends Weapon {
  readonly type  = 'WEAPON_ARROW';
  readonly label = '🏹 Flechas';

  private projectileSpeed = 550;
  private projectileLife  = 1500;
  private piercing        = false;

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, 1600, 28);
  }

  override upgrade(): void {
    super.upgrade();
    if (this.level >= 4) this.piercing = true;
  }

  protected fire(
    enemies:      Phaser.Physics.Arcade.Group,
    projectiles?: Phaser.Physics.Arcade.Group,
  ): void {
    if (!projectiles) return;

    const nearest = this.getNearestEnemy(enemies);
    if (!nearest) return;

    const { player, projectileSpeed, projectileLife, damage, piercing } = this;
    const mult  = player.stats.damageMult;
    const angle = Phaser.Math.Angle.Between(player.x, player.y, nearest.x, nearest.y);

    const p = projectiles.get(player.x, player.y, 'proj_arrow') as Phaser.Physics.Arcade.Sprite | null;
    if (!p) return;

    p.setActive(true).setVisible(true).setDepth(7);
    p.setData('damage',   damage * mult);
    p.setData('type',     'arrow');
    p.setData('piercing', piercing);
    p.setRotation(angle);

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

  private getNearestEnemy(enemies: Phaser.Physics.Arcade.Group): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;
    enemies.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (!e.alive || !e.active) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < minDist) { minDist = d; nearest = e; }
    });
    return nearest;
  }
}
