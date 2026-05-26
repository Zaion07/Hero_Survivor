import Phaser from "phaser";
import { CFG } from "./config";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { HUDScene } from "./scenes/HUDScene";
import { UpgradeScene } from "./scenes/UpgradeScene";
import { setupAuthScreen } from "./authScreen";
import { setupPauseScreen } from "./pauseScreen";

let game: Phaser.Game | null = null;

function startGame(): void {
  if (game) {
    return;
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: CFG.WIDTH,
    height: CFG.HEIGHT,
    backgroundColor: "#0a0a12",

    physics: {
      default: "arcade",
      arcade: { debug: false },
    },

    scene: [BootScene, MenuScene, GameScene, HUDScene, UpgradeScene],
  };

  game = new Phaser.Game(config);

  setupPauseScreen(game);
}

setupAuthScreen(startGame);