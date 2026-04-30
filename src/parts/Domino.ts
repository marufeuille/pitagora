import Phaser from 'phaser'
import { BasePart, type PhysicsScene } from './BasePart'
import type { PartType, PartOptions } from '../types/PartTypes'
import { DOMINO_W, DOMINO_H, COLOR_DOMINO_FILL, COLOR_INK, COLOR_INK_LIGHT, COLOR_SELECT } from '../constants'

export class Domino extends BasePart {
  readonly type: PartType = 'domino'
  private _w = DOMINO_W
  private _h = DOMINO_H

  create(scene: PhysicsScene, x: number, y: number, options: PartOptions): void {
    this._scene = scene
    this._w = (options.width as number | undefined) ?? DOMINO_W
    this._h = (options.height as number | undefined) ?? DOMINO_H
    this._initX = x
    this._initY = y
    this._initAngle = 0

    this._body = scene.matter.add.rectangle(x, y, this._w, this._h, {
      restitution: 0.1,
      friction: 0.4,
      frictionStatic: 0.9,
      frictionAir: 0.005,
      density: 0.0008,
      label: 'domino',
    })
    Phaser.Physics.Matter.Matter.Body.setStatic(this._body, true)

    this._graphics = scene.add.graphics()
    this._redraw()
    this.syncTransform()
  }

  onStartSimulation(_scene: PhysicsScene): void {
    const M = Phaser.Physics.Matter.Matter
    M.Body.setStatic(this._body, false)
    M.Body.setVelocity(this._body, { x: 0, y: 0 })
    M.Body.setAngularVelocity(this._body, 0)
  }

  protected _redraw(): void {
    const g = this._graphics
    const hw = this._w / 2
    const hh = this._h / 2
    g.clear()

    // Fill
    g.fillStyle(COLOR_DOMINO_FILL, 1)
    g.fillRect(-hw, -hh, this._w, this._h)

    // Center dividing line
    g.lineStyle(1.5, COLOR_INK_LIGHT, 0.6)
    g.beginPath(); g.moveTo(-hw + 2, 0); g.lineTo(hw - 2, 0); g.strokePath()

    // Dots (hand-drawn circles)
    g.fillStyle(COLOR_INK, 0.85)
    const dr = 2.8
    for (const dy of [-hh * 0.5, 0, hh * 0.5]) {
      g.fillCircle(0, dy, dr)
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
