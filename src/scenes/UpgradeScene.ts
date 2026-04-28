import Phaser from 'phaser';
import { CFG, UpgradeDef } from '../config';

// =============================================================
//  UpgradeScene — menu de melhoria estilo carta de RPG (RF10)
// =============================================================
export class UpgradeScene extends Phaser.Scene {
  constructor() { super({ key: 'Upgrade' }); }

  create(data: { upgrades: UpgradeDef[] }): void {
    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;

    // ── Fundo escuro com overlay ──────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.80).setDepth(0);

    // Ornamento superior
    this.buildOrnament(W, H);

    // ── Título ────────────────────────────────────────────
    this.add.text(W / 2, 52, '✦  NÍVEL ACIMA  ✦', {
      fontSize: '34px', color: '#d4af37',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(2);

    this.add.text(W / 2, 96, 'Escolha uma melhoria para sua jornada', {
      fontSize: '14px', color: '#a0a0a0',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(2);

    // ── Cards de upgrade ──────────────────────────────────
    const upgrades = data.upgrades;
    const cardW    = 210;
    const cardH    = 220;
    const gap      = 20;
    const totalW   = upgrades.length * cardW + (upgrades.length - 1) * gap;
    const startX   = (W - totalW) / 2;

    upgrades.forEach((upg, i) => {
      this.createCard(
        startX + i * (cardW + gap),
        H / 2 - cardH / 2 + 30,
        cardW, cardH, upg, i + 1,
      );
    });

    // ── Dica de atalho ────────────────────────────────────
    this.add.text(W / 2, H - 24, 'Pressione 1, 2 ou 3 para escolher', {
      fontSize: '12px', color: '#555555',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(2);

    // Atalhos de teclado
    [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
    ].forEach((code, i) => {
      if (i < upgrades.length) {
        this.input.keyboard!.addKey(code).once('down', () => this.choose(upgrades[i].id));
      }
    });
  }

  private buildOrnament(W: number, _H: number): void {
    const g = this.add.graphics().setDepth(1);

    // Linha dourada horizontal
    g.lineStyle(1.5, 0x4a1f75, 0.8);
    g.lineBetween(40, 120, W - 40, 120);

    // Losangos decorativos
    g.fillStyle(0xd4af37, 0.9);
    [[W / 2, 120], [80, 120], [W - 80, 120]].forEach(([x, y]) => {
      g.fillPoints([
        { x: x,     y: y - 6 },
        { x: x + 5, y: y     },
        { x: x,     y: y + 6 },
        { x: x - 5, y: y     },
      ], true);
    });
  }

  private createCard(
    x: number, y: number,
    w: number, h: number,
    upg: UpgradeDef,
    num: number,
  ): void {
    const cx = x + w / 2;
    const cy = y + h / 2;

    const container = this.add.container(cx, cy + 80).setDepth(5).setAlpha(0);

    // ── Fundo da carta ────────────────────────────────────
    const bgCard = this.add.graphics();
    // Sombra
    bgCard.fillStyle(0x000000, 0.5);
    bgCard.fillRect(-w / 2 + 4, -h / 2 + 4, w, h);
    // Corpo
    bgCard.fillStyle(0x0d0d1a, 1);
    bgCard.fillRect(-w / 2, -h / 2, w, h);
    // Gradiente simulado (faixa superior)
    bgCard.fillStyle(0x1a0a2e, 1);
    bgCard.fillRect(-w / 2, -h / 2, w, h / 3);
    // Borda dourada
    bgCard.lineStyle(2, 0xd4af37, 0.8);
    bgCard.strokeRect(-w / 2, -h / 2, w, h);
    // Borda interna fina
    bgCard.lineStyle(1, 0x4a1f75, 0.6);
    bgCard.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
    // Cantos decorativos
    bgCard.lineStyle(2, 0xd4af37, 0.9);
    const cx2 = w / 2, cy2 = h / 2;
    const cs  = 12;
    [[-cx2, -cy2], [cx2 - 1, -cy2], [-cx2, cy2 - 1], [cx2 - 1, cy2 - 1]].forEach(([bx, by]) => {
      const sx = bx < 0 ? 1 : -1;
      const sy = by < 0 ? 1 : -1;
      bgCard.lineBetween(bx, by, bx + sx * cs, by);
      bgCard.lineBetween(bx, by, bx, by + sy * cs);
    });

    // ── Número do atalho ──────────────────────────────────
    const numText = this.add.text(-w / 2 + 10, -h / 2 + 8, `[${num}]`, {
      fontSize: '12px', color: '#555', fontFamily: 'Cinzel, Georgia, serif',
    });

    // ── Ícone central (emoji grande) ──────────────────────
    const icon = this.add.text(0, -h / 2 + 58, upg.label.split(' ')[0], {
      fontSize: '40px',
    }).setOrigin(0.5);

    // ── Nome da melhoria ──────────────────────────────────
    const nameParts = upg.label.split(' ');
    nameParts.shift(); // remove emoji
    const nameText = this.add.text(0, -h / 2 + 108, nameParts.join(' '), {
      fontSize: '16px', color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 3,
      wordWrap: { width: w - 24 },
      align: 'center',
    }).setOrigin(0.5, 0);

    // Linha separadora
    const sep = this.add.graphics();
    sep.lineStyle(1, 0x4a1f75, 0.7);
    sep.lineBetween(-w / 2 + 20, -h / 2 + 134, w / 2 - 20, -h / 2 + 134);

    // ── Descrição ─────────────────────────────────────────
    const descText = this.add.text(0, -h / 2 + 144, upg.desc, {
      fontSize: '12px', color: '#9090b0',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 2,
      wordWrap: { width: w - 30 },
      align: 'center',
    }).setOrigin(0.5, 0);

    // ── Hitbox clicável ───────────────────────────────────
    const hitbox = this.add.rectangle(0, 0, w, h, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    hitbox.on('pointerdown', () => this.choose(upg.id));
    hitbox.on('pointerover', () => {
      bgCard.clear();
      bgCard.fillStyle(0x000000, 0.5);
      bgCard.fillRect(-w / 2 + 4, -h / 2 + 4, w, h);
      bgCard.fillStyle(0x1a0a3e, 1);
      bgCard.fillRect(-w / 2, -h / 2, w, h);
      bgCard.fillStyle(0x2d1255, 1);
      bgCard.fillRect(-w / 2, -h / 2, w, h / 3);
      bgCard.lineStyle(2.5, 0xffd700, 1);
      bgCard.strokeRect(-w / 2, -h / 2, w, h);
      bgCard.lineStyle(1, 0x9b59b6, 0.8);
      bgCard.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
      container.setScale(1.04);
    });
    hitbox.on('pointerout', () => {
      container.setScale(1.0);
      // Redesenha o card normal
      bgCard.clear();
      bgCard.fillStyle(0x000000, 0.5);
      bgCard.fillRect(-w / 2 + 4, -h / 2 + 4, w, h);
      bgCard.fillStyle(0x0d0d1a, 1);
      bgCard.fillRect(-w / 2, -h / 2, w, h);
      bgCard.fillStyle(0x1a0a2e, 1);
      bgCard.fillRect(-w / 2, -h / 2, w, h / 3);
      bgCard.lineStyle(2, 0xd4af37, 0.8);
      bgCard.strokeRect(-w / 2, -h / 2, w, h);
      bgCard.lineStyle(1, 0x4a1f75, 0.6);
      bgCard.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
    });

    container.add([bgCard, numText, icon, nameText, sep, descText, hitbox]);

    // Animação de entrada (cartas sobem de baixo)
    this.tweens.add({
      targets: container,
      y: cy,
      alpha: 1,
      duration: 300,
      delay: (num - 1) * 80,
      ease: 'Back.out',
    });
  }

  private choose(upgradeId: string): void {
    // Flash de saída
    this.cameras.main.flash(150, 212, 175, 55);
    this.scene.get('Game').events.emit('upgradeChosen', upgradeId);
    this.time.delayedCall(100, () => {
      this.scene.stop('Upgrade');
      this.scene.resume('Game');
    });
  }
}
