import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Player } from '../entities/Player';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  Boomerang — lâmina de vento que vai e volta perfurando tudo
//  Evolui para Ciclone (lâminas duplas)
// =============================================================
export class Boomerang extends Weapon {
  readonly type  = 'WEAPON_BOOMERANG';
  readonly label = '🪃 Bumerangue';

  private speed = 430;

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, 2100, 28);
  }

  protected override evolve(): void {
    this.damage *= 1.35;
    this.speed  += 80;
  }

  protected fire(
    enemies:      Phaser.Physics.Arcade.Group,
    projectiles?: Phaser.Physics.Arcade.Group,
  ): void {
    if (!projectiles) return;

    const target = this.nearestEnemy(enemies);
    const facing = this.player.getFacing();
    const baseAngle = target
      ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y)
      : Math.atan2(facing.y, facing.x);

    Sfx.weaponFire(this.scene, this.type);

    const throws = this.evolved ? 2 : 1;
    for (let i = 0; i < throws; i++) {
      const angle = baseAngle + i * Math.PI; // evoluído: um para cada lado
      this.throwBlade(projectiles, angle);
    }
  }

  private throwBlade(projectiles: Phaser.Physics.Arcade.Group, angle: number): void {
    const p = this.acquireProjectile(projectiles, this.player.x, this.player.y, 'proj_boomerang');
    if (!p) return;

    const mult = this.player.stats.damageMult;

    p.setData('damage', this.damage * mult);
    p.setData('pierce', Infinity);
    p.setScale(this.evolved ? 1.5 : 1.1);
    p.setAngularVelocity(640);

    p.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);

    // Retorno: inverte o voo na metade do percurso
    this.scene.time.delayedCall(680, () => {
      if (!p.active) return;
      const back = Phaser.Math.Angle.Between(p.x, p.y, this.player.x, this.player.y);
      p.setVelocity(Math.cos(back) * this.speed * 1.15, Math.sin(back) * this.speed * 1.15);
    });

    this.expireProjectile(p, 1450);
  }
}
