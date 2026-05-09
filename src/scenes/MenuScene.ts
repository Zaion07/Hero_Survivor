import Phaser from 'phaser';
import { CFG } from '../config';
import { CollectionTracker } from '../utils/CollectionTracker';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  MenuScene — Tela inicial com bestiário e arsenal
// =============================================================

const MONSTERS = Object.entries(CFG.ENEMY_TYPES).map(([type, def]) => ({
  key: `enemy_${type}`,
  name: def.name,
  type,
  size: def.r * 2,
}));

type ArsenalItem = { id: string; icon: string; name: string; kind: 'weapon' | 'upgrade' };

const ARSENAL: ArsenalItem[] = [
  { id: 'WEAPON_AURA',   icon: '🌀', name: 'Aura Mágica', kind: 'weapon'  },
  { id: 'WEAPON_ORB',    icon: '🔮', name: 'Orbe Mágico', kind: 'weapon'  },
  { id: 'WEAPON_ARROW',  icon: '🏹', name: 'Flechas',     kind: 'weapon'  },
  { id: 'MAX_HP',        icon: '❤️', name: 'Vida',        kind: 'upgrade' },
  { id: 'SPEED',         icon: '💨', name: 'Velocidade',  kind: 'upgrade' },
  { id: 'DAMAGE',        icon: '⚔️', name: 'Dano',        kind: 'upgrade' },
  { id: 'PICKUP_RADIUS', icon: '🧲', name: 'Magnetismo',  kind: 'upgrade' },
  { id: 'COOLDOWN',      icon: '⚡', name: 'Cadência',    kind: 'upgrade' },
];

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'Menu' }); }

  create(): void {
    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;

    // ── Fundo: tile de pedra + overlay escuro ─────────────
    this.add.tileSprite(0, 0, W, H, 'bg_tile').setOrigin(0).setDepth(0);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(1);

    // ── Título ────────────────────────────────────────────
    this.buildTitle(W);

    // ── Separador ornamental ──────────────────────────────
    this.buildDivider(W, 102);

    // ── Bestiário ─────────────────────────────────────────
    this.buildBestiary(W);

    // ── Separador ─────────────────────────────────────────
    this.buildDivider(W, 284);

    // ── Arsenal ───────────────────────────────────────────
    this.buildArsenal(W);

    // ── Separador ─────────────────────────────────────────
    this.buildDivider(W, 442);

    // ── Botão jogar ───────────────────────────────────────
    this.buildPlayButton(W, H);

    // ── Dica de controles ─────────────────────────────────
    this.add.text(W / 2, H - 14, 'WASD / Setas: Mover  •  1 2 3: Escolher Melhoria  •  R: Menu', {
      fontSize: '10px', color: '#333355',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10);
  }

  // ── Título principal ─────────────────────────────────────
  private buildTitle(W: number): void {
    this.add.text(W / 2, 24, '☠  DUNGEON OF ETERNITY  ☠', {
      fontSize: '34px', color: '#d4af37',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(W / 2, 70, 'Sobreviva às hordas das trevas eternas', {
      fontSize: '13px', color: '#6a6a8a',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10);
  }

  // ── Linha separadora com losangos ────────────────────────
  private buildDivider(W: number, y: number): void {
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(1, 0x3a1a55, 0.8);
    g.lineBetween(50, y, W - 50, y);
    g.fillStyle(0xd4af37, 0.7);
    [W / 2, 100, W - 100].forEach(x => {
      g.fillPoints([
        { x, y: y - 5 }, { x: x + 4, y },
        { x, y: y + 5 }, { x: x - 4, y },
      ], true);
    });
  }

  // ── Bestiário ─────────────────────────────────────────────
  private buildBestiary(W: number): void {
    this.add.text(W / 2, 112, '✦  BESTIÁRIO  ✦', {
      fontSize: '14px', color: '#9070b0',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    const cardW = 100, cardH = 148, gap = 8;
    const totalW = MONSTERS.length * cardW + (MONSTERS.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const startY = 128;

    MONSTERS.forEach((m, i) => {
      const discovered = CollectionTracker.hasMonster(m.type);
      this.buildMonsterCard(startX + i * (cardW + gap), startY, cardW, cardH, m, discovered);
    });
  }

  private buildMonsterCard(
    x: number, y: number,
    w: number, h: number,
    monster: { key: string; name: string; type: string; size: number },
    discovered: boolean,
  ): void {
    const cx = x + w / 2;
    const borderColor = discovered ? 0xd4af37 : 0x1e1e30;
    const borderAlpha = discovered ? 0.85 : 0.6;

    // Fundo
    const bg = this.add.graphics().setDepth(6);
    bg.fillStyle(0x060612, 1);
    bg.fillRect(x, y, w, h);
    if (discovered) {
      bg.fillStyle(0x12083a, 1);
      bg.fillRect(x, y, w, h / 3);
    }
    bg.lineStyle(1.5, borderColor, borderAlpha);
    bg.strokeRect(x, y, w, h);
    // Cantos decorativos (só se descoberto)
    if (discovered) {
      bg.lineStyle(1, 0xd4af37, 0.5);
      const cs = 8;
      [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]].forEach(([bx, by]) => {
        const sx = bx === x ? 1 : -1;
        const sy = by === y ? 1 : -1;
        bg.lineBetween(bx, by, bx + sx * cs, by);
        bg.lineBetween(bx, by, bx, by + sy * cs);
      });
    }

    // Sprite (ou silhueta)
    const imgY = y + 66;
    const maxPx = 70;
    const scale = Math.min(maxPx / monster.size, 1.8);
    const img = this.add.image(cx, imgY, monster.key)
      .setScale(scale)
      .setDepth(7);

    if (!discovered) {
      img.setTint(0x0a0a14).setAlpha(0.45);
    }

    // Nome ou ???
    this.add.text(cx, y + h - 38, discovered ? monster.name : '???', {
      fontSize: '11px',
      color: discovered ? '#d4af37' : '#2a2a44',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(8);

    if (discovered) {
      const def = CFG.ENEMY_TYPES[monster.type];
      this.add.text(cx, y + h - 22, `HP ${def.hp}  ·  XP ${def.xp}`, {
        fontSize: '9px', color: '#55557a',
        fontFamily: 'Cinzel, Georgia, serif',
      }).setOrigin(0.5).setDepth(8);
    } else {
      // Cadeado sutil
      this.add.text(cx, y + h - 22, '🔒', {
        fontSize: '11px',
      }).setOrigin(0.5).setAlpha(0.3).setDepth(8);
    }
  }

  // ── Arsenal: 8 ítens em 2 linhas de 4 ───────────────────
  private buildArsenal(W: number): void {
    this.add.text(W / 2, 294, '✦  ARSENAL  ✦', {
      fontSize: '14px', color: '#9070b0',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    const iconW = 100, iconH = 58, gapX = 14, gapY = 10;
    const perRow = 4;
    const rowW = perRow * iconW + (perRow - 1) * gapX;
    const startX = (W - rowW) / 2;
    const startY = 312;

    ARSENAL.forEach((item, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = startX + col * (iconW + gapX);
      const y = startY + row * (iconH + gapY);

      const discovered = item.kind === 'weapon'
        ? CollectionTracker.hasWeapon(item.id)
        : CollectionTracker.hasUpgrade(item.id);

      this.buildArsenalIcon(x, y, iconW, iconH, item, discovered);
    });
  }

  private buildArsenalIcon(
    x: number, y: number,
    w: number, h: number,
    item: ArsenalItem,
    discovered: boolean,
  ): void {
    const cx = x + w / 2;
    const bg = this.add.graphics().setDepth(6);

    bg.fillStyle(0x060612, 1);
    bg.fillRect(x, y, w, h);
    bg.lineStyle(1, discovered ? 0x5a3a80 : 0x151520, 0.9);
    bg.strokeRect(x, y, w, h);

    if (discovered) {
      // Fundo com gradiente suave
      bg.fillStyle(0x180033, 1);
      bg.fillRect(x + 1, y + 1, w - 2, h / 2);
    }

    // Ícone
    this.add.text(cx, y + 18, discovered ? item.icon : '?', {
      fontSize: discovered ? '22px' : '16px',
      color: discovered ? '#ffffff' : '#1e1e33',
    }).setOrigin(0.5).setDepth(8);

    // Label
    this.add.text(cx, y + h - 13, discovered ? item.name : '???', {
      fontSize: '9px',
      color: discovered ? '#aa88cc' : '#1e1e33',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(8);

    // Badge "arma" ou "melhoria"
    if (discovered) {
      const badge = item.kind === 'weapon' ? 'ARMA' : 'BÔNUS';
      const badgeColor = item.kind === 'weapon' ? '#4400aa' : '#003344';
      const bg2 = this.add.graphics().setDepth(7);
      bg2.fillStyle(item.kind === 'weapon' ? 0x220044 : 0x001122, 0.9);
      bg2.fillRect(x + 4, y + 3, 34, 10);
      this.add.text(x + 21, y + 8, badge, {
        fontSize: '7px', color: badgeColor,
        fontFamily: 'Cinzel, Georgia, serif',
      }).setOrigin(0.5).setDepth(9);
    }
  }

  // ── Botão "Iniciar Aventura" ──────────────────────────────
  private buildPlayButton(W: number, _H: number): void {
    const btnW = 290, btnH = 52;
    const btnX = W / 2 - btnW / 2;
    const btnY = 456;

    const bg = this.add.graphics().setDepth(10);
    const drawBtn = (hover: boolean) => {
      bg.clear();
      bg.fillStyle(hover ? 0x2d0055 : 0x150033, 1);
      bg.fillRect(btnX, btnY, btnW, btnH);
      bg.lineStyle(2.5, hover ? 0xffd700 : 0xd4af37, 1);
      bg.strokeRect(btnX, btnY, btnW, btnH);
      bg.lineStyle(1, hover ? 0xcc55ff : 0x5500aa, 0.6);
      bg.strokeRect(btnX + 4, btnY + 4, btnW - 8, btnH - 8);
    };
    drawBtn(false);

    const txt = this.add.text(W / 2, btnY + btnH / 2, '⚔  INICIAR AVENTURA  ⚔', {
      fontSize: '20px', color: '#d4af37',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(11);

    const hitbox = this.add.rectangle(W / 2, btnY + btnH / 2, btnW, btnH, 0xffffff, 0)
      .setInteractive({ useHandCursor: true }).setDepth(12);

    hitbox.on('pointerover', () => { drawBtn(true);  txt.setColor('#ffd700'); });
    hitbox.on('pointerout',  () => { drawBtn(false); txt.setColor('#d4af37'); });
    hitbox.on('pointerdown', () => this.startGame());

    // Atalhos de teclado
    this.input.keyboard!.addKey('SPACE').once('down', () => this.startGame());
    this.input.keyboard!.addKey('ENTER').once('down', () => this.startGame());

    // Pulsar sutil no texto
    this.tweens.add({
      targets: txt, alpha: 0.65,
      yoyo: true, repeat: -1,
      duration: 1200, ease: 'Sine.InOut',
    });

    // Dica de teclado abaixo do botão
    this.add.text(W / 2, btnY + btnH + 14, 'ENTER ou ESPAÇO para iniciar', {
      fontSize: '10px', color: '#333355',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10);
  }

  private startGame(): void {
    Sfx.unlock(this);
    this.cameras.main.flash(250, 212, 175, 55);
    this.time.delayedCall(180, () => this.scene.start('Game'));
  }
}
