import Phaser from 'phaser'
import { BasePart, type PhysicsScene } from './BasePart'
import type { PartType, PartOptions } from '../types/PartTypes'
import { BALL_RADIUS, COLOR_BALL_FILL, COLOR_INK, COLOR_SELECT } from '../constants'

export class Ball extends BasePart {
  readonly type: PartType = 'ball'
  private _radius: number = BALL_RADIUS

  create(scene: PhysicsScene, x: number, y: number, options: PartOptions): void {
    this._scene = scene
    this._radius = (options.radius as number | undefined) ?? BALL_RADIUS
    this._initX = x
    this._initY = y
    this._initAngle = 0

    this._body = scene.matter.add.circle(x, y, this._radius, {
      restitution: 0.3,
      friction: (options.friction as number | undefined) ?? 0.3,
      frictionStatic: (options.frictionStatic as number | undefined) ?? 0.5,
      frictionAir: 0.001,
      density: 0.004,
      label: 'ball',
    })
    Phaser.Physics.Matter.Matter.Body.setStatic(this._body, true)

    this._graphics = scene.add.graphics()
    this._redraw()
    this.syncTransform()
  }

  onStartSimulation(_scene: PhysicsScene): void {
    Phaser.Physics.Matter.Matter.Body.setStatic(this._body, false)
    Phaser.Physics.Matter.Matter.Body.setVelocity(this._body, { x: 0, y: 0 })
  }

  protected _redraw(): void {
    const g = this._graphics
    const r = this._radius
    g.clear()

    // Fill
    g.fillStyle(COLOR_BALL_FILL, 1)
    g.fillCircle(0, 0, r)

    // Ink border (slightly thick, pen style)
    g.lineStyle(2.5, COLOR_INK, 1)
    g.strokeCircle(0, 0, r)

    // Sketch lines inside for depth (3 short curved strokes, upper-left)
    g.lineStyle(1, COLOR_INK, 0.25)
    for (let i = 0; i < 3; i++) {
      const offset = (i - 1) * r * 0.28
      g.beginPath()
      g.arc(0, 0, r * 0.55, -Math.PI * 0.85 + offset * 0.04, -Math.PI * 0.35 + offset * 0.04)
      g.strokePath()
    }

    // Selection ring (blue pen)
    if (this._selected) {
      g.lineStyle(2.5, COLOR_SELECT, 1)
      g.strokeCircle(0, 0, r + 4)
    }
  }

  protected _serializeOptions(): PartOptions {
    return { radius: this._radius }
  }
}
