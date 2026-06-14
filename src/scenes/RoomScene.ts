import Phaser from 'phaser';

import { CFG } from '../config';
import { Sfx } from '../utils/Sfx';
import { auth } from '../services/firebase';

import {
  createRoom,
  joinRoom,
  leaveRoom,
  listenRoom,
  listenPlayers,
  startPrep,
  updateRoomSettings,
  RoomData,
  RoomPlayer,
} from '../services/roomService';

const PREP_OPTIONS = [
  { label: '1 MIN', seconds: 60 },
  { label: '3 MIN', seconds: 180 },
  { label: '5 MIN', seconds: 300 },
];

type ScreenMode = 'menu' | 'create' | 'join' | 'lobby';
type InputField = 'createName' | 'createPlayers' | 'joinName' | 'joinCode' | null;

// =============================================================
//  RoomScene — lobby do Battle Royale online
// =============================================================

export class RoomScene extends Phaser.Scene {
  private roomCode: string | null = null;
  private room: RoomData | null = null;
  private players: RoomPlayer[] = [];

  private unsubRoom?: () => void;
  private unsubPlayers?: () => void;

  private starting = false;
  private busy = false;
  private autoStarting = false;

  private screenMode: ScreenMode = 'menu';
  private activeField: InputField = null;

  private createName = '';
  private createPlayers = '2';
  private joinName = '';
  private joinCode = '';

  // Elementos redesenháveis
  private dynamicObjects: Phaser.GameObjects.GameObject[] = [];
  private keyHandler?: (event: KeyboardEvent) => void;

  constructor() {
    super({ key: 'Room' });
  }

  create(): void {
    this.roomCode = null;
    this.room = null;
    this.players = [];
    this.starting = false;
    this.busy = false;
    this.autoStarting = false;
    this.screenMode = 'menu';
    this.activeField = null;

    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;

    this.add.tileSprite(0, 0, W, H, 'bg_tile').setOrigin(0).setDepth(0);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.86).setDepth(1);

