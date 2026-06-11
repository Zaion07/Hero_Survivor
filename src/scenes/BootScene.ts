import Phaser from 'phaser';
import { CFG } from '../config';

// =============================================================
//  BootScene — gera todas as texturas proceduralmente
//  Tema dungeon / RPG gótico — sem assets externos
// =============================================================
export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }

  create(): void {
    this.makeMage();
    this.makeKnight();
    this.makeRanger();
    this.makeCommonBat();
    this.makeFastWraith();
    this.makeTankGolem();
    this.makeBruteExecutioner();
    this.makeShooterEye();
    this.makeFlankerShadow();
    this.makeGuardian();
    this.makeMinibossNecromancer();
    this.makeMinibossWarlord();
    this.makeBossDemon();
    this.makeBossAbyssTitan();
    this.makeXPGem();
    this.makeItems();
    this.makeProjectiles();
    this.makeWeaponSprites();
    this.makeStoneTile();
    this.makeVignette();
    this.scene.start('Menu');
  }

  // ── Utilitário: cria um Graphics fora da cena ─────────────
  private gfx(w: number, h: number): Phaser.GameObjects.Graphics {
    return this.make.graphics({ x: 0, y: 0 }, false);
  }

  // ── MAGE — Arcanista: aventureiro com capa roxa ──────────
  private makeMage(): void {
    const g = this.gfx(32, 32);

    // Capa — corpo
    g.fillStyle(0x4a1f75, 1);
    g.fillRect(8, 14, 16, 18);

    // Dobras da capa
    g.fillStyle(0x6a2fa5, 1);
    g.fillRect(8, 14, 6, 16);
    g.fillRect(18, 14, 6, 16);

    // Ombros com pauldrons
    g.fillStyle(0x7b3db5, 1);
    g.fillRect(4, 12, 7, 6);
    g.fillRect(21, 12, 7, 6);
    // Spikes nos ombros
    g.fillStyle(0xc0a000, 1);
    g.fillTriangle(5, 12, 8, 12, 6, 8);
    g.fillTriangle(24, 12, 27, 12, 26, 8);

    // Pescoço
    g.fillStyle(0xc8956c, 1);
    g.fillRect(13, 10, 6, 5);

    // Cabeça
    g.fillStyle(0xc8956c, 1);
    g.fillCircle(16, 8, 7);

    // Capuz / capote
    g.fillStyle(0x35145a, 1);
    g.fillTriangle(9, 11, 23, 11, 16, 1);
    g.fillRect(9, 6, 14, 6);

    // Olhos brilhantes (ciano)
    g.fillStyle(0x00e5ff, 1);
    g.fillRect(11, 7, 3, 2);
    g.fillRect(18, 7, 3, 2);
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(11, 7, 1, 1);
    g.fillRect(18, 7, 1, 1);

    // Orbe mágico na mão direita
    g.fillStyle(0x220044, 1);
    g.fillCircle(25, 22, 5);
    g.fillStyle(0x9900ff, 0.9);
    g.fillCircle(25, 22, 3);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(23, 20, 1, 1);

    g.generateTexture('player_MAGE', 32, 32);
    g.destroy();
  }

  // ── KNIGHT — Cavaleiro: armadura de aço e escudo ─────────
  private makeKnight(): void {
    const g = this.gfx(32, 32);

    // Corpo — armadura de aço
    g.fillStyle(0x6b7080, 1);
    g.fillRect(8, 14, 16, 18);

    // Placas do peitoral
    g.fillStyle(0x8a90a5, 1);
    g.fillRect(9, 15, 14, 6);
    g.fillRect(9, 23, 14, 4);

    // Ombros com pauldrons largos
    g.fillStyle(0x9aa0b5, 1);
    g.fillRect(3, 12, 8, 7);
    g.fillRect(21, 12, 8, 7);
    g.fillStyle(0xd4af37, 1);
    g.fillRect(3, 12, 8, 2);
    g.fillRect(21, 12, 8, 2);

    // Pescoço
    g.fillStyle(0xc8956c, 1);
    g.fillRect(13, 10, 6, 5);

    // Elmo
    g.fillStyle(0x7b8095, 1);
    g.fillCircle(16, 8, 7);
    g.fillStyle(0x595e70, 1);
    g.fillRect(9, 6, 14, 4);

    // Pluma vermelha
    g.fillStyle(0xaa1122, 1);
    g.fillRect(14, 0, 4, 4);
    g.fillTriangle(14, 0, 18, 0, 16, -2);

    // Visor com olhos brilhantes
    g.fillStyle(0x101018, 1);
    g.fillRect(10, 7, 12, 3);
    g.fillStyle(0x66ccff, 1);
    g.fillRect(11, 7, 3, 2);
    g.fillRect(18, 7, 3, 2);

    // Escudo na mão esquerda
    g.fillStyle(0x3a3f50, 1);
    g.fillRect(2, 18, 8, 11);
    g.fillStyle(0xd4af37, 1);
    g.fillRect(5, 21, 2, 5);
    g.lineStyle(1, 0xd4af37, 0.9);
    g.strokeRect(2, 18, 8, 11);

    // Espada na mão direita
    g.fillStyle(0xd6d6d6, 1);
    g.fillRect(26, 12, 2, 14);
    g.fillStyle(0x8a5a20, 1);
    g.fillRect(24, 25, 6, 2);

    g.generateTexture('player_KNIGHT', 32, 32);
    g.destroy();
  }

  // ── RANGER — Caçadora: capuz verde e arco ────────────────
  private makeRanger(): void {
    const g = this.gfx(32, 32);

    // Capa — corpo
    g.fillStyle(0x1e4d2b, 1);
    g.fillRect(8, 14, 16, 18);

    // Dobras da capa
    g.fillStyle(0x2e6d3f, 1);
    g.fillRect(8, 14, 6, 16);
    g.fillRect(18, 14, 6, 16);

    // Cinto com adaga
    g.fillStyle(0x5a3a1a, 1);
    g.fillRect(8, 24, 16, 2);
    g.fillStyle(0xc0c0c0, 1);
    g.fillRect(20, 26, 2, 5);

    // Ombros
    g.fillStyle(0x3a7d4f, 1);
    g.fillRect(5, 12, 6, 5);
    g.fillRect(21, 12, 6, 5);

    // Pescoço
    g.fillStyle(0xd8a57c, 1);
    g.fillRect(13, 10, 6, 5);

    // Cabeça
    g.fillStyle(0xd8a57c, 1);
    g.fillCircle(16, 8, 7);

    // Capuz verde
    g.fillStyle(0x143a1f, 1);
    g.fillTriangle(9, 11, 23, 11, 16, 1);
    g.fillRect(9, 6, 14, 5);

    // Olhos âmbar
    g.fillStyle(0xffcc44, 1);
    g.fillRect(11, 7, 3, 2);
    g.fillRect(18, 7, 3, 2);
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(11, 7, 1, 1);
    g.fillRect(18, 7, 1, 1);

    // Arco nas costas (curva à direita)
    g.lineStyle(2, 0x7a4a1a, 1);
    g.beginPath();
    g.arc(25, 20, 9, -Math.PI / 2.2, Math.PI / 2.2, false);
    g.strokePath();
    // Corda do arco
    g.lineStyle(1, 0xdddddd, 0.9);
    g.lineBetween(25, 11, 25, 29);

    g.generateTexture('player_RANGER', 32, 32);
    g.destroy();
  }

  // ── COMMON — Morcego (28×28, r=14) ───────────────────────
  private makeCommonBat(): void {
    const g = this.gfx(28, 28);

    // Asas (triângulos)
    g.fillStyle(0x660000, 1);
    g.fillTriangle(0, 8, 12, 14, 2, 24);
    g.fillTriangle(0, 8, 10, 2, 12, 14);
    g.fillTriangle(28, 8, 16, 14, 26, 24);
    g.fillTriangle(28, 8, 18, 2, 16, 14);

    // Membrana translúcida
    g.fillStyle(0x990000, 0.55);
    g.fillTriangle(2, 9, 12, 14, 4, 22);
    g.fillTriangle(26, 9, 16, 14, 24, 22);

    // Corpo central
    g.fillStyle(0x3a0000, 1);
    g.fillCircle(14, 14, 7);

    // Orelhas
    g.fillStyle(0x550000, 1);
    g.fillTriangle(8, 9, 11, 3, 13, 9);
    g.fillTriangle(20, 9, 17, 3, 15, 9);

    // Olhos vermelhos
    g.fillStyle(0xff2222, 1);
    g.fillCircle(11, 13, 2);
    g.fillCircle(17, 13, 2);
    g.fillStyle(0xff8888, 1);
    g.fillRect(10, 12, 1, 1);
    g.fillRect(16, 12, 1, 1);

    // Presas
    g.fillStyle(0xffffff, 1);
    g.fillRect(12, 17, 2, 3);
    g.fillRect(15, 17, 2, 3);

    g.generateTexture('enemy_COMMON', 28, 28);
    g.destroy();
  }

  // ── FAST — Espírito (20×20, r=10) ────────────────────────
  private makeFastWraith(): void {
    const g = this.gfx(20, 20);

    // Cauda espectral (3 pontas)
    g.fillStyle(0xd4860a, 0.5);
    g.fillTriangle(2, 14, 7, 20, 10, 14);
    g.fillTriangle(8, 14, 13, 20, 16, 14);
    g.fillTriangle(14, 14, 18, 20, 20, 14);

    // Corpo principal
    g.fillStyle(0xf39c12, 0.9);
    g.fillCircle(10, 9, 8);

    // Brilho interno
    g.fillStyle(0xffd700, 0.5);
    g.fillCircle(10, 8, 4);

    // Olhos ocos
    g.fillStyle(0x0a0500, 1);
    g.fillEllipse(7, 8, 4, 5);
    g.fillEllipse(13, 8, 4, 5);

    // Brilho nos olhos
    g.fillStyle(0xff7700, 0.9);
    g.fillCircle(7, 7, 1);
    g.fillCircle(13, 7, 1);

    // Boca
    g.fillStyle(0x0a0500, 1);
    g.fillRect(6, 13, 8, 2);

    g.generateTexture('enemy_FAST', 20, 20);
    g.destroy();
  }

  // ── TANK — Golem (44×44, r=22) ───────────────────────────
  private makeTankGolem(): void {
    const g = this.gfx(44, 44);

    // Sombra
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(22, 42, 30, 6);

    // Pernas
    g.fillStyle(0x3e3355, 1);
    g.fillRect(9, 30, 9, 12);
    g.fillRect(26, 30, 9, 12);

    // Corpo
    g.fillStyle(0x4e4268, 1);
    g.fillRect(6, 16, 32, 18);

    // Rachaduras de pedra
    g.lineStyle(1, 0x2a1f40, 0.9);
    g.lineBetween(6, 22, 38, 22);
    g.lineBetween(6, 28, 38, 28);
    g.lineBetween(15, 16, 15, 34);
    g.lineBetween(29, 16, 29, 34);

    // Braços grandes
    g.fillStyle(0x3e3355, 1);
    g.fillRect(0, 17, 8, 15);
    g.fillRect(36, 17, 8, 15);

    // Punhos
    g.fillStyle(0x5a4e7a, 1);
    g.fillRect(-1, 28, 10, 8);
    g.fillRect(35, 28, 10, 8);

    // Cabeça
    g.fillStyle(0x5a4e7a, 1);
    g.fillRect(10, 4, 24, 14);

    // Barra superior da cabeça
    g.fillStyle(0x3e3355, 1);
    g.fillRect(10, 4, 24, 3);

    // Olhos com brilho roxo
    g.fillStyle(0x6a1a9a, 1);
    g.fillRect(13, 8, 6, 5);
    g.fillRect(25, 8, 6, 5);
    g.fillStyle(0xdd44ff, 1);
    g.fillRect(14, 9, 2, 2);
    g.fillRect(26, 9, 2, 2);

    // Runa no peito
    g.lineStyle(1.5, 0x9955cc, 0.8);
    g.lineBetween(22, 18, 22, 32);
    g.lineBetween(13, 25, 31, 25);

    g.generateTexture('enemy_TANK', 44, 44);
    g.destroy();
  }

  // ── BRUTE — Carrasco (52×52, r=26) ───────────────────────
  private makeBruteExecutioner(): void {
    const g = this.gfx(52, 52);

    // Sombra
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(26, 49, 36, 8);

    // Pernas
    g.fillStyle(0x2a1010, 1);
    g.fillRect(14, 34, 9, 16);
    g.fillRect(29, 34, 9, 16);

    // Peitoral
    g.fillStyle(0x4a1f1f, 1);
    g.fillRect(10, 16, 32, 22);
    g.fillStyle(0x6d2f2f, 1);
    g.fillRect(10, 16, 32, 4);

    // Ombreiras
    g.fillStyle(0x3a1414, 1);
    g.fillRect(6, 16, 8, 10);
    g.fillRect(38, 16, 8, 10);

    // Cabeça
    g.fillStyle(0x5a2626, 1);
    g.fillRect(14, 4, 24, 14);
    g.fillStyle(0x2a0a0a, 1);
    g.fillRect(18, 8, 16, 6);

    // Olhos
    g.fillStyle(0xff5533, 1);
    g.fillRect(20, 9, 4, 2);
    g.fillRect(28, 9, 4, 2);

    // Machado
    g.fillStyle(0x2b1b12, 1);
    g.fillRect(43, 6, 3, 40);
    g.fillStyle(0x9b9b9b, 1);
    g.fillRect(38, 4, 13, 8);
    g.fillStyle(0xd6d6d6, 1);
    g.fillTriangle(50, 4, 52, 8, 50, 12);

    g.generateTexture('enemy_BRUTE', 52, 52);
    g.destroy();
  }

  // ── SHOOTER — Olho Maldito (24×24, r=12) ─────────────────
  private makeShooterEye(): void {
    const g = this.gfx(24, 24);

    // Tentáculos inferiores
    g.fillStyle(0x115566, 0.8);
    g.fillTriangle(6, 16, 4, 24, 9, 18);
    g.fillTriangle(11, 17, 11, 24, 14, 18);
    g.fillTriangle(17, 16, 20, 24, 15, 18);

    // Globo ocular
    g.fillStyle(0x1a7a99, 1);
    g.fillCircle(12, 11, 9);
    g.fillStyle(0x22aacc, 1);
    g.fillCircle(12, 10, 7);

    // Esclera
    g.fillStyle(0xddeef5, 1);
    g.fillCircle(12, 10, 5);

    // Íris e pupila
    g.fillStyle(0x6a1a9a, 1);
    g.fillCircle(12, 10, 3);
    g.fillStyle(0x05000f, 1);
    g.fillCircle(12, 10, 1.5);

    // Brilho
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(10, 7, 2, 2);

    // Veias
    g.lineStyle(1, 0xcc3333, 0.6);
    g.lineBetween(8, 13, 10, 11);
    g.lineBetween(16, 13, 14, 11);

    g.generateTexture('enemy_SHOOTER', 24, 24);
    g.destroy();
  }

  // ── FLANKER — Sombra Caçadora (26×26, r=13) ──────────────
  private makeFlankerShadow(): void {
    const g = this.gfx(26, 26);

    // Manto esfumaçado
    g.fillStyle(0x2a2a44, 0.92);
    g.fillTriangle(13, 1, 2, 24, 24, 24);
    g.fillStyle(0x44446a, 0.85);
    g.fillTriangle(13, 4, 6, 22, 20, 22);

    // Farrapos da base
    g.fillStyle(0x1a1a30, 0.9);
    g.fillTriangle(4, 24, 8, 18, 10, 24);
    g.fillTriangle(11, 24, 14, 19, 17, 24);
    g.fillTriangle(18, 24, 21, 19, 23, 24);

    // Capuz
    g.fillStyle(0x14142a, 1);
    g.fillCircle(13, 8, 6);

    // Olhos predadores
    g.fillStyle(0xcc66ff, 1);
    g.fillRect(10, 7, 3, 2);
    g.fillRect(15, 7, 3, 2);
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(10, 7, 1, 1);
    g.fillRect(15, 7, 1, 1);

    // Garra
    g.fillStyle(0x9999bb, 0.9);
    g.fillTriangle(22, 12, 26, 10, 24, 16);

    g.generateTexture('enemy_FLANKER', 26, 26);
    g.destroy();
  }

  // ── GUARDIAN — Guardião Ancestral (60×60, r=30) ──────────
  private makeGuardian(): void {
    const g = this.gfx(60, 60);

    // Sombra
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(30, 57, 40, 8);

    // Pernas de pedra
    g.fillStyle(0x1d5c3a, 1);
    g.fillRect(14, 42, 12, 16);
    g.fillRect(34, 42, 12, 16);

    // Corpo musgo e pedra
    g.fillStyle(0x2e8b57, 1);
    g.fillRect(10, 20, 40, 26);
    g.fillStyle(0x1d5c3a, 1);
    g.fillRect(10, 20, 40, 5);

    // Rachaduras
    g.lineStyle(1, 0x0e3520, 0.9);
    g.lineBetween(18, 25, 18, 44);
    g.lineBetween(30, 25, 30, 44);
    g.lineBetween(42, 25, 42, 44);

    // Braços enormes
    g.fillStyle(0x236b45, 1);
    g.fillRect(0, 22, 10, 20);
    g.fillRect(50, 22, 10, 20);
    g.fillStyle(0x2e8b57, 1);
    g.fillRect(0, 36, 11, 10);
    g.fillRect(49, 36, 11, 10);

    // Cabeça
    g.fillStyle(0x36a567, 1);
    g.fillRect(16, 4, 28, 18);
    g.fillStyle(0x1d5c3a, 1);
    g.fillRect(16, 4, 28, 4);

    // Olhos rúnicos dourados
    g.fillStyle(0xffd24a, 1);
    g.fillRect(21, 11, 6, 4);
    g.fillRect(33, 11, 6, 4);
    g.fillStyle(0xfff2bb, 1);
    g.fillRect(22, 12, 2, 2);
    g.fillRect(34, 12, 2, 2);

    // Runa no peito
    g.lineStyle(1.5, 0xffd24a, 0.85);
    g.strokeCircle(30, 32, 7);
    g.lineBetween(30, 25, 30, 39);

    g.generateTexture('enemy_GUARDIAN', 60, 60);
    g.destroy();
  }

  // ── MINIBOSS — Necromante (68×68, r=34) ──────────────────
  private makeMinibossNecromancer(): void {
    const g = this.gfx(68, 68);

    // Sombra
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(34, 65, 44, 8);

    // Manto inferior (flare)
    g.fillStyle(0x0e0022, 1);
    g.fillTriangle(12, 26, 34, 67, 56, 26);

    // Corpo do manto
    g.fillStyle(0x1a0033, 1);
    g.fillRect(18, 24, 32, 40);

    // Detalhes do manto
    g.fillStyle(0x2a0055, 1);
    g.fillRect(32, 28, 4, 36);
    g.lineStyle(1, 0x5500aa, 0.5);
    g.lineBetween(22, 32, 22, 62);
    g.lineBetween(46, 32, 46, 62);

    // Tronco
    g.fillStyle(0x220044, 1);
    g.fillRect(24, 24, 20, 18);

    // Ombros pontiagudos
    g.fillStyle(0x330066, 1);
    g.fillTriangle(8, 20, 22, 24, 16, 34);
    g.fillTriangle(60, 20, 46, 24, 52, 34);

    // Crânio — cabeça
    g.fillStyle(0xd4cbb0, 1);
    g.fillCircle(34, 16, 13);

    // Mandíbula
    g.fillStyle(0xc4bba0, 1);
    g.fillRect(26, 22, 16, 7);

    // Órbitas (olhos)
    g.fillStyle(0x05000f, 1);
    g.fillCircle(28, 14, 5);
    g.fillCircle(40, 14, 5);

    // Brilho roxo nos olhos
    g.fillStyle(0x8800ee, 1);
    g.fillCircle(28, 14, 3);
    g.fillCircle(40, 14, 3);
    g.fillStyle(0xcc55ff, 1);
    g.fillRect(27, 13, 1, 1);
    g.fillRect(39, 13, 1, 1);

    // Dentes
    g.fillStyle(0xeeeeee, 1);
    for (let i = 0; i < 5; i++) {
      g.fillRect(27 + i * 3, 26, 2, 4);
    }

    // Cajado
    g.fillStyle(0x3a2200, 1);
    g.fillRect(57, 8, 4, 58);
    g.fillStyle(0x5a3300, 1);
    g.fillRect(58, 8, 2, 58);

    // Orbe no cajado
    g.fillStyle(0x220044, 1);
    g.fillCircle(59, 7, 8);
    g.fillStyle(0x8800ee, 0.85);
    g.fillCircle(59, 7, 5);
    g.fillStyle(0xcc55ff, 0.6);
    g.fillRect(56, 5, 2, 2);

    // Runa no peito
    g.lineStyle(1, 0x9900ff, 0.8);
    g.lineBetween(34, 26, 34, 40);
    g.lineBetween(26, 33, 42, 33);

    g.generateTexture('enemy_MINIBOSS', 68, 68);
    g.destroy();
  }

  // ── MINIBOSS_WARLORD — Lorde da Guerra (76×76, r=38) ─────
  private makeMinibossWarlord(): void {
    const g = this.gfx(76, 76);

    // Sombra
    g.fillStyle(0x000000, 0.42);
    g.fillEllipse(38, 72, 48, 10);

    // Capa
    g.fillStyle(0x180606, 1);
    g.fillTriangle(14, 30, 38, 74, 62, 30);

    // Corpo
    g.fillStyle(0x4a1111, 1);
    g.fillRect(20, 24, 36, 40);
    g.fillStyle(0x7a2a2a, 1);
    g.fillRect(20, 24, 36, 5);

    // Braços
    g.fillStyle(0x3a0e0e, 1);
    g.fillRect(10, 26, 10, 24);
    g.fillRect(56, 26, 10, 24);

    // Elmo
    g.fillStyle(0x2a0808, 1);
    g.fillRect(23, 8, 30, 18);
    g.fillStyle(0x7a1f1f, 1);
    g.fillRect(23, 8, 30, 4);

    // Chifres
    g.fillStyle(0xbca080, 1);
    g.fillTriangle(23, 12, 16, 4, 27, 14);
    g.fillTriangle(53, 12, 60, 4, 49, 14);

    // Olhos
    g.fillStyle(0xffaa44, 1);
    g.fillRect(29, 14, 5, 3);
    g.fillRect(42, 14, 5, 3);

    // Espadão
    g.fillStyle(0x4a4a4a, 1);
    g.fillRect(66, 10, 4, 50);
    g.fillStyle(0xd6d6d6, 1);
    g.fillTriangle(66, 8, 70, 8, 68, 2);
    g.fillStyle(0x2b1b12, 1);
    g.fillRect(65, 58, 6, 6);

    g.generateTexture('enemy_MINIBOSS_WARLORD', 76, 76);
    g.destroy();
  }

  // ── BOSS — Senhor do Vazio (120×120, r=60) ───────────────
  //  Tema: roxo profundo, runas ciano, olhos dourados, ossos
  private makeBossDemon(): void {
    const S = 120;
    const g = this.gfx(S, S);

    // ── Aura / brilho externo ─────────────────────────────
    g.fillStyle(0x1a0044, 0.55);
    g.fillCircle(60, 60, 59);

    // ── Asas enormes ──────────────────────────────────────
    // Asa esquerda
    g.fillStyle(0x1e0055, 0.95);
    g.fillTriangle(0, 30, 32, 56, 6, 96);
    g.fillTriangle(0, 30, 22, 18, 32, 56);
    // Membrana esquerda
    g.fillStyle(0x3300aa, 0.4);
    g.fillTriangle(4, 34, 30, 56, 8, 88);
    // Asa direita
    g.fillStyle(0x1e0055, 0.95);
    g.fillTriangle(120, 30, 88, 56, 114, 96);
    g.fillTriangle(120, 30, 98, 18, 88, 56);
    // Membrana direita
    g.fillStyle(0x3300aa, 0.4);
    g.fillTriangle(116, 34, 90, 56, 112, 88);

    // Costelas das asas (ciano brilhante)
    g.lineStyle(1.5, 0x00ccaa, 0.6);
    g.lineBetween(8, 34, 28, 56);
    g.lineBetween(4, 46, 26, 64);
    g.lineBetween(112, 34, 92, 56);
    g.lineBetween(116, 46, 94, 64);

    // ── Cauda bifurcada ───────────────────────────────────
    g.fillStyle(0x2a0066, 1);
    g.fillTriangle(48, 104, 60, 88, 56, 118);
    g.fillTriangle(72, 104, 60, 88, 64, 118);
    g.fillStyle(0x6600cc, 0.7);
    g.fillTriangle(50, 104, 60, 90, 56, 115);

    // ── Corpo/tronco ──────────────────────────────────────
    g.fillStyle(0x18003a, 1);
    g.fillEllipse(60, 72, 58, 64);
    g.fillStyle(0x220055, 1);
    g.fillRect(32, 52, 56, 44);

    // Costelas ósseas (branco-acinzentado)
    g.lineStyle(1.5, 0xccbbee, 0.55);
    g.lineBetween(34, 60, 86, 60);
    g.lineBetween(34, 68, 86, 68);
    g.lineBetween(34, 76, 86, 76);
    g.lineBetween(34, 84, 86, 84);

    // ── Ombros com espinhos ───────────────────────────────
    g.fillStyle(0x4400aa, 1);
    g.fillRect(22, 50, 12, 20);
    g.fillRect(86, 50, 12, 20);
    // Espinhos
    g.fillStyle(0xddccff, 1);
    g.fillTriangle(22, 50, 28, 50, 25, 40);
    g.fillTriangle(86, 50, 92, 50, 89, 40);
    g.fillTriangle(26, 50, 32, 50, 29, 42);
    g.fillTriangle(88, 50, 94, 50, 91, 42);

    // ── Cabeça — crânio estilizado ────────────────────────
    g.fillStyle(0x22005a, 1);
    g.fillCircle(60, 38, 24);
    // Maxilar
    g.fillStyle(0x1a0044, 1);
    g.fillRect(44, 50, 32, 10);
    // Detalhes crânio
    g.fillStyle(0x330077, 1);
    g.fillRect(46, 38, 28, 14);

    // ── Chifres curvos ────────────────────────────────────
    g.fillStyle(0x0d0022, 1);
    g.fillTriangle(36, 26, 44, 12, 50, 28);
    g.fillTriangle(84, 26, 76, 12, 70, 28);
    // Brilho nos chifres
    g.fillStyle(0x6600cc, 0.5);
    g.fillTriangle(38, 26, 44, 14, 48, 28);
    g.fillTriangle(82, 26, 76, 14, 72, 28);

    // ── Olhos — 3 pares dourados (distinção visual chave) ─
    // Par superior
    g.fillStyle(0xffcc00, 1);
    g.fillEllipse(48, 30, 9, 6);
    g.fillEllipse(72, 30, 9, 6);
    g.fillStyle(0xfff0aa, 1);
    g.fillEllipse(48, 30, 5, 3);
    g.fillEllipse(72, 30, 5, 3);
    // Par central
    g.fillStyle(0xffaa00, 1);
    g.fillEllipse(44, 40, 7, 5);
    g.fillEllipse(76, 40, 7, 5);
    g.fillStyle(0xffe066, 1);
    g.fillEllipse(44, 40, 4, 3);
    g.fillEllipse(76, 40, 4, 3);
    // Par pequeno (testa)
    g.fillStyle(0xff8800, 0.9);
    g.fillCircle(55, 22, 3);
    g.fillCircle(65, 22, 3);
    g.fillStyle(0xffdd99, 1);
    g.fillCircle(55, 22, 1);
    g.fillCircle(65, 22, 1);

    // ── Boca com presas ósseas ────────────────────────────
    g.fillStyle(0x06000e, 1);
    g.fillRect(46, 50, 28, 5);
    g.fillStyle(0xeeddff, 1);
    g.fillTriangle(46, 50, 50, 50, 48, 57);
    g.fillTriangle(52, 50, 56, 50, 54, 56);
    g.fillTriangle(58, 50, 62, 50, 60, 55);
    g.fillTriangle(64, 50, 68, 50, 66, 57);
    g.fillTriangle(70, 50, 74, 50, 72, 56);

    // ── Runas ciano no peito ──────────────────────────────
    g.lineStyle(2.5, 0x00eedd, 0.9);
    g.lineBetween(60, 56, 60, 82);
    g.lineBetween(46, 69, 74, 69);
    g.lineBetween(49, 59, 71, 79);
    g.lineBetween(71, 59, 49, 79);
    // Brilho central
    g.fillStyle(0x00ccff, 0.3);
    g.fillCircle(60, 69, 10);
    g.fillStyle(0x6600ff, 0.4);
    g.fillCircle(60, 69, 5);

    g.generateTexture('enemy_BOSS', S, S);
    g.destroy();
  }

  // ── BOSS_ABYSS — Titã Abissal (136×136, r=68) ─────────────
  private makeBossAbyssTitan(): void {
    const S = 136;
    const g = this.gfx(S, S);

    // Aura externa
    g.fillStyle(0x090012, 0.6);
    g.fillCircle(68, 68, 66);

    // Corpo central
    g.fillStyle(0x1a0830, 1);
    g.fillEllipse(68, 74, 72, 84);
    g.fillStyle(0x2f0f57, 1);
    g.fillRect(36, 50, 64, 48);

    // Cabeça
    g.fillStyle(0x1e0a3a, 1);
    g.fillCircle(68, 38, 26);
    g.fillStyle(0x3f1670, 1);
    g.fillRect(48, 32, 40, 14);

    // Olhos
    g.fillStyle(0x55e6ff, 1);
    g.fillEllipse(58, 36, 12, 7);
    g.fillEllipse(78, 36, 12, 7);
    g.fillStyle(0xd5ffff, 1);
    g.fillCircle(58, 36, 2);
    g.fillCircle(78, 36, 2);

    // Braços tentaculares
    g.fillStyle(0x241046, 1);
    g.fillTriangle(20, 66, 40, 80, 16, 112);
    g.fillTriangle(116, 66, 96, 80, 120, 112);
    g.fillStyle(0x3a1e6b, 0.8);
    g.fillTriangle(24, 70, 38, 82, 22, 106);
    g.fillTriangle(112, 70, 98, 82, 114, 106);

    // Runas no peito
    g.lineStyle(2, 0x33d5ff, 0.9);
    g.lineBetween(68, 58, 68, 92);
    g.lineBetween(50, 75, 86, 75);
    g.lineBetween(54, 63, 82, 87);
    g.lineBetween(82, 63, 54, 87);

    // Dentes
    g.fillStyle(0xe8dcff, 1);
    g.fillTriangle(52, 48, 56, 48, 54, 56);
    g.fillTriangle(60, 48, 64, 48, 62, 57);
    g.fillTriangle(68, 48, 72, 48, 70, 56);
    g.fillTriangle(76, 48, 80, 48, 78, 57);

    g.generateTexture('enemy_BOSS_ABYSS', S, S);
    g.destroy();
  }

  // ── Gema de XP — cristal ciano (16×16) ───────────────────
  private makeXPGem(): void {
    const g = this.gfx(16, 16);

    // Sombra
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(8, 15, 10, 4);

    // Corpo do cristal
    g.fillStyle(0x008fa8, 1);
    g.fillTriangle(8, 1, 15, 7, 8, 15);
    g.fillTriangle(8, 1, 1, 7, 8, 15);

    // Faceta brilhante
    g.fillStyle(0x00d4f5, 0.85);
    g.fillTriangle(8, 2, 14, 7, 8, 13);

    // Brilho topo
    g.fillStyle(0xffffff, 0.9);
    g.fillTriangle(8, 3, 12, 6, 9, 3);
    g.fillRect(7, 4, 2, 1);

    g.generateTexture('xp_orb', 16, 16);
    g.destroy();
  }

  // ── Itens dropáveis por inimigos fortes ───────────────────
  private makeItems(): void {
    this.makeItemPotion();
    this.makeItemMagnet();
    this.makeItemBomb();
    this.makeItemFury();
    this.makeItemHaste();
  }

  // Poção Vital — frasco vermelho (14×18)
  private makeItemPotion(): void {
    const g = this.gfx(14, 18);

    // Sombra
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(7, 17, 10, 3);

    // Corpo do frasco
    g.fillStyle(0x2a0a0a, 1);
    g.fillCircle(7, 11, 6);
    g.fillStyle(0xcc1133, 1);
    g.fillCircle(7, 11, 5);

    // Líquido brilhante
    g.fillStyle(0xff4466, 0.9);
    g.fillCircle(6, 10, 3);
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(5, 8, 2, 2);

    // Gargalo
    g.fillStyle(0x884422, 1);
    g.fillRect(5, 2, 4, 5);

    // Rolha
    g.fillStyle(0xc8a060, 1);
    g.fillRect(4, 0, 6, 3);

    g.generateTexture('item_POTION', 14, 18);
    g.destroy();
  }

  // Ímã Arcano — ferradura ciana (16×16)
  private makeItemMagnet(): void {
    const g = this.gfx(16, 16);

    // Sombra
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(8, 15, 10, 3);

    // Corpo em U
    g.fillStyle(0x0099bb, 1);
    g.fillRect(2, 2, 4, 10);
    g.fillRect(10, 2, 4, 10);
    g.fillRect(2, 10, 12, 4);

    // Brilho interno
    g.fillStyle(0x33ddff, 0.8);
    g.fillRect(3, 3, 2, 8);
    g.fillRect(11, 3, 2, 8);

    // Pontas claras
    g.fillStyle(0xeeeeee, 1);
    g.fillRect(2, 0, 4, 3);
    g.fillRect(10, 0, 4, 3);

    g.generateTexture('item_MAGNET', 16, 16);
    g.destroy();
  }

  // Bomba Sombria — esfera negra com pavio (16×18)
  private makeItemBomb(): void {
    const g = this.gfx(16, 18);

    // Sombra
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(8, 17, 11, 3);

    // Corpo
    g.fillStyle(0x14081f, 1);
    g.fillCircle(8, 11, 6);
    g.fillStyle(0x2a1144, 1);
    g.fillCircle(7, 10, 4);

    // Brilho roxo
    g.fillStyle(0x8844cc, 0.7);
    g.fillCircle(6, 9, 2);

    // Pavio
    g.lineStyle(1.5, 0x886633, 1);
    g.lineBetween(9, 5, 12, 2);

    // Faísca
    g.fillStyle(0xffaa00, 1);
    g.fillCircle(12, 2, 2);
    g.fillStyle(0xffee66, 1);
    g.fillCircle(12, 2, 1);

    g.generateTexture('item_BOMB', 16, 18);
    g.destroy();
  }

  // Fúria Demoníaca — espada flamejante vermelha (14×18)
  private makeItemFury(): void {
    const g = this.gfx(14, 18);

    // Sombra
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(7, 17, 9, 3);

    // Lâmina
    g.fillStyle(0xdd2222, 1);
    g.fillTriangle(7, 0, 4, 11, 10, 11);
    g.fillStyle(0xff6644, 0.9);
    g.fillTriangle(7, 2, 6, 10, 8, 10);

    // Guarda
    g.fillStyle(0xc8a000, 1);
    g.fillRect(3, 11, 8, 2);

    // Cabo
    g.fillStyle(0x5a3a1a, 1);
    g.fillRect(6, 13, 2, 4);

    g.generateTexture('item_FURY', 14, 18);
    g.destroy();
  }

  // Botas da Pressa — bota verde alada (16×16)
  private makeItemHaste(): void {
    const g = this.gfx(16, 16);

    // Sombra
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(8, 15, 11, 3);

    // Cano da bota
    g.fillStyle(0x1e7d3f, 1);
    g.fillRect(5, 2, 5, 9);

    // Pé
    g.fillStyle(0x2a9d52, 1);
    g.fillRect(5, 9, 9, 5);

    // Sola
    g.fillStyle(0x14502a, 1);
    g.fillRect(5, 13, 9, 2);

    // Asa
    g.fillStyle(0xeeeecc, 0.95);
    g.fillTriangle(5, 4, 0, 2, 4, 8);
    g.fillTriangle(5, 6, 1, 6, 4, 9);

    g.generateTexture('item_HASTE', 16, 16);
    g.destroy();
  }

  // ── Sprites das armas de classe ───────────────────────────
  private makeWeaponSprites(): void {
    // Espada orbital / chuva de espadas (12×26)
    const gs = this.gfx(12, 26);
    gs.fillStyle(0xd6d6e6, 1);
    gs.fillTriangle(6, 0, 2, 16, 10, 16);
    gs.fillStyle(0xffffff, 0.8);
    gs.fillTriangle(6, 2, 5, 14, 7, 14);
    gs.fillStyle(0xc8a000, 1);
    gs.fillRect(1, 16, 10, 3);
    gs.fillStyle(0x5a3a1a, 1);
    gs.fillRect(5, 19, 2, 6);
    gs.fillStyle(0xc8a000, 1);
    gs.fillCircle(6, 25, 2);
    gs.generateTexture('proj_sword', 12, 26);
    gs.destroy();

    // Arco de corte da espada (64×64) — crescente
    const ga = this.gfx(64, 64);
    ga.fillStyle(0xffffff, 0.9);
    ga.slice(32, 32, 30, Phaser.Math.DegToRad(-55), Phaser.Math.DegToRad(55), false);
    ga.fillPath();
    ga.fillStyle(0x0b0b14, 1);
    ga.slice(32, 32, 18, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false);
    ga.fillPath();
    ga.generateTexture('slash_arc', 64, 64);
    ga.destroy();

    // Machado (18×18)
    const gx = this.gfx(18, 18);
    gx.fillStyle(0x6a4a26, 1);
    gx.fillRect(8, 2, 3, 15);
    gx.fillStyle(0xb8b8c8, 1);
    gx.fillTriangle(8, 2, 8, 10, 1, 6);
    gx.fillTriangle(11, 2, 11, 10, 17, 6);
    gx.fillStyle(0xe8e8f4, 0.8);
    gx.fillTriangle(8, 3, 8, 7, 4, 5);
    gx.generateTexture('proj_axe', 18, 18);
    gx.destroy();

    // Adaga (16×7)
    const gk = this.gfx(16, 7);
    gk.fillStyle(0xc9c9d9, 1);
    gk.fillTriangle(16, 3.5, 6, 0, 6, 7);
    gk.fillStyle(0x4a3a2a, 1);
    gk.fillRect(0, 2, 6, 3);
    gk.fillStyle(0xffffff, 0.7);
    gk.fillTriangle(15, 3.5, 8, 2, 8, 3);
    gk.generateTexture('proj_knife', 16, 7);
    gk.destroy();

    // Bumerangue — lâmina de vento (20×20)
    const gb = this.gfx(20, 20);
    gb.lineStyle(4, 0x66ffcc, 0.95);
    gb.beginPath();
    gb.arc(10, 10, 7, Phaser.Math.DegToRad(-30), Phaser.Math.DegToRad(210), false);
    gb.strokePath();
    gb.lineStyle(2, 0xffffff, 0.7);
    gb.beginPath();
    gb.arc(10, 10, 7, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180), false);
    gb.strokePath();
    gb.generateTexture('proj_boomerang', 20, 20);
    gb.destroy();
  }

  // ── Projéteis ─────────────────────────────────────────────
  private makeProjectiles(): void {
    // Orbe mágico — esfera roxa
    const go = this.gfx(14, 14);
    go.fillStyle(0x1a0033, 1);
    go.fillCircle(7, 7, 7);
    go.fillStyle(0x8800ee, 0.9);
    go.fillCircle(7, 7, 5);
    go.fillStyle(0xcc55ff, 0.8);
    go.fillCircle(7, 7, 3);
    go.fillStyle(0xffffff, 0.85);
    go.fillRect(5, 5, 1, 1);
    go.generateTexture('proj_orb', 14, 14);
    go.destroy();

    // Projétil inimigo — bolha sombria (12×12)
    const gd = this.gfx(12, 12);
    gd.fillStyle(0x06222e, 1);
    gd.fillCircle(6, 6, 6);
    gd.fillStyle(0x1a8aaa, 0.9);
    gd.fillCircle(6, 6, 4);
    gd.fillStyle(0x66e5ff, 0.85);
    gd.fillCircle(6, 6, 2);
    gd.generateTexture('proj_dark', 12, 12);
    gd.destroy();

    // Flecha — shaft dourado + ponta metálica + penas vermelhas
    const ga = this.gfx(26, 11);
    ga.fillStyle(0xc8a000, 1);
    ga.fillRect(0, 4, 19, 3);
    ga.fillStyle(0xd4d4d4, 1);
    ga.fillTriangle(18, 2, 26, 5, 18, 8);
    ga.fillStyle(0xaa1100, 1);
    ga.fillTriangle(0, 4, 6, 0, 6, 4);
    ga.fillStyle(0x881100, 1);
    ga.fillTriangle(0, 7, 6, 11, 6, 7);
    ga.generateTexture('proj_arrow', 26, 11);
    ga.destroy();
  }

  // ── Chão de masmorra — blocos de pedra variados (128×128) ─
  private makeStoneTile(): void {
    const S = 128;
    const CELL = 32;
    const g = this.gfx(S, S);

    // Argamassa de fundo
    g.fillStyle(0x0a0a12, 1);
    g.fillRect(0, 0, S, S);

    // Paleta de pedras (variação determinística por célula)
    const palette = [0x17172c, 0x141424, 0x1a1a32, 0x12121f, 0x191929, 0x15152a];

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = col * CELL + 1;
        const y = row * CELL + 1;
        const w = CELL - 2;
        const h = CELL - 2;
        const c = palette[(row * 5 + col * 3) % palette.length];

        g.fillStyle(c, 1);
        g.fillRect(x, y, w, h);

        // Textura interna — manchas mais claras/escuras
        g.fillStyle(0xffffff, 0.02 + ((row + col) % 3) * 0.01);
        g.fillRect(x + 3, y + 3, w - 12, h - 14);
        g.fillStyle(0x000000, 0.10);
        g.fillRect(x + w - 9, y + h - 7, 7, 5);

        // Realce superior/esquerdo
        g.lineStyle(1, 0x26263f, 0.85);
        g.lineBetween(x, y, x + w, y);
        g.lineBetween(x, y, x, y + h);

        // Sombra inferior/direita
        g.lineStyle(1, 0x05050a, 0.95);
        g.lineBetween(x, y + h, x + w, y + h);
        g.lineBetween(x + w, y, x + w, y + h);
      }
    }

    // Rachaduras espalhadas
    g.lineStyle(1, 0x06060c, 1);
    g.lineBetween(8, 10, 18, 22);
    g.lineBetween(18, 22, 14, 30);
    g.lineBetween(70, 6, 84, 18);
    g.lineBetween(40, 72, 52, 86);
    g.lineBetween(52, 86, 48, 94);
    g.lineBetween(104, 40, 116, 54);
    g.lineBetween(12, 100, 24, 112);
    g.lineBetween(88, 96, 100, 110);

    // Musgo
    g.fillStyle(0x0c2210, 0.55);
    g.fillRect(34, 20, 12, 6);
    g.fillRect(98, 56, 10, 8);
    g.fillRect(8, 70, 8, 10);
    g.fillRect(66, 108, 14, 6);
    g.fillStyle(0x123018, 0.4);
    g.fillRect(36, 22, 6, 3);
    g.fillRect(100, 58, 5, 4);

    // Runa arcana fraca em um bloco (detalhe místico)
    g.lineStyle(1, 0x3a2a6a, 0.5);
    g.lineBetween(80, 72, 80, 88);
    g.lineBetween(72, 80, 88, 80);
    g.strokeCircle(80, 80, 9);

    // Pedrinhas soltas
    g.fillStyle(0x23233a, 0.9);
    g.fillRect(26, 50, 3, 2);
    g.fillRect(58, 34, 2, 2);
    g.fillRect(110, 90, 3, 3);
    g.fillRect(44, 118, 2, 2);

    g.generateTexture('bg_tile', S, S);
    g.destroy();
  }

  // ── Vinheta — escurece as bordas da tela ─────────────────
  private makeVignette(): void {
    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;
    const g = this.gfx(W, H);

    const steps = 36;
    for (let i = 0; i < steps; i++) {
      const alpha = 0.45 * Math.pow(1 - i / steps, 2.2);
      g.lineStyle(4, 0x000000, alpha);
      g.strokeRect(i * 2, i * 2, W - i * 4, H - i * 4);
    }

    g.generateTexture('vignette', W, H);
    g.destroy();
  }
}
