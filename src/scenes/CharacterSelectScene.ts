import Phaser from 'phaser';
import { CFG, CharacterDef } from '../config';
import { Sfx } from '../utils/Sfx';

// =============================================================
//  CharacterSelectScene — escolha do herói antes da partida
// =============================================================
export class CharacterSelectScene extends Phaser.Scene {
  private starting = false;
  private mode: 'solo' | 'online' = 'solo';

  constructor() {
    super({ key: 'CharSelect' });
  }

  init(data: { mode?: 'solo' | 'online' }): void {
    this.mode = data?.mode ?? 'solo';
  }

  create(): void {
    this.starting = false;

    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;

    this.add.tileSprite(0, 0, W, H, 'bg_tile').setOrigin(0).setDepth(0);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(1);

    this.add.text(W / 2, 40, '✦  ESCOLHA SEU HERÓI  ✦', {
      fontSize: '30px',
      color: '#d4af37',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(W / 2, 80, 'Cada herói possui atributos e uma habilidade única (ESPAÇO)', {
      fontSize: '13px',
      color: '#6a6a8a',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10);

    const chars = Object.values(CFG.CHARACTERS);
    const cardW = 270;
    const cardH = 420;
    const gap   = 24;
    const totalW = chars.length * cardW + (chars.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const startY = 108;

    chars.forEach((c, i) => {
      this.buildCharCard(startX + i * (cardW + gap), startY, cardW, cardH, c, i + 1);
    });

    this.add.text(W / 2, H - 36, 'Pressione 1, 2 ou 3 — ou clique no herói', {
      fontSize: '12px',
      color: '#555577',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10);

    this.buildBackButton();

    // Atalhos de teclado
    [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
    ].forEach((code, i) => {
      if (i < chars.length) {
        this.input.keyboard!.addKey(code).on('down', () => this.choose(chars[i].id));
      }
    });

    this.input.keyboard!.addKey('ESC').on('down', () => {
      if (!this.starting) this.scene.start('Menu');
    });
  }

  private buildCharCard(
    x: number,
    y: number,
    w: number,
    h: number,
    c: CharacterDef,
    num: number,
  ): void {
    const cx = x + w / 2;

    const bg = this.add.graphics().setDepth(5);

    const draw = (hover: boolean) => {
      bg.clear();
      // Sombra
      bg.fillStyle(0x000000, 0.5);
      bg.fillRect(x + 5, y + 5, w, h);
      // Corpo
      bg.fillStyle(hover ? 0x16082e : 0x0c0c18, 1);
      bg.fillRect(x, y, w, h);
      // Faixa superior
      bg.fillStyle(hover ? 0x2d1255 : 0x180a30, 1);
      bg.fillRect(x, y, w, 120);
      // Borda
      bg.lineStyle(2, hover ? 0xffd700 : 0xd4af37, hover ? 1 : 0.7);
      bg.strokeRect(x, y, w, h);
      bg.lineStyle(1, hover ? 0x9b59b6 : 0x4a1f75, 0.7);
      bg.strokeRect(x + 5, y + 5, w - 10, h - 10);
    };

    draw(false);

    // Número do atalho
    this.add.text(x + 12, y + 10, `[${num}]`, {
      fontSize: '13px',
      color: '#666688',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setDepth(8);

    // Retrato (sprite ampliado, pixelado)
    const portrait = this.add.image(cx, y + 66, c.texture)
      .setScale(2.8)
      .setDepth(8);

    // Nome e título
    this.add.text(cx, y + 132, `${c.icon} ${c.name}`, {
      fontSize: '20px',
      color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(8);

    this.add.text(cx, y + 154, c.title, {
      fontSize: '11px',
      color: '#9070b0',
      fontFamily: 'Cinzel, Georgia, serif',
      fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(8);

    // Descrição
    this.add.text(cx, y + 176, c.desc, {
      fontSize: '11px',
      color: '#8888aa',
      fontFamily: 'Cinzel, Georgia, serif',
      align: 'center',
      wordWrap: { width: w - 30 },
      lineSpacing: 3,
    }).setOrigin(0.5, 0).setDepth(8);

    // Barras de atributos
    this.buildStatBars(x, y + 234, w, c);

    // Separador
    const sep = this.add.graphics().setDepth(8);
    sep.lineStyle(1, 0x4a1f75, 0.7);
    sep.lineBetween(x + 20, y + 318, x + w - 20, y + 318);

    // Habilidade
    this.add.text(cx, y + 330, `${c.ability.icon} ${c.ability.name}`, {
      fontSize: '14px',
      color: '#66ddff',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(8);

    this.add.text(cx, y + 350, c.ability.desc, {
      fontSize: '10px',
      color: '#7799bb',
      fontFamily: 'Cinzel, Georgia, serif',
      align: 'center',
      wordWrap: { width: w - 36 },
    }).setOrigin(0.5, 0).setDepth(8);

    // Suprema (Q)
    this.add.text(cx, y + h - 40, `${c.ultimate.icon} Suprema: ${c.ultimate.name}`, {
      fontSize: '11px',
      color: '#ffaa33',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(8);

    this.add.text(
      cx,
      y + h - 22,
      `Recarga: ${(c.ability.cooldownMs / 1000).toFixed(0)}s  •  Arma: ${this.weaponName(c.startWeapon)}`,
      {
        fontSize: '10px',
        color: '#555577',
        fontFamily: 'Cinzel, Georgia, serif',
      },
    ).setOrigin(0.5).setDepth(8);

    // Hitbox interativa
    const hitbox = this.add.rectangle(cx, y + h / 2, w, h, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);

    hitbox.on('pointerover', () => {
      draw(true);
      portrait.setScale(3.1);
    });
    hitbox.on('pointerout', () => {
      draw(false);
      portrait.setScale(2.8);
    });
    hitbox.on('pointerdown', () => this.choose(c.id));
  }

  private buildStatBars(x: number, y: number, w: number, c: CharacterDef): void {
    // Normalização relativa entre os personagens
    const stats: Array<{ label: string; value: number; max: number; color: number }> = [
      { label: 'VIDA',       value: c.maxHp,                 max: 150, color: 0xcc2222 },
      { label: 'VELOCIDADE', value: c.speed,                 max: 220, color: 0x22aa55 },
      { label: 'DANO',       value: c.damageMult * 100,      max: 130, color: 0xcc8800 },
      { label: 'CADÊNCIA',   value: (2 - c.cooldownMult) * 100, max: 115, color: 0x3388cc },
    ];

    const barX = x + 92;
    const barW = w - 92 - 24;
    const barH = 8;

    const g = this.add.graphics().setDepth(8);

    stats.forEach((s, i) => {
      const by = y + i * 20;

      this.add.text(x + 22, by - 1, s.label, {
        fontSize: '9px',
        color: '#777799',
        fontFamily: 'Cinzel, Georgia, serif',
      }).setDepth(8);

      g.fillStyle(0x111122, 1);
      g.fillRect(barX, by, barW, barH);

      const pct = Phaser.Math.Clamp(s.value / s.max, 0, 1);
      g.fillStyle(s.color, 1);
      g.fillRect(barX, by, Math.round(barW * pct), barH);

      g.lineStyle(1, 0x333355, 0.9);
      g.strokeRect(barX, by, barW, barH);
    });
  }

  private weaponName(id: string): string {
    const info = CFG.WEAPON_INFO[id];
    if (!info) return id;
    return info.label.split(' ').slice(1).join(' ');
  }

  private buildBackButton(): void {
    const txt = this.add.text(18, 18, '← VOLTAR (ESC)', {
      fontSize: '12px',
      color: '#8888aa',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setDepth(20).setInteractive({ useHandCursor: true });

    txt.on('pointerover', () => txt.setColor('#ffffff'));
    txt.on('pointerout',  () => txt.setColor('#8888aa'));
    txt.on('pointerdown', () => {
      if (!this.starting) this.scene.start('Menu');
    });
  }

  private choose(charId: string): void {
    if (this.starting) return;
    this.starting = true;

    Sfx.upgradeChoose(this);
    this.registry.set('characterId', charId);

    this.cameras.main.flash(250, 212, 175, 55);
    this.time.delayedCall(200, () => {
      if (this.mode === 'online') {
        this.scene.start('Room');
      } else {
        this.scene.start('Game', { characterId: charId });
      }
    });
  }
}
