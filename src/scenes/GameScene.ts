import Phaser from 'phaser';
import { CFG } from '../config';
import { Player }            from '../entities/Player';
import { Enemy }             from '../entities/Enemy';
import { XPOrb }             from '../entities/XPOrb';
import { Aura }              from '../weapons/Aura';
import { MagicOrb }          from '../weapons/MagicOrb';
import { Arrow }             from '../weapons/Arrow';
import { Sword }             from '../weapons/Sword';
import { SpinBlades }        from '../weapons/SpinBlades';
import { Axe }               from '../weapons/Axe';
import { Knife }             from '../weapons/Knife';
import { Boomerang }         from '../weapons/Boomerang';
import { Lightning }         from '../weapons/Lightning';
import type { Weapon }       from '../weapons/Weapon';
import { SpawnSystem }       from '../systems/SpawnSystem';
import { floatingText }      from '../utils/floatingText';
import { CollectionTracker } from '../utils/CollectionTracker';
import { Sfx } from '../utils/Sfx';
import { auth } from '../services/firebase';
import { clearSave, GameSave } from '../services/saveService';
import { getCurrentScore } from '../services/scoreService';
import {
  awardKill,
  finishRoom,
  generateZones,
  getCurrentRoomCode,
  getZoneAt,
  leaveRoom,
  listenMyHits,
  listenPlayers,
  listenRoom,
  pushMyState,
  sendHit,
  startArena,
  RoomData,
  RoomPlayer,
} from '../services/roomService';

const NOVA_RADIUS    = 260;
const NOVA_DAMAGE    = 70;
const NOVA_KNOCKBACK = 420;
const SHIELD_MS      = 3000;
const DASH_MS        = 220;
const POTION_HEAL    = 30;
const BOMB_RADIUS    = 420;
const BOMB_DAMAGE    = 80;
const BUFF_MS        = 10000;

// ── Battle Royale ──
const SYNC_INTERVAL_MS    = 250;
const ZONE_TICK_MS        = 600;
const CONTACT_PVP_DMG     = 12;
const CONTACT_PVP_CD_MS   = 600;

// =============================================================
//  GameScene — loop principal com polish visual estilo VS
// =============================================================
export class GameScene extends Phaser.Scene {
  player!:      Player;
  enemyGroup!:  Phaser.Physics.Arcade.Group;
  xpGroup!:     Phaser.Physics.Arcade.Group;
  projGroup!:   Phaser.Physics.Arcade.Group;
  itemGroup!:   Phaser.Physics.Arcade.Group;
  enemyProjGroup!: Phaser.Physics.Arcade.Group;

  private spawn!:          SpawnSystem;
  private bgTile!:         Phaser.GameObjects.TileSprite;
  private enemyHpGfx!:     Phaser.GameObjects.Graphics;
  private shieldGfx!:      Phaser.GameObjects.Graphics;
  private characterId      = 'KNIGHT';
  private levelUpPending   = false;
  private gameOver         = false;
  private dashHit          = new Set<Enemy>();
  private itemsCollected   = new Map<string, number>();

  // ── Battle Royale ──
  private royale           = false;
  private roomCode: string | null = null;
  private roomData: RoomData | null = null;
  private roomPlayers: RoomPlayer[] = [];
  private remoteGroup!:     Phaser.Physics.Arcade.Group;
  private remoteSprites    = new Map<string, Phaser.Physics.Arcade.Sprite>();
  private remoteLabels     = new Map<string, Phaser.GameObjects.Text>();
  private roomUnsubs:      Array<() => void> = [];
  private arenaActive      = false;
  private arenaRequested   = false;
  private finishedHandled  = false;
  private syncTimer        = 0;
  private zoneTickTimer    = 0;
  private auraPvpTimer     = 0;
  private zoneGfx?:         Phaser.GameObjects.Graphics;
  private outsideOverlay?:  Phaser.GameObjects.Rectangle;
  private lastContactHit   = new Map<string, number>();
  private lastDamageFrom: { uid: string; name: string } | null = null;

  // ── Buraco Negro (suprema do Arcanista) ──
  private blackHole: { x: number; y: number; until: number; tick: number } | null = null;

  // ── Save / FX de buffs ──
  private resumeData: GameSave | null = null;
  private restoring   = false;
  private furyFxTimer = 0;
  private hasteFxTimer = 0;

  constructor() { super({ key: 'Game' }); }

  init(data: { characterId?: string; royale?: boolean; resume?: GameSave }): void {
    this.characterId = data?.characterId ?? this.registry.get('characterId') ?? 'KNIGHT';
    this.royale      = !!data?.royale && !!getCurrentRoomCode();
    this.roomCode    = this.royale ? getCurrentRoomCode() : null;
    this.resumeData  = !this.royale ? (data?.resume ?? null) : null;
  }

  // ═══════════════════════════════════════════════════════════
  create(): void {
    // ── Resetar estado (garante reinício limpo) ───────────
    this.gameOver       = false;
    this.levelUpPending = false;
    this.itemsCollected = new Map();
    this.dashHit.clear();
    this.roomData        = null;
    this.roomPlayers     = [];
    this.remoteSprites   = new Map();
    this.remoteLabels    = new Map();
    this.roomUnsubs      = [];
    this.arenaActive     = false;
    this.arenaRequested  = false;
    this.finishedHandled = false;
    this.syncTimer       = 0;
    this.zoneTickTimer   = 0;
    this.auraPvpTimer    = 0;
    this.lastContactHit  = new Map();
    this.lastDamageFrom  = null;
    this.blackHole       = null;
    Sfx.unlock(this);
    Sfx.startDungeonBgm(this);

    const W = CFG.WORLD;

    this.physics.world.setBounds(0, 0, W, W);

    // Chão de masmorra (TileSprite que scrolla com a câmera)
    this.bgTile = this.add.tileSprite(0, 0, CFG.WIDTH, CFG.HEIGHT, 'bg_tile')
      .setOrigin(0).setScrollFactor(0).setDepth(-1);

    // Vinheta — bordas escurecidas para clima de masmorra
    this.add.image(0, 0, 'vignette')
      .setOrigin(0).setScrollFactor(0).setDepth(25).setAlpha(0.9);

    // Poeira ambiente flutuando
    this.spawnAmbientDust();

    // ── Jogador (personagem escolhido) ────────────────────
    this.player = new Player(this, W / 2, W / 2, this.characterId);
    this.registry.set('charDef', this.player.charDef);

    // ── Câmera (RF14) ─────────────────────────────────────
    this.cameras.main.setBackgroundColor(0x080810);
    this.cameras.main.startFollow(this.player, true, 0.10, 0.10);
    this.cameras.main.setBounds(0, 0, W, W);

    // ── Grupos ────────────────────────────────────────────
    this.enemyGroup     = this.physics.add.group({ classType: Enemy,  maxSize: 400 });
    this.xpGroup        = this.physics.add.group({ classType: XPOrb,  maxSize: 800 });
    this.projGroup      = this.physics.add.group({ maxSize: 200 });
    this.itemGroup      = this.physics.add.group({ maxSize: 60 });
    this.enemyProjGroup = this.physics.add.group({ maxSize: 80 });

    // Gráfico para barras de HP dos inimigos / escudo
    this.enemyHpGfx = this.add.graphics().setDepth(20);
    this.shieldGfx  = this.add.graphics().setDepth(11);

    // ── Colisões ──────────────────────────────────────────
    this.setupPhysics();

    // ── Arma inicial do personagem ────────────────────────
    this.addOrUpgradeWeapon(this.player.charDef.startWeapon);

    // ── Habilidade do personagem (ESPAÇO) ─────────────────
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
      .on('down', () => this.useAbility());

    // ── Suprema (Q) — carrega a cada 3 minutos ────────────
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q)
      .on('down', () => this.useUltimate());

