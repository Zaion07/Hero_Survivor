import Phaser from 'phaser';
import { CFG } from '../config';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  HUDScene — interface estilo Vampire Survivors / RPG gótico
// =============================================================
export class HUDScene extends Phaser.Scene {
  private hpFill!:    Phaser.GameObjects.Graphics;
  private xpFill!:    Phaser.GameObjects.Graphics;
  private hpText!:    Phaser.GameObjects.Text;
  private levelBadge!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private killText!:  Phaser.GameObjects.Text;
  private waveMsg!:   Phaser.GameObjects.Text;
  private gameOverGrp!: Phaser.GameObjects.Container;

  private kills = 0;

  constructor() { super({ key: 'HUD' }); }

  create(): void {
    // Garante reset ao reiniciar cena
    this.kills = 0;

    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;
    const game = this.scene.get('Game');

    // ── Painel superior escuro ────────────────────────────
    const topPanel = this.add.graphics();
    topPanel.fillStyle(0x000000, 0.65);
    topPanel.fillRect(0, 0, W, 52);
    topPanel.lineStyle(1, 0x4a1f75, 0.8);
    topPanel.lineBetween(0, 52, W, 52);

    // ── Barra de vida (RF03.1) ────────────────────────────
    const HP_X = 12, HP_Y = 8, HP_W = 220, HP_H = 18;

    // Fundo da barra
    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x1a0000, 1);
    hpBg.fillRect(HP_X, HP_Y, HP_W, HP_H);
    hpBg.lineStyle(1.5, 0x6b0000, 1);
    hpBg.strokeRect(HP_X, HP_Y, HP_W, HP_H);
    // Cantos decorativos
    hpBg.lineStyle(1, 0xff2222, 0.6);
    hpBg.lineBetween(HP_X, HP_Y, HP_X + 6, HP_Y);
    hpBg.lineBetween(HP_X, HP_Y, HP_X, HP_Y + 6);
    hpBg.lineBetween(HP_X + HP_W, HP_Y, HP_X + HP_W - 6, HP_Y);
    hpBg.lineBetween(HP_X + HP_W, HP_Y, HP_X + HP_W, HP_Y + 6);
    hpBg.lineBetween(HP_X, HP_Y + HP_H, HP_X + 6, HP_Y + HP_H);
    hpBg.lineBetween(HP_X, HP_Y + HP_H, HP_X, HP_Y + HP_H - 6);
    hpBg.lineBetween(HP_X + HP_W, HP_Y + HP_H, HP_X + HP_W - 6, HP_Y + HP_H);
    hpBg.lineBetween(HP_X + HP_W, HP_Y + HP_H, HP_X + HP_W, HP_Y + HP_H - 6);

