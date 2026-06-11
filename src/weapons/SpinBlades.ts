import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

// =============================================================
//  SpinBlades — espadas orbitando o jogador (estilo King Bible)
//  Evolui para Tempestade de Lâminas
// =============================================================
export class SpinBlades extends Weapon {
  readonly type  = 'WEAPON_SPIN';
  readonly label = '🌀 Lâminas Giratórias';

  private blades: Phaser.GameObjects.Image[] = [];
  private bladeCount = 2;
  private radius     = 72;
  private rotSpeed   = 0.0028;  // rad por ms
  private angle      = 0;
  private lastHit    = new Map<Enemy, number>();

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, 999999, 16); // sem ciclo de disparo — dano por contato
    this.rebuildBlades();
  }

  override upgrade(): void {
    this.level++;
    this.damage *= 1.2;
    if (this.level % 2 === 0) this.bladeCount++;
    this.radius += 6;

    if (!this.evolved && this.level >= 5) {
      this.evolved = true;
      this.evolve();
      this.scene.events.emit('weaponEvolved', this.type);
    }

    this.rebuildBlades();
  }

  protected override evolve(): void {
    this.bladeCount += 2;
    this.radius     += 26;
    this.rotSpeed   *= 1.5;
    this.damage     *= 1.3;
  }

  private rebuildBlades(): void {
    this.blades.forEach(b => b.destroy());
    this.blades = [];
    for (let i = 0; i < this.bladeCount; i++) {
      const blade = this.scene.add.image(this.player.x, this.player.y, 'proj_sword')
        .setDepth(9)
        .setScale(this.evolved ? 1.35 : 1.05);
      if (this.evolved) blade.setTint(0x88e5ff);
      this.blades.push(blade);
    }
  }

  // Atualização contínua: órbita + dano de contato
  override update(delta: number, enemies: Phaser.Physics.Arcade.Group): void {
    this.angle += this.rotSpeed * delta;
    const now = this.scene.time.now;
    const mult = this.player.stats.damageMult;
    const hitRange = this.evolved ? 26 : 20;

    this.blades.forEach((blade, i) => {
      const a  = this.angle + (Math.PI * 2 * i) / this.blades.length;
      const bx = this.player.x + Math.cos(a) * this.radius;
      const by = this.player.y + Math.sin(a) * this.radius;
      blade.setPosition(bx, by);
      blade.setRotation(a + Math.PI / 2);

      enemies.getChildren().forEach(obj => {
        const e = obj as Enemy;
        if (!e.alive || !e.active) return;
        const last = this.lastHit.get(e) ?? -Infinity;
        if (now - last < 380) return;
        const dist = Phaser.Math.Distance.Between(bx, by, e.x, e.y);
        if (dist <= hitRange + e.typeDef.r) {
          this.lastHit.set(e, now);
          e.takeDamage(this.damage, mult);
        }
      });
    });
  }

  protected fire(): void { /* dano por contato — sem disparo */ }
}
