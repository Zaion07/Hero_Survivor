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

  static specialSpawn(scene: Phaser.Scene, kind: 'subboss' | 'boss'): void {
    if (kind === 'boss') {
      this.sweep(scene, { from: 160, to: 50, duration: 0.32, volume: 0.13, wave: 'sawtooth' });
      this.sweep(scene, { from: 90, to: 140, duration: 0.24, volume: 0.08, wave: 'square', delay: 0.1 });
      return;
    }
    this.sweep(scene, { from: 220, to: 80, duration: 0.2, volume: 0.1, wave: 'square' });
  }

  static weaponFire(scene: Phaser.Scene, weaponType: string): void {
    if (!this.allow(scene, `weapon:${weaponType}`, 80)) return;

    if (weaponType === 'WEAPON_ARROW') {
      this.sweep(scene, { from: 660, to: 330, duration: 0.05, volume: 0.04, wave: 'square' });
      return;
    }
    if (weaponType === 'WEAPON_ORB') {
      this.sweep(scene, { from: 420, to: 560, duration: 0.08, volume: 0.04, wave: 'sine' });
      return;
    }
    this.sweep(scene, { from: 180, to: 240, duration: 0.09, volume: 0.03, wave: 'triangle' });
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
