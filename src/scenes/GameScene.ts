import Phaser from 'phaser'
import { EditManager } from '../managers/EditManager'
import { SimulationManager } from '../managers/SimulationManager'
import { SaveLoadManager } from '../managers/SaveLoadManager'
import { SoundManager } from '../managers/SoundManager'
import { LevelManager } from '../managers/LevelManager'
import {
  WORLD_WIDTH, WORLD_HEIGHT, WALL_THICKNESS, GRAVITY_Y,
  MIN_ZOOM, MAX_ZOOM, SNAP_ANGLE_DEG,
  COLOR_PAPER, COLOR_GRID, COLOR_INK, COLOR_WALL, COLOR_SELECT, COLOR_GROUND,
  BALL_RADIUS, RAMP_W, RAMP_H, PLATFORM_W, PLATFORM_H,
  DOMINO_W, DOMINO_H, SEESAW_W, SEESAW_H,
  COLOR_BALL_FILL, COLOR_WOOD_FILL, COLOR_DOMINO_FILL,
} from '../constants'
import type { PartType, PartData } from '../types/PartTypes'
import type { LevelData } from '../types/LevelTypes'
import type { BasePart } from '../parts/BasePart'

// Spring / Bell sizes (keep in sync with part files)
const SPRING_W = 36
const SPRING_H = 40
const BELL_W = 30
const BELL_H = 42

export class GameScene extends Phaser.Scene {
  private _edit!: EditManager
  private _sim!: SimulationManager
  private _save!: SaveLoadManager
  private _sound!: SoundManager
  private _levels!: LevelManager
  private _ghost!: Phaser.GameObjects.Graphics
  private _worldH = WORLD_HEIGHT
  private _rotHandle!: Phaser.GameObjects.Graphics
  private _editorOverlay!: Phaser.GameObjects.Graphics
  private _stageEditorMode = false

  // Rotation handle state
  private _rotating = false
  private _rotTarget: BasePart | null = null
  private _rotOrigAngle = 0
  private readonly _rotHandleDist = 58
  private readonly _rotHandleRadius = 11

  // Camera pan state
  private _panning = false
  private _panFromEmpty = false
  private _panOriginX = 0
  private _panOriginY = 0
  private _panScrollX = 0
  private _panScrollY = 0

  // Drag-to-move state
  private _dragging = false
  private _dragTarget: BasePart | null = null
  private _dragOffsetX = 0
  private _dragOffsetY = 0
  private _dragOrigX = 0
  private _dragOrigY = 0

  // Pinch zoom
  private _pinchDist = 0

  constructor() { super({ key: 'GameScene' }) }

  create(): void {
    this._worldH = WORLD_HEIGHT

    this.matter.world.setBounds(0, 0, WORLD_WIDTH, this._worldH, WALL_THICKNESS)
    this.matter.world.setGravity(0, GRAVITY_Y)
    this.matter.world.pause()

    this._applyFitZoom()
    this.scale.on('resize', () => this._applyFitZoom())

    this._drawBackground()

    this._sound = new SoundManager()
    this._edit = new EditManager(this)
    this._sim = new SimulationManager(this, this._edit, this._sound)
    this._save = new SaveLoadManager(this._edit)
    this._levels = new LevelManager()

    this._ghost = this.add.graphics()
    this._ghost.setDepth(10)
    this._rotHandle = this.add.graphics()
    this._rotHandle.setDepth(11)
    this._editorOverlay = this.add.graphics()
    this._editorOverlay.setDepth(9)

    this._setupInput()

    // Emit constraintUpdate when parts change or mode switches
    this.game.events.on('partsUpdate', () => this._updateConstraintUI())
    this.game.events.on('constraintUpdate', () => this._updateConstraintUI())
    // Use setTimeout(0) so this runs AFTER Toolbar's modeChange handler
    this.game.events.on('modeChange', () => setTimeout(() => this._updateConstraintUI(), 0))

    this.game.events.emit('gameSceneReady', this)
  }

  update(): void {
    for (const part of this._edit.getAllParts()) {
      part.syncTransform()
    }
    this._sim.checkGoals()
    this._drawRotHandle()
    if (this._stageEditorMode) this._drawEditorOverlay()
  }

  // ── Public API ────────────────────────────────────────────────

  getEditManager()  { return this._edit }
  getSimManager()   { return this._sim }
  getSaveManager()  { return this._save }
  getLevelManager() { return this._levels }
  getSoundManager() { return this._sound }

