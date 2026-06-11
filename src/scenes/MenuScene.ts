import Phaser from 'phaser';
import { CFG } from '../config';
import { CollectionTracker } from '../utils/CollectionTracker';
import { Sfx } from '../utils/Sfx';
import { getGlobalRanking, RankingPlayer } from '../services/rankingService';
import { logoutUser } from '../services/authService';
import { loadGame, clearSave, GameSave } from '../services/saveService';

// =============================================================
//  MenuScene — Tela inicial com bestiário, ranking e arsenal
// =============================================================

const MONSTERS = Object.entries(CFG.ENEMY_TYPES).map(([type, def]) => ({
  key: `enemy_${type}`,
  name: def.name,
  type,
  size: def.r * 2,
}));

type ArsenalItem = {
  id: string;
  icon: string;
  name: string;
  kind: 'weapon' | 'upgrade';
};

// Armas das classes + melhorias passivas
const ARSENAL: ArsenalItem[] = [
  ...Object.values(CFG.WEAPON_INFO).map(w => ({
    id: w.id,
    icon: w.label.split(' ')[0],
    name: w.label.split(' ').slice(1).join(' '),
    kind: 'weapon' as const,
  })),
  { id: 'MAX_HP',        icon: '❤️', name: 'Vida',        kind: 'upgrade' },
  { id: 'SPEED',         icon: '💨', name: 'Velocidade',  kind: 'upgrade' },
  { id: 'DAMAGE',        icon: '⚔️', name: 'Dano',        kind: 'upgrade' },
  { id: 'PICKUP_RADIUS', icon: '🧲', name: 'Magnetismo',  kind: 'upgrade' },
  { id: 'COOLDOWN',      icon: '⚡', name: 'Cadência',    kind: 'upgrade' },
  { id: 'REGEN',         icon: '✨', name: 'Regeneração', kind: 'upgrade' },
  { id: 'ABILITY',       icon: '⭐', name: 'Habilidade',  kind: 'upgrade' },
];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;

    this.add.tileSprite(0, 0, W, H, 'bg_tile').setOrigin(0).setDepth(0);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(1);

    this.buildTitle(W);
    this.buildLogoutButton(W);

    this.buildDivider(W, 102);

    this.buildBestiary(W);

    this.buildDivider(W, 284);

    this.buildArsenal(W);

    // Ranking agora fica ao lado do Arsenal
    this.buildRankingPanel();

    this.buildDivider(W, 442);

    this.buildPlayButton(W, H);

    void this.buildContinuePanel(W);

    this.add.text(
      W / 2,
      H - 14,
      'WASD / Setas: Mover  •  ESPAÇO: Habilidade  •  Q: Suprema  •  ESC: Pausar  •  1 2 3: Melhoria  •  R: Menu',
      {
        fontSize: '10px',
        color: '#333355',
        fontFamily: 'Cinzel, Georgia, serif',
      },
    ).setOrigin(0.5).setDepth(10);
  }

  private buildTitle(W: number): void {
    this.add.text(W / 2, 24, '☠  DUNGEON OF ETERNITY  ☠', {
      fontSize: '34px',
      color: '#d4af37',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(W / 2, 70, 'Sobreviva às hordas das trevas eternas', {
      fontSize: '13px',
      color: '#6a6a8a',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10);
  }

  private buildLogoutButton(W: number): void {
    const btnW = 120;
    const btnH = 28;
    const x = W - btnW - 18;
    const y = 18;

    const bg = this.add.graphics().setDepth(20);

    const draw = (hover: boolean) => {
      bg.clear();
      bg.fillStyle(hover ? 0x551111 : 0x240808, 0.95);
      bg.fillRect(x, y, btnW, btnH);
      bg.lineStyle(1.5, hover ? 0xff5555 : 0xaa3333, 0.9);
      bg.strokeRect(x, y, btnW, btnH);
    };

    draw(false);

    const txt = this.add.text(x + btnW / 2, y + btnH / 2, 'SAIR DA CONTA', {
      fontSize: '10px',
      color: '#ffcccc',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(21);

    const hitbox = this.add.rectangle(x + btnW / 2, y + btnH / 2, btnW, btnH, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(22);

    hitbox.on('pointerover', () => {
      draw(true);
      txt.setColor('#ffffff');
    });

    hitbox.on('pointerout', () => {
      draw(false);
      txt.setColor('#ffcccc');
    });

    hitbox.on('pointerdown', async () => {
      await logoutUser();
      window.location.reload();
    });
  }

  private buildDivider(W: number, y: number): void {
    const g = this.add.graphics().setDepth(5);

    g.lineStyle(1, 0x3a1a55, 0.8);
    g.lineBetween(50, y, W - 50, y);

    g.fillStyle(0xd4af37, 0.7);

    [W / 2, 100, W - 100].forEach((x) => {
      g.fillPoints([
        { x, y: y - 5 },
        { x: x + 4, y },
        { x, y: y + 5 },
        { x: x - 4, y },
      ], true);
    });
  }

  private buildRankingPanel(): void {
    const x = 735;
    const y = 310;
    const w = 170;
    const h = 125;

    const bg = this.add.graphics().setDepth(20);

    bg.fillStyle(0x060612, 0.96);
    bg.fillRect(x, y, w, h);

    bg.lineStyle(1.5, 0xd4af37, 0.75);
    bg.strokeRect(x, y, w, h);

    bg.lineStyle(1, 0x4a1f75, 0.75);
    bg.strokeRect(x + 4, y + 4, w - 8, h - 8);

    this.add.text(x + w / 2, y + 12, '✦ RANKING ✦', {
      fontSize: '11px',
      color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(21);

    this.add.text(x + w / 2, y + 27, 'TOP 5 GLOBAL', {
      fontSize: '8px',
      color: '#6a6a8a',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(21);

    const loadingText = this.add.text(x + w / 2, y + 72, 'Carregando...', {
      fontSize: '10px',
      color: '#777799',
      fontFamily: 'Cinzel, Georgia, serif',
      align: 'center',
    }).setOrigin(0.5).setDepth(21);

    this.loadRankingData(x, y, w, loadingText);
  }

  private async loadRankingData(
    x: number,
    y: number,
    w: number,
    loadingText: Phaser.GameObjects.Text,
  ): Promise<void> {
    try {
      const ranking = await getGlobalRanking();

      loadingText.destroy();

      if (ranking.length === 0) {
        this.add.text(x + w / 2, y + 72, 'Nenhuma\npontuação ainda', {
          fontSize: '10px',
          color: '#777799',
          fontFamily: 'Cinzel, Georgia, serif',
          align: 'center',
          lineSpacing: 4,
        }).setOrigin(0.5).setDepth(21);

        return;
      }

      ranking.slice(0, 5).forEach((player: RankingPlayer, index: number) => {
        this.buildRankingRow(player, index, x, y, w);
      });
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);

      loadingText.setText('Erro ao\ncarregar');
      loadingText.setColor('#cc4444');
    }
  }

  private buildRankingRow(
    player: RankingPlayer,
    index: number,
    x: number,
    y: number,
    w: number,
  ): void {
    const rowY = y + 42 + index * 16;

    const position = index + 1;
    const medal =
      position === 1
        ? '🥇'
        : position === 2
          ? '🥈'
          : position === 3
            ? '🥉'
            : `${position}.`;

    const username = this.limitText(player.username || 'Jogador', 9);
    const score = player.score ?? 0;

    const color =
      index === 0
        ? '#ffd700'
        : index === 1
          ? '#c0c0c0'
          : index === 2
            ? '#cd7f32'
            : '#aaaacc';

    this.add.text(x + 10, rowY, medal, {
      fontSize: '10px',
      color,
      fontFamily: 'Arial',
    }).setDepth(21);

    this.add.text(x + 36, rowY, username, {
      fontSize: '9px',
      color: '#e5e7eb',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setDepth(21);

    this.add.text(x + w - 10, rowY, `${score}`, {
      fontSize: '9px',
      color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(1, 0).setDepth(21);
  }

  private limitText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    return `${text.substring(0, maxLength)}...`;
  }

  private buildBestiary(W: number): void {
    this.add.text(W / 2, 112, '✦  BESTIÁRIO  ✦', {
      fontSize: '14px',
      color: '#9070b0',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    const cardW = 80;
    const cardH = 148;
    const gap = 5;
    const totalW = MONSTERS.length * cardW + (MONSTERS.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const startY = 128;

    MONSTERS.forEach((m, i) => {
      const discovered = CollectionTracker.hasMonster(m.type);

      this.buildMonsterCard(
        startX + i * (cardW + gap),
        startY,
        cardW,
        cardH,
        m,
        discovered,
      );
    });
  }

  private buildMonsterCard(
    x: number,
    y: number,
    w: number,
    h: number,
    monster: { key: string; name: string; type: string; size: number },
    discovered: boolean,
  ): void {
    const cx = x + w / 2;
    const borderColor = discovered ? 0xd4af37 : 0x1e1e30;
    const borderAlpha = discovered ? 0.85 : 0.6;

    const bg = this.add.graphics().setDepth(6);

    bg.fillStyle(0x060612, 1);
    bg.fillRect(x, y, w, h);

    if (discovered) {
      bg.fillStyle(0x12083a, 1);
      bg.fillRect(x, y, w, h / 3);
    }

    bg.lineStyle(1.5, borderColor, borderAlpha);
    bg.strokeRect(x, y, w, h);

    if (discovered) {
      bg.lineStyle(1, 0xd4af37, 0.5);
      const cs = 8;

      [
        [x, y],
        [x + w - 1, y],
        [x, y + h - 1],
        [x + w - 1, y + h - 1],
      ].forEach(([bx, by]) => {
        const sx = bx === x ? 1 : -1;
        const sy = by === y ? 1 : -1;

        bg.lineBetween(bx, by, bx + sx * cs, by);
        bg.lineBetween(bx, by, bx, by + sy * cs);
      });
    }

    const imgY = y + 62;
    const maxPx = 54;
    const scale = Math.min(maxPx / monster.size, 1.7);

    const img = this.add.image(cx, imgY, monster.key)
      .setScale(scale)
      .setDepth(7);

    if (!discovered) {
      img.setTint(0x0a0a14).setAlpha(0.45);
    }

    this.add.text(cx, y + h - 40, discovered ? monster.name : '???', {
      fontSize: '9px',
      color: discovered ? '#d4af37' : '#2a2a44',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 2,
      align: 'center',
      wordWrap: { width: w - 6 },
    }).setOrigin(0.5, 0).setDepth(8);

    if (discovered) {
      const def = CFG.ENEMY_TYPES[monster.type];

      this.add.text(cx, y + h - 14, `HP ${def.hp} · XP ${def.xp}`, {
        fontSize: '8px',
        color: '#55557a',
        fontFamily: 'Cinzel, Georgia, serif',
      }).setOrigin(0.5).setDepth(8);
    } else {
      this.add.text(cx, y + h - 22, '🔒', {
        fontSize: '11px',
      }).setOrigin(0.5).setAlpha(0.3).setDepth(8);
    }
  }

  private buildArsenal(W: number): void {
    this.add.text(W / 2, 294, '✦  ARSENAL  ✦', {
      fontSize: '14px',
      color: '#9070b0',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    const iconW = 84;
    const iconH = 38;
    const gapX = 10;
    const gapY = 6;
    const perRow = 6;
    const rowW = perRow * iconW + (perRow - 1) * gapX;
    const startX = (W - rowW) / 2 - 40; // desloca para não cobrir o ranking
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
    x: number,
    y: number,
    w: number,
    h: number,
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
      bg.fillStyle(0x180033, 1);
      bg.fillRect(x + 1, y + 1, w - 2, h / 2);
    }

    this.add.text(cx, y + 13, discovered ? item.icon : '?', {
      fontSize: discovered ? '14px' : '12px',
      color: discovered ? '#ffffff' : '#1e1e33',
    }).setOrigin(0.5).setDepth(8);

    this.add.text(cx, y + h - 9, discovered ? item.name : '???', {
      fontSize: '8px',
      color: discovered
        ? (item.kind === 'weapon' ? '#aa88cc' : '#7799aa')
        : '#1e1e33',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(8);
  }

  private buildPlayButton(W: number, _H: number): void {
    const btnW = 290;
    const btnH = 52;
    const btnY = 456;
    const gap  = 26;

    this.buildMenuButton(
      W / 2 - gap / 2 - btnW,
      btnY, btnW, btnH,
      '⚔  AVENTURA SOLO  ⚔',
      () => this.startGame('solo'),
    );

    this.buildMenuButton(
      W / 2 + gap / 2,
      btnY, btnW, btnH,
      '🌐  BATALHA ROYALE  🌐',
      () => this.startGame('online'),
    );

    this.input.keyboard!.addKey('SPACE').once('down', () => this.startGame('solo'));
    this.input.keyboard!.addKey('ENTER').once('down', () => this.startGame('solo'));

    this.add.text(W / 2, btnY + btnH + 14, 'ENTER ou ESPAÇO para jogar solo', {
      fontSize: '10px',
      color: '#333355',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10);
  }

  private buildMenuButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    onClick: () => void,
  ): void {
    const bg = this.add.graphics().setDepth(10);

    const drawBtn = (hover: boolean) => {
      bg.clear();

      bg.fillStyle(hover ? 0x2d0055 : 0x150033, 1);
      bg.fillRect(x, y, w, h);

      bg.lineStyle(2.5, hover ? 0xffd700 : 0xd4af37, 1);
      bg.strokeRect(x, y, w, h);

      bg.lineStyle(1, hover ? 0xcc55ff : 0x5500aa, 0.6);
      bg.strokeRect(x + 4, y + 4, w - 8, h - 8);
    };

    drawBtn(false);

    const txt = this.add.text(x + w / 2, y + h / 2, label, {
      fontSize: '17px',
      color: '#d4af37',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(11);

    const hitbox = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(12);

    hitbox.on('pointerover', () => {
      drawBtn(true);
      txt.setColor('#ffd700');
    });

    hitbox.on('pointerout', () => {
      drawBtn(false);
      txt.setColor('#d4af37');
    });

    hitbox.on('pointerdown', onClick);

    this.tweens.add({
      targets: txt,
      alpha: 0.65,
      yoyo: true,
      repeat: -1,
      duration: 1200,
      ease: 'Sine.InOut',
    });
  }

  // ── Painel "Continuar" — partida salva (Salvar e Sair) ────
  private async buildContinuePanel(W: number): Promise<void> {
    let save: GameSave | null = null;
    try {
      save = await loadGame();
    } catch (error) {
      console.error('Erro ao carregar save:', error);
      return;
    }
    if (!save || !this.scene.isActive()) return;

    const def = CFG.CHARACTERS[save.charId];
    const m = Math.floor(save.elapsedSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(save.elapsedSeconds % 60).toString().padStart(2, '0');

    const panelW = 600;
    const panelH = 38;
    const x = W / 2 - panelW / 2;
    const y = 538;

    const bg = this.add.graphics().setDepth(10);
    const draw = (hover: boolean) => {
      bg.clear();
      bg.fillStyle(hover ? 0x123312 : 0x0a1f0a, 0.96);
      bg.fillRect(x, y, panelW, panelH);
      bg.lineStyle(1.5, hover ? 0x66ff88 : 0x2e8b57, 0.95);
      bg.strokeRect(x, y, panelW, panelH);
    };
    draw(false);

    const txt = this.add.text(
      x + 14,
      y + panelH / 2,
      `▶  CONTINUAR:  ${def?.icon ?? '❔'} ${def?.name ?? save.charId}  —  LVL ${save.level}  •  ⏱ ${m}:${s}  •  ☠ ${save.kills}`,
      {
        fontSize: '13px',
        color: '#88eeaa',
        fontFamily: 'Cinzel, Georgia, serif',
        stroke: '#000',
        strokeThickness: 3,
      },
    ).setOrigin(0, 0.5).setDepth(11);

    const hit = this.add.rectangle(x + panelW / 2 - 20, y + panelH / 2, panelW - 40, panelH, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(12);

    hit.on('pointerover', () => { draw(true); txt.setColor('#bbffcc'); });
    hit.on('pointerout',  () => { draw(false); txt.setColor('#88eeaa'); });
    hit.on('pointerdown', () => {
      Sfx.unlock(this);
      this.registry.set('characterId', save!.charId);
      this.cameras.main.flash(250, 100, 220, 120);
      this.time.delayedCall(180, () => {
        this.scene.start('Game', { characterId: save!.charId, resume: save! });
      });
    });

    // Descartar save
    const discard = this.add.text(x + panelW - 12, y + panelH / 2, '✖', {
      fontSize: '14px',
      color: '#cc6666',
      fontFamily: 'Arial',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(1, 0.5).setDepth(13).setInteractive({ useHandCursor: true });

    discard.on('pointerover', () => discard.setColor('#ff4444'));
    discard.on('pointerout',  () => discard.setColor('#cc6666'));
    discard.on('pointerdown', async () => {
      await clearSave();
      bg.destroy(); txt.destroy(); hit.destroy(); discard.destroy();
    });
  }

  private startGame(mode: 'solo' | 'online'): void {
    Sfx.unlock(this);

    this.cameras.main.flash(250, 212, 175, 55);

    this.time.delayedCall(180, () => {
      this.scene.start('CharSelect', { mode });
    });
  }
}