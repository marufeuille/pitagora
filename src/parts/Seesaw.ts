import Phaser from 'phaser'
import { BasePart, type PhysicsScene } from './BasePart'
import type { PartType, PartOptions } from '../types/PartTypes'
import { SEESAW_W, SEESAW_H, COLOR_WOOD_FILL, COLOR_INK, COLOR_INK_LIGHT, COLOR_PIVOT, COLOR_SELECT } from '../constants'

export class Seesaw extends BasePart {
  readonly type: PartType = 'seesaw'
  private _w = SEESAW_W
  private _h = SEESAW_H
  private _constraint: MatterJS.ConstraintType | null = null

  create(scene: PhysicsScene, x: number, y: number, options: PartOptions): void {
    this._scene = scene
    this._w = (options.width as number | undefined) ?? SEESAW_W
    this._h = (options.height as number | undefined) ?? SEESAW_H
    this._initX = x
    this._initY = y
    this._initAngle = 0

    this._body = scene.matter.add.rectangle(x, y, this._w, this._h, {
      friction: 0.3,
      restitution: 0.1,
      label: 'seesaw',
    })
    Phaser.Physics.Matter.Matter.Body.setStatic(this._body, true)

    this._graphics = scene.add.graphics()
    this._redraw()
    this.syncTransform()
  }

  onStartSimulation(scene: PhysicsScene): void {
    const M = Phaser.Physics.Matter.Matter
    M.Body.setStatic(this._body, false)
    M.Body.setVelocity(this._body, { x: 0, y: 0 })
    M.Body.setAngularVelocity(this._body, 0)

    this._constraint = scene.matter.add.worldConstraint(this._body, 0, 1, {
      pointA: { x: this._initX, y: this._initY },
      pointB: { x: 0, y: 0 },
    } as object) as MatterJS.ConstraintType
  }

  onReset(): void {
    const M = Phaser.Physics.Matter.Matter
    if (this._constraint && this._scene) {
      Phaser.Physics.Matter.Matter.Composite.remove(
        this._scene.matter.world.localWorld as unknown as MatterJS.CompositeType,
        this._constraint as unknown as MatterJS.ConstraintType,
      )
      this._constraint = null
    }
    M.Body.setStatic(this._body, true)
    M.Body.setPosition(this._body, { x: this._initX, y: this._initY })
    M.Body.setAngle(this._body, this._initAngle)
    M.Body.setVelocity(this._body, { x: 0, y: 0 })
    M.Body.setAngularVelocity(this._body, 0)
    this.syncTransform()
  }

  protected _redraw(): void {
    const g = this._graphics
    const hw = this._w / 2
    const hh = this._h / 2
    g.clear()

    // Plank fill
    g.fillStyle(COLOR_WOOD_FILL, 1)
    g.fillRect(-hw, -hh, this._w, this._h)

    // Horizontal grain
    g.lineStyle(1, COLOR_INK_LIGHT, 0.35)
    g.beginPath(); g.moveTo(-hw, 0); g.lineTo(hw, 0); g.strokePath()

    // Ink border
    g.lineStyle(2.5, COLOR_INK, 1)
    g.strokeRect(-hw, -hh, this._w, this._h)

    // Pivot triangle (filled, ink outline)
    g.fillStyle(COLOR_PIVOT, 1)
    g.fillTriangle(-10, hh, 10, hh, 0, hh + 18)
    g.lineStyle(2, COLOR_INK, 1)
    g.strokeTriangle(-10, hh, 10, hh, 0, hh + 18)

    // Center dot
    g.fillStyle(COLOR_INK, 1)
    g.fillCircle(0, 0, 4)

    if (this._selected) {
      g.lineStyle(2.5, COLOR_SELECT, 1)
      g.strokeRect(-hw - 3, -hh - 3, this._w + 6, this._h + 6)
    }
  }

  protected _serializeOptions(): PartOptions {
    return { width: this._w, height: this._h }
  }
}
