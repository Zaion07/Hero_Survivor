import Phaser from 'phaser';

type Waveform = OscillatorType;

export class Sfx {
  private static throttle = new Map<string, number>();

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