  getCameraState() {
    const cam = this.cameras.main
    return { x: cam.scrollX, y: cam.scrollY, zoom: cam.zoom }
  }

  restoreCameraState(x: number, y: number, zoom: number): void {
    this.cameras.main.setScroll(x, y)
    this.cameras.main.setZoom(Phaser.Math.Clamp(zoom, MIN_ZOOM, MAX_ZOOM))
  }

  // ── Level loading ─────────────────────────────────────────────

  loadLevel(level: LevelData): void {
    this._sim.fullReset()
    const constraints = Object.keys(level.constraints).length > 0 ? level.constraints : null
    this._edit.setLevelMode(true, constraints)

    for (const item of level.parts) {
      this._edit.restorePart(item)
    }

    this._applyFitZoom()
    this._updateConstraintUI()
    this.game.events.emit('partsUpdate')
    this.game.events.emit('levelLoaded', level)
  }

  exitLevelMode(): void {
    this._sim.fullReset()
    this._levels.exitLevelMode()
    this._updateConstraintUI()
    this.game.events.emit('levelExited')
  }

  // ── Stage editor ──────────────────────────────────────────────

  setStageEditorMode(enabled: boolean): void {
    this._stageEditorMode = enabled
    if (!enabled) this._editorOverlay.clear()
    this.game.events.emit('stageEditorModeChange', enabled)
  }

  isStageEditorMode(): boolean { return this._stageEditorMode }

  captureEditorState(): PartData[] {
    return this._edit.getAllParts().map(p => p.serialize())
  }

  restoreEditorState(snapshots: PartData[]): void {
    this._sim.fullReset()
    this._levels.exitLevelMode()
    for (const data of snapshots) {
      this._edit.restorePart(data)
    }
    this._updateConstraintUI()
    this.game.events.emit('levelExited')
  }

  toggleFixedOnSelected(): boolean | null {
    const part = this._edit.getSelectedPart()
    if (!part) return null
    part.isFixed = !part.isFixed
    return part.isFixed
  }

  private _drawEditorOverlay(): void {
    this._editorOverlay.clear()
    for (const part of this._edit.getAllParts()) {
      if (!part.isFixed) continue
      const { x, y } = part.body.position
      this._editorOverlay.fillStyle(0x2255cc, 0.35)
      this._editorOverlay.fillCircle(x, y, 9)
      this._editorOverlay.lineStyle(2, 0x88aaff, 0.9)
      this._editorOverlay.strokeCircle(x, y, 9)
    }
  }

  // ── Preset ───────────────────────────────────────────────────

  loadPreset(): void {
    this._sim.fullReset()

    const items: Array<{ type: PartType; x: number; y: number; angle: number; options: Record<string, number> }> = [
      { type: 'ball',     x: 510,  y: 300,  angle: 0,    options: {} },
      { type: 'ramp',     x: 600,  y: 682,  angle: 0.35, options: {} },
      { type: 'platform', x: 760,  y: 778,  angle: 0,    options: { width: 300, height: 16 } },
      { type: 'domino',   x: 740,  y: 710,  angle: 0,    options: { width: 22, height: 120 } },
      { type: 'domino',   x: 790,  y: 710,  angle: 0,    options: { width: 22, height: 120 } },
      { type: 'domino',   x: 840,  y: 710,  angle: 0,    options: { width: 22, height: 120 } },
      { type: 'ball',     x: 875,  y: 748,  angle: 0,    options: {} },
      { type: 'seesaw',   x: 990,  y: 820,  angle: 0,    options: {} },
    ]

    for (const item of items) {
      this._edit.restorePart({ id: crypto.randomUUID(), ...item })
    }

    this._applyFitZoom()
    this.game.events.emit('partsUpdate')
  }

  // ── Constraint UI ─────────────────────────────────────────────

