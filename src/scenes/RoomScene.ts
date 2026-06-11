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

  // Elementos redesenháveis
  private dynamicObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'Room' });
  }

  create(): void {
    this.roomCode = null;
    this.room = null;
    this.players = [];
    this.starting = false;
    this.busy = false;

    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;

    this.add.tileSprite(0, 0, W, H, 'bg_tile').setOrigin(0).setDepth(0);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.86).setDepth(1);

    this.add.text(W / 2, 44, '🌐  BATALHA ROYALE  🌐', {
      fontSize: '30px',
      color: '#d4af37',
      fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(
      W / 2,
      84,
      'Prepare-se sozinho no seu mapa — depois todos lutam na arena com a zona fechando',
      {
        fontSize: '12px',
        color: '#6a6a8a',
        fontFamily: 'Cinzel, Georgia, serif',
      },
    ).setOrigin(0.5).setDepth(10);

    this.buildBackButton();
    this.redraw();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubRoom?.();
      this.unsubPlayers?.();
    });
  }

  // ── Redesenha a área dinâmica (lobby ou seleção) ──────────
  private redraw(): void {
    this.dynamicObjects.forEach(o => o.destroy());
    this.dynamicObjects = [];

    if (!this.roomCode) {
      this.drawEntryMenu();
    } else {
      this.drawLobby();
    }
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.dynamicObjects.push(obj);
    return obj;
  }

  // ── Menu inicial: criar ou entrar ─────────────────────────
  private drawEntryMenu(): void {
    const W = CFG.WIDTH;

    this.buildButton(W / 2, 240, 340, 60, '⚒  CRIAR SALA', async () => {
      if (this.busy) return;
      this.busy = true;
      try {
        const charId = (this.registry.get('characterId') as string) ?? 'KNIGHT';
        const code = await createRoom(300, charId);
        this.attachRoom(code);
      } catch (error) {
        console.error('Erro ao criar sala:', error);
        this.busy = false;
      }
    });

    this.buildButton(W / 2, 330, 340, 60, '🔑  ENTRAR COM CÓDIGO', async () => {
      if (this.busy) return;
      const code = window.prompt('Código da sala:');
      if (!code) return;
      this.busy = true;
      try {
        const charId = (this.registry.get('characterId') as string) ?? 'KNIGHT';
        const joined = await joinRoom(code, charId);
        if (!joined) {
          this.busy = false;
          this.flashMessage('Sala não encontrada ou já iniciada');
          return;
        }
        this.attachRoom(joined);
      } catch (error) {
        console.error('Erro ao entrar na sala:', error);
        this.busy = false;
      }
    });

    this.track(this.add.text(W / 2, 420, 'O criador da sala define o tempo de preparação\ne inicia a partida quando todos entrarem', {
      fontSize: '12px',
      color: '#555577',
      fontFamily: 'Cinzel, Georgia, serif',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5).setDepth(10));
  }

  private attachRoom(code: string): void {
    this.roomCode = code;
    this.busy = false;

    this.unsubRoom = listenRoom(code, room => {
      this.room = room;

      if (!room) {
        // Sala desfeita pelo líder
        this.roomCode = null;
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

      this.redraw();
    });

    this.unsubPlayers = listenPlayers(code, players => {
      this.players = players;
      if (!this.starting) this.redraw();
    });

    this.redraw();
  }

  // ── Lobby da sala ─────────────────────────────────────────
  private drawLobby(): void {
    const W = CFG.WIDTH;
    const room = this.room;
    const amHost = room ? room.hostUid === auth.currentUser?.uid : false;

    // Código da sala em destaque
    this.track(this.add.text(W / 2, 140, 'CÓDIGO DA SALA', {
      fontSize: '12px',
      color: '#6a6a8a',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10));

    this.track(this.add.text(W / 2, 172, this.roomCode ?? '-----', {
      fontSize: '40px',
      color: '#66ddff',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 6,
      letterSpacing: 12,
    }).setOrigin(0.5).setDepth(10));

    this.track(this.add.text(W / 2, 204, 'Compartilhe este código com os outros jogadores', {
      fontSize: '10px',
      color: '#555577',
      fontFamily: 'Cinzel, Georgia, serif',
    }).setOrigin(0.5).setDepth(10));

    // Lista de jogadores
    const listX = W / 2 - 200;
    const listY = 240;

    this.track(this.add.text(W / 2, listY, `✦ JOGADORES (${this.players.length}) ✦`, {
      fontSize: '14px',
      color: '#9070b0',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10));

    this.players.slice(0, 8).forEach((p, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = listX + col * 220;
      const y = listY + 28 + row * 30;

      const def = CFG.CHARACTERS[p.charId];
      const crown = room && p.uid === room.hostUid ? '👑 ' : '';

      this.track(this.add.text(x, y, `${crown}${def?.icon ?? '❔'} ${p.username}`, {
        fontSize: '13px',
        color: p.uid === auth.currentUser?.uid ? '#ffd700' : '#ccccdd',
        fontFamily: 'Cinzel, Georgia, serif',
        stroke: '#000',
        strokeThickness: 3,
      }).setDepth(10));
    });

    // Tempo de preparação
    const prepY = 420;
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

    // Botão de iniciar (apenas o líder)
    if (amHost) {
      this.buildButton(W / 2, 540, 320, 54, '⚔  INICIAR BATALHA', async () => {
        if (!this.roomCode || this.busy) return;
        this.busy = true;
        try {
          await startPrep(this.roomCode);
        } catch (error) {
          console.error('Erro ao iniciar:', error);
          this.busy = false;
        }
      });
    } else {
      this.track(this.add.text(W / 2, 540, 'Aguardando o líder iniciar a batalha...', {
        fontSize: '14px',
        color: '#9070b0',
        fontFamily: 'Cinzel, Georgia, serif',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(10));
    }
  }

  // ── Utilitários de UI ─────────────────────────────────────
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
      bg.fillRect(cx - w / 2, cy - h / 2, w, h);
      bg.lineStyle(2, hover ? 0xffd700 : 0xd4af37, 1);
      bg.strokeRect(cx - w / 2, cy - h / 2, w, h);
    };

    draw(false);

    const txt = this.track(this.add.text(cx, cy, label, {
      fontSize: '18px',
      color: '#d4af37',
      fontFamily: 'Cinzel, Georgia, serif',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(11));

    const hit = this.track(this.add.rectangle(cx, cy, w, h, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(12));

    hit.on('pointerover', () => { draw(true); txt.setColor('#ffd700'); });
    hit.on('pointerout',  () => { draw(false); txt.setColor('#d4af37'); });
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
    txt.on('pointerout',  () => txt.setColor('#8888aa'));
    txt.on('pointerdown', async () => {
      if (this.starting) return;
      await leaveRoom();
      this.scene.start('Menu');
    });
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
