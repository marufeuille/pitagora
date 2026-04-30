import Phaser from 'phaser'
import { BasePart, type PhysicsScene } from './BasePart'
import type { PartType, PartOptions } from '../types/PartTypes'
import { COLOR_INK, COLOR_SELECT } from '../constants'

const BELL_W = 30
const BELL_H = 42

export class Bell extends BasePart {
  readonly type: PartType = 'bell'
  private _rung = false

  create(scene: PhysicsScene, x: number, y: number, _options: PartOptions): void {
    this._scene = scene
    this._initX = x
    this._initY = y
    this._initAngle = 0

    this._body = scene.matter.add.rectangle(x, y, BELL_W, BELL_H, {
      isStatic: true,
      label: 'bell',
      friction: 0.3,
    })

    this._graphics = scene.add.graphics()
    this._redraw()
    this.syncTransform()
  }

  /** Trigger ring visual + allow sound (called by SimulationManager) */
  ring(): void {
    if (this._rung) return
    this._rung = true
    this._scene.tweens.add({
      targets: this._graphics,
      rotation: this._graphics.rotation + 0.22,
      duration: 65,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.InOut',
      onComplete: () => {
        this._graphics.rotation = this._body.angle
      },
    })
  }

  override onReset(): void {
    super.onReset()
    this._rung = false
  }

  get hasRung(): boolean { return this._rung }

  protected _redraw(): void {
    const g = this._graphics
    const hw = BELL_W / 2
    const hh = BELL_H / 2
    g.clear()

    // Bell dome
    g.fillStyle(0xf5c540, 1)
    g.beginPath()
    g.arc(0, -hh + 16, 14, Math.PI, 0, false)
    g.closePath()
    g.fillPath()
    g.lineStyle(2.5, COLOR_INK, 1)
    g.beginPath()
    g.arc(0, -hh + 16, 14, Math.PI, 0, false)
    g.closePath()
    g.strokePath()

    // Bell skirt (lower part)
    g.fillStyle(0xf5c540, 1)
    g.fillRect(-hw, -hh + 16, BELL_W, hh - 8)
    g.lineStyle(2.5, COLOR_INK, 1)
    g.strokeRect(-hw, -hh + 16, BELL_W, hh - 8)

    // Clapper ball
    g.fillStyle(COLOR_INK, 1)
    g.fillCircle(0, hh - 8, 4.5)

    // Hang hook
    g.lineStyle(2.5, COLOR_INK, 1)
    g.beginPath()
    g.moveTo(0, -hh + 16)
    g.lineTo(0, -hh + 2)
    g.strokePath()
    g.fillCircle(0, -hh + 1, 3)

    if (this._selected) {
      g.lineStyle(2.5, COLOR_SELECT, 1)
      g.strokeRect(-hw - 3, -hh - 3, BELL_W + 6, BELL_H + 6)
    }
  }

  protected _serializeOptions(): PartOptions { return {} }
}
