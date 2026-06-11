import Phaser from 'phaser';

type Waveform = OscillatorType;

export class Sfx {
  private static throttle = new Map<string, number>();
  private static dungeonBgmEnabled = true;
  private static readonly BGM_VOLUME = 0.55;
  private static bgm:
    | { ownerKey: string; timer: Phaser.Time.TimerEvent; step: number }
    | null = null;

  static unlock(scene: Phaser.Scene): void {
    const ctx = this.getContext(scene);
    if (!ctx || ctx.state !== 'suspended') return;
    void ctx.resume();
  }

  static enemyHit(scene: Phaser.Scene): void {
    if (!this.allow(scene, 'enemyHit', 45)) return;
    this.sweep(scene, { from: 460, to: 260, duration: 0.06, volume: 0.03, wave: 'square' });
  }

  static enemyDie(scene: Phaser.Scene): void {
    this.sweep(scene, { from: 240, to: 110, duration: 0.14, volume: 0.06, wave: 'sawtooth' });
  }

  static playerHit(scene: Phaser.Scene): void {
    this.sweep(scene, { from: 180, to: 90, duration: 0.18, volume: 0.1, wave: 'triangle' });
  }

  static playerDie(scene: Phaser.Scene): void {
    this.sweep(scene, { from: 220, to: 40, duration: 0.45, volume: 0.14, wave: 'sawtooth' });
  }

  static xpPickup(scene: Phaser.Scene): void {
    if (!this.allow(scene, 'xpPickup', 40)) return;
    this.sweep(scene, { from: 780, to: 1040, duration: 0.06, volume: 0.04, wave: 'triangle' });
  }

  static levelUp(scene: Phaser.Scene): void {
    this.sweep(scene, { from: 420, to: 920, duration: 0.22, volume: 0.09, wave: 'triangle' });
    this.sweep(scene, { from: 700, to: 1320, duration: 0.2, volume: 0.05, wave: 'sine', delay: 0.08 });
  }

  static upgradeChoose(scene: Phaser.Scene): void {
    this.sweep(scene, { from: 520, to: 980, duration: 0.12, volume: 0.08, wave: 'triangle' });
  }

  static itemPickup(scene: Phaser.Scene): void {
    this.sweep(scene, { from: 440, to: 760, duration: 0.1, volume: 0.07, wave: 'triangle' });
    this.sweep(scene, { from: 760, to: 1180, duration: 0.1, volume: 0.05, wave: 'sine', delay: 0.08 });
  }

  static bombExplode(scene: Phaser.Scene): void {
    this.sweep(scene, { from: 160, to: 35, duration: 0.4, volume: 0.16, wave: 'sawtooth' });
    this.sweep(scene, { from: 90, to: 50, duration: 0.3, volume: 0.1, wave: 'square', delay: 0.05 });
  }

  static heal(scene: Phaser.Scene): void {
    this.sweep(scene, { from: 520, to: 880, duration: 0.14, volume: 0.07, wave: 'sine' });
    this.sweep(scene, { from: 660, to: 1100, duration: 0.12, volume: 0.04, wave: 'triangle', delay: 0.06 });
  }

  static ability(scene: Phaser.Scene, charId: string): void {
    if (charId === 'KNIGHT') {
      // Escudo Divino — acorde grave e sólido
      this.sweep(scene, { from: 220, to: 440, duration: 0.25, volume: 0.1, wave: 'triangle' });
      this.sweep(scene, { from: 330, to: 660, duration: 0.22, volume: 0.06, wave: 'sine', delay: 0.06 });
      return;
    }
    if (charId === 'RANGER') {
      // Dash Sombrio — whoosh rápido
      this.sweep(scene, { from: 900, to: 240, duration: 0.16, volume: 0.08, wave: 'sawtooth' });
      return;
    }
    // Nova Arcana — explosão mágica
    this.sweep(scene, { from: 140, to: 50, duration: 0.35, volume: 0.14, wave: 'sawtooth' });
    this.sweep(scene, { from: 600, to: 1400, duration: 0.3, volume: 0.07, wave: 'sine', delay: 0.04 });
  }

