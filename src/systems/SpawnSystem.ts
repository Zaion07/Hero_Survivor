import Phaser from 'phaser';
import { CFG, WaveDef } from '../config';
import { Enemy } from '../entities/Enemy';
import { CollectionTracker } from '../utils/CollectionTracker';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  SpawnSystem — RF05 (geração fora do viewport)
//               RF07 (hierarquia de inimigos)
//               RF08 (ondas de dificuldade crescente)
// =============================================================
export class SpawnSystem {
  private scene:      Phaser.Scene;
  private group:      Phaser.Physics.Arcade.Group;
  private camera:     Phaser.Cameras.Scene2D.Camera;

  private elapsed    = 0;
  private spawnTimer = 0;
  private waveIndex  = 0;
  private currentWave!: WaveDef;

  private spawnedSpecial: Set<string> = new Set();

  constructor(
    scene:  Phaser.Scene,
    group:  Phaser.Physics.Arcade.Group,
    camera: Phaser.Cameras.Scene2D.Camera,
  ) {
    this.scene       = scene;
    this.group       = group;
    this.camera      = camera;
    this.currentWave = CFG.WAVES[0];
  }

  update(delta: number): void {
    this.elapsed += delta / 1000;

    this.advanceWave();

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.currentWave.interval;
      this.spawnRegular();
    }

    this.checkSpecialSpawns();
  }

  private advanceWave(): void {
    for (let i = CFG.WAVES.length - 1; i >= 0; i--) {
      if (this.elapsed >= CFG.WAVES[i].time) {
        if (this.waveIndex !== i) {
          this.waveIndex   = i;
          this.currentWave = CFG.WAVES[i];
          this.spawnTimer  = 0;
        }
        break;
      }
    }
  }

  private spawnRegular(): void {
    const type      = this.weightedRandom(this.currentWave.pool);
    const { x, y } = this.randomOutsideViewport();
    CollectionTracker.addMonster(type);
    Enemy.spawn(this.scene, this.group, type, x, y);
  }

  private checkSpecialSpawns(): void {
    CFG.WAVES.forEach((wave, idx) => {
      if (this.elapsed < wave.time) return;

      wave.minibosses?.forEach(type => this.spawnSpecial(type, idx));
      wave.bosses?.forEach(type => this.spawnSpecial(type, idx));
    });
  }

  private spawnSpecial(type: string, waveIndex: number): void {
    const spawnId = `${waveIndex}:${type}`;
    if (this.spawnedSpecial.has(spawnId)) return;

    const def = CFG.ENEMY_TYPES[type];
    if (!def) return;

    this.spawnedSpecial.add(spawnId);
    const { x, y } = this.randomOutsideViewport();
    CollectionTracker.addMonster(type);
    Enemy.spawn(this.scene, this.group, type, x, y);
    if (def.kind === 'subboss' || def.kind === 'boss') {
      Sfx.specialSpawn(this.scene, def.kind);
    }

    const title = def.kind === 'boss' ? 'CHEFÃO' : 'SUBCHEFE';
    const icon  = def.kind === 'boss' ? '💀' : '⚠️';
    this.scene.events.emit('waveMessage', `${icon} ${title}: ${def.name}`);
  }

  // ── Posição aleatória FORA do campo de visão (RF05) ────────
  private randomOutsideViewport(): { x: number; y: number } {
    const cam    = this.camera;
    const margin = CFG.SPAWN_MARGIN;
    const world  = CFG.WORLD;

    const side = Phaser.Math.Between(0, 3);
    let x: number, y: number;

    switch (side) {
      case 0:
        x = Phaser.Math.Between(cam.scrollX - margin, cam.scrollX + cam.width  + margin);
        y = cam.scrollY - margin;
        break;
      case 1:
        x = Phaser.Math.Between(cam.scrollX - margin, cam.scrollX + cam.width  + margin);
        y = cam.scrollY + cam.height + margin;
        break;
      case 2:
        x = cam.scrollX - margin;
        y = Phaser.Math.Between(cam.scrollY - margin, cam.scrollY + cam.height + margin);
        break;
      default:
        x = cam.scrollX + cam.width + margin;
        y = Phaser.Math.Between(cam.scrollY - margin, cam.scrollY + cam.height + margin);
        break;
    }

    x = Phaser.Math.Clamp(x, 50, world - 50);
    y = Phaser.Math.Clamp(y, 50, world - 50);
    return { x, y };
  }

  private weightedRandom(pool: string[]): string {
    const total = pool.reduce((s, t) => s + CFG.ENEMY_TYPES[t].w, 0);
    if (total <= 0) return pool[pool.length - 1];
    let roll    = Math.random() * total;
    for (const type of pool) {
      roll -= CFG.ENEMY_TYPES[type].w;
      if (roll <= 0) return type;
    }
    return pool[pool.length - 1];
  }

  getElapsedSeconds(): number { return this.elapsed; }
}