    // Ícone ♥ e texto HP (criados ANTES de drawHpFill para evitar undefined)
    this.add.text(HP_X + 4, HP_Y + 1, '♥', {
      fontSize: '14px', color: '#ff2222', fontFamily: 'Arial',
    });
    this.hpText = this.add.text(HP_X + HP_W / 2, HP_Y + 1, '', {
      fontSize: '13px', color: '#ffcccc',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // Preenchimento da vida (dinâmico) — hpText já existe aqui
    this.hpFill = this.add.graphics();
    this.drawHpFill(CFG.PLAYER.MAX_HP, CFG.PLAYER.MAX_HP, HP_X, HP_Y, HP_W, HP_H);

    // ── Badge de nível ────────────────────────────────────
    this.levelBadge = this.add.text(HP_X, HP_Y + HP_H + 4, 'LVL 1', {
      fontSize: '11px', color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 3,
    });

    // ── Cronômetro central (RF13) ─────────────────────────
    this.timerText = this.add.text(W / 2, 6, '00:00', {
      fontSize: '28px', color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5, 0);

    // Ornamento do timer
    const timerDeco = this.add.graphics();
    timerDeco.lineStyle(1, 0x4a1f75, 0.7);
    timerDeco.lineBetween(W / 2 - 70, 44, W / 2 - 10, 44);
    timerDeco.lineBetween(W / 2 + 10, 44, W / 2 + 70, 44);
    timerDeco.fillStyle(0xd4af37, 0.8);
    timerDeco.fillCircle(W / 2 - 10, 44, 2);
    timerDeco.fillCircle(W / 2 + 10, 44, 2);

    // ── Contador de kills ─────────────────────────────────
    this.killText = this.add.text(W - 12, 8, '☠ 0', {
      fontSize: '14px', color: '#bbb',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);
    this.buildMusicToggleBtn(W, game);

    // ── Barra de XP na base da tela (RF09) ───────────────
    const XP_H = 8;
    const xpBg = this.add.graphics();
    xpBg.fillStyle(0x000022, 1);
    xpBg.fillRect(0, H - XP_H, W, XP_H);
    xpBg.lineStyle(1, 0x003366, 0.8);
    xpBg.strokeRect(0, H - XP_H, W, XP_H);

    this.xpFill = this.add.graphics();
    this.drawXpFill(0, CFG.XP_TABLE[0], H, XP_H);

    // Texto XP
    this.add.text(W / 2, H - XP_H - 2, 'XP', {
      fontSize: '9px', color: '#3399ff',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5, 1).setAlpha(0.7);

    // ── Mensagem de onda ──────────────────────────────────
    this.waveMsg = this.add.text(W / 2, H / 2 - 80, '', {
      fontSize: '22px', color: '#ff4422',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0).setDepth(50);

    // ── Tela de Game Over estilizada ──────────────────────
    this.buildGameOver(W, H);

    // ── Tecla R reinicia (só após Game Over) ─────────────
    this.input.keyboard!.addKey('R').on('down', () => {
      if (!this.gameOverGrp.visible) return;
      if (this.scene.isActive('Upgrade')) this.scene.stop('Upgrade');
      this.scene.stop('Game');
      this.scene.start('Menu'); // inicia Menu antes de parar HUD
      this.scene.stop('HUD');
    });

    // ── Ouve eventos da GameScene ─────────────────────────
    game.events.on('playerHpChanged', (hp: number, max: number) =>
      this.drawHpFill(hp, max, HP_X, HP_Y, HP_W, HP_H),
    );
    game.events.on('playerXPChanged', (xp: number, next: number) =>
      this.drawXpFill(xp, next, H, XP_H),
    );
    game.events.on('playerLevelUp', (level: number) =>
      this.levelBadge.setText(`LVL ${level}`),
    );
    game.events.on('survivalTime',  (s: number) => this.updateTimer(s));
    game.events.on('playerDied',    ()           => this.showGameOver());
    game.events.on('waveMessage',   (m: string)  => this.showWaveMsg(m));
    game.events.on('enemyKilled',   ()           => {
      this.kills++;
      this.killText.setText(`☠ ${this.kills}`);
    });
  }

  private buildMusicToggleBtn(W: number, game: Phaser.Scene): void {
    const btnW = 90;
    const btnH = 18;
    const x = W - 12 - btnW / 2;
    const y = 32;
    const bg = this.add.graphics().setDepth(20);
    const txt = this.add.text(x, y, '', {
      fontSize: '10px',
      color: '#f2f2f2',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(21);

    const paint = (enabled: boolean) => {
      bg.clear();
      bg.fillStyle(enabled ? 0x103320 : 0x3a1111, 0.95);
      bg.fillRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 5);
      bg.lineStyle(1, enabled ? 0x44cc88 : 0xcc5555, 0.95);
      bg.strokeRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 5);
      txt.setText(enabled ? '♪ MÚSICA: ON' : '♪ MÚSICA: OFF');
    };

    paint(Sfx.isDungeonBgmEnabled());

    const hitbox = this.add.rectangle(x, y, btnW, btnH, 0xffffff, 0)
      .setDepth(22)
      .setInteractive({ useHandCursor: true });
    hitbox.on('pointerover', () => txt.setAlpha(0.85));
    hitbox.on('pointerout', () => txt.setAlpha(1));
    hitbox.on('pointerdown', () => {
      const enabled = Sfx.toggleDungeonBgm(game);
      paint(enabled);
    });
  }

  // ── Preenchimento HP com gradiente de cor ─────────────────
  private drawHpFill(
    hp: number, max: number,
    x: number, y: number, w: number, h: number,
  ): void {
    const pct  = Math.max(0, hp / max);
    const fill = pct > 0.5 ? 0xcc2222 : pct > 0.25 ? 0xcc6600 : 0xff1111;
    const glow = pct > 0.5 ? 0xff3333 : pct > 0.25 ? 0xff8800 : 0xff4444;

    this.hpFill.clear();

    // Preenchimento principal
    this.hpFill.fillStyle(fill, 1);
    this.hpFill.fillRect(x + 1, y + 1, Math.round((w - 2) * pct), h - 2);

    // Linha de brilho no topo
    this.hpFill.fillStyle(glow, 0.5);
    this.hpFill.fillRect(x + 1, y + 1, Math.round((w - 2) * pct), 4);

    this.hpText.setText(`${Math.ceil(hp)} / ${max}`);
  }

  // ── Preenchimento XP com gradiente azul ───────────────────
  private drawXpFill(xp: number, next: number, H: number, XP_H: number): void {
    const pct = next > 0 ? Math.min(1, xp / next) : 1;

    this.xpFill.clear();
    this.xpFill.fillStyle(0x1155cc, 1);
    this.xpFill.fillRect(1, H - XP_H + 1, Math.round((CFG.WIDTH - 2) * pct), XP_H - 2);
    // Brilho topo
    this.xpFill.fillStyle(0x3399ff, 0.5);
    this.xpFill.fillRect(1, H - XP_H + 1, Math.round((CFG.WIDTH - 2) * pct), 3);
  }

  // ── Cronômetro MM:SS (RF13) ───────────────────────────────
  private updateTimer(totalSeconds: number): void {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    this.timerText.setText(`${m}:${s}`);
  }

  // ── Mensagem de onda ──────────────────────────────────────
  private showWaveMsg(msg: string): void {
    this.waveMsg.setText(msg).setAlpha(1).setScale(1.3);
    this.tweens.add({ targets: this.waveMsg, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back' });
    this.tweens.add({ targets: this.waveMsg, alpha: 0, delay: 2800, duration: 600 });
  }

  // ── Game Over ─────────────────────────────────────────────
  private buildGameOver(W: number, H: number): void {
    this.gameOverGrp = this.add.container(W / 2, H / 2).setVisible(false).setDepth(200);

    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.85).setOrigin(0.5);

    // Bordas góticas
    const border = this.add.graphics();
    border.lineStyle(2, 0x6b0000, 1);
    border.strokeRect(-W / 2 + 20, -H / 2 + 20, W - 40, H - 40);
    border.lineStyle(1, 0xaa0000, 0.5);
    border.strokeRect(-W / 2 + 28, -H / 2 + 28, W - 56, H - 56);

    const skull = this.add.text(0, -H / 2 + 60, '💀', {
      fontSize: '48px',
    }).setOrigin(0.5);

    const goText = this.add.text(0, -60, 'GAME OVER', {
      fontSize: '52px', color: '#cc0000',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5);

    const subText = this.add.text(0, 10, 'A escuridão te consumiu...', {
      fontSize: '16px', color: '#888888',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    const restartText = this.add.text(0, 65, '[ Pressione R para renascer ]', {
      fontSize: '18px', color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Pulsa o texto de restart
    this.tweens.add({
      targets: restartText,
      alpha: 0.3,
      yoyo: true, repeat: -1,
      duration: 800, ease: 'Sine',
    });

    this.gameOverGrp.add([bg, border, skull, goText, subText, restartText]);
  }

  private showGameOver(): void {
    this.gameOverGrp.setVisible(true);
    // Animação de entrada
    this.gameOverGrp.setAlpha(0);
    this.tweens.add({ targets: this.gameOverGrp, alpha: 1, duration: 1000, ease: 'Power2' });
  }
}
