import Phaser from 'phaser';
import { CFG } from '../config';
import type { Player } from '../entities/Player';

// =============================================================
//  Weapon — classe-base para todas as armas (RF02, RF12)
//  Evolui ao atingir CFG.WEAPON_EVOLVE_LEVEL (estilo VS)
// =============================================================
export abstract class Weapon {
  abstract readonly type:  string;
  abstract readonly label: string;

  protected scene:    Phaser.Scene;
  protected player:   Player;
  protected elapsed   = 0;
  protected cooldown: number;
  protected baseCooldown: number;

  level   = 1;
  evolved = false;
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

  get cooldownMs(): number {
    return this.cooldown;
  }

  upgrade(): void {
    this.level++;
    this.damage  *= 1.25;
    this.cooldown = Math.max(150, this.cooldown * 0.9);

    if (!this.evolved && this.level >= CFG.WEAPON_EVOLVE_LEVEL) {
      this.evolved = true;
      this.evolve();
      this.scene.events.emit('weaponEvolved', this.type);
    }
  }

  /** Transformação no nível de evolução — cada arma define a sua. */
  protected evolve(): void {}

  /** Nome atual (muda após evoluir). */
  get displayName(): string {
    const info = CFG.WEAPON_INFO[this.type];
    if (!info) return this.label;
    return this.evolved ? info.evolvedName : info.label;
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

  // ── Helpers de projétil (pool compartilhado) ──────────────
  /** Pega um projétil do pool e zera estado herdado de outros tipos. */
  protected acquireProjectile(
    projectiles: Phaser.Physics.Arcade.Group,
    x: number,
    y: number,
    texture: string,
  ): Phaser.Physics.Arcade.Sprite | null {
    const p = projectiles.get(x, y, texture) as Phaser.Physics.Arcade.Sprite | null;
    if (!p) return null;

    p.setTexture(texture);
    p.setActive(true).setVisible(true).setDepth(7);
    p.setAlpha(1).setScale(1).setRotation(0).clearTint();
    p.setAngularVelocity(0);
    p.setData('pierce', 0);

    // Nova "geração": invalida timers de expiração de usos anteriores
    // deste mesmo sprite (pool compartilhado) — evita que um disparo
    // antigo desative o projétil novo no meio do voo.
    p.setData('gen', ((p.getData('gen') as number) ?? 0) + 1);

    const body = p.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    body.setSize(p.width, p.height, true);
    body.setAllowGravity(false);
    body.setGravityY(0);

    return p;
  }

  /** Desativa o projétil após `ms` (vida útil). */
  protected expireProjectile(p: Phaser.Physics.Arcade.Sprite, ms: number): void {
    const gen = p.getData('gen') as number;
    this.scene.time.delayedCall(ms, () => {
      // Só expira se ainda for o mesmo disparo (não foi reciclado pelo pool)
      if (p.active && p.getData('gen') === gen) {
        p.setActive(false).setVisible(false);
        (p.body as Phaser.Physics.Arcade.Body).stop();
      }
    });
  }

  /** Inimigo mais próximo do jogador (alvo padrão). */
  protected nearestEnemy(enemies: Phaser.Physics.Arcade.Group): Phaser.Physics.Arcade.Sprite | null {
    let nearest: Phaser.Physics.Arcade.Sprite | null = null;
    let minDist = Infinity;
    enemies.getChildren().forEach(obj => {
      const e = obj as Phaser.Physics.Arcade.Sprite & { alive?: boolean };
      if (!e.active || e.alive === false) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < minDist) { minDist = d; nearest = e; }
    });
    return nearest;
  }
}
