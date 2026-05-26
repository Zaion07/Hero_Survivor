import Phaser from 'phaser';
import { logoutUser } from './services/authService';
import { getCurrentScore } from './services/scoreService';
import { Sfx } from './utils/Sfx';

let pauseScreen: HTMLDivElement | null = null;
let pauseScoreText: HTMLParagraphElement | null = null;
let musicButton: HTMLButtonElement | null = null;

export function setupPauseScreen(game: Phaser.Game): void {
  pauseScreen = document.getElementById('pause-screen') as HTMLDivElement;
  pauseScoreText = document.getElementById('pause-score') as HTMLParagraphElement;
  musicButton = document.getElementById('pause-music-button') as HTMLButtonElement;

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