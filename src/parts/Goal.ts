import Phaser from 'phaser'
import { BasePart, type PhysicsScene } from './BasePart'
import type { PartType, PartOptions } from '../types/PartTypes'
import { COLOR_INK, COLOR_INK_LIGHT, COLOR_SELECT } from '../constants'

const GOAL_W = 80
const GOAL_H = 70
const WALL_T = 10
const FLAG_POLE_H = 58   // flag pole height above goal opening

export class Goal extends BasePart {
  readonly type: PartType = 'goal'
  private _w = GOAL_W
  private _h = GOAL_H
  private _bodies: MatterJS.BodyType[] = []
  private _wallRelPos: Array<{ x: number; y: number }> = []

  // Flag animation state
  private _flagShowing = false
  private _flagOuter: Phaser.GameObjects.Container | null = null
  private _flagInner: Phaser.GameObjects.Container | null = null

  create(scene: PhysicsScene, x: number, y: number, _options: PartOptions): void {
    this._scene = scene
    this._initX = x
    this._initY = y
    this._initAngle = 0

    this._body = scene.matter.add.rectangle(x, y, this._w, this._h, {
      isStatic: true,
      isSensor: true,
      label: 'goal-sensor',
    })

    this._buildWalls(scene, x, y)

    this._graphics = scene.add.graphics()
    this._redraw()
    this.syncTransform()
  }

  private _buildWalls(scene: PhysicsScene, x: number, y: number): void {
    const hw = this._w / 2
    const hh = this._h / 2
    const t = WALL_T
    const opts = { isStatic: true, friction: 0.5, label: 'goal-wall' }

    this._wallRelPos = [
      { x: 0,           y: hh - t / 2 },   // bottom
      { x: -hw + t / 2, y: 0 },             // left wall
      { x:  hw - t / 2, y: 0 },             // right wall
    ]

    this._bodies.push(scene.matter.add.rectangle(x, y + this._wallRelPos[0].y, this._w, t, opts))
    this._bodies.push(scene.matter.add.rectangle(x + this._wallRelPos[1].x, y, t, this._h, opts))
    this._bodies.push(scene.matter.add.rectangle(x + this._wallRelPos[2].x, y, t, this._h, opts))
  }

  override setAngle(radians: number): void {
    const M = Phaser.Physics.Matter.Matter
    const cx = this._body.position.x
    const cy = this._body.position.y
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)

    for (let i = 0; i < this._bodies.length; i++) {
      const rel = this._wallRelPos[i]
      M.Body.setPosition(this._bodies[i], {
        x: cx + rel.x * cos - rel.y * sin,
        y: cy + rel.x * sin + rel.y * cos,
      })
      M.Body.setAngle(this._bodies[i], radians)
    }

