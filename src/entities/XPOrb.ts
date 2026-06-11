import Phaser from 'phaser';

// =============================================================
//  XPOrb — RF03 (magnetismo de coleta), RF09 (XP)
// =============================================================
export class XPOrb extends Phaser.Physics.Arcade.Sprite {
  value      = 0;
  private attracting = false;

  static spawn(
    scene:  Phaser.Scene,
    group:  Phaser.Physics.Arcade.Group,
    x:      number,
    y:      number,
    value:  number,
  ): XPOrb | null {
    const orb = group.get(x, y, 'xp_orb') as XPOrb | null;
    if (!orb) return null;

    orb.value      = value;
    orb.attracting = false;
    orb.setActive(true).setVisible(true).setDepth(3);
    (orb.body as Phaser.Physics.Arcade.Body).reset(x, y);
    return orb;
  }

  /** Ímã Arcano — passa a perseguir o jogador de qualquer distância */
  forceAttract(): void {
    if (this.active) this.attracting = true;
  }

  // ── Magnetismo a cada frame (RF03) ────────────────────────
  magnetUpdate(px: number, py: number, pickupRadius: number): void {
    if (!this.active) return;

    // Cintilação — balanço suave do cristal
    this.rotation = Math.sin(this.scene.time.now * 0.005 + this.x * 0.1) * 0.35;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);

    if (dist < pickupRadius * 2) this.attracting = true;

    if (this.attracting) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, px, py);
      const speed = Phaser.Math.Clamp(300 + (pickupRadius * 2 - dist) * 4, 200, 600);
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }
}