    // ── Anúncio de evolução de arma (estilo VS) ───────────
    this.events.on('weaponEvolved', (type: string) => {
      if (this.restoring) return; // sem fanfarra ao recarregar save
      const info = CFG.WEAPON_INFO[type];
      if (!info) return;
      Sfx.levelUp(this);
      this.cameras.main.flash(300, 255, 215, 0);
      this.events.emit('waveMessage', `✨ EVOLUÇÃO: ${info.evolvedName}!`);
      floatingText(this, this.player.x, this.player.y - 34, info.evolvedName, '#ffd700', 15);
    });

    // ── Sistema de spawn ──────────────────────────────────
    this.spawn = new SpawnSystem(this, this.enemyGroup, this.cameras.main);

    // ── HUD paralelo ──────────────────────────────────────
    this.scene.launch('HUD');

    // ── Eventos ───────────────────────────────────────────
    this.events.on('playerLevelUp', (level: number) => this.handleLevelUp(level));
    this.events.on('playerDied',    ()               => {
      this.gameOver = true;
      this.handleRoyaleDeath();
      if (!this.royale) void clearSave(); // morreu → save consumido
    });
    this.events.on('upgradeChosen', (id: string)     => this.applyUpgrade(id));
    this.events.on('enemyDied',     (x: number, y: number, xp: number, type: string, isElite: boolean) => {
      XPOrb.spawn(this, this.xpGroup, x, y, xp);
      this.rollItemDrops(x, y, type, isElite);
      this.spawnDeathParticles(x, y, type);
      this.events.emit('enemyKilled');
    });

    // ── Battle Royale ─────────────────────────────────────
    this.registry.set('isRoyale', this.royale);
    if (this.royale) this.setupRoyale();