    M.Body.setAngle(this._body, radians)
    this._initAngle = radians
    this.syncTransform()
  }

  override setPosition(x: number, y: number): void {
    const M = Phaser.Physics.Matter.Matter
    const angle = this._body.angle
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    M.Body.setPosition(this._body, { x, y })
    for (let i = 0; i < this._bodies.length; i++) {
      const rel = this._wallRelPos[i]
      M.Body.setPosition(this._bodies[i], {
        x: x + rel.x * cos - rel.y * sin,
        y: y + rel.x * sin + rel.y * cos,
      })
    }
    this.syncTransform()
  }

  override onReset(): void {
    this._cleanupFlag()

    const M = Phaser.Physics.Matter.Matter
    const cx = this._initX
    const cy = this._initY
    const a = this._initAngle
    const cos = Math.cos(a)
    const sin = Math.sin(a)

    M.Body.setPosition(this._body, { x: cx, y: cy })
    M.Body.setAngle(this._body, a)

    for (let i = 0; i < this._bodies.length; i++) {
      const rel = this._wallRelPos[i]
      M.Body.setPosition(this._bodies[i], {
        x: cx + rel.x * cos - rel.y * sin,
        y: cy + rel.x * sin + rel.y * cos,
      })
      M.Body.setAngle(this._bodies[i], a)
    }

    this.syncTransform()
  }

  /** Check if world point is inside the goal bucket (rotation-aware) */
  containsPoint(wx: number, wy: number): boolean {
    const cx = this._body.position.x
    const cy = this._body.position.y
    const a = -this._body.angle
    const dx = wx - cx
    const dy = wy - cy
    const lx = dx * Math.cos(a) - dy * Math.sin(a)
    const ly = dx * Math.sin(a) + dy * Math.cos(a)
    const hw = this._w / 2 - WALL_T
    return lx > -hw && lx < hw && ly > -this._h / 2 && ly < this._h / 2 - WALL_T
  }

  /** Animate the "ピ" flag rising from the goal opening */
  triggerFlagAnimation(): void {
    if (this._flagShowing) return
    this._flagShowing = true

    const scene = this._scene
    const cx = this._body.position.x
    const cy = this._body.position.y
    const hh = this._h / 2

    // Outer container: positioned at goal center, rotated with the goal
    const outer = scene.add.container(cx, cy)
    outer.setRotation(this._body.angle)
    outer.setDepth(30)

    // Inner container: this is what we tween
    // Starts shifted downward so the assembly is hidden inside the box
    const inner = scene.add.container(0, hh + FLAG_POLE_H / 2)
    inner.setAlpha(0)
    outer.add(inner)

    // Pole (from inner origin downward, extending up to flag)
    const poleG = scene.add.graphics()
    poleG.lineStyle(3.5, 0x196b0e, 1)
    poleG.beginPath()
    poleG.moveTo(0, 0)
    poleG.lineTo(0, -FLAG_POLE_H)
    poleG.strokePath()
    // Small base disc
    poleG.fillStyle(0x196b0e, 1)
    poleG.fillCircle(0, 0, 3)

    // Flag: green rectangle at top of pole
    const flagG = scene.add.graphics()
    const fy = -FLAG_POLE_H           // flag top y
    flagG.fillStyle(0x28b318, 1)
    flagG.fillRect(2, fy, 42, 28)
    flagG.lineStyle(2, 0x196b0e, 1)
    flagG.strokeRect(2, fy, 42, 28)

    // "ピ" text centered on flag
    const txt = scene.add.text(23, fy + 14, 'ピ', {
      fontSize: '17px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif",
      resolution: 2,
    }).setOrigin(0.5, 0.5)

    inner.add([poleG, flagG, txt])

    this._flagOuter = outer
    this._flagInner = inner

    // Tween: inner rises up and fades in
    scene.tweens.add({
      targets: inner,
      y: -hh,
      alpha: 1,
      duration: 560,
      ease: 'Back.Out',
      onComplete: () => {
        if (!this._flagOuter) return
        // Hold then fade out
        scene.time.delayedCall(2400, () => {
          if (!this._flagOuter) return
          scene.tweens.add({
            targets: outer,
            alpha: 0,
            y: cy - 20,
            duration: 450,
            ease: 'Cubic.In',
            onComplete: () => {
              outer.destroy()
              this._flagOuter = null
              this._flagInner = null
              this._flagShowing = false
            },
          })
        })
      },
    })
  }

  private _cleanupFlag(): void {
    if (this._flagInner) {
      this._scene.tweens.killTweensOf(this._flagInner)
      this._flagInner = null
    }
    if (this._flagOuter) {
      this._scene.tweens.killTweensOf(this._flagOuter)
      this._flagOuter.destroy()
      this._flagOuter = null
    }
    this._flagShowing = false
  }

  override destroy(): void {
    this._cleanupFlag()
    for (const b of this._bodies) {
      this._scene.matter.world.remove(b as unknown as Phaser.Physics.Matter.Image, true)
    }
    super.destroy()
  }

  protected _redraw(): void {
    const g = this._graphics
    const hw = this._w / 2
    const hh = this._h / 2
    g.clear()

    // Inner fill (light cream)
    g.fillStyle(0xfff8e8, 1)
    g.fillRect(-hw + WALL_T, -hh, this._w - WALL_T * 2, this._h - WALL_T)

    // Star inside
    this._drawStar(g, 0, -hh * 0.35, 14, 6, 5)

    // Walls
    g.fillStyle(0xe8d4a2, 1)
    g.fillRect(-hw, -hh, WALL_T, this._h)          // left
    g.fillRect(hw - WALL_T, -hh, WALL_T, this._h)  // right
    g.fillRect(-hw, hh - WALL_T, this._w, WALL_T)  // bottom

    // Ink borders
    g.lineStyle(2.5, COLOR_INK, 1)
    g.strokeRect(-hw, -hh, WALL_T, this._h)
    g.strokeRect(hw - WALL_T, -hh, WALL_T, this._h)
    g.strokeRect(-hw, hh - WALL_T, this._w, WALL_T)
    // Top opening hint
    g.lineStyle(1.5, COLOR_INK_LIGHT, 0.5)
    g.beginPath(); g.moveTo(-hw + WALL_T, -hh); g.lineTo(hw - WALL_T, -hh); g.strokePath()

    if (this._selected) {
      g.lineStyle(2.5, COLOR_SELECT, 1)
      g.strokeRect(-hw - 3, -hh - 3, this._w + 6, this._h + 6)
    }
  }

  private _drawStar(g: Phaser.GameObjects.Graphics, x: number, y: number, outerR: number, innerR: number, points: number): void {
    g.fillStyle(0xf5c842, 1)
    g.lineStyle(1.5, COLOR_INK, 0.7)
    const step = Math.PI / points
    g.beginPath()
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR
      const angle = i * step - Math.PI / 2
      const px = x + Math.cos(angle) * r
      const py = y + Math.sin(angle) * r
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py)
    }
    g.closePath()
    g.fillPath()
    g.strokePath()
  }

  protected _serializeOptions(): PartOptions {
    return {}
  }
}
