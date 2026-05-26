import Phaser from 'phaser';
import { CFG } from '../config';
import { CollectionTracker } from '../utils/CollectionTracker';
import { Sfx } from '../utils/Sfx';
import { getGlobalRanking, RankingPlayer } from '../services/rankingService';
import { logoutUser } from '../services/authService';

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

    this.add.text(
      W / 2,
      H - 14,
      'WASD / Setas: Mover  •  ESC: Pausar  •  1 2 3: Escolher Melhoria  •  R: Menu',
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

    const cardW = 100;
    const cardH = 148;
    const gap = 8;
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

    const imgY = y + 66;
    const maxPx = 70;
    const scale = Math.min(maxPx / monster.size, 1.8);

    const img = this.add.image(cx, imgY, monster.key)
      .setScale(scale)
      .setDepth(7);

    if (!discovered) {
      img.setTint(0x0a0a14).setAlpha(0.45);
    }

    this.add.text(cx, y + h - 38, discovered ? monster.name : '???', {
      fontSize: '11px',
      color: discovered ? '#d4af37' : '#2a2a44',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(8);

    if (discovered) {
      const def = CFG.ENEMY_TYPES[monster.type];

      this.add.text(cx, y + h - 22, `HP ${def.hp}  ·  XP ${def.xp}`, {
        fontSize: '9px',
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

    const iconW = 100;
    const iconH = 58;
    const gapX = 14;
    const gapY = 10;
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

    this.add.text(cx, y + 18, discovered ? item.icon : '?', {
      fontSize: discovered ? '22px' : '16px',
      color: discovered ? '#ffffff' : '#1e1e33',
    }).setOrigin(0.5).setDepth(8);

    this.add.text(cx, y + h - 13, discovered ? item.name : '???', {
      fontSize: '9px',
      color: discovered ? '#aa88cc' : '#1e1e33',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(8);

    if (discovered) {
      const badge = item.kind === 'weapon' ? 'ARMA' : 'BÔNUS';
      const badgeColor = item.kind === 'weapon' ? '#4400aa' : '#003344';
      const bg2 = this.add.graphics().setDepth(7);

      bg2.fillStyle(item.kind === 'weapon' ? 0x220044 : 0x001122, 0.9);
      bg2.fillRect(x + 4, y + 3, 34, 10);

      this.add.text(x + 21, y + 8, badge, {
        fontSize: '7px',
        color: badgeColor,
        fontFamily: 'Cinzel, Georgia, serif',
      }).setOrigin(0.5).setDepth(9);
    }
  }

  private buildPlayButton(W: number, _H: number): void {
    const btnW = 290;
    const btnH = 52;
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
      fontSize: '20px',
      color: '#d4af37',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(11);

    const hitbox = this.add.rectangle(W / 2, btnY + btnH / 2, btnW, btnH, 0xffffff, 0)
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

    hitbox.on('pointerdown', () => this.startGame());

    this.input.keyboard!.addKey('SPACE').once('down', () => this.startGame());
    this.input.keyboard!.addKey('ENTER').once('down', () => this.startGame());

    this.tweens.add({
      targets: txt,
      alpha: 0.65,
      yoyo: true,
      repeat: -1,
      duration: 1200,
      ease: 'Sine.InOut',
    });

    this.add.text(W / 2, btnY + btnH + 14, 'ENTER ou ESPAÇO para iniciar', {
      fontSize: '10px',
      color: '#333355',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10);
  }

  private startGame(): void {
    Sfx.unlock(this);

    this.cameras.main.flash(250, 212, 175, 55);

    this.time.delayedCall(180, () => {
      this.scene.start('Game');
    });
  }
}