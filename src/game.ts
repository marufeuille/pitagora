import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { GameScene } from './scenes/GameScene'
import { GRAVITY_Y, TOOLBAR_WIDTH, CONTROLBAR_HEIGHT } from './constants'

export function createGame(): Phaser.Game {
  const w = window.innerWidth  - TOOLBAR_WIDTH
  const h = window.innerHeight - CONTROLBAR_HEIGHT

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-canvas',
    width: w,
    height: h,
    backgroundColor: '#b89860',
    disableVisibilityChange: true,
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: GRAVITY_Y },
        debug: false,
      },
    },
    scene: [BootScene, GameScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    input: {
      smoothFactor: 0,
    },
  })
}
