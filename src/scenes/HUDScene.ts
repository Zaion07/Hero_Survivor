import Phaser from 'phaser';
import { CFG, CharacterDef } from '../config';
import { Sfx } from '../utils/Sfx';

import { auth } from '../services/firebase';
import { savePlayerScore } from '../services/rankingService';
import {
  resetScore,
  updateKills,
  updateSurvivalTime,
  getCurrentScore,
} from '../services/scoreService';

type MinimapState = {
  world: number;
  me: { x: number; y: number; alive: boolean };
  others: Array<{ x: number; y: number }>;
  current: { x: number; y: number; r: number };
  target: { x: number; y: number; r: number } | null;
};

// =============================================================
//  HUDScene — interface estilo Vampire Survivors / RPG gótico
// =============================================================
export class HUDScene extends Phaser.Scene {
  private hpFill!: Phaser.GameObjects.Graphics;
  private xpFill!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private levelBadge!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private waveMsg!: Phaser.GameObjects.Text;
  private gameOverGrp!: Phaser.GameObjects.Container;
  private gameOverScoreText!: Phaser.GameObjects.Text;

  private kills = 0;
  private finalScoreSaved = false;
  private itemIcons = new Map<string, { txt: Phaser.GameObjects.Text; img: Phaser.GameObjects.Image }>();
  private itemsLabel?: Phaser.GameObjects.Text;
  private royaleText?: Phaser.GameObjects.Text;
  private minimapGfx?: Phaser.GameObjects.Graphics;
  private minimapBg?: Phaser.GameObjects.Graphics;
  private royaleEndGrp?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'HUD' });
  }

  create(): void {
    this.kills = 0;
    this.finalScoreSaved = false;
    this.itemIcons = new Map();
    this.itemsLabel = undefined;
    this.royaleText = undefined;
    this.minimapGfx = undefined;
    this.minimapBg = undefined;
    this.royaleEndGrp = undefined;
    resetScore();

    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;
    const game = this.scene.get('Game');

    const topPanel = this.add.graphics();
    topPanel.fillStyle(0x000000, 0.65);
    topPanel.fillRect(0, 0, W, 52);
    topPanel.lineStyle(1, 0x4a1f75, 0.8);
    topPanel.lineBetween(0, 52, W, 52);

    const HP_X = 12;
    const HP_Y = 8;
    const HP_W = 220;
    const HP_H = 18;

    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x1a0000, 1);
    hpBg.fillRect(HP_X, HP_Y, HP_W, HP_H);
    hpBg.lineStyle(1.5, 0x6b0000, 1);
    hpBg.strokeRect(HP_X, HP_Y, HP_W, HP_H);

    hpBg.lineStyle(1, 0xff2222, 0.6);
    hpBg.lineBetween(HP_X, HP_Y, HP_X + 6, HP_Y);
    hpBg.lineBetween(HP_X, HP_Y, HP_X, HP_Y + 6);
    hpBg.lineBetween(HP_X + HP_W, HP_Y, HP_X + HP_W - 6, HP_Y);
    hpBg.lineBetween(HP_X + HP_W, HP_Y, HP_X + HP_W, HP_Y + 6);
    hpBg.lineBetween(HP_X, HP_Y + HP_H, HP_X + 6, HP_Y + HP_H);
    hpBg.lineBetween(HP_X, HP_Y + HP_H, HP_X, HP_Y + HP_H - 6);
    hpBg.lineBetween(HP_X + HP_W, HP_Y + HP_H, HP_X + HP_W - 6, HP_Y + HP_H);
    hpBg.lineBetween(HP_X + HP_W, HP_Y + HP_H, HP_X + HP_W, HP_Y + HP_H - 6);

    this.add.text(HP_X + 4, HP_Y + 1, '♥', {
      fontSize: '14px',
      color: '#ff2222',
      fontFamily: 'Arial',
    });

    this.hpText = this.add.text(HP_X + HP_W / 2, HP_Y + 1, '', {
      fontSize: '13px',
      color: '#ffcccc',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    this.hpFill = this.add.graphics();
    this.drawHpFill(CFG.PLAYER.MAX_HP, CFG.PLAYER.MAX_HP, HP_X, HP_Y, HP_W, HP_H);

    this.levelBadge = this.add.text(HP_X, HP_Y + HP_H + 4, 'LVL 1', {
      fontSize: '11px',
      color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    });

    // Nome do herói escolhido
    const charDef = this.registry.get('charDef') as CharacterDef | undefined;
    if (charDef) {
      this.add.text(HP_X + 52, HP_Y + HP_H + 4, `${charDef.icon} ${charDef.name}`, {
        fontSize: '11px',
        color: '#9070b0',
        fontFamily: 'Cinzel, Georgia, serif',
        stroke: '#000',
        strokeThickness: 3,
      });
    }

    this.timerText = this.add.text(W / 2, 6, '00:00', {
      fontSize: '28px',
      color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5, 0);

    const timerDeco = this.add.graphics();
    timerDeco.lineStyle(1, 0x4a1f75, 0.7);
    timerDeco.lineBetween(W / 2 - 70, 44, W / 2 - 10, 44);
    timerDeco.lineBetween(W / 2 + 10, 44, W / 2 + 70, 44);
    timerDeco.fillStyle(0xd4af37, 0.8);
    timerDeco.fillCircle(W / 2 - 10, 44, 2);
    timerDeco.fillCircle(W / 2 + 10, 44, 2);

    this.killText = this.add.text(W - 12, 8, '☠ 0', {
    fontSize: '14px',
    color: '#bbb',
    fontFamily: 'Cinzel, Georgia, serif',
    stroke: '#000',
    strokeThickness: 3,
    }).setOrigin(1, 0);

    // Partida retomada de um save: restaura kills e nível exibidos
    const resumeKills = (this.registry.get('resumeKills') as number) ?? 0;
    const resumeLevel = (this.registry.get('resumeLevel') as number) ?? 1;
    if (resumeKills > 0) {
      this.kills = resumeKills;
      updateKills(this.kills);
      this.killText.setText(`☠ ${this.kills}`);
    }
    if (resumeLevel > 1) this.levelBadge.setText(`LVL ${resumeLevel}`);

    const XP_H = 8;

    const xpBg = this.add.graphics();
    xpBg.fillStyle(0x000022, 1);
    xpBg.fillRect(0, H - XP_H, W, XP_H);
    xpBg.lineStyle(1, 0x003366, 0.8);
    xpBg.strokeRect(0, H - XP_H, W, XP_H);

    this.xpFill = this.add.graphics();
    this.drawXpFill(0, CFG.XP_TABLE[0], H, XP_H);

    this.add.text(W / 2, H - XP_H - 2, 'XP', {
      fontSize: '9px',
      color: '#3399ff',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5, 1).setAlpha(0.7);

    this.waveMsg = this.add.text(W / 2, H / 2 - 80, '', {
      fontSize: '22px',
      color: '#ff4422',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0).setDepth(50);

    this.buildMusicToggleBtn(W, game);

    if (charDef) {
      this.buildAbilityBox(H, charDef, game);
      this.buildUltimateBox(H, charDef, game);
    }

    // Painel de itens adquiridos (canto superior esquerdo)
    game.events.on('itemCollected', (itemId: string, count: number) =>
      this.updateItemsPanel(itemId, count),
    );

    // ── Battle Royale ─────────────────────────────────────
    game.events.on('royalePhase', (phase: string, remaining: number, alive: number) =>
      this.updateRoyalePhase(phase, remaining, alive),
    );

    game.events.on('minimapState', (state: MinimapState) =>
      this.drawMinimap(state),
    );

    game.events.on('royaleFinished', (won: boolean, winnerName: string) =>
      this.showRoyaleEnd(won, winnerName),
    );

    this.buildGameOver(W, H);

    this.input.keyboard!.addKey('R').on('down', () => {
      if (!this.gameOverGrp.visible && !this.royaleEndGrp?.visible) return;

      if (this.scene.isActive('Upgrade')) {
        this.scene.stop('Upgrade');
      }

      this.scene.stop('Game');
      this.scene.start('Menu');
      this.scene.stop('HUD');
    });

    game.events.on('playerHpChanged', (hp: number, max: number) =>
      this.drawHpFill(hp, max, HP_X, HP_Y, HP_W, HP_H),
    );

    game.events.on('playerXPChanged', (xp: number, next: number) =>
      this.drawXpFill(xp, next, H, XP_H),
    );

    game.events.on('playerLevelUp', (level: number) =>
      this.levelBadge.setText(`LVL ${level}`),
    );

    game.events.on('survivalTime', (seconds: number) => {
      updateSurvivalTime(seconds);
      this.updateTimer(seconds);
    });

    game.events.on('playerDied', () => {
      this.showGameOver();
      this.saveFinalScore();
    });

    game.events.on('waveMessage', (message: string) =>
      this.showWaveMsg(message),
    );

    game.events.on('enemyKilled', () => {
      this.kills++;
      updateKills(this.kills);
      this.killText.setText(`☠ ${this.kills}`);
    });
  }

  // ── Battle Royale: fase / contagem ────────────────────────
  private updateRoyalePhase(phase: string, remaining: number, alive: number): void {
    if (!this.royaleText) {
      this.royaleText = this.add.text(CFG.WIDTH / 2, 58, '', {
        fontSize: '14px',
        color: '#66ddff',
        fontFamily: 'Cinzel, Georgia, serif',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5, 0).setDepth(40);
    }

    if (phase === 'prep') {
      const m = Math.floor(remaining / 60).toString().padStart(2, '0');
      const s = Math.floor(remaining % 60).toString().padStart(2, '0');
      this.royaleText.setText(`🛡 PREPARAÇÃO: ${m}:${s}`);
      this.royaleText.setColor(remaining <= 10 ? '#ff6644' : '#66ddff');
    } else {
      this.royaleText.setText(`⚔ ARENA — VIVOS: ${alive}`);
      this.royaleText.setColor('#ffd700');
    }
  }

  // ── Battle Royale: minimapa (zona atual e próxima) ────────
  private drawMinimap(state: MinimapState): void {
    const SIZE = 150;
    const x = CFG.WIDTH - SIZE - 14;
    const y = CFG.HEIGHT - SIZE - 24;

    if (!this.minimapBg) {
      this.minimapBg = this.add.graphics().setDepth(40);
      this.minimapBg.fillStyle(0x05050d, 0.85);
      this.minimapBg.fillRect(x - 2, y - 2, SIZE + 4, SIZE + 4);
      this.minimapBg.lineStyle(1.5, 0xd4af37, 0.85);
      this.minimapBg.strokeRect(x - 2, y - 2, SIZE + 4, SIZE + 4);

      this.add.text(x + SIZE / 2, y - 8, 'ZONA', {
        fontSize: '8px',
        color: '#777799',
        fontFamily: 'Cinzel, Georgia, serif',
      }).setOrigin(0.5, 1).setDepth(41);

      this.minimapGfx = this.add.graphics().setDepth(41);

      // Recorta o desenho dentro do quadro
      const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
      maskShape.fillStyle(0xffffff, 1);
      maskShape.fillRect(x, y, SIZE, SIZE);
      this.minimapGfx.setMask(maskShape.createGeometryMask());
    }

    const g = this.minimapGfx!;
    const scale = SIZE / state.world;
    const mx = (wx: number) => x + wx * scale;
    const my = (wy: number) => y + wy * scale;

    g.clear();

    // Círculo atual (azul)
    g.lineStyle(1.5, 0x55aaff, 0.95);
    g.strokeCircle(mx(state.current.x), my(state.current.y), state.current.r * scale);

    // Próximo círculo (dourado) — para onde a zona vai fechar
    if (state.target) {
      g.lineStyle(1, 0xffd700, 0.8);
      g.strokeCircle(mx(state.target.x), my(state.target.y), state.target.r * scale);
    }

    // Outros jogadores (vermelho)
    state.others.forEach(p => {
      g.fillStyle(0xff4444, 1);
      g.fillCircle(mx(p.x), my(p.y), 2.5);
    });

    // Eu (verde)
    if (state.me.alive) {
      g.fillStyle(0x44ff88, 1);
      g.fillCircle(mx(state.me.x), my(state.me.y), 3.5);
      g.lineStyle(1, 0xffffff, 0.8);
      g.strokeCircle(mx(state.me.x), my(state.me.y), 5);
    }
  }

  // ── Battle Royale: fim de partida ─────────────────────────
  private showRoyaleEnd(won: boolean, winnerName: string): void {
    if (this.royaleEndGrp) return;

    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;

    const grp = this.add.container(W / 2, H / 2).setDepth(210).setAlpha(0);
    this.royaleEndGrp = grp;

    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.85).setOrigin(0.5);

    const border = this.add.graphics();
    border.lineStyle(2, won ? 0xd4af37 : 0x6b0000, 1);
    border.strokeRect(-W / 2 + 20, -H / 2 + 20, W - 40, H - 40);

    const icon = this.add.text(0, -120, won ? '🏆' : '💀', {
      fontSize: '54px',
    }).setOrigin(0.5);

    const title = this.add.text(0, -40, won ? 'VITÓRIA REAL!' : 'FIM DE JOGO', {
      fontSize: '48px',
      color: won ? '#ffd700' : '#cc0000',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    const sub = this.add.text(
      0,
      28,
      won
        ? 'Você foi o último sobrevivente da arena!'
        : `Vencedor: ${winnerName}`,
      {
        fontSize: '18px',
        color: '#ccccdd',
        fontFamily: 'Cinzel, Georgia, serif',
        stroke: '#000',
        strokeThickness: 3,
      },
    ).setOrigin(0.5);

    const hint = this.add.text(0, 110, '[ Pressione R para voltar ao menu ]', {
      fontSize: '16px',
      color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: hint,
      alpha: 0.3,
      yoyo: true,
      repeat: -1,
      duration: 800,
    });

    grp.add([bg, border, icon, title, sub, hint]);

    this.tweens.add({
      targets: grp,
      alpha: 1,
      duration: 800,
      ease: 'Power2',
    });
  }

  // ── Painel de itens adquiridos (topo esquerdo) ───────────
  private updateItemsPanel(itemId: string, count: number): void {
    const def = CFG.ITEMS[itemId];
    if (!def) return;

    const baseX = 14;
    const baseY = 60;

    // Rótulo aparece junto com o primeiro item
    if (!this.itemsLabel) {
      this.itemsLabel = this.add.text(baseX, baseY, 'ITENS', {
        fontSize: '9px',
        color: '#666688',
        fontFamily: 'Cinzel, Georgia, serif',
        stroke: '#000',
        strokeThickness: 2,
      });
    }

    const existing = this.itemIcons.get(itemId);
    if (existing) {
      existing.txt.setText(`x${count}`);

      // Pulso ao coletar de novo
      this.tweens.add({
        targets: existing.img,
        scale: 1.7,
        yoyo: true,
        duration: 120,
      });
      return;
    }

    // Novo tipo de item — adiciona à fileira
    const idx = this.itemIcons.size;
    const x = baseX + idx * 52;
    const y = baseY + 14;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a16, 0.85);
    bg.fillRect(x - 3, y - 3, 46, 24);
    bg.lineStyle(1, 0x4a1f75, 0.8);
    bg.strokeRect(x - 3, y - 3, 46, 24);

    const img = this.add.image(x + 8, y + 9, def.texture).setScale(1.2);

    const txt = this.add.text(x + 20, y + 3, `x${count}`, {
      fontSize: '11px',
      color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    });

    this.itemIcons.set(itemId, { txt, img });

    // Entrada animada
    img.setScale(0.2);
    this.tweens.add({
      targets: img,
      scale: 1.2,
      duration: 220,
      ease: 'Back.out',
    });
  }

  // ── Indicador da habilidade do personagem (ESPAÇO) ───────
  private buildAbilityBox(H: number, charDef: CharacterDef, game: Phaser.Scene): void {
    const size = 46;
    const x = 12;
    const y = H - size - 18;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a16, 0.92);
    bg.fillRect(x, y, size, size);

    const icon = this.add.text(x + size / 2, y + size / 2, charDef.ability.icon, {
      fontSize: '24px',
    }).setOrigin(0.5);

    // Overlay de recarga (desce conforme recarrega)
    const cdOverlay = this.add.graphics();

    const border = this.add.graphics();

    this.add.text(x + size + 8, y + 4, charDef.ability.name, {
      fontSize: '11px',
      color: '#66ddff',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    });

    this.add.text(x + size + 8, y + 20, '[ESPAÇO]', {
      fontSize: '9px',
      color: '#555577',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 2,
    });

    const cdText = this.add.text(x + size + 8, y + 33, '', {
      fontSize: '10px',
      color: '#aaaacc',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 2,
    });

    // Badge do nível da habilidade
    const lvlText = this.add.text(x + size - 3, y + size - 3, 'Nv.1', {
      fontSize: '9px',
      color: '#ffd700',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(1, 1).setDepth(1);

    const paint = (readyIn: number, total: number, level = 1) => {
      const ready = readyIn <= 0;
      const pct = total > 0 ? readyIn / total : 0;

      lvlText.setText(`Nv.${level}`);

      cdOverlay.clear();
      if (!ready) {
        const ch = Math.round(size * pct);
        cdOverlay.fillStyle(0x000000, 0.72);
        cdOverlay.fillRect(x, y, size, ch);
      }

      border.clear();
      border.lineStyle(2, ready ? 0xffd700 : 0x444466, ready ? 1 : 0.9);
      border.strokeRect(x, y, size, size);

      icon.setAlpha(ready ? 1 : 0.55);
      cdText.setText(ready ? 'PRONTA!' : `${(readyIn / 1000).toFixed(1)}s`);
      cdText.setColor(ready ? '#ffd700' : '#aaaacc');
    };

    paint(0, charDef.ability.cooldownMs);

    game.events.on('abilityStatus', (readyIn: number, total: number, level: number) =>
      paint(readyIn, total, level),
    );
  }

  // ── Indicador da suprema (Q) — carrega a cada 3 min ──────
  private buildUltimateBox(H: number, charDef: CharacterDef, game: Phaser.Scene): void {
    const size = 46;
    const x = 196;
    const y = H - size - 18;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a16, 0.92);
    bg.fillRect(x, y, size, size);

    const icon = this.add.text(x + size / 2, y + size / 2, charDef.ultimate.icon, {
      fontSize: '24px',
    }).setOrigin(0.5);

    // Carga sobe de baixo para cima (dourada)
    const chargeFill = this.add.graphics();
    const border = this.add.graphics();

    this.add.text(x + size + 8, y + 4, charDef.ultimate.name, {
      fontSize: '11px',
      color: '#ffaa33',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    });

    this.add.text(x + size + 8, y + 20, '[Q] SUPREMA', {
      fontSize: '9px',
      color: '#555577',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 2,
    });

    const cdText = this.add.text(x + size + 8, y + 33, '', {
      fontSize: '10px',
      color: '#aaaacc',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 2,
    });

    const paint = (readyIn: number, total: number) => {
      const ready = readyIn <= 0;
      const charge = total > 0 ? 1 - readyIn / total : 1;

      chargeFill.clear();
      const ch = Math.round((size - 4) * charge);
      chargeFill.fillStyle(ready ? 0xffaa00 : 0x7a5500, ready ? 0.45 : 0.35);
      chargeFill.fillRect(x + 2, y + size - 2 - ch, size - 4, ch);

      border.clear();
      border.lineStyle(2, ready ? 0xffaa00 : 0x444466, ready ? 1 : 0.9);
      border.strokeRect(x, y, size, size);

      icon.setAlpha(ready ? 1 : 0.5);
      if (ready) {
        cdText.setText('PRONTA!');
        cdText.setColor('#ffaa00');
      } else {
        const m = Math.floor(readyIn / 60000);
        const s = Math.floor((readyIn % 60000) / 1000).toString().padStart(2, '0');
        cdText.setText(`${m}:${s} (${Math.floor(charge * 100)}%)`);
        cdText.setColor('#aaaacc');
      }
    };

    paint(charDef.ultimate.cooldownMs, charDef.ultimate.cooldownMs);

    game.events.on('ultStatus', (readyIn: number, total: number) =>
      paint(readyIn, total),
    );
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

  private drawHpFill(
    hp: number,
    max: number,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const pct = Math.max(0, hp / max);
    const fill = pct > 0.5 ? 0xcc2222 : pct > 0.25 ? 0xcc6600 : 0xff1111;
    const glow = pct > 0.5 ? 0xff3333 : pct > 0.25 ? 0xff8800 : 0xff4444;

    this.hpFill.clear();

    this.hpFill.fillStyle(fill, 1);
    this.hpFill.fillRect(x + 1, y + 1, Math.round((w - 2) * pct), h - 2);

    this.hpFill.fillStyle(glow, 0.5);
    this.hpFill.fillRect(x + 1, y + 1, Math.round((w - 2) * pct), 4);

    this.hpText.setText(`${Math.ceil(hp)} / ${max}`);
  }

  private drawXpFill(xp: number, next: number, H: number, XP_H: number): void {
    const pct = next > 0 ? Math.min(1, xp / next) : 1;

    this.xpFill.clear();
    this.xpFill.fillStyle(0x1155cc, 1);
    this.xpFill.fillRect(
      1,
      H - XP_H + 1,
      Math.round((CFG.WIDTH - 2) * pct),
      XP_H - 2,
    );

    this.xpFill.fillStyle(0x3399ff, 0.5);
    this.xpFill.fillRect(
      1,
      H - XP_H + 1,
      Math.round((CFG.WIDTH - 2) * pct),
      3,
    );
  }

  private updateTimer(totalSeconds: number): void {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');

    this.timerText.setText(`${m}:${s}`);
  }

  private showWaveMsg(msg: string): void {
    this.waveMsg.setText(msg).setAlpha(1).setScale(1.3);

    this.tweens.add({
      targets: this.waveMsg,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back',
    });

    this.tweens.add({
      targets: this.waveMsg,
      alpha: 0,
      delay: 2800,
      duration: 600,
    });
  }

  private buildGameOver(W: number, H: number): void {
    this.gameOverGrp = this.add.container(W / 2, H / 2).setVisible(false).setDepth(200);

    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.85).setOrigin(0.5);

    const border = this.add.graphics();
    border.lineStyle(2, 0x6b0000, 1);
    border.strokeRect(-W / 2 + 20, -H / 2 + 20, W - 40, H - 40);
    border.lineStyle(1, 0xaa0000, 0.5);
    border.strokeRect(-W / 2 + 28, -H / 2 + 28, W - 56, H - 56);

    const skull = this.add.text(0, -H / 2 + 60, '💀', {
      fontSize: '48px',
    }).setOrigin(0.5);

    const goText = this.add.text(0, -70, 'GAME OVER', {
      fontSize: '52px',
      color: '#cc0000',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.gameOverScoreText = this.add.text(0, 5, '', {
      fontSize: '16px',
      color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    const subText = this.add.text(0, 95, 'A escuridão te consumiu...', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    const restartText = this.add.text(0, 150, '[ Pressione R para renascer ]', {
      fontSize: '18px',
      color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: restartText,
      alpha: 0.3,
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: 'Sine',
    });

    this.gameOverGrp.add([
      bg,
      border,
      skull,
      goText,
      this.gameOverScoreText,
      subText,
      restartText,
    ]);
  }

  private updateGameOverScoreText(): void {
    const currentScore = getCurrentScore();

    this.gameOverScoreText.setText(
      `Pontuação: ${currentScore.score}\n` +
      `Tempo: ${this.formatTime(currentScore.survivalTime)}\n` +
      `Kills: ${currentScore.kills}`,
    );
  }

  private async saveFinalScore(): Promise<void> {
    if (this.finalScoreSaved) {
      return;
    }

    this.finalScoreSaved = true;

    const user = auth.currentUser;

    if (!user) {
      return;
    }

    const currentScore = getCurrentScore();

    try {
      await savePlayerScore(
        user.uid,
        currentScore.score,
        currentScore.kills,
        currentScore.survivalTime,
      );
    } catch (error) {
      console.error('Erro ao salvar pontuação no ranking:', error);
    }
  }

  private showGameOver(): void {
    this.updateGameOverScoreText();

    this.gameOverGrp.setVisible(true);
    this.gameOverGrp.setAlpha(0);

    this.tweens.add({
      targets: this.gameOverGrp,
      alpha: 1,
      duration: 1000,
      ease: 'Power2',
    });
  }

  private formatTime(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');

    return `${m}:${s}`;
  }
}