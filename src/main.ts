import Phaser from 'phaser';
import { CFG }          from './config';
import { BootScene }    from './scenes/BootScene';
import { MenuScene }    from './scenes/MenuScene';
import { GameScene }    from './scenes/GameScene';
import { HUDScene }     from './scenes/HUDScene';
import { UpgradeScene } from './scenes/UpgradeScene';

const config: Phaser.Types.Core.GameConfig = {
  type:   Phaser.AUTO,
  width:  CFG.WIDTH,
  height: CFG.HEIGHT,
  // SEM parent — Phaser anexa o canvas direto ao body
  backgroundColor: '#0a0a12',

  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },

  scene: [BootScene, MenuScene, GameScene, HUDScene, UpgradeScene],
};

new Phaser.Game(config);
