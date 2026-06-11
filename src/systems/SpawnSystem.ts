import Phaser from 'phaser';
import { CFG, HordeDef, WaveDef } from '../config';
import { Enemy } from '../entities/Enemy';
import { CollectionTracker } from '../utils/CollectionTracker';
import { Sfx } from '../utils/Sfx';

type SpecialSpawnRequest = {
  spawnId: string;
  type: string;
  waveIndex?: number;
  message?: string;
};

const TIMED_ELITES: Array<{ time: number; type: string; message: string }> = [
  { time: 1, type: 'GUARDIAN', message: '⚠️ O GUARDIÃO ANCESTRAL despertou com você!' },
  { time: 60, type: 'TANK', message: '⚔️ ELITE: Golem (1:00)' },
  { time: 120, type: 'BRUTE', message: '⚔️ ELITE: Carrasco (2:00)' },
  { time: 180, type: 'MINIBOSS', message: '⚠️ SUBCHEFE: Necromante (3:00)' },
  { time: 240, type: 'MINIBOSS_WARLORD', message: '⚠️ SUBCHEFE: Lorde da Guerra (4:00)' },
  { time: 300, type: 'BOSS', message: '💀 CHEFÃO: Sr. do Vazio (5:00)' },
  { time: 420, type: 'BOSS_ABYSS', message: '💀 CHEFÃO: Titã Abissal (7:00)' },
];

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
  private waveIndex  = -1;
  private currentWave!: WaveDef;
  private hordeIndex = 0;
  private activeHorde: HordeDef | null = null;
  private hordeEndAt = 0;
  private hordeSpawnTimer = 0;

  private spawnedSpecial: Set<string> = new Set();
  private queuedSpecial: Set<string> = new Set();
  private pendingSpecials: SpecialSpawnRequest[] = [];
  private specialRetryTimer = 0;
  private elitePressureTimer = 0;

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
    this.updateHorde(delta);
    this.checkTimedElites();
    this.checkSpecialSpawns();
    this.processPendingSpecials(delta);

    this.spawnTimer -= delta;
    while (this.spawnTimer <= 0) {
      this.spawnTimer += this.currentWave.interval * this.getSpawnIntervalMultiplier();
      if (!this.shouldHoldRegularSpawn()) this.spawnRegular();
    }

    this.updateElitePressure(delta);
  }

  private advanceWave(): void {
    for (let i = CFG.WAVES.length - 1; i >= 0; i--) {
      if (this.elapsed >= CFG.WAVES[i].time) {
        if (this.waveIndex !== i) {
          this.waveIndex   = i;
          this.currentWave = CFG.WAVES[i];
          this.spawnTimer  = 0;
          this.scene.events.emit('waveMessage', `🌊 ONDA ${i + 1}`);
        }
        break;
      }
    }
  }

  private updateHorde(delta: number): void {
    while (this.activeHorde === null && this.hordeIndex < CFG.HORDES.length) {
      const horde = CFG.HORDES[this.hordeIndex];
      if (this.elapsed < horde.start) break;

      this.hordeIndex++;
      const scheduledEnd = horde.start + horde.duration;
      if (this.elapsed >= scheduledEnd) continue;

      this.activeHorde = horde;
      this.hordeEndAt = scheduledEnd;
      this.hordeSpawnTimer = 0;
      this.scene.events.emit('waveMessage', `🔥 HORDA: ${horde.label}`);
    }

    if (!this.activeHorde) return;

    if (this.elapsed >= this.hordeEndAt) {
      this.activeHorde = null;
      this.hordeSpawnTimer = 0;
      return;
    }

    this.hordeSpawnTimer -= delta;
    while (this.hordeSpawnTimer <= 0 && this.activeHorde) {
      this.spawnHordeBatch(this.activeHorde);
      this.hordeSpawnTimer += this.activeHorde.interval;
    }
  }

  private spawnRegular(): void {
    const type      = this.weightedRandom(this.currentWave.pool);
    this.spawnEnemy(type);
  }

  private spawnHordeBatch(horde: HordeDef): void {
    for (let i = 0; i < horde.count; i++) {
      const type = this.weightedRandom(horde.pool);
      this.spawnEnemy(type);
    }
  }

  private spawnEnemy(type: string, prioritize = false): Enemy | null {
    const { x, y } = this.randomOutsideViewport();
    let enemy = Enemy.spawn(this.scene, this.group, type, x, y);
    if (!enemy && prioritize && this.recycleOneNormalEnemy()) {
      enemy = Enemy.spawn(this.scene, this.group, type, x, y);
    }
    if (enemy) {
      CollectionTracker.addMonster(type);

      // Variante elite dourada (somente inimigos normais)
      if (enemy.typeDef.kind === 'normal' && Math.random() < CFG.ELITE.CHANCE) {
        enemy.makeElite();
      }
    }
    return enemy;
  }

  /** Retoma uma partida salva: avança o relógio e marca eventos já ocorridos. */
  setElapsed(seconds: number): void {
    this.elapsed = seconds;

    // Eventos cronometrados que já aconteceram não devem disparar de novo
    TIMED_ELITES.forEach((entry, idx) => {
      if (entry.time <= seconds) {
        this.spawnedSpecial.add(`timed:${idx}:${entry.type}`);
      }
    });

    CFG.WAVES.forEach((wave, idx) => {
      if (wave.time > seconds) return;
      wave.minibosses?.forEach(type => this.spawnedSpecial.add(`wave:${idx}:${type}`));
      wave.bosses?.forEach(type => this.spawnedSpecial.add(`wave:${idx}:${type}`));
    });
  }

  private checkSpecialSpawns(): void {
    CFG.WAVES.forEach((wave, idx) => {
      if (this.elapsed < wave.time) return;

      wave.minibosses?.forEach(type => this.enqueueSpecial(type, `wave:${idx}:${type}`, idx));
      wave.bosses?.forEach(type => this.enqueueSpecial(type, `wave:${idx}:${type}`, idx));
    });
  }

  private checkTimedElites(): void {
    TIMED_ELITES.forEach((entry, idx) => {
      if (this.elapsed < entry.time) return;
      this.enqueueSpecial(entry.type, `timed:${idx}:${entry.type}`, undefined, entry.message);
    });
  }

  private enqueueSpecial(type: string, spawnId: string, waveIndex?: number, message?: string): void {
    if (this.spawnedSpecial.has(spawnId) || this.queuedSpecial.has(spawnId)) return;

    this.queuedSpecial.add(spawnId);
    this.pendingSpecials.push({ spawnId, type, waveIndex, message });
  }

  private processPendingSpecials(delta: number): void {
    if (this.pendingSpecials.length === 0) return;

    this.specialRetryTimer -= delta;
    if (this.specialRetryTimer > 0) return;

    const request = this.pendingSpecials[0];
    const def = CFG.ENEMY_TYPES[request.type];
    if (!def) {
      // O console vai gritar de vermelho se o nome estiver errado!
      console.error(`🚨 ERRO DE SPAWN: O chefe '${request.type}' não existe no CFG.ENEMY_TYPES!`);
      this.pendingSpecials.shift();
      this.queuedSpecial.delete(request.spawnId);
      return;
    }

    const enemy = this.spawnPriorityEnemy(request.type);
    if (!enemy) {
      this.specialRetryTimer = 420;
      return;
    }

    this.pendingSpecials.shift();
    this.queuedSpecial.delete(request.spawnId);
    this.spawnedSpecial.add(request.spawnId);

    this.onSpecialSpawned(def, request.type, request.waveIndex, request.message);
    this.specialRetryTimer = 0;
  }

  private spawnPriorityEnemy(type: string): Enemy | null {
    let enemy = this.spawnEnemy(type, true);
    if (enemy) return enemy;

    // Fallback agressivo: libera espaço com inimigos ativos e tenta novamente.
    for (let i = 0; i < 16; i++) {
      if (!this.recycleOneNormalEnemy() && !this.recycleOneActiveEnemy()) break;
      enemy = this.spawnEnemy(type, false);
      if (enemy) return enemy;
    }

    return null;
  }

  private onSpecialSpawned(
    def: (typeof CFG.ENEMY_TYPES)[string],
    type: string,
    waveIndex?: number,
    message?: string,
  ): void {
    this.spawnSupportPack(def.kind);

    if (def.kind === 'subboss' || def.kind === 'boss') {
      Sfx.specialSpawn(this.scene, def.kind, type);
    }

    if (message) {
      this.scene.events.emit('waveMessage', message);
      return;
    }

    const title = def.kind === 'boss' ? 'CHEFÃO' : 'SUBCHEFE';
    const icon  = def.kind === 'boss' ? '💀' : '⚠️';
    const suffix = waveIndex !== undefined ? ` (Onda ${waveIndex + 1})` : '';
    this.scene.events.emit('waveMessage', `${icon} ${title}: ${def.name}${suffix}`);
  }

  private spawnSupportPack(kind: 'normal' | 'subboss' | 'boss'): void {
    if (kind === 'normal') return;
    const normalPool = this.currentWave.pool.filter(t => CFG.ENEMY_TYPES[t]?.kind === 'normal');
    const pool = normalPool.length > 0 ? normalPool : ['COMMON'];
    const count = kind === 'boss' ? 8 : 4;
    for (let i = 0; i < count; i++) {
      const type = this.weightedRandom(pool);
      this.spawnEnemy(type);
    }
  }

  private updateElitePressure(delta: number): void {
    const specials = this.getAliveSpecials();
    if (specials.length === 0) {
      this.elitePressureTimer = 0;
      return;
    }

    this.elitePressureTimer -= delta;
    if (this.elitePressureTimer > 0) return;

    const hasBoss = specials.some(e => e.typeDef.kind === 'boss');
    const normalPool = this.currentWave.pool.filter(t => CFG.ENEMY_TYPES[t]?.kind === 'normal');
    const pool = normalPool.length > 0 ? normalPool : ['COMMON'];
    const count = hasBoss ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const type = this.weightedRandom(pool);
      this.spawnEnemy(type);
    }

    this.elitePressureTimer = hasBoss ? 3600 : 5200;
  }

  private shouldHoldRegularSpawn(): boolean {
    if (this.pendingSpecials.length === 0) return false;
    const max = this.group.maxSize;
    if (max <= 0) return false;
    return this.group.countActive(true) >= Math.max(1, max - 10);
  }

  private getSpawnIntervalMultiplier(): number {
    const specials = this.getAliveSpecials();
    if (specials.length === 0) return 1;
    const hasBoss = specials.some(e => e.typeDef.kind === 'boss');
    return hasBoss ? 0.62 : 0.78;
  }

  private getAliveSpecials(): Enemy[] {
    return this.group.getChildren()
      .map(obj => obj as Enemy)
      .filter(e => e.active && e.alive && e.typeDef.kind !== 'normal');
  }

  private recycleOneNormalEnemy(): boolean {
    const normal = this.group.getChildren()
      .map(obj => obj as Enemy)
      .find(e => e.active && e.alive && e.typeDef.kind === 'normal');
    if (!normal) return false;
    normal.setVelocity(0, 0).setActive(false).setVisible(false);
    (normal.body as Phaser.Physics.Arcade.Body).stop();
    return true;
  }

  private recycleOneActiveEnemy(): boolean {
    const enemy = this.group.getChildren()
      .map(obj => obj as Enemy)
      .find(e => e.active && e.alive);
    if (!enemy) return false;
    enemy.setVelocity(0, 0).setActive(false).setVisible(false);
    (enemy.body as Phaser.Physics.Arcade.Body).stop();
    return true;
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
