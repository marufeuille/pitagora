import { BasePart, type PhysicsScene } from './BasePart'
import type { PartType, PartOptions } from '../types/PartTypes'
import { RAMP_W, RAMP_H, COLOR_WOOD_FILL, COLOR_INK, COLOR_INK_LIGHT, COLOR_SELECT } from '../constants'
import Phaser from 'phaser'

export class Ramp extends BasePart {
  readonly type: PartType = 'ramp'
  private _w = RAMP_W
  private _h = RAMP_H

  create(scene: PhysicsScene, x: number, y: number, options: PartOptions): void {
    this._scene = scene
    this._w = (options.width as number | undefined) ?? RAMP_W
    this._h = (options.height as number | undefined) ?? RAMP_H
    this._initX = x
    this._initY = y
    this._initAngle = (options.angle as number | undefined) ?? -Math.PI / 8

    this._body = scene.matter.add.rectangle(x, y, this._w, this._h, {
      friction: 0.3,
      label: 'ramp',
    })
    Phaser.Physics.Matter.Matter.Body.setStatic(this._body, true)
    Phaser.Physics.Matter.Matter.Body.setAngle(this._body, this._initAngle)

    this._graphics = scene.add.graphics()
    this._redraw()
    this.syncTransform()
  }

  protected _redraw(): void {
    const g = this._graphics
    const hw = this._w / 2
    const hh = this._h / 2
    g.clear()

    // Fill
    g.fillStyle(COLOR_WOOD_FILL, 1)
    g.fillRect(-hw, -hh, this._w, this._h)

    // Diagonal hatching for sketch texture
    g.lineStyle(1, COLOR_INK_LIGHT, 0.35)
    const step = 14
    for (let x = -hw + step; x < hw + this._h; x += step) {
      const x1 = Math.max(-hw, x - this._h)
      const y1 = x1 === -hw ? Math.min(hh, hh - (x - (-hw))) : -hh
      const x2 = Math.min(hw, x)
      const y2 = x2 === hw ? Math.max(-hh, -hh + (x - hw)) : hh
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath()
    }

    // Ink border
    g.lineStyle(2.5, COLOR_INK, 1)
    g.strokeRect(-hw, -hh, this._w, this._h)

    if (this._selected) {
      g.lineStyle(2.5, COLOR_SELECT, 1)
      g.strokeRect(-hw - 3, -hh - 3, this._w + 6, this._h + 6)
    }
  }

  protected _serializeOptions(): PartOptions {
    return { width: this._w, height: this._h, angle: this._initAngle }
  }
}
