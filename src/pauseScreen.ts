import Phaser from 'phaser';
import { logoutUser } from './services/authService';
import { getCurrentScore } from './services/scoreService';
import { saveGame, GameSave } from './services/saveService';
import { Sfx } from './utils/Sfx';

let pauseScreen: HTMLDivElement | null = null;
let pauseScoreText: HTMLParagraphElement | null = null;
let musicButton: HTMLButtonElement | null = null;
let saveButton: HTMLButtonElement | null = null;

export function setupPauseScreen(game: Phaser.Game): void {
  pauseScreen = document.getElementById('pause-screen') as HTMLDivElement;
  pauseScoreText = document.getElementById('pause-score') as HTMLParagraphElement;
  musicButton = document.getElementById('pause-music-button') as HTMLButtonElement;
  saveButton = document.getElementById('pause-save-button') as HTMLButtonElement;

  const resumeButton = document.getElementById('resume-button') as HTMLButtonElement;
  const logoutButton = document.getElementById('pause-logout-button') as HTMLButtonElement;

  updateMusicButtonText();

  resumeButton.addEventListener('click', () => {
    resumeGame(game);
  });

  logoutButton.addEventListener('click', async () => {
    await logoutUser();
    window.location.reload();
  });

  saveButton?.addEventListener('click', async () => {
    const gameScene = game.scene.getScene('Game') as Phaser.Scene & {
      getSaveState?: () => GameSave | null;
    };
    if (!gameScene?.getSaveState) return;

    const save = gameScene.getSaveState();
    if (!save) return; // royale ou já morto — não salva

    saveButton!.disabled = true;
    saveButton!.textContent = 'Salvando...';

    try {
      await saveGame(save);
      game.scene.stop('Upgrade');
      game.scene.stop('Game');
      game.scene.stop('HUD');
      game.scene.start('Menu');

      if (pauseScreen) pauseScreen.style.display = 'none';
    } catch (error) {
      console.error('Erro ao salvar o jogo:', error);
    } finally {
      saveButton!.disabled = false;
      saveButton!.textContent = '💾 Salvar e sair';
    }
  });

  musicButton.addEventListener('click', () => {
    const gameScene = game.scene.getScene('Game');

    if (!gameScene) {
      return;
    }

    Sfx.toggleDungeonBgm(gameScene);
    updateMusicButtonText();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    const gameScene = game.scene.getScene('Game');

    if (!gameScene) {
      return;
    }

    if (gameScene.scene.isPaused()) {
      resumeGame(game);
    } else {
      pauseGame(game);
    }
  });
}

function pauseGame(game: Phaser.Game): void {
  const gameScene = game.scene.getScene('Game');
  const hudScene = game.scene.getScene('HUD');

  if (!gameScene || !gameScene.scene.isActive()) {
    return;
  }

  const currentScore = getCurrentScore();

  if (pauseScoreText) {
    pauseScoreText.innerHTML = `
      Pontuação atual: <strong>${currentScore.score}</strong><br>
      Tempo: <strong>${formatTime(currentScore.survivalTime)}</strong><br>
      Kills: <strong>${currentScore.kills}</strong>
    `;
  }

  updateMusicButtonText();

  // Salvar só está disponível no modo solo
  if (saveButton) {
    saveButton.style.display = game.registry.get('isRoyale') === true ? 'none' : 'block';
  }

  gameScene.scene.pause();

  if (hudScene && hudScene.scene.isActive()) {
    hudScene.scene.pause();
  }

  if (pauseScreen) {
    pauseScreen.style.display = 'flex';
  }
}

function resumeGame(game: Phaser.Game): void {
  const gameScene = game.scene.getScene('Game');
  const hudScene = game.scene.getScene('HUD');

  if (gameScene && gameScene.scene.isPaused()) {
    gameScene.scene.resume();
  }

  if (hudScene && hudScene.scene.isPaused()) {
    hudScene.scene.resume();
  }

  if (pauseScreen) {
    pauseScreen.style.display = 'none';
  }
}

function updateMusicButtonText(): void {
  if (!musicButton) {
    return;
  }

  const enabled = Sfx.isDungeonBgmEnabled();

  musicButton.textContent = enabled ? 'Música: ON' : 'Música: OFF';
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');

  return `${minutes}:${seconds}`;
}