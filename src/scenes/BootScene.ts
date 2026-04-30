import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }) }

  preload(): void {
    // No external assets – everything is drawn procedurally
  }

  create(): void {
    this.scene.start('GameScene')
  }
}