  private _updateConstraintUI(): void {
    const constraints = this._edit.getConstraints()
    const placed = this._edit.getUserPlacedCounts()

    document.querySelectorAll<HTMLButtonElement>('.tool-btn[data-tool]').forEach(btn => {
      const tool = btn.dataset.tool as PartType | 'cursor'
      if (!tool || tool === 'cursor') return

      let badge = btn.querySelector<HTMLSpanElement>('.constraint-badge')

      if (constraints !== null) {
        const max = constraints[tool as PartType]
        if (max !== undefined) {
          const used = placed[tool as PartType] ?? 0
          const remaining = max - used
          if (!badge) {
            badge = document.createElement('span')
            badge.className = 'constraint-badge'
            btn.appendChild(badge)
          }
          badge.textContent = `${remaining}`
          badge.style.color = remaining === 0 ? '#c0392b' : '#2a6e3c'
          btn.disabled = this._sim.getMode() !== 'edit' || remaining <= 0
        } else {
          // Part not available in this level
          if (!badge) {
            badge = document.createElement('span')
            badge.className = 'constraint-badge'
            btn.appendChild(badge)
          }
          badge.textContent = '✕'
          badge.style.color = '#999'
          btn.disabled = true
        }
      } else {
        // Free play: remove badges and restore
        badge?.remove()
        btn.disabled = this._sim.getMode() !== 'edit'
      }
    })
  }

  // ── Camera ────────────────────────────────────────────────────

  private _applyFitZoom(): void {
    const fitZoom = Phaser.Math.Clamp(this.scale.height / this._worldH, MIN_ZOOM, MAX_ZOOM)
    this.cameras.main.setZoom(fitZoom)
    this._resetCameraToGround()
  }

