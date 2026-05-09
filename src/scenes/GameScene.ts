import Phaser from 'phaser';
import { CFG } from '../config';
import { Player }            from '../entities/Player';
import { Enemy }             from '../entities/Enemy';
import { XPOrb }             from '../entities/XPOrb';
import { Aura }              from '../weapons/Aura';
import { MagicOrb }          from '../weapons/MagicOrb';
import { Arrow }             from '../weapons/Arrow';
import { SpawnSystem }       from '../systems/SpawnSystem';
import { floatingText }      from '../utils/floatingText';
import { CollectionTracker } from '../utils/CollectionTracker';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  GameScene — loop principal com polish visual estilo VS
// =============================================================
export class GameScene extends Phaser.Scene {
  player!:      Player;
  enemyGroup!:  Phaser.Physics.Arcade.Group;
  xpGroup!:     Phaser.Physics.Arcade.Group;
  projGroup!:   Phaser.Physics.Arcade.Group;

  private spawn!:          SpawnSystem;
  private bgTile!:         Phaser.GameObjects.TileSprite;
  private enemyHpGfx!:     Phaser.GameObjects.Graphics;
  private levelUpPending   = false;
  private gameOver         = false;

  constructor() { super({ key: 'Game' }); }

  // ═══════════════════════════════════════════════════════════
  create(): void {
    // ── Resetar estado (garante reinício limpo) ───────────
    this.gameOver       = false;
    this.levelUpPending = false;

    const W = CFG.WORLD;

    this.physics.world.setBounds(0, 0, W, W);

    // Chão de masmorra (TileSprite que scrolla com a câmera)
    this.bgTile = this.add.tileSprite(0, 0, CFG.WIDTH, CFG.HEIGHT, 'bg_tile')
      .setOrigin(0).setScrollFactor(0).setDepth(-1);

    // ── Jogador ───────────────────────────────────────────
    this.player = new Player(this, W / 2, W / 2);

    // ── Câmera (RF14) ─────────────────────────────────────
    this.cameras.main.setBackgroundColor(0x080810);
    this.cameras.main.startFollow(this.player, true, 0.10, 0.10);
    this.cameras.main.setBounds(0, 0, W, W);

    // ── Grupos ────────────────────────────────────────────
    this.enemyGroup = this.physics.add.group({ classType: Enemy,  maxSize: 400 });
    this.xpGroup    = this.physics.add.group({ classType: XPOrb,  maxSize: 800 });
    this.projGroup  = this.physics.add.group({ maxSize: 200 });

    // Gráfico para barras de HP dos inimigos
    this.enemyHpGfx = this.add.graphics().setDepth(20);

    // ── Colisões ──────────────────────────────────────────
    this.setupPhysics();

    // ── Arma inicial ──────────────────────────────────────
    this.player.addWeapon(new Aura(this, this.player));
    CollectionTracker.addWeapon('WEAPON_AURA');

    // ── Sistema de spawn ──────────────────────────────────
    this.spawn = new SpawnSystem(this, this.enemyGroup, this.cameras.main);

    // ── HUD paralelo ──────────────────────────────────────
    this.scene.launch('HUD');

    // ── Eventos ───────────────────────────────────────────
    this.events.on('playerLevelUp', (level: number) => this.handleLevelUp(level));
    this.events.on('playerDied',    ()               => { this.gameOver = true; });
    this.events.on('upgradeChosen', (id: string)     => this.applyUpgrade(id));
    this.events.on('enemyDied',     (x: number, y: number, xp: number, type: string) => {
      XPOrb.spawn(this, this.xpGroup, x, y, xp);
      this.spawnDeathParticles(x, y, type);
      this.events.emit('enemyKilled');
    });
  }

  // ── Física e overlaps ────────────────────────────────────
  private setupPhysics(): void {
    // Inimigo toca jogador → dano + screen shake (RF16)
    this.physics.add.overlap(
      this.player,
      this.enemyGroup,
      (_p, obj) => {
        const e = obj as Enemy;
        if (!e.alive || !e.active) return;
        const wasAlive = this.player.alive;
        this.player.takeDamage(e.typeDef.dmg);
        if (wasAlive && this.player.stats.hp > 0) {
          // Screen shake leve ao tomar dano
          this.cameras.main.shake(180, 0.012);
        }
      },
    );

    // Projétil atinge inimigo (RF16)
    this.physics.add.overlap(
      this.projGroup,
      this.enemyGroup,
      (proj, obj) => {
        const p = proj as Phaser.Physics.Arcade.Sprite;
        const e = obj  as Enemy;
        if (!p.active || !e.alive) return;

        const dmg      = (p.getData('damage') as number) ?? 10;
        const piercing = (p.getData('piercing') as boolean) ?? false;

        e.takeDamage(dmg, 1);

        if (!piercing) {
          p.setActive(false).setVisible(false);
          (p.body as Phaser.Physics.Arcade.Body).stop();
        }
      },
    );

    // Coleta de XP (RF03, RF09)
    this.physics.add.overlap(
      this.player,
      this.xpGroup,
      (_p, obj) => {
        const orb = obj as XPOrb;
        if (!orb.active) return;
        floatingText(this, orb.x, orb.y - 10, `+${orb.value}`, '#00e5ff', 12);
        this.player.gainXP(orb.value);
        Sfx.xpPickup(this);
        orb.setActive(false).setVisible(false);
        (orb.body as Phaser.Physics.Arcade.Body).stop();
      },
    );
  }

