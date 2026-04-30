import Phaser from 'phaser'
import { BasePart, type PhysicsScene } from './BasePart'
import type { PartType, PartOptions } from '../types/PartTypes'
import { PLATFORM_W, PLATFORM_H, COLOR_WOOD_FILL, COLOR_INK, COLOR_INK_LIGHT, COLOR_SELECT } from '../constants'

export class Platform extends BasePart {
  readonly type: PartType = 'platform'
  private _w = PLATFORM_W
  private _h = PLATFORM_H

  create(scene: PhysicsScene, x: number, y: number, options: PartOptions): void {
    this._scene = scene
    this._w = (options.width as number | undefined) ?? PLATFORM_W
    this._h = (options.height as number | undefined) ?? PLATFORM_H
    this._initX = x
    this._initY = y
    this._initAngle = 0

    this._body = scene.matter.add.rectangle(x, y, this._w, this._h, {
      friction: 0.15,
      frictionStatic: 0.02,
      label: 'platform',
    })
    Phaser.Physics.Matter.Matter.Body.setStatic(this._body, true)

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

    // Horizontal grain lines
    g.lineStyle(1, COLOR_INK_LIGHT, 0.4)
    const laneH = 5
    for (let y = -hh + laneH; y < hh; y += laneH * 2) {
      g.beginPath(); g.moveTo(-hw, y); g.lineTo(hw, y); g.strokePath()
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
    return { width: this._w, height: this._h }
  }
}