  private _clampScroll(): void {
    const cam = this.cameras.main
    const zoom = cam.zoom
    const camW = this.scale.width
    const camH = this.scale.height
    const viewW = camW / zoom
    const viewH = camH / zoom
    const offsetX = (viewW - camW) / 2
    const offsetY = (viewH - camH) / 2

    if (viewW <= WORLD_WIDTH) {
      const maxWvX = WORLD_WIDTH - viewW
      cam.scrollX = Phaser.Math.Clamp(cam.scrollX, offsetX, maxWvX + offsetX)
    } else {
      cam.scrollX = (WORLD_WIDTH - camW) / 2
    }

    if (viewH <= this._worldH) {
      const maxWvY = this._worldH - viewH
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY, offsetY, maxWvY + offsetY)
    } else {
      cam.scrollY = (this._worldH - camH) / 2
    }
  }

  private _resetCameraToGround(): void {
    const cam = this.cameras.main
    const zoom = cam.zoom
    const camW = this.scale.width
    const camH = this.scale.height
    const viewW = camW / zoom
    const viewH = camH / zoom
    const offsetX = (viewW - camW) / 2
    const offsetY = (viewH - camH) / 2

    if (viewW <= WORLD_WIDTH) {
      const wvX = (WORLD_WIDTH - viewW) / 2
      cam.scrollX = wvX + offsetX
    } else {
      cam.scrollX = (WORLD_WIDTH - camW) / 2
    }

    if (viewH <= this._worldH) {
      cam.scrollY = offsetY
    } else {
      cam.scrollY = (this._worldH - camH) / 2
    }

    this._clampScroll()
  }

  // ── Background ────────────────────────────────────────────────

  private _drawBackground(): void {
    const shadow = this.add.graphics()
    shadow.setDepth(-21)
    shadow.fillStyle(0x000000, 0.18)
    shadow.fillRect(8, 8, WORLD_WIDTH, this._worldH)

    const bg = this.add.graphics()
    bg.setDepth(-20)

    bg.fillStyle(COLOR_PAPER, 1)
    bg.fillRect(0, 0, WORLD_WIDTH, this._worldH)

    bg.lineStyle(1, COLOR_GRID, 0.45)
    for (let x = 0; x <= WORLD_WIDTH; x += 40) {
      bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, this._worldH); bg.strokePath()
    }
    for (let y = 0; y <= this._worldH; y += 40) {
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(WORLD_WIDTH, y); bg.strokePath()
    }
    bg.lineStyle(1, COLOR_GRID, 0.9)
    for (let x = 0; x <= WORLD_WIDTH; x += 160) {
      bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, this._worldH); bg.strokePath()
    }
    for (let y = 0; y <= this._worldH; y += 160) {
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(WORLD_WIDTH, y); bg.strokePath()
    }

    bg.lineStyle(3, COLOR_INK, 0.55)
    bg.strokeRect(0, 0, WORLD_WIDTH, this._worldH)

    bg.fillStyle(COLOR_WALL, 0.18)
    bg.fillRect(0, 0, WALL_THICKNESS, this._worldH)
    bg.fillRect(WORLD_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, this._worldH)
    bg.lineStyle(2, COLOR_INK, 0.3)
    bg.beginPath(); bg.moveTo(WALL_THICKNESS, 0); bg.lineTo(WALL_THICKNESS, this._worldH); bg.strokePath()
    bg.beginPath(); bg.moveTo(WORLD_WIDTH - WALL_THICKNESS, 0); bg.lineTo(WORLD_WIDTH - WALL_THICKNESS, this._worldH); bg.strokePath()

    bg.lineStyle(3.5, COLOR_INK, 0.65)
    bg.beginPath(); bg.moveTo(0, this._worldH); bg.lineTo(WORLD_WIDTH, this._worldH); bg.strokePath()
  }

  // ── Input ─────────────────────────────────────────────────────

  private _setupInput(): void {
    this.input.addPointer(2)

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.rightButtonDown()) { this._startPan(ptr); return }
      if (ptr.leftButtonDown()) this._handleLeftDown(ptr)
    })

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this._panning) { this._updatePan(ptr); return }
      if (this._rotating && this._rotTarget) { this._updateRotation(ptr); return }
      if (this._dragging && this._dragTarget) this._updateDrag(ptr)
      this._handlePinch()
      this._updateGhost(ptr)
    })

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (this._panning) {
        this._panning = false
        if (this._panFromEmpty) {
          this._panFromEmpty = false
          const moved = Phaser.Math.Distance.Between(ptr.x, ptr.y, this._panOriginX, this._panOriginY)
          if (moved < 6) {
            this._edit.deselectPart()
            this.game.events.emit('selectionChange', null)
          }
        }
        return
      }
      if (this._rotating && this._rotTarget) {
        this._edit.commitRotate(this._rotTarget, this._rotOrigAngle)
        this._rotating = false
        this._rotTarget = null
        return
      }
      if (this._dragging && this._dragTarget) {
        this._edit.commitMove(this._dragTarget, this._dragOrigX, this._dragOrigY)
        this._dragging = false
        this._dragTarget = null
      }
    })

    this.input.on('pointerupoutside', () => {
      if (this._rotating && this._rotTarget) {
        this._edit.commitRotate(this._rotTarget, this._rotOrigAngle)
        this._rotating = false
        this._rotTarget = null
      }
      this._panning = false
      this._panFromEmpty = false
      this._dragging = false
      this._dragTarget = null
      this._ghost.clear()
    })

    this.input.on('wheel',
      (_ptr: Phaser.Input.Pointer, _gos: unknown, _dx: number, dy: number) => {
        const factor = dy > 0 ? 0.92 : 1.08
        const z = Phaser.Math.Clamp(this.cameras.main.zoom * factor, MIN_ZOOM, MAX_ZOOM)
        this.cameras.main.setZoom(z)
        this._clampScroll()
      },
    )

    const kb = this.input.keyboard
    if (kb) {
      kb.on('keydown-DELETE',    () => this._edit.deleteSelectedPart())
      kb.on('keydown-BACKSPACE', () => this._edit.deleteSelectedPart())
      kb.on('keydown-Z', (e: KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey) {
          e.shiftKey ? this._edit.redo() : this._edit.undo()
          this.game.events.emit('undoRedoUpdate')
          this._updateConstraintUI()
        }
      })
      kb.on('keydown-R', () => {
        const sel = this._edit.getSelectedPart()
        if (sel) this._edit.rotatePart(sel, Phaser.Math.DegToRad(15))
      })
    }

    this.input.on('contextmenu', () => {/* handled by DOM */})
  }

  private _handleLeftDown(ptr: Phaser.Input.Pointer): void {
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y)
    const tool = this._edit.getActiveTool()

    if (tool !== 'cursor') {
      if (this._sim.getMode() !== 'edit') return
      if (wp.y >= this._worldH - WALL_THICKNESS) return
      if (!this._edit.canPlace(tool as PartType)) return
      this._edit.placePart(wp.x, wp.y)
      this.game.events.emit('partsUpdate')
      this._updateConstraintUI()
      return
    }

    if (this._sim.getMode() !== 'edit') return

    const selected = this._edit.getSelectedPart()
    if (selected) {
      const hp = this._rotHandlePos(selected)
      const dist = Phaser.Math.Distance.Between(wp.x, wp.y, hp.x, hp.y)
      if (dist <= this._rotHandleRadius * 1.8) {
        this._rotating = true
        this._rotTarget = selected
        this._rotOrigAngle = selected.body.angle
        return
      }
    }

    const part = this._edit.findPartAt(wp.x, wp.y)
    if (part) {
      this._edit.selectPart(part)
      this._dragging = true
      this._dragTarget = part
      this._dragOffsetX = wp.x - part.body.position.x
      this._dragOffsetY = wp.y - part.body.position.y
      this._dragOrigX = part.body.position.x
      this._dragOrigY = part.body.position.y
    } else {
      this._startPan(ptr)
      this._panFromEmpty = true
    }
    this.game.events.emit('selectionChange', this._edit.getSelectedPart())
  }

  private _updateDrag(ptr: Phaser.Input.Pointer): void {
    if (!this._dragTarget || this._sim.getMode() !== 'edit') return
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y)
    this._edit.movePart(this._dragTarget, wp.x - this._dragOffsetX, wp.y - this._dragOffsetY)
  }

  private _startPan(ptr: Phaser.Input.Pointer): void {
    this._panning = true
    this._panOriginX = ptr.x
    this._panOriginY = ptr.y
    this._panScrollX = this.cameras.main.scrollX
    this._panScrollY = this.cameras.main.scrollY
  }

  private _updatePan(ptr: Phaser.Input.Pointer): void {
    const z = this.cameras.main.zoom
    this.cameras.main.scrollX = this._panScrollX + (this._panOriginX - ptr.x) / z
    this.cameras.main.scrollY = this._panScrollY + (this._panOriginY - ptr.y) / z
    this._clampScroll()
  }

  private _handlePinch(): void {
    const ptrs = this.input.manager.pointers.filter((p: Phaser.Input.Pointer) => p.isDown)
    if (ptrs.length < 2) { this._pinchDist = 0; return }
    const [p1, p2] = ptrs as [Phaser.Input.Pointer, Phaser.Input.Pointer]
    const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y)
    if (this._pinchDist > 0) {
      const z = Phaser.Math.Clamp(this.cameras.main.zoom * (d / this._pinchDist), MIN_ZOOM, MAX_ZOOM)
      this.cameras.main.setZoom(z)
      this._clampScroll()
    }
    this._pinchDist = d
  }

  private _rotHandlePos(part: BasePart): { x: number; y: number } {
    const angle = part.body.angle
    return {
      x: part.body.position.x + Math.sin(angle) * this._rotHandleDist,
      y: part.body.position.y - Math.cos(angle) * this._rotHandleDist,
    }
  }

  private _drawRotHandle(): void {
    this._rotHandle.clear()
    const sel = this._edit.getSelectedPart()
    if (!sel || this._edit.getActiveTool() !== 'cursor' || this._sim.getMode() !== 'edit') return

    const hp = this._rotHandlePos(sel)
    const cx = sel.body.position.x
    const cy = sel.body.position.y
    const g = this._rotHandle

    g.lineStyle(1.5, COLOR_INK, 0.4)
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(hp.x, hp.y); g.strokePath()

    g.fillStyle(COLOR_BALL_FILL, 1)
    g.fillCircle(hp.x, hp.y, this._rotHandleRadius)
    g.lineStyle(2, this._rotating ? COLOR_SELECT : COLOR_INK, 1)
    g.strokeCircle(hp.x, hp.y, this._rotHandleRadius)

    g.lineStyle(1.5, this._rotating ? COLOR_SELECT : COLOR_INK, 0.8)
    g.beginPath()
    g.arc(hp.x, hp.y, this._rotHandleRadius * 0.52, -Math.PI * 0.7, Math.PI * 0.4)
    g.strokePath()
    const tipAngle = Math.PI * 0.4
    const tr = this._rotHandleRadius * 0.52
    const tx = hp.x + Math.cos(tipAngle) * tr
    const ty = hp.y + Math.sin(tipAngle) * tr
    g.fillStyle(this._rotating ? COLOR_SELECT : COLOR_INK, 1)
    g.fillTriangle(tx - 3, ty + 3, tx + 4, ty, tx, ty - 4)
  }

  private _updateRotation(ptr: Phaser.Input.Pointer): void {
    if (!this._rotTarget) return
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y)
    const cx = this._rotTarget.body.position.x
    const cy = this._rotTarget.body.position.y
    let angle = Math.atan2(wp.x - cx, cy - wp.y)
    if (ptr.event instanceof PointerEvent && (ptr.event as PointerEvent).shiftKey) {
      const snapRad = Phaser.Math.DegToRad(SNAP_ANGLE_DEG)
      angle = Math.round(angle / snapRad) * snapRad
    }
    this._edit.setAngleLive(this._rotTarget, angle)
  }

  private _updateGhost(ptr: Phaser.Input.Pointer): void {
    this._ghost.clear()
    const tool = this._edit.getActiveTool()
    if (tool === 'cursor' || this._sim.getMode() !== 'edit') return

    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y)
    this._ghost.x = wp.x
    this._ghost.y = wp.y
    this._ghost.rotation = 0

    const g = this._ghost
    const fill = 0.18
    const stroke = 0.55

    switch (tool as PartType) {
      case 'ball': {
        g.fillStyle(COLOR_BALL_FILL, fill)
        g.fillCircle(0, 0, BALL_RADIUS)
        g.lineStyle(2, COLOR_INK, stroke)
        g.strokeCircle(0, 0, BALL_RADIUS)
        break
      }
      case 'ramp': {
        this._ghost.rotation = -Math.PI / 8
        const hw = RAMP_W / 2, hh = RAMP_H / 2
        g.fillStyle(COLOR_WOOD_FILL, fill)
        g.fillRect(-hw, -hh, RAMP_W, RAMP_H)
        g.lineStyle(2, COLOR_INK, stroke)
        g.strokeRect(-hw, -hh, RAMP_W, RAMP_H)
        break
      }
      case 'platform': {
        const hw = PLATFORM_W / 2, hh = PLATFORM_H / 2
        g.fillStyle(COLOR_WOOD_FILL, fill)
        g.fillRect(-hw, -hh, PLATFORM_W, PLATFORM_H)
        g.lineStyle(2, COLOR_INK, stroke)
        g.strokeRect(-hw, -hh, PLATFORM_W, PLATFORM_H)
        break
      }
      case 'domino': {
        const hw = DOMINO_W / 2, hh = DOMINO_H / 2
        g.fillStyle(COLOR_DOMINO_FILL, fill)
        g.fillRect(-hw, -hh, DOMINO_W, DOMINO_H)
        g.lineStyle(2, COLOR_INK, stroke)
        g.strokeRect(-hw, -hh, DOMINO_W, DOMINO_H)
        break
      }
      case 'seesaw': {
        const hw = SEESAW_W / 2, hh = SEESAW_H / 2
        g.fillStyle(COLOR_WOOD_FILL, fill)
        g.fillRect(-hw, -hh, SEESAW_W, SEESAW_H)
        g.lineStyle(2, COLOR_INK, stroke)
        g.strokeRect(-hw, -hh, SEESAW_W, SEESAW_H)
        g.fillStyle(COLOR_INK, fill * 2)
        g.fillTriangle(-10, hh, 10, hh, 0, hh + 18)
        break
      }
      case 'goal': {
        const gw = 80, gh = 70, wt = 10
        const ghw = gw / 2, ghh = gh / 2
        g.fillStyle(0xe8d4a2, fill)
        g.fillRect(-ghw, -ghh, wt, gh)
        g.fillRect(ghw - wt, -ghh, wt, gh)
        g.fillRect(-ghw, ghh - wt, gw, wt)
        g.lineStyle(2, COLOR_INK, stroke)
        g.strokeRect(-ghw, -ghh, wt, gh)
        g.strokeRect(ghw - wt, -ghh, wt, gh)
        g.strokeRect(-ghw, ghh - wt, gw, wt)
        break
      }
      case 'spring': {
        g.fillStyle(0xd4a850, fill)
        g.fillRect(-SPRING_W / 2, -SPRING_H / 2, SPRING_W, SPRING_H)
        g.lineStyle(2, COLOR_INK, stroke)
        g.strokeRect(-SPRING_W / 2, -SPRING_H / 2, SPRING_W, SPRING_H)
        break
      }
      case 'bell': {
        g.fillStyle(0xf5c540, fill)
        g.fillRect(-BELL_W / 2, -BELL_H / 2, BELL_W, BELL_H)
        g.lineStyle(2, COLOR_INK, stroke)
        g.strokeRect(-BELL_W / 2, -BELL_H / 2, BELL_W, BELL_H)
        break
      }
    }
  }
}
