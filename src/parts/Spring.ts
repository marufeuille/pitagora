import Phaser from 'phaser'
import { BasePart, type PhysicsScene } from './BasePart'
import type { PartType, PartOptions } from '../types/PartTypes'
import { COLOR_INK, COLOR_SELECT } from '../constants'

const SPRING_W = 36
const SPRING_H = 40

export class Spring extends BasePart {
  readonly type: PartType = 'spring'

  create(scene: PhysicsScene, x: number, y: number, _options: PartOptions): void {
    this._scene = scene
    this._initX = x
    this._initY = y
    this._initAngle = 0

    this._body = scene.matter.add.rectangle(x, y, SPRING_W, SPRING_H, {
      isStatic: true,
      label: 'spring',
      friction: 0.05,
      restitution: 0.1,
    })

    this._graphics = scene.add.graphics()
    this._redraw()
    this.syncTransform()
  }

  protected _redraw(): void {
    const g = this._graphics
    const hw = SPRING_W / 2
    const hh = SPRING_H / 2
    g.clear()

    // Base plate
    g.fillStyle(0xd4a850, 1)
    g.fillRect(-hw, hh - 9, SPRING_W, 9)
    g.lineStyle(2, COLOR_INK, 1)
    g.strokeRect(-hw, hh - 9, SPRING_W, 9)

    // Spring coils (zigzag)
    const coilZone = SPRING_H - 9 - 5  // between top cap and base
    const coils = 4
    const coilH = coilZone / coils
    g.lineStyle(2.5, 0x777788, 1)
    for (let i = 0; i < coils; i++) {
      const y1 = -hh + 5 + i * coilH
      const y2 = -hh + 5 + (i + 1) * coilH
      const xA = i % 2 === 0 ? -hw + 5 : hw - 5
      const xB = i % 2 === 0 ? hw - 5 : -hw + 5
      g.beginPath()
      g.moveTo(xA, y1)
      g.lineTo(xB, y2)
      g.strokePath()
    }

    // Top cap
    g.fillStyle(0xccccdd, 1)
    g.fillRect(-hw + 4, -hh, SPRING_W - 8, 6)
    g.lineStyle(2, COLOR_INK, 1)
    g.strokeRect(-hw + 4, -hh, SPRING_W - 8, 6)

    if (this._selected) {
      g.lineStyle(2.5, COLOR_SELECT, 1)
      g.strokeRect(-hw - 3, -hh - 3, SPRING_W + 6, SPRING_H + 6)
    }
  }

  protected _serializeOptions(): PartOptions { return {} }
}
