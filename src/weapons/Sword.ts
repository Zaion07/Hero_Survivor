import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  Sword — golpe em arco na direção do olhar (arma do Cavaleiro)
//  Evolui para Excalibur: golpeia dos dois lados
// =============================================================
export class Sword extends Weapon {
  readonly type  = 'WEAPON_SWORD';
  readonly label = '🗡️ Espada';

  private range = 95;

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, 950, 26);
  }

  override upgrade(): void {
    super.upgrade();
    this.range += 9;
  }

  protected override evolve(): void {
    this.range  += 35;
    this.damage *= 1.4;
  }

  protected fire(enemies: Phaser.Physics.Arcade.Group): void {
    Sfx.weaponFire(this.scene, this.type);

    const facingLeft = this.player.flipX;
    this.slash(enemies, facingLeft ? -1 : 1);
    if (this.evolved) {
      this.scene.time.delayedCall(110, () => this.slash(enemies, facingLeft ? 1 : -1));
    }
  }

  /** Corta um semicírculo no sentido `dir` (1 = direita, -1 = esquerda). */
  private slash(enemies: Phaser.Physics.Arcade.Group, dir: number): void {
    const { player, range, damage } = this;
    const mult = player.stats.damageMult;

    // Visual: crescente que varre e desvanece
    const arc = this.scene.add.image(player.x + dir * range * 0.45, player.y, 'slash_arc')
      .setDepth(9)
      .setTint(this.evolved ? 0xffd700 : 0xeeeeff)
      .setAlpha(0.85)
      .setScale(range / 42)
      .setFlipX(dir < 0)
      .setRotation(dir * -0.5);

    this.scene.tweens.add({
      targets: arc,
      rotation: dir * 0.5,
      alpha: 0,
      duration: 200,
      ease: 'Cubic.Out',
      onComplete: () => arc.destroy(),
    });

    // Dano: inimigos no alcance e do lado do golpe
    enemies.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (!e.alive || !e.active) return;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      if (dx * dir < -e.typeDef.r) return; // atrás do golpe
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= range + e.typeDef.r) {
        e.takeDamage(damage, mult);
      }
    });
  }
}
