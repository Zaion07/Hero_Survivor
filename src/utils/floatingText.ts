import Phaser from 'phaser';

/**
 * Exibe um número ou texto flutuante que sobe e desaparece.
 * Usado para feedback visual de dano / XP (RF15).
 */
export function floatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#ff4444',
  size = 16,
): void {
  const t = scene.add
    .text(x, y, text, {
      fontSize: `${size}px`,
      color,
      fontFamily: '"Arial Black", Arial, sans-serif',
      stroke: '#000000',
      strokeThickness: 3,
    })
    .setDepth(100)
    .setOrigin(0.5, 1);

  scene.tweens.add({
    targets: t,
    y: y - 50,
    alpha: 0,
    duration: 750,
    ease: 'Power2',
    onComplete: () => t.destroy(),
  });
}
