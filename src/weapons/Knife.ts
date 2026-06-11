import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Player } from '../entities/Player';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  Knife — rajada de adagas na direção do movimento (estilo VS)
//  Evolui para Mil Facas
// =============================================================
export class Knife extends Weapon {
  readonly type  = 'WEAPON_KNIFE';
  readonly label = '🔪 Adagas';

  private count = 2;
  private speed = 720;

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, 750, 13);
  }

  override upgrade(): void {
    super.upgrade();
    if (this.level % 2 === 0) this.count++;
    this.speed += 30;
  }

  protected override evolve(): void {
    this.count   += 3;
    this.cooldown = Math.max(120, this.cooldown * 0.6);
    this.damage  *= 1.25;
  }

  protected fire(
    _enemies:     Phaser.Physics.Arcade.Group,
    projectiles?: Phaser.Physics.Arcade.Group,
  ): void {
    if (!projectiles) return;
    Sfx.weaponFire(this.scene, this.type);

    const facing = this.player.getFacing();
    const baseAngle = Math.atan2(facing.y, facing.x);
    const mult = this.player.stats.damageMult;

    for (let i = 0; i < this.count; i++) {
      const p = this.acquireProjectile(projectiles, this.player.x, this.player.y, 'proj_knife');
      if (!p) break;

      const spread = (Math.random() - 0.5) * 0.22;
      const angle  = baseAngle + spread;

      p.setData('damage', this.damage * mult);
      p.setData('pierce', this.evolved ? 2 : 0);
      p.setRotation(angle);
      if (this.evolved) p.setTint(0xccffee);

      // Pequeno escalonamento para a rajada não sair sobreposta
      const delay = i * 50;
      p.setVisible(false);
      this.scene.time.delayedCall(delay, () => {
        if (!p.active) return;
        p.setVisible(true);
        (p.body as Phaser.Physics.Arcade.Body).reset(this.player.x, this.player.y);
        p.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
      });

      this.expireProjectile(p, 800 + delay);
    }
  }
}