    // ── Retomar partida salva (solo) ──────────────────────
    this.registry.set('resumeKills', 0);
    this.registry.set('resumeLevel', 1);
    if (this.resumeData) this.applyResume(this.resumeData);
  }

  // ── Restaura o estado salvo no jogador / armas / relógio ──
  private applyResume(save: GameSave): void {
    this.restoring = true;
    const p = this.player;

    p.level        = save.level;
    p.xp           = save.xp;
    p.xpToNext     = save.xpToNext;
    p.abilityLevel = save.abilityLevel;
    p.ultReadyIn   = save.ultReadyIn;

    p.stats.maxHp        = save.maxHp;
    p.stats.hp           = save.hp;
    p.stats.speed        = save.speed;
    p.stats.damageMult   = save.damageMult;
    p.stats.cooldownMult = save.cooldownMult;
    p.stats.pickupRadius = save.pickupRadius;
    p.stats.regen        = save.regen;

    save.weapons.forEach(sw => {
      let weapon = p.getWeapon(sw.type);
      if (!weapon) {
        this.addOrUpgradeWeapon(sw.type);
        weapon = p.getWeapon(sw.type);
      }
      if (!weapon) return;
      while (weapon.level < sw.level) weapon.upgrade();
      weapon.applySpeedMult(p.stats.cooldownMult);
    });

    this.spawn.setElapsed(save.elapsedSeconds);
    this.registry.set('resumeKills', save.kills);
    this.registry.set('resumeLevel', save.level);
    this.restoring = false;

    // HUD é lançado depois — sincroniza as barras na sequência
    this.time.delayedCall(60, () => {
      this.events.emit('playerHpChanged', p.stats.hp, p.stats.maxHp);
      this.events.emit('playerXPChanged', p.xp, p.xpToNext, p.level);
      this.events.emit('waveMessage', '📜 Aventura retomada!');
    });
  }

  /** Estado atual para o "Salvar e Sair" (somente solo, vivo). */
  getSaveState(): GameSave | null {
    if (this.royale || this.gameOver || !this.player.alive) return null;
    const p = this.player;
    return {
      charId: p.charDef.id,
      level: p.level,
      xp: p.xp,
      xpToNext: p.xpToNext,
      hp: Math.ceil(p.stats.hp),
      maxHp: p.stats.maxHp,
      speed: p.stats.speed,
      damageMult: p.stats.damageMult,
      cooldownMult: p.stats.cooldownMult,
      pickupRadius: p.stats.pickupRadius,
      regen: p.stats.regen,
      abilityLevel: p.abilityLevel,
      ultReadyIn: p.ultReadyIn,
      weapons: p.weapons.map(w => ({ type: w.type, level: w.level })),
      elapsedSeconds: Math.floor(this.spawn.getElapsedSeconds()),
      kills: getCurrentScore().kills,
      savedAt: Date.now(),
    };
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
        this.player.takeDamage(e.contactDamage);
        if (wasAlive && this.player.stats.hp > 0) {
          // Screen shake leve ao tomar dano
          this.cameras.main.shake(180, 0.012);
        }
      },
    );

    // Projétil inimigo atinge o jogador
    this.physics.add.overlap(
      this.player,
      this.enemyProjGroup,
      (_p, obj) => {
        const bolt = obj as Phaser.Physics.Arcade.Sprite;
        if (!bolt.active) return;
        bolt.setActive(false).setVisible(false);
        (bolt.body as Phaser.Physics.Arcade.Body).stop();
        this.player.takeDamage((bolt.getData('damage') as number) ?? 10);
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

        const dmg    = (p.getData('damage') as number) ?? 10;
        const pierce = (p.getData('pierce') as number) ?? 0;

        e.takeDamage(dmg, 1);

        if (pierce > 0) {
          if (pierce !== Infinity) p.setData('pierce', pierce - 1);
        } else {
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

    // Coleta de itens dropados por inimigos fortes
    this.physics.add.overlap(
      this.player,
      this.itemGroup,
      (_p, obj) => {
        const item = obj as Phaser.Physics.Arcade.Sprite;
        if (!item.active) return;
        const itemId = (item.getData('itemId') as string) ?? 'POTION';
        this.tweens.killTweensOf(item);
        item.setActive(false).setVisible(false);
        (item.body as Phaser.Physics.Arcade.Body).stop();
        this.applyItemEffect(itemId, item.x, item.y);
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

    // Habilidade — cooldown e status para o HUD
    this.player.updateAbility(delta);
    this.events.emit(
      'abilityStatus',
      this.player.abilityReadyIn,
      this.player.getAbilityCooldown(),
      this.player.abilityLevel,
    );
    this.events.emit(
      'ultStatus',
      this.player.ultReadyIn,
      this.player.charDef.ultimate.cooldownMs,
    );

    // Buraco Negro ativo — sucção e dano
    this.updateBlackHole(delta);

    // Dash Sombrio nv.2+ — dana inimigos atravessados
    this.updateDashDamage();

    // Regeneração passiva (upgrade REGEN)
    this.player.applyRegen(delta);

    // Auto-attack (RF02)
    this.player.weapons.forEach(w => w.update(delta, this.enemyGroup, this.projGroup));

    // Anel da Aura
    const aura = this.player.getWeapon('WEAPON_AURA') as Aura | undefined;
    aura?.drawRing();

    // Escudo Divino — anel dourado enquanto ativo
    this.drawShield();

    // IA dos inimigos (RF06)
    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.enemyGroup.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (e.alive && e.active) {
        e.chase(this.player.x, this.player.y, pBody.velocity.x, pBody.velocity.y);
      }
    });

    // Atiradores à distância + ataques telegrafados dos chefes
    this.updateShooters();
    this.updateSpecialAttacks();

    // Efeitos visuais de buffs ativos (Fúria / Pressa)
    this.updateBuffFx(delta);

    // Magnetismo XP (RF03)
    const { x: px, y: py, stats } = this.player;
    this.xpGroup.getChildren().forEach(obj =>
      (obj as XPOrb).magnetUpdate(px, py, stats.pickupRadius),
    );

    // Barras de HP nos inimigos
    this.drawEnemyHpBars();

    // Spawn (RF05, RF08) — desligado na arena do royale
    if (!this.arenaActive) this.spawn.update(delta);

    // Cronômetro (RF13)
    this.events.emit('survivalTime', this.spawn.getElapsedSeconds());

    // Battle Royale (sincronização, zona, PvP)
    if (this.royale) this.updateRoyale(delta);
  }

  // ── Habilidade do personagem (ESPAÇO) ─────────────────────
  private useAbility(): void {
    if (this.gameOver || this.levelUpPending) return;
    if (!this.player.tryUseAbility()) return;

    Sfx.ability(this, this.player.charDef.id);
    this.events.emit('abilityUsed');

    switch (this.player.charDef.id) {
      case 'KNIGHT':  this.abilityShield(); break;
      case 'RANGER':  this.abilityDash();   break;
      case 'MAGE':    this.abilityNova();   break;
    }
  }

  // Escudo Divino — invulnerabilidade prolongada com anel dourado
  // Cada nível adiciona +0.6s de duração
  private abilityShield(): void {
    const duration = SHIELD_MS + (this.player.abilityLevel - 1) * 600;
    this.player.setInvulnerable(duration);
    this.player.shieldUntil = this.time.now + duration;
    this.cameras.main.flash(150, 212, 175, 55);
    floatingText(this, this.player.x, this.player.y - 30, '🛡️ ESCUDO DIVINO', '#ffd700', 14);
  }

  // Dash Sombrio — avanço rápido com rastro fantasma
  // A partir do nv.2 dana inimigos atravessados
  private abilityDash(): void {
    this.dashHit.clear();
    this.player.startDash(DASH_MS + (this.player.abilityLevel - 1) * 25);

    // Rastro de imagens fantasma
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 45, () => {
        const ghost = this.add.image(this.player.x, this.player.y, this.player.texture.key)
          .setFlipX(this.player.flipX)
          .setAlpha(0.45)
          .setTint(0x44ff88)
          .setDepth(9);
        this.tweens.add({
          targets: ghost,
          alpha: 0,
          duration: 280,
          onComplete: () => ghost.destroy(),
        });
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SUPREMAS (Q) — carregam a cada 3 minutos
  // ═══════════════════════════════════════════════════════════
  private useUltimate(): void {
    if (this.gameOver || this.levelUpPending) return;
    if (!this.player.tryUseUltimate()) return;

    Sfx.ultimate(this, this.player.charDef.id);
    this.events.emit('waveMessage', `${this.player.charDef.ultimate.icon} ${this.player.charDef.ultimate.name.toUpperCase()}!`);

    switch (this.player.charDef.id) {
      case 'KNIGHT': this.ultSwordRain();  break;
      case 'RANGER': this.ultArrowStorm(); break;
      case 'MAGE':   this.ultBlackHole();  break;
    }
  }

  // ── Julgamento Celestial: espadas gigantes caem do céu ────
  private ultSwordRain(): void {
    this.cameras.main.flash(300, 255, 230, 120);
    const cam = this.cameras.main;
    const mult = this.player.stats.damageMult;

    this.time.addEvent({
      delay: 160,
      repeat: 13,
      callback: () => {
        // Alvo: inimigo vivo na tela, senão ponto aleatório visível
        const visible = this.enemyGroup.getChildren().filter(obj => {
          const e = obj as Enemy;
          return e.alive && e.active && cam.worldView.contains(e.x, e.y);
        }) as Enemy[];

        const target = visible.length > 0
          ? Phaser.Utils.Array.GetRandom(visible)
          : null;
        const tx = target ? target.x : cam.worldView.x + Math.random() * cam.worldView.width;
        const ty = target ? target.y : cam.worldView.y + Math.random() * cam.worldView.height;

        const sword = this.add.image(tx, ty - 460, 'proj_sword')
          .setDepth(16)
          .setScale(2.8)
          .setRotation(Math.PI)
          .setTint(0xffe066)
          .setAlpha(0.95);

        this.tweens.add({
          targets: sword,
          y: ty,
          duration: 240,
          ease: 'Quad.In',
          onComplete: () => {
            // Impacto: explosão dourada em área
            const ring = this.add.circle(tx, ty, 18)
              .setStrokeStyle(5, 0xffd700, 0.95)
              .setDepth(15);
            this.tweens.add({
              targets: ring,
              radius: 95,
              alpha: 0,
              duration: 320,
              ease: 'Cubic.Out',
              onUpdate: () => ring.setStrokeStyle(5, 0xffd700, ring.alpha),
              onComplete: () => ring.destroy(),
            });

            this.cameras.main.shake(90, 0.006);

            this.enemyGroup.getChildren().forEach(obj => {
              const e = obj as Enemy;
              if (!e.alive || !e.active) return;
              if (Phaser.Math.Distance.Between(tx, ty, e.x, e.y) <= 95 + e.typeDef.r) {
                e.takeDamage(95, mult);
              }
            });

            this.tweens.add({
              targets: sword,
              alpha: 0,
              duration: 200,
              onComplete: () => sword.destroy(),
            });
          },
        });
      },
    });
  }

  // ── Tempestade de Flechas: chuva varre a tela por 3.5s ────
  private ultArrowStorm(): void {
    const cam = this.cameras.main;
    const mult = this.player.stats.damageMult;

    this.time.addEvent({
      delay: 130,
      repeat: 26,
      callback: () => {
        for (let i = 0; i < 5; i++) {
          const p = this.projGroup.get(0, 0, 'proj_arrow') as Phaser.Physics.Arcade.Sprite | null;
          if (!p) return;

          const x = cam.worldView.x + Math.random() * (cam.worldView.width + 200) - 100;
          const y = cam.worldView.y - 40;

          p.setTexture('proj_arrow');
          p.setActive(true).setVisible(true).setDepth(16);
          p.setAlpha(0.95).setScale(1.25).setTint(0x99ffcc);
          p.setData('damage', 36 * mult);
          p.setData('pierce', Infinity);

          const angle = Phaser.Math.DegToRad(72 + Math.random() * 14);
          p.setRotation(angle);

          const body = p.body as Phaser.Physics.Arcade.Body;
          body.reset(x, y);
          body.setAllowGravity(false);
          body.setGravityY(0);
          p.setAngularVelocity(0);
          p.setVelocity(Math.cos(angle) * 820, Math.sin(angle) * 820);

          this.time.delayedCall(1400, () => {
            if (p.active) {
              p.setActive(false).setVisible(false).clearTint().setScale(1);
              (p.body as Phaser.Physics.Arcade.Body).stop();
            }
          });
        }
      },
    });
  }

  // ── Buraco Negro: vórtice que suga e tritura por 5s ───────
  private ultBlackHole(): void {
    const facing = this.player.getFacing();
    const x = this.player.x + facing.x * 160;
    const y = this.player.y + facing.y * 160;
    const DURATION = 5000;

    this.blackHole = { x, y, until: this.time.now + DURATION, tick: 0 };

    // Núcleo pulsante
    const core = this.add.circle(x, y, 22, 0x05000d, 1)
      .setStrokeStyle(3, 0x9900ff, 0.9)
      .setDepth(15);
    const glow = this.add.circle(x, y, 40, 0x330066, 0.35).setDepth(14);

    this.tweens.add({
      targets: [core, glow],
      scale: 1.35,
      yoyo: true,
      repeat: -1,
      duration: 380,
      ease: 'Sine.InOut',
    });

    // Partículas em espiral sendo sugadas
    const spiralTimer = this.time.addEvent({
      delay: 70,
      loop: true,
      callback: () => {
        const a0 = Math.random() * Math.PI * 2;
        const r0 = 240 + Math.random() * 90;
        const particle = this.add.circle(
          x + Math.cos(a0) * r0,
          y + Math.sin(a0) * r0,
          Phaser.Math.Between(2, 4),
          Phaser.Utils.Array.GetRandom([0x9900ff, 0xcc66ff, 0x6600cc, 0xffffff]),
          0.85,
        ).setDepth(14);

        const spin = { t: 0 };
        this.tweens.add({
          targets: spin,
          t: 1,
          duration: 700 + Math.random() * 300,
          ease: 'Quad.In',
          onUpdate: () => {
            const r = r0 * (1 - spin.t);
            const a = a0 + spin.t * 5;
            particle.setPosition(x + Math.cos(a) * r, y + Math.sin(a) * r);
            particle.setAlpha(0.85 * (1 - spin.t * 0.5));
          },
          onComplete: () => particle.destroy(),
        });
      },
    });

    // Encerramento: implosão final
    this.time.delayedCall(DURATION, () => {
      spiralTimer.remove(false);
      this.blackHole = null;

      const mult = this.player.stats.damageMult;
      this.cameras.main.shake(350, 0.02);
      this.cameras.main.flash(250, 80, 0, 140);

      const ring = this.add.circle(x, y, 30)
        .setStrokeStyle(8, 0xcc66ff, 1)
        .setDepth(15);
      this.tweens.add({
        targets: ring,
        radius: 300,
        alpha: 0,
        duration: 450,
        ease: 'Cubic.Out',
        onUpdate: () => ring.setStrokeStyle(8, 0xcc66ff, ring.alpha),
        onComplete: () => ring.destroy(),
      });

      this.enemyGroup.getChildren().forEach(obj => {
        const e = obj as Enemy;
        if (!e.alive || !e.active) return;
        if (Phaser.Math.Distance.Between(x, y, e.x, e.y) <= 300 + e.typeDef.r) {
          e.takeDamage(120, mult);
        }
      });

      this.tweens.add({
        targets: [core, glow],
        scale: 0,
        alpha: 0,
        duration: 300,
        onComplete: () => { core.destroy(); glow.destroy(); },
      });
    });
  }

  // Sucção e dano contínuo do Buraco Negro
  private updateBlackHole(delta: number): void {
    const bh = this.blackHole;
    if (!bh) return;

    const PULL_RADIUS = 360;
    bh.tick -= delta;
    const doDamage = bh.tick <= 0;
    if (doDamage) bh.tick = 400;

    const mult = this.player.stats.damageMult;

    this.enemyGroup.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (!e.alive || !e.active) return;
      const dist = Phaser.Math.Distance.Between(bh.x, bh.y, e.x, e.y);
      if (dist > PULL_RADIUS) return;

      // Sucção: quanto mais perto, mais forte
      const angle = Phaser.Math.Angle.Between(e.x, e.y, bh.x, bh.y);
      const force = 140 + (1 - dist / PULL_RADIUS) * 260;
      e.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
      e.stunnedUntil = this.time.now + 80;

      if (doDamage && dist < 130) {
        e.takeDamage(18, mult);
      }
    });
  }

  // Dano do Dash Sombrio nv.2+ enquanto atravessa inimigos
  private updateDashDamage(): void {
    if (!this.player.isDashing() || this.player.abilityLevel < 2) return;

    const mult   = this.player.stats.damageMult;
    const damage = 20 + this.player.abilityLevel * 10;

    this.enemyGroup.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (!e.alive || !e.active || this.dashHit.has(e)) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (dist <= 34 + e.typeDef.r) {
        this.dashHit.add(e);
        e.takeDamage(damage, mult);
      }
    });
  }

  // Nova Arcana — explosão em área com knockback
  // Cada nível: +25% de dano e +25px de raio
  private abilityNova(): void {
    const { x, y } = this.player;
    const lvl    = this.player.abilityLevel;
    const radius = NOVA_RADIUS + (lvl - 1) * 25;
    const damage = NOVA_DAMAGE * (1 + 0.25 * (lvl - 1));
    const mult = this.player.stats.damageMult;

    // Onda expansiva visual
    const ring = this.add.circle(x, y, 30)
      .setStrokeStyle(6, 0x9900ff, 0.95)
      .setDepth(15);
    this.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.Out',
      onUpdate: () => ring.setStrokeStyle(6, 0x9900ff, ring.alpha),
      onComplete: () => ring.destroy(),
    });

    const flash = this.add.circle(x, y, radius, 0xcc66ff, 0.22).setDepth(14);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 350,
      onComplete: () => flash.destroy(),
    });

    this.cameras.main.shake(250, 0.014);

    // Dano + knockback em área
    this.enemyGroup.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (!e.alive || !e.active) return;
      const dist = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (dist > radius + e.typeDef.r) return;

      const died = e.takeDamage(damage, mult);
      if (died) return;

      // Empurra para longe (chefes resistem mais)
      const angle = Phaser.Math.Angle.Between(x, y, e.x, e.y);
      const force = e.typeDef.kind === 'normal' ? NOVA_KNOCKBACK : NOVA_KNOCKBACK * 0.35;
      e.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
      e.stunnedUntil = this.time.now + 350;
    });
  }

  // ── Anel do Escudo Divino ─────────────────────────────────
  private drawShield(): void {
    this.shieldGfx.clear();
    const remaining = this.player.shieldUntil - this.time.now;
    if (remaining <= 0) return;

    const pulse = 1 + Math.sin(this.time.now / 90) * 0.06;
    const alpha = Math.min(1, remaining / 500); // fade-out no fim
    this.shieldGfx.lineStyle(3, 0xffd700, 0.9 * alpha);
    this.shieldGfx.strokeCircle(this.player.x, this.player.y, 26 * pulse);
    this.shieldGfx.fillStyle(0xffd700, 0.08 * alpha);
    this.shieldGfx.fillCircle(this.player.x, this.player.y, 26 * pulse);
  }

  // ── Drops: apenas elites dourados e chefes (coloração única)
  private rollItemDrops(x: number, y: number, type: string, isElite = false): void {
    const def = CFG.ENEMY_TYPES[type];
    if (!def) return;

    let count = 0;
    if (def.kind === 'boss')         count = 2;
    else if (def.kind === 'subboss') count = 1;
    else if (isElite)                count = 1;

    const itemIds = Object.keys(CFG.ITEMS);
    for (let i = 0; i < count; i++) {
      const itemId = Phaser.Utils.Array.GetRandom(itemIds);
      const ox = x + (count > 1 ? (i === 0 ? -16 : 16) : 0);
      this.spawnItem(itemId, ox, y);
    }
  }

  private spawnItem(itemId: string, x: number, y: number): void {
    const def = CFG.ITEMS[itemId];
    if (!def) return;

    const item = this.itemGroup.get(x, y, def.texture) as Phaser.Physics.Arcade.Sprite | null;
    if (!item) return;

    this.tweens.killTweensOf(item);
    item.setTexture(def.texture);
    item.setData('itemId', itemId);
    item.setActive(true).setVisible(true).setDepth(4).setAlpha(1);
    (item.body as Phaser.Physics.Arcade.Body).reset(x, y);

    // Balanço sutil para chamar atenção
    this.tweens.add({
      targets: item,
      y: y - 5,
      yoyo: true,
      repeat: -1,
      duration: 600,
      ease: 'Sine.InOut',
    });
  }

  // ── Olho Maldito: dispara projéteis à distância ───────────
  private updateShooters(): void {
    const now = this.time.now;

    this.enemyGroup.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (!e.alive || !e.active || e.typeName !== 'SHOOTER') return;
      if (now < e.nextShotAt) return;

      const dist = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (dist > 560) return;

      e.nextShotAt = now + 2400 + Math.random() * 800;

      // Telegraph: o olho brilha antes de disparar
      e.setTint(0x99ffff);
      this.time.delayedCall(280, () => {
        if (!e.alive || !e.active) return;
        e.restoreTint();

        const bolt = this.enemyProjGroup.get(e.x, e.y, 'proj_dark') as Phaser.Physics.Arcade.Sprite | null;
        if (!bolt) return;

        bolt.setTexture('proj_dark');
        bolt.setActive(true).setVisible(true).setDepth(7).setAlpha(1).setScale(e.isElite ? 1.4 : 1);
        bolt.setData('damage', e.contactDamage);

        const body = bolt.body as Phaser.Physics.Arcade.Body;
        body.reset(e.x, e.y);
        body.setAllowGravity(false);

        const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
        bolt.setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);

        this.time.delayedCall(2600, () => {
          if (bolt.active) {
            bolt.setActive(false).setVisible(false);
            (bolt.body as Phaser.Physics.Arcade.Body).stop();
          }
        });
      });
    });
  }

  // ── Chefes/subchefes: ataque com área telegrafada ─────────
  private updateSpecialAttacks(): void {
    const now = this.time.now;

    this.enemyGroup.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (!e.alive || !e.active || e.casting) return;
      if (e.typeDef.kind === 'normal') return;
      if (now < e.nextSlamAt) return;

      const dist = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (dist > 520) return;

      this.startTelegraphedSlam(e);
    });
  }

  private startTelegraphedSlam(e: Enemy): void {
    const isBoss = e.typeDef.kind === 'boss';
    const radius = isBoss ? 150 : 105;
    const WINDUP = 950;

    // Mira na posição ATUAL do jogador — dá tempo de fugir
    const tx = this.player.x;
    const ty = this.player.y;

    e.casting = true;
    e.stunnedUntil = this.time.now + WINDUP;
    e.setVelocity(0, 0);
    e.setTint(0xff5544);

    // Zona vermelha pulsante no chão
    const zone = this.add.circle(tx, ty, radius, 0xcc0000, 0.16)
      .setStrokeStyle(2.5, 0xff3322, 0.9)
      .setDepth(4);

    this.tweens.add({
      targets: zone,
      alpha: 0.55,
      yoyo: true,
      repeat: -1,
      duration: 200,
    });

    // Anel que encolhe marcando o tempo do impacto
    const shrink = this.add.circle(tx, ty, radius * 1.6)
      .setStrokeStyle(2, 0xffaa00, 0.8)
      .setDepth(4);
    this.tweens.add({
      targets: shrink,
      radius: radius,
      duration: WINDUP,
      ease: 'Linear',
      onUpdate: () => shrink.setStrokeStyle(2, 0xffaa00, 0.8),
    });

    this.time.delayedCall(WINDUP, () => {
      this.tweens.killTweensOf(zone);
      zone.destroy();
      shrink.destroy();

      if (!e.alive || !e.active) return;

      e.casting = false;
      e.restoreTint();
      e.nextSlamAt = this.time.now + 5200 + Math.random() * 1800;

      // Impacto: onda de choque + estilhaços
      Sfx.specialSpawn(this, 'subboss');
      this.cameras.main.shake(220, 0.012);

      const ring = this.add.circle(tx, ty, 20)
        .setStrokeStyle(6, 0xff5533, 0.95)
        .setDepth(15);
      this.tweens.add({
        targets: ring,
        radius: radius,
        alpha: 0,
        duration: 300,
        ease: 'Cubic.Out',
        onUpdate: () => ring.setStrokeStyle(6, 0xff5533, ring.alpha),
        onComplete: () => ring.destroy(),
      });

      for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10;
        const shard = this.add.rectangle(tx, ty, 4, 4, 0xff7744).setDepth(15);
        this.tweens.add({
          targets: shard,
          x: tx + Math.cos(a) * radius * 0.9,
          y: ty + Math.sin(a) * radius * 0.9,
          alpha: 0,
          duration: 350,
          onComplete: () => shard.destroy(),
        });
      }

      // Dano se o jogador permaneceu na zona
      const pd = Phaser.Math.Distance.Between(this.player.x, this.player.y, tx, ty);
      if (pd <= radius + 14) {
        this.player.takeDamage(Math.round(e.typeDef.dmg * 1.25));
      }
    });
  }

  // ── FX dos buffs: Fúria (chamas) e Pressa (rastro) ────────
  private updateBuffFx(delta: number): void {
    if (this.player.hasBuff('FURY')) {
      this.furyFxTimer -= delta;
      if (this.furyFxTimer <= 0) {
        this.furyFxTimer = 90;
        const fx = Phaser.Math.FloatBetween(-12, 12);
        const flame = this.add.circle(
          this.player.x + fx,
          this.player.y + 6,
          Phaser.Math.Between(2, 4),
          Phaser.Utils.Array.GetRandom([0xff4422, 0xff8833, 0xffcc44]),
          0.85,
        ).setDepth(11);

        this.tweens.add({
          targets: flame,
          y: flame.y - Phaser.Math.Between(22, 36),
          alpha: 0,
          scale: 0.3,
          duration: 420,
          ease: 'Cubic.Out',
          onComplete: () => flame.destroy(),
        });
      }
    }

    if (this.player.hasBuff('HASTE')) {
      this.hasteFxTimer -= delta;
      if (this.hasteFxTimer <= 0) {
        this.hasteFxTimer = 120;
        const ghost = this.add.image(this.player.x, this.player.y, this.player.texture.key)
          .setFlipX(this.player.flipX)
          .setAlpha(0.35)
          .setTint(0x44ee88)
          .setDepth(9);
        this.tweens.add({
          targets: ghost,
          alpha: 0,
          duration: 260,
          onComplete: () => ghost.destroy(),
        });
      }
    }
  }

  // ── Poeira ambiente (atmosfera da masmorra) ───────────────
  private spawnAmbientDust(): void {
    for (let i = 0; i < 16; i++) {
      const size = Phaser.Math.Between(1, 2);
      const dust = this.add.circle(
        Phaser.Math.Between(0, CFG.WIDTH),
        Phaser.Math.Between(0, CFG.HEIGHT),
        size,
        0x9988bb,
        Phaser.Math.FloatBetween(0.10, 0.25),
      ).setScrollFactor(0).setDepth(24);

      const drift = () => {
        dust.setPosition(Phaser.Math.Between(0, CFG.WIDTH), CFG.HEIGHT + 8);
        this.tweens.add({
          targets: dust,
          y: -10,
          x: dust.x + Phaser.Math.Between(-80, 80),
          duration: Phaser.Math.Between(9000, 16000),
          ease: 'Linear',
          onComplete: drift,
        });
      };

      // Primeira subida parte da posição inicial aleatória
      this.tweens.add({
        targets: dust,
        y: -10,
        x: dust.x + Phaser.Math.Between(-60, 60),
        duration: Phaser.Math.Between(5000, 14000),
        ease: 'Linear',
        onComplete: drift,
      });
    }
  }

  // ── Efeitos dos itens ─────────────────────────────────────
  private applyItemEffect(itemId: string, x: number, y: number): void {
    const def = CFG.ITEMS[itemId];

    // Registra para o painel de itens do HUD
    const total = (this.itemsCollected.get(itemId) ?? 0) + 1;
    this.itemsCollected.set(itemId, total);
    this.events.emit('itemCollected', itemId, total);
    const announce = (color: string) =>
      floatingText(this, x, y - 14, `${def.icon} ${def.name}`, color, 13);

    switch (itemId) {
      case 'POTION':
        this.player.heal(POTION_HEAL);
        Sfx.heal(this);
        announce('#ff5577');
        break;

      case 'MAGNET':
        this.xpGroup.getChildren().forEach(obj => (obj as XPOrb).forceAttract());
        Sfx.itemPickup(this);
        announce('#33ddff');
        break;

      case 'BOMB':
        this.explodeBomb(x, y);
        announce('#cc88ff');
        break;

      case 'FURY':
        this.player.applyTimedBuff(
          'FURY',
          BUFF_MS,
          () => { this.player.stats.damageMult *= 1.5; },
          () => { this.player.stats.damageMult /= 1.5; },
        );
        Sfx.itemPickup(this);
        announce('#ff6644');
        break;

      case 'HASTE':
        this.player.applyTimedBuff(
          'HASTE',
          BUFF_MS,
          () => { this.player.stats.speed *= 1.4; },
          () => { this.player.stats.speed /= 1.4; },
        );
        Sfx.itemPickup(this);
        announce('#44ee88');
        break;
    }
  }

  // Bomba Sombria — explosão em área ao redor do ponto de coleta
  private explodeBomb(x: number, y: number): void {
    Sfx.bombExplode(this);
    this.cameras.main.shake(300, 0.018);
    this.cameras.main.flash(200, 120, 60, 200);

    const ring = this.add.circle(x, y, 40)
      .setStrokeStyle(8, 0xcc66ff, 0.95)
      .setDepth(15);
    this.tweens.add({
      targets: ring,
      radius: BOMB_RADIUS,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.Out',
      onUpdate: () => ring.setStrokeStyle(8, 0xcc66ff, ring.alpha),
      onComplete: () => ring.destroy(),
    });

    const mult = this.player.stats.damageMult;
    this.enemyGroup.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (!e.alive || !e.active) return;
      const dist = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (dist <= BOMB_RADIUS + e.typeDef.r) {
        e.takeDamage(BOMB_DAMAGE, mult);
      }
    });
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

  // ── Cria nova arma ou aprimora a existente ───────────────
  private addOrUpgradeWeapon(id: string): void {
    CollectionTracker.addWeapon(id);

    const existing = this.player.getWeapon(id);
    if (existing) { existing.upgrade(); return; }

    let weapon: Weapon;
    switch (id) {
      case 'WEAPON_SWORD':     weapon = new Sword(this, this.player);      break;
      case 'WEAPON_SPIN':      weapon = new SpinBlades(this, this.player); break;
      case 'WEAPON_AXE':       weapon = new Axe(this, this.player);        break;
      case 'WEAPON_ARROW':     weapon = new Arrow(this, this.player);      break;
      case 'WEAPON_KNIFE':     weapon = new Knife(this, this.player);      break;
      case 'WEAPON_BOOMERANG': weapon = new Boomerang(this, this.player);  break;
      case 'WEAPON_ORB':       weapon = new MagicOrb(this, this.player);   break;
      case 'WEAPON_LIGHTNING': weapon = new Lightning(this, this.player);  break;
      default:                 weapon = new Aura(this, this.player);       break;
    }

    weapon.applySpeedMult(this.player.stats.cooldownMult);
    this.player.addWeapon(weapon);
  }

  // ── Aplica upgrade (RF11, RF12) ──────────────────────────
  private applyUpgrade(id: string): void {
    this.levelUpPending = false;
    Sfx.upgradeChoose(this);

    if (id.startsWith('WEAPON_')) {
      this.addOrUpgradeWeapon(id);
      return;
    }

    if (id === 'ABILITY') {
      CollectionTracker.addUpgrade(id);
      this.player.upgradeAbility();
      const ab = this.player.charDef.ability;
      floatingText(
        this,
        this.player.x,
        this.player.y - 30,
        `${ab.icon} ${ab.name} Nv.${this.player.abilityLevel}`,
        '#66ddff',
        14,
      );
      return;
    }

    CollectionTracker.addUpgrade(id);
    this.player.applyUpgrade(id);
  }

  // ═══════════════════════════════════════════════════════════
  //  BATTLE ROYALE
  // ═══════════════════════════════════════════════════════════
  private setupRoyale(): void {
    const code = this.roomCode!;
    const myId = auth.currentUser?.uid;

    this.remoteGroup = this.physics.add.group({ maxSize: 16 });

    // Zona desenhada no mundo + alerta vermelho fora dela
    this.zoneGfx = this.add.graphics().setDepth(6);
    this.outsideOverlay = this.add
      .rectangle(0, 0, CFG.WIDTH, CFG.HEIGHT, 0xcc0000, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(26);

    // Projétil atinge outro jogador (PvP)
    this.physics.add.overlap(
      this.projGroup,
      this.remoteGroup,
      (proj, obj) => {
        const p = proj as Phaser.Physics.Arcade.Sprite;
        const r = obj  as Phaser.Physics.Arcade.Sprite;
        if (!p.active || !r.active || !this.arenaActive) return;

        const uid = r.getData('uid') as string;
        const dmg = Math.round((p.getData('damage') as number) ?? 10);
        void sendHit(code, uid, dmg);
        floatingText(this, r.x, r.y - 20, `-${dmg}`, '#ff8866', 12);

        const pierce = (p.getData('pierce') as number) ?? 0;
        if (pierce > 0) {
          if (pierce !== Infinity) p.setData('pierce', pierce - 1);
        } else {
          p.setActive(false).setVisible(false);
          (p.body as Phaser.Physics.Arcade.Body).stop();
        }
      },
    );

    // Contato corpo a corpo entre jogadores
    this.physics.add.overlap(
      this.player,
      this.remoteGroup,
      (_p, obj) => {
        const r = obj as Phaser.Physics.Arcade.Sprite;
        if (!r.active || !this.arenaActive) return;
        const uid  = r.getData('uid') as string;
        const now  = this.time.now;
        const last = this.lastContactHit.get(uid) ?? -Infinity;
        if (now - last < CONTACT_PVP_CD_MS) return;
        this.lastContactHit.set(uid, now);
        void sendHit(code, uid, CONTACT_PVP_DMG);
      },
    );

    // Estado da sala
    this.roomUnsubs.push(listenRoom(code, room => {
      this.roomData = room;
      if (!room) return;

      if (room.status === 'finished' && !this.finishedHandled) {
        this.finishedHandled = true;
        const won = room.winnerUid === myId;
        this.gameOver = true;
        this.events.emit('royaleFinished', won, room.winnerName ?? 'Desconhecido');
      }
    }));

    // Estado dos outros jogadores
    this.roomUnsubs.push(listenPlayers(code, players => {
      this.roomPlayers = players;
      this.syncRemoteSprites(players);
      this.checkVictory(players);
    }));

    // Dano PvP recebido
    this.roomUnsubs.push(listenMyHits(code, hit => {
      if (!this.player.alive || this.finishedHandled) return;
      this.lastDamageFrom = { uid: hit.fromUid, name: hit.fromName };
      this.cameras.main.shake(120, 0.008);
      this.player.applyTrueDamage(hit.dmg);
    }));

    // Limpeza ao sair da cena
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.roomUnsubs.forEach(u => u());
      this.roomUnsubs = [];
      void leaveRoom();
    });
  }

  // ── Loop do royale ────────────────────────────────────────
  private updateRoyale(delta: number): void {
    const room = this.roomData;
    if (!room || !this.roomCode) return;

    // Sincroniza o próprio estado
    this.syncTimer -= delta;
    if (this.syncTimer <= 0) {
      this.syncTimer = SYNC_INTERVAL_MS;
      pushMyState(this.roomCode, {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        hp: Math.ceil(this.player.stats.hp),
        maxHp: this.player.stats.maxHp,
        level: this.player.level,
        alive: this.player.alive,
      });
    }

    // Interpola os jogadores remotos
    this.remoteSprites.forEach((sprite, uid) => {
      if (!sprite.visible) return;
      const tx = (sprite.getData('tx') as number) ?? sprite.x;
      const ty = (sprite.getData('ty') as number) ?? sprite.y;
      sprite.x += (tx - sprite.x) * 0.18;
      sprite.y += (ty - sprite.y) * 0.18;
      const label = this.remoteLabels.get(uid);
      label?.setPosition(sprite.x, sprite.y - 26);
    });

    // ── Fase de preparação ────────────────────────────────
    if (room.status === 'prep' && room.prepStartMs) {
      const elapsed   = (Date.now() - room.prepStartMs) / 1000;
      const remaining = Math.max(0, room.prepSeconds - elapsed);
      this.events.emit('royalePhase', 'prep', remaining, this.countAlive());

      const isHost  = room.hostUid === auth.currentUser?.uid;
      const overdue = elapsed - room.prepSeconds;

      // Líder abre a arena (qualquer um assume após 8s de atraso)
      if (!this.arenaRequested && (isHost ? overdue >= 0 : overdue >= 8)) {
        this.arenaRequested = true;
        void startArena(this.roomCode, generateZones());
      }
      return;
    }

    // ── Fase de arena ─────────────────────────────────────
    if (room.status !== 'arena' || !room.arenaStartMs) return;

    if (!this.arenaActive) this.enterArena(room);

    const elapsed = (Date.now() - room.arenaStartMs) / 1000;
    const { current, target } = getZoneAt(room.zones, elapsed);

    this.drawZone(current, target);
    this.applyZoneDamage(delta, current);
    this.updateAuraPvp(delta);

    this.events.emit('royalePhase', 'arena', 0, this.countAlive());
    this.events.emit('minimapState', {
      world: CFG.WORLD,
      me: { x: this.player.x, y: this.player.y, alive: this.player.alive },
      others: this.roomPlayers
        .filter(p => p.uid !== auth.currentUser?.uid && p.alive)
        .map(p => ({ x: p.x, y: p.y })),
      current,
      target,
    });
  }

  // ── Entrada na arena compartilhada ────────────────────────
  private enterArena(room: RoomData): void {
    this.arenaActive = true;

    // Limpa o mapa de preparação (inimigos, gemas, itens)
    this.enemyGroup.getChildren().forEach(obj => {
      const e = obj as Enemy;
      if (!e.active) return;
      e.alive = false;
      e.setVelocity(0, 0).setActive(false).setVisible(false);
      (e.body as Phaser.Physics.Arcade.Body).stop();
    });
    [this.xpGroup, this.itemGroup, this.projGroup, this.enemyProjGroup].forEach(group =>
      group.getChildren().forEach(obj => {
        const s = obj as Phaser.Physics.Arcade.Sprite;
        if (!s.active) return;
        this.tweens.killTweensOf(s);
        s.setActive(false).setVisible(false);
        (s.body as Phaser.Physics.Arcade.Body).stop();
      }),
    );

    // Posição de largada: espalhados pela borda do primeiro círculo
    const uids = this.roomPlayers.map(p => p.uid).sort();
    const idx  = Math.max(0, uids.indexOf(auth.currentUser?.uid ?? ''));
    const total = Math.max(1, uids.length);
    const z0 = room.zones[0] ?? { x: CFG.WORLD / 2, y: CFG.WORLD / 2, r: CFG.WORLD * 0.5, t: 0 };
    const angle = (idx / total) * Math.PI * 2;
    const px = z0.x + Math.cos(angle) * z0.r * 0.5;
    const py = z0.y + Math.sin(angle) * z0.r * 0.5;

    (this.player.body as Phaser.Physics.Arcade.Body).reset(px, py);
    this.player.heal(this.player.stats.maxHp);

    Sfx.specialSpawn(this, 'boss', 'BOSS');
    this.cameras.main.flash(400, 130, 60, 220);
    this.events.emit('waveMessage', '⚔ A ARENA FOI ABERTA — ÚLTIMO VIVO VENCE!');
  }

  // ── Zona: desenho do círculo atual e do próximo ───────────
  private drawZone(
    current: { x: number; y: number; r: number },
    target: { x: number; y: number; r: number } | null,
  ): void {
    if (!this.zoneGfx) return;
    this.zoneGfx.clear();

    // Círculo atual (azul tempestade)
    this.zoneGfx.lineStyle(4, 0x55aaff, 0.85);
    this.zoneGfx.strokeCircle(current.x, current.y, current.r);
    this.zoneGfx.lineStyle(10, 0x2255cc, 0.18);
    this.zoneGfx.strokeCircle(current.x, current.y, current.r + 7);

    // Próximo círculo-alvo (dourado)
    if (target) {
      this.zoneGfx.lineStyle(2, 0xffd700, 0.45);
      this.zoneGfx.strokeCircle(target.x, target.y, target.r);
    }
  }

  // ── Dano por estar fora da zona ───────────────────────────
  private applyZoneDamage(delta: number, current: { x: number; y: number; r: number }): void {
    const dist    = Phaser.Math.Distance.Between(this.player.x, this.player.y, current.x, current.y);
    const outside = dist > current.r;

    if (this.outsideOverlay) {
      const pulse = 0.10 + Math.abs(Math.sin(this.time.now / 300)) * 0.08;
      this.outsideOverlay.setFillStyle(0xcc0000, outside ? pulse : 0);
    }

    if (!outside || !this.player.alive) {
      this.zoneTickTimer = 0;
      return;
    }

    this.zoneTickTimer -= delta;
    if (this.zoneTickTimer <= 0) {
      this.zoneTickTimer = ZONE_TICK_MS;
      // Quanto menor a zona, maior o dano
      const dmg = 3 + Math.floor((CFG.WORLD * 0.7 - current.r) / 400);
      this.lastDamageFrom = null; // morte pela zona não dá kill
      this.player.applyTrueDamage(dmg);
      floatingText(this, this.player.x, this.player.y - 24, `-${dmg} ☠`, '#ff4444', 12);
    }
  }

  // ── Aura também acerta jogadores na arena ─────────────────
  private updateAuraPvp(delta: number): void {
    if (!this.arenaActive || !this.roomCode) return;
    const aura = this.player.getWeapon('WEAPON_AURA') as Aura | undefined;
    if (!aura) return;

    this.auraPvpTimer -= delta;
    if (this.auraPvpTimer > 0) return;
    this.auraPvpTimer = aura.cooldownMs;

    const radius = aura.getRadius();
    const dmg = Math.round(aura.damage * this.player.stats.damageMult);

    this.remoteSprites.forEach((sprite, uid) => {
      if (!sprite.visible) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
      if (dist <= radius + 16) {
        void sendHit(this.roomCode!, uid, dmg);
        floatingText(this, sprite.x, sprite.y - 20, `-${dmg}`, '#ff8866', 12);
      }
    });
  }

  // ── Sprites dos jogadores remotos ─────────────────────────
  private syncRemoteSprites(players: RoomPlayer[]): void {
    const myId = auth.currentUser?.uid;

    players.forEach(p => {
      if (p.uid === myId) return;

      let sprite = this.remoteSprites.get(p.uid);

      if (!sprite) {
        const def = CFG.CHARACTERS[p.charId] ?? CFG.CHARACTERS['KNIGHT'];
        sprite = this.remoteGroup.get(p.x, p.y, def.texture) as Phaser.Physics.Arcade.Sprite | null ?? undefined;
        if (!sprite) return;

        sprite.setDepth(9);
        sprite.setData('uid', p.uid);
        (sprite.body as Phaser.Physics.Arcade.Body).setCircle(13, 1, 1);

        const label = this.add.text(p.x, p.y - 26, p.username, {
          fontSize: '10px',
          color: '#ff9999',
          fontFamily: 'Cinzel, Georgia, serif',
          stroke: '#000',
          strokeThickness: 3,
        }).setOrigin(0.5).setDepth(21);

        this.remoteSprites.set(p.uid, sprite);
        this.remoteLabels.set(p.uid, label);
      }

      sprite.setData('tx', p.x);
      sprite.setData('ty', p.y);

      // Visível apenas na arena (na preparação cada um está "no seu mapa")
      const show = this.arenaActive && p.alive;
      const wasVisible = sprite.visible;
      sprite.setActive(show).setVisible(show);
      (sprite.body as Phaser.Physics.Arcade.Body).enable = show;
      this.remoteLabels.get(p.uid)?.setVisible(show);

      // Acabou de morrer na arena → partículas
      if (wasVisible && !p.alive && this.arenaActive) {
        this.spawnDeathParticles(sprite.x, sprite.y, 'COMMON');
        this.events.emit('waveMessage', `💀 ${p.username} foi eliminado!`);
      }

      // Primeira aparição na arena: posiciona direto no destino
      if (show && !wasVisible) {
        sprite.setPosition(p.x, p.y);
        (sprite.body as Phaser.Physics.Arcade.Body).reset(p.x, p.y);
      }
    });
  }

  // ── Vitória: último vivo ──────────────────────────────────
  private checkVictory(players: RoomPlayer[]): void {
    if (!this.arenaActive || this.finishedHandled || !this.roomCode) return;
    const myId = auth.currentUser?.uid;
    if (!myId || !this.player.alive) return;

    const others = players.filter(p => p.uid !== myId);
    if (players.length > 1 && others.length > 0 && others.every(p => !p.alive)) {
      this.finishedHandled = true;
      const me = players.find(p => p.uid === myId);
      void finishRoom(this.roomCode, myId, me?.username ?? 'Vencedor');
      this.events.emit('royaleFinished', true, me?.username ?? 'Você');
      this.gameOver = true;
    }
  }

  private countAlive(): number {
    return this.roomPlayers.filter(p => p.alive).length;
  }

  // ── Morte no royale: avisa a sala e dá o abate ────────────
  private handleRoyaleDeath(): void {
    if (!this.royale || !this.roomCode) return;

    pushMyState(this.roomCode, { alive: false, hp: 0 });

    if (this.lastDamageFrom) {
      awardKill(this.roomCode, this.lastDamageFrom.uid);
      this.events.emit('waveMessage', `💀 Você foi eliminado por ${this.lastDamageFrom.name}`);
    }
  }

  // ── 3 upgrades aleatórios (RF10) — pool exclusivo da classe
  private getRandomUpgrades(count: number) {
    const pool = [...CFG.UPGRADES];

    // Armas da classe (estilo Vampire Survivors)
    this.player.charDef.weapons.forEach(id => {
      const info = CFG.WEAPON_INFO[id];
      if (!info) return;

      const owned = this.player.getWeapon(id);
      if (!owned) {
        pool.push({ id, label: info.label, desc: `NOVA ARMA: ${info.desc}` });
        return;
      }
      if (owned.evolved) return; // arma evoluída não sobe mais

      const nextLevel = owned.level + 1;
      const willEvolve = nextLevel >= CFG.WEAPON_EVOLVE_LEVEL;
      pool.push({
        id,
        label: owned.displayName,
        desc: willEvolve
          ? `⭐ EVOLUI para ${info.evolvedName}: ${info.evolvedDesc}`
          : `Aprimora para nível ${nextLevel}`,
      });
    });

    // Habilidade do personagem entra no sorteio
    const ab = this.player.charDef.ability;
    pool.push({
      id: 'ABILITY',
      label: `${ab.icon} ${ab.name}`,
      desc: `Nv.${this.player.abilityLevel} → ${this.player.abilityLevel + 1}: ${ab.upgradeDesc}`,
    });

    Phaser.Utils.Array.Shuffle(pool);
    return pool.slice(0, count);
  }
}
