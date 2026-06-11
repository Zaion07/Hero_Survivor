import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Player } from '../entities/Player';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  Axe — machados arremessados em arco por cima (estilo VS Axe)
//  Evolui para Machado do Carrasco
// =============================================================
export class Axe extends Weapon {
  readonly type  = 'WEAPON_AXE';
  readonly label = '🪓 Machado';

  private count = 1;

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, 1700, 34);
  }

  override upgrade(): void {
    super.upgrade();
    if (this.level === 3) this.count++;
  }

  protected override evolve(): void {
    this.count  += 2;
    this.damage *= 1.35;
  }

  protected fire(
    _enemies:     Phaser.Physics.Arcade.Group,
    projectiles?: Phaser.Physics.Arcade.Group,
  ): void {
    if (!projectiles) return;
    Sfx.weaponFire(this.scene, this.type);

    const mult = this.player.stats.damageMult;

    for (let i = 0; i < this.count; i++) {
      const p = this.acquireProjectile(projectiles, this.player.x, this.player.y - 10, 'proj_axe');
      if (!p) break;

      p.setData('damage', this.damage * mult);
      p.setData('pierce', this.evolved ? Infinity : 2);
      p.setScale(this.evolved ? 1.7 : 1.15);
      if (this.evolved) p.setTint(0xffcccc);
      p.setAngularVelocity(560);

      const body = p.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(true);
      body.setGravityY(760);

      const vx = Phaser.Math.Between(-170, 170);
      const vy = Phaser.Math.Between(-520, -420);
      p.setVelocity(vx, vy);

      this.expireProjectile(p, 2300);
    }
  }
}
