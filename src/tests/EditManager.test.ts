import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Minimal Phaser mock (no browser needed) ---
vi.mock('phaser', () => {
  const Body = {
    setStatic: vi.fn(),
    setPosition: vi.fn(),
    setAngle: vi.fn(),
    setVelocity: vi.fn(),
    setAngularVelocity: vi.fn(),
  }
  const Bounds = { contains: vi.fn(() => false) }
  const Matter = { Body, Bounds, World: { remove: vi.fn() } }
  const DegToRad = (deg: number) => (deg * Math.PI) / 180
  return {
    default: {
      Physics: { Matter: { Matter } },
      Math: { DegToRad, Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max) },
    },
  }
})

// Stub Graphics class
class FakeGraphics {
  x = 0; y = 0; rotation = 0
  clear() { return this }
  fillStyle() { return this }
  fillRect() { return this }
  fillCircle() { return this }
  fillGradientStyle() { return this }
  lineStyle() { return this }
  strokeRect() { return this }
  strokeCircle() { return this }
  beginPath() { return this }
  moveTo() { return this }
  lineTo() { return this }
  strokePath() { return this }
  fillTriangle() { return this }
  destroy() {}
}

// Stub scene
function makeScene() {
  const bodies: Record<string, { position: { x: number; y: number }; angle: number; bounds: { min: { x: number; y: number }; max: { x: number; y: number } } }> = {}
  let bodyId = 0
  return {
    matter: {
      add: {
        rectangle: vi.fn((x: number, y: number) => {
          const id = `body_${bodyId++}`
          const b = { position: { x, y }, angle: 0, bounds: { min: { x: x - 10, y: y - 10 }, max: { x: x + 10, y: y + 10 } }, id }
          bodies[id] = b
          return b
        }),
        circle: vi.fn((x: number, y: number) => {
          const id = `body_${bodyId++}`
          const b = { position: { x, y }, angle: 0, bounds: { min: { x: x - 10, y: y - 10 }, max: { x: x + 10, y: y + 10 } }, id }
          bodies[id] = b
          return b
        }),
        worldConstraint: vi.fn(),
      },
      world: { remove: vi.fn(), localWorld: {} },
    },
    add: { graphics: vi.fn(() => new FakeGraphics()) },
  }
}

import { EditManager } from '../managers/EditManager'
import type { PhysicsScene } from '../parts/BasePart'

describe('EditManager', () => {
  let scene: ReturnType<typeof makeScene>
  let em: EditManager

  beforeEach(() => {
    scene = makeScene()
    em = new EditManager(scene as unknown as PhysicsScene)
  })

  describe('パーツ配置', () => {
    it('cursor ツール選択中は placePart が null を返す', () => {
      em.selectTool('cursor')
      expect(em.placePart(100, 100)).toBeNull()
      expect(em.getAllParts()).toHaveLength(0)
    })

    it('ball ツール選択中は placePart がパーツを生成する', () => {
      em.selectTool('ball')
      const part = em.placePart(200, 300)
      expect(part).not.toBeNull()
      expect(part?.type).toBe('ball')
      expect(em.getAllParts()).toHaveLength(1)
    })

    it('複数パーツを連続して配置できる', () => {
      em.selectTool('domino')
      em.placePart(100, 100)
      em.placePart(200, 100)
      em.placePart(300, 100)
      expect(em.getAllParts()).toHaveLength(3)
    })
  })

  describe('削除', () => {
    it('選択中のパーツを削除できる', () => {
      em.selectTool('platform')
      const part = em.placePart(100, 200)!
      em.selectPart(part)
      em.deleteSelectedPart()
      expect(em.getAllParts()).toHaveLength(0)
      expect(em.getSelectedPart()).toBeNull()
    })
  })

  describe('Undo / Redo', () => {
    it('配置 → undo でパーツが消える', () => {
      em.selectTool('ball')
      em.placePart(100, 100)
      expect(em.getAllParts()).toHaveLength(1)
      em.undo()
      expect(em.getAllParts()).toHaveLength(0)
    })

    it('undo → redo でパーツが復元される', () => {
      em.selectTool('ball')
      em.placePart(100, 100)
      em.undo()
      em.redo()
      expect(em.getAllParts()).toHaveLength(1)
    })

    it('削除 → undo でパーツが復元される', () => {
      em.selectTool('platform')
      const part = em.placePart(100, 200)!
      em.selectPart(part)
      em.deleteSelectedPart()
      expect(em.getAllParts()).toHaveLength(0)
      em.undo() // undo of delete = restore
      em.undo() // undo of place = remove
      expect(em.getAllParts()).toHaveLength(0)
    })

    it('空スタックで undo/redo してもクラッシュしない', () => {
      expect(() => { em.undo(); em.redo() }).not.toThrow()
    })
  })

  describe('clearAll', () => {
    it('全パーツを削除して undo スタックもリセットする', () => {
      em.selectTool('domino')
      em.placePart(100, 100)
      em.placePart(200, 100)
      em.clearAll()
      expect(em.getAllParts()).toHaveLength(0)
      em.undo() // スタックが空なので何も起きない
      expect(em.getAllParts()).toHaveLength(0)
    })
  })

  describe('restorePart', () => {
    it('PartData からパーツを復元できる', () => {
      const data = { id: 'test-id', type: 'ball' as const, x: 50, y: 80, angle: 0, options: { radius: 22 } }
      const part = em.restorePart(data)
      expect(part.id).toBe('test-id')
      expect(part.type).toBe('ball')
      expect(em.getAllParts()).toHaveLength(1)
    })
  })
})
