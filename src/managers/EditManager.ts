import Phaser from 'phaser'
import type { PhysicsScene } from '../parts/BasePart'
import { BasePart } from '../parts/BasePart'
import { Ball } from '../parts/Ball'
import { Ramp } from '../parts/Ramp'
import { Platform } from '../parts/Platform'
import { Domino } from '../parts/Domino'
import { Seesaw } from '../parts/Seesaw'
import { Goal } from '../parts/Goal'
import { Spring } from '../parts/Spring'
import { Bell } from '../parts/Bell'
import type { PartType, PartOptions, PartData } from '../types/PartTypes'
import type { PartConstraints } from '../types/LevelTypes'
import { SNAP_ANGLE_DEG } from '../constants'

type UndoEntry =
  | { type: 'place';  data: PartData }
  | { type: 'delete'; data: PartData }
  | { type: 'move';   id: string; from: { x: number; y: number }; to: { x: number; y: number } }
  | { type: 'rotate'; id: string; from: number; to: number }

export class EditManager {
  private _parts: BasePart[] = []
  private _selected: BasePart | null = null
  private _activeTool: PartType | 'cursor' = 'cursor'
  private _undo: UndoEntry[] = []
  private _redo: UndoEntry[] = []

  // Level mode
  private _levelMode = false
  private _constraints: PartConstraints | null = null
  private _userPlaced: Partial<Record<PartType, number>> = {}

  constructor(private readonly _scene: PhysicsScene) {}

  // ── Level mode ──────────────────────────────────────────────────

  setLevelMode(enabled: boolean, constraints: PartConstraints | null): void {
    this._levelMode = enabled
    this._constraints = enabled ? constraints : null
    this._userPlaced = {}
  }

  getConstraints(): PartConstraints | null { return this._constraints }

  getUserPlacedCounts(): Partial<Record<PartType, number>> { return this._userPlaced }

  getTotalUserPlaced(): number {
    return Object.values(this._userPlaced).reduce((s, n) => s + (n ?? 0), 0)
  }

  getRemainingFor(type: PartType): number {
    if (!this._constraints) return Infinity
    const max = this._constraints[type]
    if (max === undefined) return 0
    return max - (this._userPlaced[type] ?? 0)
  }

  canPlace(type: PartType): boolean {
    if (!this._levelMode || !this._constraints) return true
    return this.getRemainingFor(type) > 0
  }

  // ── Tool selection ──────────────────────────────────────────────

  selectTool(tool: PartType | 'cursor'): void {
    this._activeTool = tool
    if (tool !== 'cursor') this.deselectPart()
  }

  getActiveTool() { return this._activeTool }

  // ── Part placement ──────────────────────────────────────────────

  placePart(x: number, y: number): BasePart | null {
    if (this._activeTool === 'cursor') return null
    if (!this.canPlace(this._activeTool)) return null
    const part = this._createPart(this._activeTool, x, y, {})
    this._parts.push(part)
    this._undo.push({ type: 'place', data: part.serialize() })
    this._redo = []
    if (this._levelMode) {
      this._userPlaced[this._activeTool] = (this._userPlaced[this._activeTool] ?? 0) + 1
      this._scene.game.events.emit('constraintUpdate')
    }
    return part
  }

  restorePart(data: PartData): BasePart {
    const part = this._createPart(data.type, data.x, data.y, data.options, data.id)
    part.setAngle(data.angle)
    if (data.isFixed) part.isFixed = true
    this._parts.push(part)
    return part
  }

  private _createPart(type: PartType, x: number, y: number, options: PartOptions, id?: string): BasePart {
    let part: BasePart
    switch (type) {
      case 'ball':     part = new Ball(id);     break
      case 'ramp':     part = new Ramp(id);     break
      case 'platform': part = new Platform(id); break
      case 'domino':   part = new Domino(id);   break
      case 'seesaw':   part = new Seesaw(id);   break
      case 'goal':     part = new Goal(id);     break
      case 'spring':   part = new Spring(id);   break
      case 'bell':     part = new Bell(id);     break
    }
    part.create(this._scene, x, y, options)
    return part
  }

  // ── Selection ───────────────────────────────────────────────────

  selectPart(part: BasePart): void {
    if (this._levelMode && part.isFixed) return
    if (this._selected === part) return
    this._selected?.setSelected(false)
    this._selected = part
    part.setSelected(true)
  }

  deselectPart(): void {
    this._selected?.setSelected(false)
    this._selected = null
  }

  getSelectedPart(): BasePart | null { return this._selected }

  findPartAt(worldX: number, worldY: number): BasePart | null {
    for (let i = this._parts.length - 1; i >= 0; i--) {
      const p = this._parts[i]
      if (this._levelMode && p.isFixed) continue
      if (Phaser.Physics.Matter.Matter.Bounds.contains(p.body.bounds, { x: worldX, y: worldY })) {
        return p
      }
    }
    return null
  }

  findPartByBody(body: MatterJS.BodyType): BasePart | null {
    return this._parts.find(p => p.body === body) ?? null
  }

  // ── Deletion ────────────────────────────────────────────────────

  deleteSelectedPart(): void {
    if (!this._selected) return
    if (this._levelMode && this._selected.isFixed) return
    this._destroy(this._selected, true)
  }