  static specialSpawn(scene: Phaser.Scene, kind: 'subboss' | 'boss', type?: string): void {
    if (type === 'MINIBOSS') {
      this.sweep(scene, { from: 300, to: 110, duration: 0.28, volume: 0.11, wave: 'triangle' });
      this.sweep(scene, { from: 520, to: 690, duration: 0.2, volume: 0.06, wave: 'sine', delay: 0.08 });
      return;
    }
    if (type === 'MINIBOSS_WARLORD') {
      this.sweep(scene, { from: 180, to: 70, duration: 0.24, volume: 0.12, wave: 'square' });
      this.sweep(scene, { from: 120, to: 120, duration: 0.16, volume: 0.07, wave: 'sawtooth', delay: 0.05 });
      return;
    }
    if (type === 'BOSS') {
      this.sweep(scene, { from: 130, to: 45, duration: 0.4, volume: 0.16, wave: 'sawtooth' });
      this.sweep(scene, { from: 70, to: 95, duration: 0.32, volume: 0.11, wave: 'square', delay: 0.12 });
      this.sweep(scene, { from: 410, to: 280, duration: 0.28, volume: 0.07, wave: 'triangle', delay: 0.08 });
      return;
    }
    if (type === 'BOSS_ABYSS') {
      this.sweep(scene, { from: 95, to: 38, duration: 0.5, volume: 0.18, wave: 'sawtooth' });
      this.sweep(scene, { from: 240, to: 480, duration: 0.34, volume: 0.08, wave: 'sine', delay: 0.1 });
      this.sweep(scene, { from: 55, to: 62, duration: 0.42, volume: 0.09, wave: 'square', delay: 0.06 });
      return;
    }

    if (kind === 'boss') {
      this.sweep(scene, { from: 160, to: 50, duration: 0.32, volume: 0.13, wave: 'sawtooth' });
      this.sweep(scene, { from: 90, to: 140, duration: 0.24, volume: 0.08, wave: 'square', delay: 0.1 });
      return;
    }
    this.sweep(scene, { from: 220, to: 80, duration: 0.2, volume: 0.1, wave: 'square' });
  }

  static weaponFire(scene: Phaser.Scene, weaponType: string): void {
    if (!this.allow(scene, `weapon:${weaponType}`, 80)) return;

    switch (weaponType) {
      case 'WEAPON_ARROW':
        this.sweep(scene, { from: 660, to: 330, duration: 0.05, volume: 0.04, wave: 'square' });
        return;
      case 'WEAPON_ORB':
        this.sweep(scene, { from: 420, to: 560, duration: 0.08, volume: 0.04, wave: 'sine' });
        return;
      case 'WEAPON_SWORD':
        this.sweep(scene, { from: 880, to: 320, duration: 0.07, volume: 0.05, wave: 'sawtooth' });
        return;
      case 'WEAPON_AXE':
        this.sweep(scene, { from: 300, to: 140, duration: 0.12, volume: 0.05, wave: 'square' });
        return;
      case 'WEAPON_KNIFE':
        this.sweep(scene, { from: 980, to: 620, duration: 0.04, volume: 0.03, wave: 'square' });
        return;
      case 'WEAPON_BOOMERANG':
        this.sweep(scene, { from: 360, to: 580, duration: 0.14, volume: 0.04, wave: 'triangle' });
        return;
      case 'WEAPON_LIGHTNING':
        this.sweep(scene, { from: 1400, to: 180, duration: 0.1, volume: 0.07, wave: 'sawtooth' });
        this.sweep(scene, { from: 90, to: 55, duration: 0.18, volume: 0.05, wave: 'square', delay: 0.04 });
        return;
    }
    this.sweep(scene, { from: 180, to: 240, duration: 0.09, volume: 0.03, wave: 'triangle' });
  }

  static ultimate(scene: Phaser.Scene, charId: string): void {
    if (charId === 'KNIGHT') {
      // Julgamento Celestial — fanfarra grave
      this.sweep(scene, { from: 220, to: 880, duration: 0.4, volume: 0.13, wave: 'triangle' });
      this.sweep(scene, { from: 110, to: 440, duration: 0.45, volume: 0.1, wave: 'sawtooth', delay: 0.08 });
      this.sweep(scene, { from: 660, to: 1320, duration: 0.3, volume: 0.07, wave: 'sine', delay: 0.18 });
      return;
    }
    if (charId === 'RANGER') {
      // Tempestade de Flechas — vento crescente
      this.sweep(scene, { from: 240, to: 1100, duration: 0.5, volume: 0.1, wave: 'sawtooth' });
      this.sweep(scene, { from: 800, to: 400, duration: 0.35, volume: 0.07, wave: 'triangle', delay: 0.15 });
      return;
    }
    // Buraco Negro — sucção profunda
    this.sweep(scene, { from: 300, to: 30, duration: 0.9, volume: 0.15, wave: 'sawtooth' });
    this.sweep(scene, { from: 1200, to: 80, duration: 0.7, volume: 0.08, wave: 'sine', delay: 0.1 });
    this.sweep(scene, { from: 55, to: 42, duration: 0.8, volume: 0.09, wave: 'square', delay: 0.2 });
  }