    this.add.text(W / 2, 44, ' BATALHA ROYALE ', {
      fontSize: '30px',
      color: '#d4af37',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(
      W / 2,
      84,
      'Crie uma sala, convide seus amigos e aguarde todos entrarem',
      {
        fontSize: '12px',
        color: '#6a6a8a',
        fontFamily: 'Cinzel, Georgia, serif',
      },
    ).setOrigin(0.5).setDepth(10);

    this.buildBackButton();
    this.setupKeyboard();
    this.redraw();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubRoom?.();
      this.unsubPlayers?.();

      if (this.input.keyboard && this.keyHandler) {
        this.input.keyboard.off('keydown', this.keyHandler);
      }
    });
  }

  // ── Teclado dos campos fake dentro do Phaser ──────────────

  private setupKeyboard(): void {
    if (!this.input.keyboard) return;

    this.keyHandler = (event: KeyboardEvent) => {
      if (!this.activeField || this.screenMode === 'lobby') return;

      if (event.key === 'Tab') {
        event.preventDefault();
        this.nextField();
        this.redraw();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();

        if (this.screenMode === 'create') {
          void this.handleCreateRoom();
        } else if (this.screenMode === 'join') {
          void this.handleJoinRoom();
        }

        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        this.removeLastChar();
        this.redraw();
        return;
      }

      if (event.key.length !== 1) return;

      this.addChar(event.key);
      this.redraw();
    };

    this.input.keyboard.on('keydown', this.keyHandler);
  }

  private nextField(): void {
    if (this.activeField === 'createName') {
      this.activeField = 'createPlayers';
      return;
    }

    if (this.activeField === 'createPlayers') {
      this.activeField = 'createName';
      return;
    }

    if (this.activeField === 'joinName') {
      this.activeField = 'joinCode';
      return;
    }

    if (this.activeField === 'joinCode') {
      this.activeField = 'joinName';
    }
  }

  private addChar(char: string): void {
    if (this.activeField === 'createName') {
      if (this.createName.length < 18) this.createName += char;
      return;
    }

    if (this.activeField === 'joinName') {
      if (this.joinName.length < 18) this.joinName += char;
      return;
    }

    if (this.activeField === 'createPlayers') {
      if (/^[0-9]$/.test(char)) this.createPlayers = char;
      return;
    }

    if (this.activeField === 'joinCode') {
      const value = char.toUpperCase();

      if (/^[A-Z0-9]$/.test(value) && this.joinCode.length < 5) {
        this.joinCode += value;
      }
    }
  }

  private removeLastChar(): void {
    if (this.activeField === 'createName') {
      this.createName = this.createName.slice(0, -1);
      return;
    }

    if (this.activeField === 'joinName') {
      this.joinName = this.joinName.slice(0, -1);
      return;
    }

    if (this.activeField === 'createPlayers') {
      this.createPlayers = '';
      return;
    }

    if (this.activeField === 'joinCode') {
      this.joinCode = this.joinCode.slice(0, -1);
    }
  }

  // ── Redesenha área dinâmica ──────────────────────────────

  private redraw(): void {
    this.dynamicObjects.forEach(o => o.destroy());
    this.dynamicObjects = [];

    if (this.roomCode || this.screenMode === 'lobby') {
      this.drawLobby();
      return;
    }

    if (this.screenMode === 'create') {
      this.drawCreateForm();
      return;
    }

    if (this.screenMode === 'join') {
      this.drawJoinForm();
      return;
    }

    this.drawEntryMenu();
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.dynamicObjects.push(obj);
    return obj;
  }

  // ── Menu inicial ─────────────────────────────────────────

  private drawEntryMenu(): void {
    const W = CFG.WIDTH;

    this.drawPanel(W / 2, 315, 470, 335);

    this.track(this.add.text(W / 2, 175, 'SALA ONLINE', {
      fontSize: '24px',
      color: '#ffd700',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10));

    this.track(this.add.text(W / 2, 210, 'Escolha como deseja entrar na batalha', {
      fontSize: '12px',
      color: '#9a8bb8',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10));

    this.buildButton(W / 2, 285, 350, 58, '⚒ CRIAR SALA', () => {
      if (this.busy) return;

      this.screenMode = 'create';
      this.activeField = 'createName';
      this.redraw();
    });

    this.buildButton(W / 2, 365, 350, 58, '🔑 ENTRAR COM CÓDIGO', () => {
      if (this.busy) return;

      this.screenMode = 'join';
      this.activeField = 'joinName';
      this.redraw();
    });

    this.track(this.add.text(
      W / 2,
      455,
      'A partida começa automaticamente quando a sala completar.',
      {
        fontSize: '12px',
        color: '#555577',
        fontFamily: 'Cinzel, Georgia, serif',
        align: 'center',
      },
    ).setOrigin(0.5).setDepth(10));
  }

  // ── Formulário de criar sala ─────────────────────────────

  private drawCreateForm(): void {
    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;

    const panelW = Math.min(W - 70, 560);
    const panelH = Math.min(H - 145, 430);
    const panelX = W / 2;
    const panelY = H / 2 + 35;
    const top = panelY - panelH / 2;

    const inputW = Math.min(panelW - 90, 430);
    const inputX = panelX - inputW / 2;
    const playerInputW = 150;
    const playerInputX = inputX;

    this.drawPanel(panelX, panelY, panelW, panelH);

    this.track(this.add.text(panelX, top + 42, 'CRIAR SALA', {
      fontSize: '24px',
      color: '#ffd700',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10));

    this.track(this.add.text(panelX, top + 78, 'Digite seu nome e a quantidade de jogadores', {
      fontSize: '11px',
      color: '#9a8bb8',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10));

    this.drawInput(inputX, top + 145, inputW, 48, 'SEU NOME', this.createName, 'createName');
    this.drawInput(playerInputX, top + 225, playerInputW, 48, 'JOGADORES', this.createPlayers, 'createPlayers');

    this.track(this.add.text(playerInputX + playerInputW + 24, top + 225, 'mínimo 2 / máximo 5', {
      fontSize: '12px',
      color: '#777799',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0, 0.5).setDepth(10));

    this.buildButton(panelX, top + 325, Math.min(panelW - 170, 340), 54, this.busy ? 'CRIANDO...' : 'CRIAR E ENTRAR', () => {
      void this.handleCreateRoom();
    });

    this.buildButton(panelX, top + 390, Math.min(panelW - 250, 230), 42, 'VOLTAR', () => {
      if (this.busy) return;

      this.screenMode = 'menu';
      this.activeField = null;
      this.redraw();
    });
  }

  // ── Formulário de entrar em sala ─────────────────────────

  private drawJoinForm(): void {
    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;

    const panelW = Math.min(W - 70, 560);
    const panelH = Math.min(H - 145, 430);
    const panelX = W / 2;
    const panelY = H / 2 + 35;
    const top = panelY - panelH / 2;

    const inputW = Math.min(panelW - 90, 430);
    const inputX = panelX - inputW / 2;
    const codeInputW = 230;

    this.drawPanel(panelX, panelY, panelW, panelH);

    this.track(this.add.text(panelX, top + 42, 'ENTRAR NA SALA', {
      fontSize: '24px',
      color: '#66ddff',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10));

    this.track(this.add.text(panelX, top + 78, 'Digite seu nome e o código da sala', {
      fontSize: '11px',
      color: '#9a8bb8',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10));

    this.drawInput(inputX, top + 145, inputW, 48, 'SEU NOME', this.joinName, 'joinName');
    this.drawInput(inputX, top + 225, codeInputW, 48, 'CÓDIGO', this.joinCode, 'joinCode');

    this.buildButton(panelX, top + 325, Math.min(panelW - 170, 340), 54, this.busy ? 'ENTRANDO...' : 'ENTRAR NA SALA', () => {
      void this.handleJoinRoom();
    });

    this.buildButton(panelX, top + 390, Math.min(panelW - 250, 230), 42, 'VOLTAR', () => {
      if (this.busy) return;

      this.screenMode = 'menu';
      this.activeField = null;
      this.redraw();
    });
  }

  private async handleCreateRoom(): Promise<void> {
    if (this.busy) return;

    const name = this.createName.trim();
    const maxPlayers = Number(this.createPlayers);

    if (!name) {
      this.activeField = 'createName';
      this.flashMessage('Digite seu nome');
      this.redraw();
      return;
    }

    if (!Number.isFinite(maxPlayers) || maxPlayers < 2 || maxPlayers > 5) {
      this.activeField = 'createPlayers';
      this.createPlayers = '2';
      this.flashMessage('Escolha de 2 até 5 jogadores');
      this.redraw();
      return;
    }

    this.busy = true;
    this.redraw();

    try {
      const charId = (this.registry.get('characterId') as string) ?? 'KNIGHT';
      const code = await createRoom(300, charId, maxPlayers, name);

      this.attachRoom(code);
    } catch (error) {
      console.error('Erro ao criar sala:', error);
      this.busy = false;
      this.flashMessage(this.formatFirebaseError(error));
      this.redraw();
    }
  }

  private async handleJoinRoom(): Promise<void> {
    if (this.busy) return;

    const name = this.joinName.trim();
    const code = this.joinCode.trim().toUpperCase();

    if (!name) {
      this.activeField = 'joinName';
      this.flashMessage('Digite seu nome');
      this.redraw();
      return;
    }

    if (code.length < 5) {
      this.activeField = 'joinCode';
      this.flashMessage('Digite o código da sala');
      this.redraw();
      return;
    }

    this.busy = true;
    this.redraw();

    try {
      const charId = (this.registry.get('characterId') as string) ?? 'KNIGHT';
      const joined = await joinRoom(code, charId, name);

      if (!joined) {
        this.busy = false;
        this.flashMessage('Sala não encontrada, cheia ou já iniciada');
        this.redraw();
        return;
      }

      this.attachRoom(joined);
    } catch (error) {
      console.error('Erro ao entrar na sala:', error);
      this.busy = false;
      this.flashMessage(this.formatFirebaseError(error));
      this.redraw();
    }
  }

  private attachRoom(code: string): void {
    this.roomCode = code;
    this.busy = false;
    this.screenMode = 'lobby';
    this.activeField = null;

    this.unsubRoom?.();
    this.unsubPlayers?.();

    this.unsubRoom = listenRoom(code, room => {
      this.room = room;

      if (!room) {
        this.roomCode = null;
        this.screenMode = 'menu';
        this.unsubPlayers?.();
        this.redraw();
        this.flashMessage('A sala foi desfeita');
        return;
      }

      if (room.status === 'prep' && !this.starting) {
        this.starting = true;
        Sfx.upgradeChoose(this);
        this.cameras.main.flash(250, 212, 175, 55);

        this.time.delayedCall(220, () => {
          this.scene.start('Game', {
            characterId: this.registry.get('characterId') ?? 'KNIGHT',
            royale: true,
          });
        });

        return;
      }

      this.maybeAutoStart();
      this.redraw();
    });

    this.unsubPlayers = listenPlayers(code, players => {
      this.players = players;
      this.maybeAutoStart();

      if (!this.starting) this.redraw();
    });

    this.redraw();
  }

  private maybeAutoStart(): void {
    if (!this.roomCode || !this.room || this.autoStarting || this.starting) return;
    if (this.room.status !== 'waiting') return;
    if (this.room.hostUid !== auth.currentUser?.uid) return;

    const maxPlayers = this.room.maxPlayers ?? 2;

    if (this.players.length < maxPlayers) return;

    this.autoStarting = true;

    void startPrep(this.roomCode).catch(error => {
      console.error('Erro ao iniciar sala automaticamente:', error);
      this.autoStarting = false;
    });
  }

  // ── Lobby da sala ─────────────────────────────────────────

  private drawLobby(): void {
    const W = CFG.WIDTH;
    const room = this.room;
    const amHost = room ? room.hostUid === auth.currentUser?.uid : false;
    const maxPlayers = room?.maxPlayers ?? 2;
    const missingPlayers = Math.max(0, maxPlayers - this.players.length);
    const isFull = missingPlayers === 0;

    this.drawPanel(W / 2, 340, 570, 440);

    this.track(this.add.text(W / 2, 128, 'CÓDIGO DA SALA', {
      fontSize: '12px',
      color: '#6a6a8a',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10));

    this.track(this.add.text(W / 2, 164, this.roomCode ?? '-----', {
      fontSize: '42px',
      color: '#66ddff',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 6,
      letterSpacing: 12,
    }).setOrigin(0.5).setDepth(10));

    this.track(this.add.text(W / 2, 200, 'Compartilhe este código com os outros jogadores', {
      fontSize: '10px',
      color: '#777799',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10));

    this.track(this.add.text(
      W / 2,
      238,
      `✦ JOGADORES (${this.players.length}/${maxPlayers}) ✦`,
      {
        fontSize: '15px',
        color: isFull ? '#7CFF9B' : '#9070b0',
        fontFamily: 'Cinzel, Georgia, serif',
        stroke: '#000',
        strokeThickness: 3,
      },
    ).setOrigin(0.5).setDepth(10));

    const listX = W / 2 - 215;
    const listY = 278;

    for (let i = 0; i < maxPlayers; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = listX + col * 240;
      const y = listY + row * 36;
      const p = this.players[i];

      if (p) {
        const def = CFG.CHARACTERS[p.charId];
        const crown = room && p.uid === room.hostUid ? '👑 ' : '';

        this.track(this.add.text(x, y, `${crown}${def?.icon ?? '❔'} ${p.username}`, {
          fontSize: '14px',
          color: p.uid === auth.currentUser?.uid ? '#ffd700' : '#ccccdd',
          fontFamily: 'Cinzel, Georgia, serif',
          stroke: '#000',
          strokeThickness: 3,
        }).setDepth(10));
      } else {
        this.track(this.add.text(x, y, '⌛ aguardando...', {
          fontSize: '14px',
          color: '#555577',
          fontFamily: 'Cinzel, Georgia, serif',
          stroke: '#000',
          strokeThickness: 3,
        }).setDepth(10));
      }
    }

    const prepY = 430;

    this.track(this.add.text(W / 2, prepY, 'TEMPO DE PREPARAÇÃO', {
      fontSize: '12px',
      color: '#6a6a8a',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10));

    const optW = 90;
    const gap = 14;
    const totalW = PREP_OPTIONS.length * optW + (PREP_OPTIONS.length - 1) * gap;
    const startX = W / 2 - totalW / 2;

    PREP_OPTIONS.forEach((opt, i) => {
      const x = startX + i * (optW + gap) + optW / 2;
      const selected = room?.prepSeconds === opt.seconds;
      const bg = this.track(this.add.graphics().setDepth(10));

      bg.fillStyle(selected ? 0x2d1255 : 0x10101e, 1);
      bg.fillRect(x - optW / 2, prepY + 16, optW, 32);
      bg.lineStyle(1.5, selected ? 0xffd700 : 0x333355, 1);
      bg.strokeRect(x - optW / 2, prepY + 16, optW, 32);

      this.track(this.add.text(x, prepY + 32, opt.label, {
        fontSize: '13px',
        color: selected ? '#ffd700' : '#777799',
        fontFamily: 'Cinzel, Georgia, serif',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(11));

      if (amHost) {
        const hit = this.track(this.add.rectangle(x, prepY + 32, optW, 32, 0xffffff, 0)
          .setInteractive({ useHandCursor: true })
          .setDepth(12));

        hit.on('pointerdown', () => {
          if (this.roomCode) void updateRoomSettings(this.roomCode, opt.seconds);
        });
      }
    });

    const lobbyMessage = isFull
      ? 'Sala completa! Iniciando batalha...'
      : `Aguardando jogadores... faltam ${missingPlayers}`;

    this.track(this.add.text(W / 2, 530, lobbyMessage, {
      fontSize: '14px',
      color: isFull ? '#7CFF9B' : '#9070b0',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10));
  }

  // ── Utilitários de UI ─────────────────────────────────────

  private drawPanel(cx: number, cy: number, w: number, h: number): void {
    const g = this.track(this.add.graphics().setDepth(8));

    g.fillStyle(0x080815, 0.96);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 20);

    g.lineStyle(2, 0xd4af37, 0.85);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 20);

    g.lineStyle(1, 0x5a3d8a, 0.55);
    g.strokeRoundedRect(cx - w / 2 + 10, cy - h / 2 + 10, w - 20, h - 20, 16);
  }

  private drawInput(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string,
    field: Exclude<InputField, null>,
  ): void {
    const focused = this.activeField === field;

    this.track(this.add.text(x, y - 40, label, {
      fontSize: '11px',
      color: focused ? '#ffd700' : '#777799',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 2,
    }).setDepth(13));

    const g = this.track(this.add.graphics().setDepth(10));

    g.fillStyle(0x10101e, 1);
    g.fillRoundedRect(x, y - h / 2, w, h, 10);

    g.lineStyle(2, focused ? 0xffd700 : 0x333355, 1);
    g.strokeRoundedRect(x, y - h / 2, w, h, 10);

    const placeholder = field === 'joinCode' ? 'ABCDE' : 'Clique e digite...';
    const display = value || placeholder;

    this.track(this.add.text(x + 16, y, display, {
      fontSize: '14px',
      color: value ? '#ffffff' : '#555577',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0, 0.5).setDepth(11));

    const hit = this.track(
      this.add.rectangle(x + w / 2, y, w, h, 0xffffff, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(12),
    );

    hit.on('pointerdown', () => {
      this.activeField = field;
      this.redraw();
    });
  }

  private buildButton(
    cx: number,
    cy: number,
    w: number,
    h: number,
    label: string,
    onClick: () => void,
  ): void {
    const bg = this.track(this.add.graphics().setDepth(10));

    const draw = (hover: boolean) => {
      bg.clear();
      bg.fillStyle(hover ? 0x2d0055 : 0x150033, 1);
      bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 14);
      bg.lineStyle(2, hover ? 0xffd700 : 0xd4af37, 1);
      bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 14);
    };

    draw(false);

    const txt = this.track(this.add.text(cx, cy, label, {
      fontSize: '17px',
      color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(11));

    const hit = this.track(this.add.rectangle(cx, cy, w, h, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(12));

    hit.on('pointerover', () => {
      draw(true);
      txt.setColor('#ffd700');
    });

    hit.on('pointerout', () => {
      draw(false);
      txt.setColor('#d4af37');
    });

    hit.on('pointerdown', onClick);
  }

  private buildBackButton(): void {
    const txt = this.add.text(18, 18, '← VOLTAR', {
      fontSize: '12px',
      color: '#8888aa',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setDepth(20).setInteractive({ useHandCursor: true });

    txt.on('pointerover', () => txt.setColor('#ffffff'));
    txt.on('pointerout', () => txt.setColor('#8888aa'));

    txt.on('pointerdown', async () => {
      if (this.starting || this.busy) return;

      if (this.roomCode) {
        await leaveRoom();
      }

      this.scene.start('Menu');
    });
  }


  private formatFirebaseError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Usuário não autenticado')) {
      return 'Você precisa estar logado para criar sala';
    }

    if (message.includes('Missing or insufficient permissions') || message.includes('permission-denied')) {
      return 'Sem permissão no Firestore para criar sala';
    }

    if (message.includes('offline') || message.includes('network')) {
      return 'Erro de conexão com o Firebase';
    }

    return `Erro ao criar sala: ${message.slice(0, 45)}`;
  }

  private flashMessage(msg: string): void {
    const txt = this.add.text(CFG.WIDTH / 2, CFG.HEIGHT - 70, msg, {
      fontSize: '14px',
      color: '#ff6666',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: txt,
      alpha: 0,
      delay: 2200,
      duration: 500,
      onComplete: () => txt.destroy(),
    });
  }
}