  private _destroy(part: BasePart, pushUndo: boolean): void {
    const data = part.serialize()
    this._parts = this._parts.filter(p => p !== part)
    if (this._selected === part) this._selected = null
    part.destroy()
    if (pushUndo) {
      this._undo.push({ type: 'delete', data })
      this._redo = []
      if (this._levelMode && !data.isFixed) {
        const t = data.type
        this._userPlaced[t] = Math.max(0, (this._userPlaced[t] ?? 0) - 1)
        this._scene.game.events.emit('constraintUpdate')
      }
    }
  }

  // ── Move / Rotate ───────────────────────────────────────────────

  movePart(part: BasePart, x: number, y: number): void {
    part.setPosition(x, y)
  }

  commitMove(part: BasePart, origX: number, origY: number): void {
    const newX = part.body.position.x
    const newY = part.body.position.y
    if (Math.abs(newX - origX) > 1 || Math.abs(newY - origY) > 1) {
      this._undo.push({ type: 'move', id: part.id, from: { x: origX, y: origY }, to: { x: newX, y: newY } })
      this._redo = []
      part.saveInitialState()
    }
  }

  rotatePart(part: BasePart, deltaRad: number): void {
    const prev = part.body.angle
    const snapRad = Phaser.Math.DegToRad(SNAP_ANGLE_DEG)
    const next = Math.round((prev + deltaRad) / snapRad) * snapRad
    if (Math.abs(next - prev) > 0.001) {
      part.setAngle(next)
      this._undo.push({ type: 'rotate', id: part.id, from: prev, to: next })
      this._redo = []
    }
  }

  setAngleLive(part: BasePart, rad: number): void {
    part.setAngle(rad)
  }

  commitRotate(part: BasePart, fromAngle: number): void {
    const toAngle = part.body.angle
    if (Math.abs(toAngle - fromAngle) > 0.001) {
      this._undo.push({ type: 'rotate', id: part.id, from: fromAngle, to: toAngle })
      this._redo = []
    }
  }

  // ── Undo / Redo ─────────────────────────────────────────────────

  canUndo(): boolean { return this._undo.length > 0 }
  canRedo(): boolean { return this._redo.length > 0 }

  undo(): void {
    const entry = this._undo.pop()
    if (!entry) return
    switch (entry.type) {
      case 'place': {
        const part = this._parts.find(p => p.id === entry.data.id)
        if (part) {
          this._parts = this._parts.filter(p => p !== part)
          if (this._selected === part) this._selected = null
          part.destroy()
          if (this._levelMode && !entry.data.isFixed) {
            const t = entry.data.type
            this._userPlaced[t] = Math.max(0, (this._userPlaced[t] ?? 0) - 1)
            this._scene.game.events.emit('constraintUpdate')
          }
        }
        this._redo.push(entry)
        break
      }
      case 'delete': {
        this.restorePart(entry.data)
        if (this._levelMode && !entry.data.isFixed) {
          const t = entry.data.type
          this._userPlaced[t] = (this._userPlaced[t] ?? 0) + 1
          this._scene.game.events.emit('constraintUpdate')
        }
        this._redo.push(entry)
        break
      }
      case 'move': {
        const part = this._parts.find(p => p.id === entry.id)
        if (part) { part.setPosition(entry.from.x, entry.from.y); part.saveInitialState() }
        this._redo.push(entry)
        break
      }
      case 'rotate': {
        const part = this._parts.find(p => p.id === entry.id)
        if (part) part.setAngle(entry.from)
        this._redo.push(entry)
        break
      }
    }
    this._scene.game.events.emit('undoRedoUpdate')
  }

  redo(): void {
    const entry = this._redo.pop()
    if (!entry) return
    switch (entry.type) {
      case 'place': {
        this.restorePart(entry.data)
        if (this._levelMode && !entry.data.isFixed) {
          const t = entry.data.type
          this._userPlaced[t] = (this._userPlaced[t] ?? 0) + 1
          this._scene.game.events.emit('constraintUpdate')
        }
        this._undo.push(entry)
        break
      }
      case 'delete': {
        const part = this._parts.find(p => p.id === entry.data.id)
        if (part) {
          this._parts = this._parts.filter(p => p !== part)
          if (this._selected === part) this._selected = null
          part.destroy()
          if (this._levelMode && !entry.data.isFixed) {
            const t = entry.data.type
            this._userPlaced[t] = Math.max(0, (this._userPlaced[t] ?? 0) - 1)
            this._scene.game.events.emit('constraintUpdate')
          }
        }
        this._undo.push(entry)
        break
      }
      case 'move': {
        const part = this._parts.find(p => p.id === entry.id)
        if (part) { part.setPosition(entry.to.x, entry.to.y); part.saveInitialState() }
        this._undo.push(entry)
        break
      }
      case 'rotate': {
        const part = this._parts.find(p => p.id === entry.id)
        if (part) part.setAngle(entry.to)
        this._undo.push(entry)
        break
      }
    }
    this._scene.game.events.emit('undoRedoUpdate')
  }

  // ── Bulk ops ────────────────────────────────────────────────────

  getAllParts(): BasePart[] { return this._parts }
  getGoals(): Goal[] { return this._parts.filter(p => p instanceof Goal) as Goal[] }
  getBells(): Bell[] { return this._parts.filter(p => p instanceof Bell) as Bell[] }

  clearAll(): void {
    this.deselectPart()
    for (const p of [...this._parts]) p.destroy()
    this._parts = []
    this._undo = []
    this._redo = []
    this._userPlaced = {}
    this.setLevelMode(false, null)
  }

  resetAll(): void {
    this.deselectPart()
    for (const p of this._parts) p.onReset()
    this._userPlaced = {}
    this._scene.game.events.emit('constraintUpdate')
  }
}