  static startDungeonBgm(scene: Phaser.Scene): void {
    if (!this.dungeonBgmEnabled) return;
    const ownerKey = scene.sys.settings.key;
    if (this.bgm && this.bgm.ownerKey === ownerKey) return;

    this.stopDungeonBgm();

    const state = {
      ownerKey,
      step: 0,
      timer: scene.time.addEvent({
        delay: 260,
        loop: true,
        callback: () => this.tickDungeonBgm(scene),
      }),
    };
    this.bgm = state;

    this.tickDungeonBgm(scene);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopDungeonBgm(ownerKey));
    scene.events.once(Phaser.Scenes.Events.DESTROY, () => this.stopDungeonBgm(ownerKey));
  }

  static stopDungeonBgm(ownerKey?: string): void {
    if (!this.bgm) return;
    if (ownerKey && this.bgm.ownerKey !== ownerKey) return;
    this.bgm.timer.remove(false);
    this.bgm = null;
  }

  static isDungeonBgmEnabled(): boolean {
    return this.dungeonBgmEnabled;
  }

  static toggleDungeonBgm(scene: Phaser.Scene): boolean {
    this.dungeonBgmEnabled = !this.dungeonBgmEnabled;
    if (this.dungeonBgmEnabled) {
      this.unlock(scene);
      this.startDungeonBgm(scene);
    } else {
      this.stopDungeonBgm();
    }
    return this.dungeonBgmEnabled;
  }

  private static sweep(
    scene: Phaser.Scene,
    opts: { from: number; to: number; duration: number; volume: number; wave: Waveform; delay?: number },
  ): void {
    const ctx = this.getContext(scene);
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = opts.wave;
    osc.frequency.setValueAtTime(opts.from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, opts.to), now + opts.duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(opts.volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + opts.duration + 0.01);
  }

  private static tickDungeonBgm(scene: Phaser.Scene): void {
    const ctx = this.getContext(scene);
    if (!ctx || ctx.state !== 'running' || !this.bgm) return;

    const progression = [45, 41, 38, 43];
    const leadPattern = [12, 15, 19, 22, 24, 22, 19, 15];
    const step = this.bgm.step;
    const root = progression[Math.floor(step / 8) % progression.length];
    const lead = root + leadPattern[step % leadPattern.length];

    this.note(ctx, this.midiToHz(lead), 0.16 * this.BGM_VOLUME, 0.02, 'triangle', 0);

    if (step % 2 === 0) {
      this.note(ctx, this.midiToHz(root), 0.12 * this.BGM_VOLUME, 0.22, 'sawtooth', 0);
    }

    if (step % 4 === 0) {
      this.note(ctx, this.midiToHz(root + 7), 0.04 * this.BGM_VOLUME, 0.68, 'sine', 0);
      this.note(ctx, this.midiToHz(root + 12), 0.03 * this.BGM_VOLUME, 0.68, 'sine', 0.04);
    }

    this.bgm.step++;
  }

  private static note(
    ctx: AudioContext,
    frequency: number,
    volume: number,
    duration: number,
    wave: Waveform,
    delay: number,
  ): void {
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = wave;
    osc.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private static midiToHz(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private static allow(scene: Phaser.Scene, key: string, cooldownMs: number): boolean {
    const now = scene.time.now;
    const scoped = `${scene.sys.settings.key}:${key}`;
    const last = this.throttle.get(scoped) ?? -Infinity;
    if (now - last < cooldownMs) return false;
    this.throttle.set(scoped, now);
    return true;
  }

  private static getContext(scene: Phaser.Scene): AudioContext | null {
    const manager = scene.sound;
    if (!manager || !('context' in manager)) return null;
    return (manager as Phaser.Sound.WebAudioSoundManager).context ?? null;
  }
}
