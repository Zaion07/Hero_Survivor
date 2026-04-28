import Phaser from 'phaser';
import type { Player } from '../entities/Player';

// =============================================================
//  Weapon — classe-base para todas as armas (RF02, RF12)
// =============================================================
export abstract class Weapon {
  abstract readonly type:  string;
  abstract readonly label: string;

  protected scene:    Phaser.Scene;
  protected player:   Player;
  protected elapsed   = 0;
  protected cooldown: number;
  protected baseCooldown: number;

  level  = 1;
  damage: number;

  constructor(
    scene:        Phaser.Scene,
    player:       Player,
    baseCooldown: number,
    damage:       number,
  ) {
    this.scene        = scene;
    this.player       = player;
    this.baseCooldown = baseCooldown;
    this.cooldown     = baseCooldown;
    this.damage       = damage;
  }

  applySpeedMult(mult: number): void {
    this.cooldown = Math.max(150, this.baseCooldown * mult);
  }

  upgrade(): void {
    this.level++;
    this.damage  *= 1.25;
    this.cooldown = Math.max(150, this.cooldown * 0.9);
  }

  update(
    delta:        number,
    enemies:      Phaser.Physics.Arcade.Group,
    projectiles?: Phaser.Physics.Arcade.Group,
  ): void {
    this.elapsed += delta;
    if (this.elapsed >= this.cooldown) {
      this.elapsed = 0;
      this.fire(enemies, projectiles);
    }
  }

  protected abstract fire(
    enemies:      Phaser.Physics.Arcade.Group,
    projectiles?: Phaser.Physics.Arcade.Group,
  ): void;
}