  // ═══════════════════════════════════════════════════════════
  update(_time: number, delta: number): void {
    if (this.gameOver || this.levelUpPending) return;

    const cam = this.cameras.main;

    // Fundo scrolla com câmera
    this.bgTile.tilePositionX = cam.scrollX;
    this.bgTile.tilePositionY = cam.scrollY;

    // Movimento (RF01)
    this.player.handleInput();

    // Auto-attack (RF02)
    this.player.weapons.forEach(w => w.update(delta, this.enemyGroup, this.projGroup));

    // Anel da Aura
    const aura = this.player.getWeapon('WEAPON_AURA') as Aura | undefined;
    aura?.drawRing();

    // IA dos inimigos (RF06)
    this.enemyGroup.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (e.alive && e.active) e.chase(this.player.x, this.player.y);
    });

    // Magnetismo XP (RF03)
    const { x: px, y: py, stats } = this.player;
    this.xpGroup.getChildren().forEach(obj =>
      (obj as XPOrb).magnetUpdate(px, py, stats.pickupRadius),
    );

    // Barras de HP nos inimigos
    this.drawEnemyHpBars();

    // Spawn (RF05, RF08)
    this.spawn.update(delta);

    // Cronômetro (RF13)
    this.events.emit('survivalTime', this.spawn.getElapsedSeconds());
  }

  // ── Barras de HP sobre cada inimigo ──────────────────────
  private drawEnemyHpBars(): void {
    this.enemyHpGfx.clear();

    this.enemyGroup.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (!e.alive || !e.active || e.hp === e.maxHp) return;

      const W   = 30;
      const H   = 4;
      const pct = Math.max(0, e.hp / e.maxHp);
      const bx  = e.x - W / 2;
      const by  = e.y - e.displayHeight / 2 - 8;

      // Fundo
      this.enemyHpGfx.fillStyle(0x1a0000, 0.9);
      this.enemyHpGfx.fillRect(bx, by, W, H);

      // Preenchimento (verde → amarelo → vermelho)
      const fill = pct > 0.6 ? 0x22cc22 : pct > 0.3 ? 0xccaa00 : 0xcc2200;
      this.enemyHpGfx.fillStyle(fill, 1);
      this.enemyHpGfx.fillRect(bx, by, Math.round(W * pct), H);

      // Borda
      this.enemyHpGfx.lineStyle(0.5, 0x333333, 0.8);
      this.enemyHpGfx.strokeRect(bx, by, W, H);
    });
  }

  // ── Partículas de morte (tweens) ─────────────────────────
  private spawnDeathParticles(x: number, y: number, type: string): void {
    const def   = CFG.ENEMY_TYPES[type];
    if (!def) return;
    const isBoss = def.kind === 'boss';
    const isSubboss = def.kind === 'subboss';
    const color = Phaser.Display.Color.IntegerToColor(def.color);
    const count = isBoss ? 20 : isSubboss ? 12 : 6;

    for (let i = 0; i < count; i++) {
      const size  = isBoss ? 6 : isSubboss ? 4 : 3;
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const speed = 60 + Math.random() * 100;
      const px    = x + Math.cos(angle) * 8;
      const py    = y + Math.sin(angle) * 8;

      const particle = this.add.rectangle(px, py, size, size, def.color).setDepth(15);

      this.tweens.add({
        targets: particle,
        x: px + Math.cos(angle) * speed,
        y: py + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 400 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Flash de luz na morte de boss/miniboss
    if (isBoss || isSubboss) {
      this.cameras.main.flash(300, 80, 0, 0);
      this.cameras.main.shake(400, 0.02);
    }
  }

  // ── Level up → pausa + UpgradeScene (RF10) ───────────────
  private handleLevelUp(_level: number): void {
    if (this.levelUpPending) return;
    this.levelUpPending = true;

    // Flash dourado de nível acima
    this.cameras.main.flash(200, 212, 175, 55);

    this.time.delayedCall(120, () => {
      const upgrades = this.getRandomUpgrades(3);
      this.scene.pause('Game');
      this.scene.launch('Upgrade', { upgrades });
    });
  }

  // ── Aplica upgrade (RF11, RF12) ──────────────────────────
  private applyUpgrade(id: string): void {
    this.levelUpPending = false;
    Sfx.upgradeChoose(this);

    switch (id) {
      case 'WEAPON_AURA': {
        CollectionTracker.addWeapon('WEAPON_AURA');
        const w = this.player.getWeapon('WEAPON_AURA') as Aura | undefined;
        if (w) w.upgrade(); else this.player.addWeapon(new Aura(this, this.player));
        break;
      }
      case 'WEAPON_ORB': {
        CollectionTracker.addWeapon('WEAPON_ORB');
        const w = this.player.getWeapon('WEAPON_ORB') as MagicOrb | undefined;
        if (w) w.upgrade(); else this.player.addWeapon(new MagicOrb(this, this.player));
        break;
      }
      case 'WEAPON_ARROW': {
        CollectionTracker.addWeapon('WEAPON_ARROW');
        const w = this.player.getWeapon('WEAPON_ARROW') as Arrow | undefined;
        if (w) w.upgrade(); else this.player.addWeapon(new Arrow(this, this.player));
        break;
      }
      default:
        CollectionTracker.addUpgrade(id);
        this.player.applyUpgrade(id);
        break;
    }
  }

  // ── 3 upgrades aleatórios (RF10) ─────────────────────────
  private getRandomUpgrades(count: number) {
    const pool = CFG.UPGRADES.map(u => {
      if (u.id.startsWith('WEAPON_')) {
        const ex = this.player.getWeapon(u.id);
        if (ex) return { ...u, desc: `Aprimora para nível ${ex.level + 1}` };
      }
      return u;
    });
    Phaser.Utils.Array.Shuffle(pool);
    return pool.slice(0, count);
  }
}
