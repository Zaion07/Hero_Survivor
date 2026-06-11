import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  Lightning — raios caem sobre inimigos aleatórios
//  (estilo VS Lightning Ring) — evolui para Ira da Tempestade
// =============================================================
export class Lightning extends Weapon {
  readonly type  = 'WEAPON_LIGHTNING';
  readonly label = '⚡ Relâmpago Arcano';

  private strikes = 1;
  private range   = 480;

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player, 1700, 42);
  }

  override upgrade(): void {
    super.upgrade();
    if (this.level % 2 === 0) this.strikes++;
    this.range += 25;
  }

  protected override evolve(): void {
    this.strikes += 2;
    this.damage  *= 1.4;
  }

  protected fire(enemies: Phaser.Physics.Arcade.Group): void {
    const candidates: Enemy[] = [];
    enemies.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (!e.alive || !e.active) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (dist <= this.range) candidates.push(e);
    });

    if (candidates.length === 0) return;
    Sfx.weaponFire(this.scene, this.type);

    const mult = this.player.stats.damageMult;
    Phaser.Utils.Array.Shuffle(candidates);

    candidates.slice(0, this.strikes).forEach((e, i) => {
      this.scene.time.delayedCall(i * 90, () => {
        if (!e.active) return;
        this.strikeBolt(e.x, e.y);
        if (e.alive) e.takeDamage(this.damage, mult);
      });
    });
  }

  // Desenha o raio em zigue-zague descendo do céu
  private strikeBolt(x: number, y: number): void {
    const g = this.scene.add.graphics().setDepth(16);
    const color = this.evolved ? 0x99eeff : 0xffee66;

    const segments = 6;
    const startY = y - 300;

    // Traçado principal + brilho
    [{ w: 5, a: 0.35 }, { w: 2.5, a: 1 }].forEach(({ w, a }) => {
      g.lineStyle(w, color, a);
      g.beginPath();
      g.moveTo(x + Phaser.Math.Between(-30, 30), startY);
      for (let s = 1; s <= segments; s++) {
        const sy = startY + ((y - startY) * s) / segments;
        const sx = s === segments ? x : x + Phaser.Math.Between(-26, 26);
        g.lineTo(sx, sy);
      }
      g.strokePath();
    });

    // Clarão no impacto
    const flash = this.scene.add.circle(x, y, this.evolved ? 34 : 24, color, 0.45).setDepth(15);

    this.scene.tweens.add({
      targets: [g, flash],
      alpha: 0,
      duration: 240,
      ease: 'Cubic.Out',
      onComplete: () => { g.destroy(); flash.destroy(); },
    });
  }
}
