import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  Aura — dano de área contínuo ao redor do jogador (RF02, RF12)
// =============================================================
export class Aura extends Weapon {
  readonly type  = 'WEAPON_AURA';
  readonly label = '🌀 Aura Mágica';

  private gfx:    Phaser.GameObjects.Graphics;
  private radius: number;
  private firing  = false;

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, 1000, 18);
    this.radius = 75;
    this.gfx    = scene.add.graphics().setDepth(8);
  }

  override upgrade(): void {
    super.upgrade();
    this.radius += 12;
  }

  // Chamado a cada frame pelo GameScene para desenhar o anel
  drawRing(): void {
    const { player, radius, firing } = this;
    this.gfx.clear();
    if (firing) {
      this.gfx.lineStyle(3, 0x3498db, 1.0);
      this.gfx.fillStyle(0x3498db, 0.08);
      this.gfx.fillCircle(player.x, player.y, radius);
    } else {
      this.gfx.lineStyle(1.5, 0x3498db, 0.3);
    }
    this.gfx.strokeCircle(player.x, player.y, radius);
  }

  protected fire(enemies: Phaser.Physics.Arcade.Group): void {
    const { player, radius, damage } = this;
    const mult = player.stats.damageMult;
    Sfx.weaponFire(this.scene, this.type);

    this.firing = true;
    this.scene.time.delayedCall(200, () => { this.firing = false; });

    enemies.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (!e.alive || !e.active) return;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
      if (dist <= radius + e.typeDef.r) {
        e.takeDamage(damage, mult);
      }
    });
  }
}
