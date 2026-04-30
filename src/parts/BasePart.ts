import Phaser from 'phaser'
import type { PartType, PartOptions, PartData } from '../types/PartTypes'

export type PhysicsScene = Phaser.Scene & {
  matter: Phaser.Physics.Matter.MatterPhysics
}

export abstract class BasePart {
  abstract readonly type: PartType

  protected _body!: MatterJS.BodyType
  protected _graphics!: Phaser.GameObjects.Graphics
  protected _scene!: PhysicsScene
  protected _id: string
  protected _selected = false
  protected _isFixed = false

  protected _initX = 0
  protected _initY = 0
  protected _initAngle = 0

  constructor(id?: string) {
    this._id = id ?? crypto.randomUUID()
  }

  get isFixed(): boolean { return this._isFixed }
  set isFixed(v: boolean) { this._isFixed = v }

  get id() { return this._id }
  get body() { return this._body }
  get graphics() { return this._graphics }
  get selected() { return this._selected }

  abstract create(scene: PhysicsScene, x: number, y: number, options: PartOptions): void

  // Override in dynamic parts (Ball, Domino, Seesaw) to go active on play
  onStartSimulation(_scene: PhysicsScene): void {}

  onReset(): void {
    const M = Phaser.Physics.Matter.Matter
    M.Body.setStatic(this._body, true)
    M.Body.setPosition(this._body, { x: this._initX, y: this._initY })
    M.Body.setAngle(this._body, this._initAngle)
    M.Body.setVelocity(this._body, { x: 0, y: 0 })
    M.Body.setAngularVelocity(this._body, 0)
    this.syncTransform()
  }

  syncTransform(): void {
    if (!this._graphics || !this._body) return
    this._graphics.x = this._body.position.x
    this._graphics.y = this._body.position.y
    this._graphics.rotation = this._body.angle
  }

  setSelected(sel: boolean): void {
    this._selected = sel
    this._redraw()
  }

  setPosition(x: number, y: number): void {
    Phaser.Physics.Matter.Matter.Body.setPosition(this._body, { x, y })
    this.syncTransform()
  }

  setAngle(radians: number): void {
    Phaser.Physics.Matter.Matter.Body.setAngle(this._body, radians)
    this._initAngle = radians
    this.syncTransform()
  }

  // Called after a position change to persist initial state for reset
  saveInitialState(): void {
    this._initX = this._body.position.x
    this._initY = this._body.position.y
    this._initAngle = this._body.angle
  }

  destroy(): void {
    if (this._graphics) this._graphics.destroy()
    if (this._body && this._scene) {
      this._scene.matter.world.remove(this._body as unknown as Phaser.Physics.Matter.Image, true)
    }
  }

  serialize(): PartData {
    return {
      id: this._id,
      type: this.type,
      x: this._initX,
      y: this._initY,
      angle: this._initAngle,
      options: this._serializeOptions(),
    }
  }

  protected abstract _serializeOptions(): PartOptions
  protected abstract _redraw(): void
}
