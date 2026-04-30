import { describe, it, expect, beforeEach } from 'vitest'
import { validateGameState } from '../../src/types/GameState'
import type { GameState } from '../../src/types/GameState'

const validState: GameState = {
  version: '1.0',
  parts: [
    { id: 'abc-123', type: 'ball', x: 100, y: 200, angle: 0, options: { radius: 22 } },
    { id: 'def-456', type: 'platform', x: 300, y: 400, angle: 0, options: { width: 220, height: 16 } },
  ],
  camera: { x: 500, y: 300, zoom: 1 },
  savedAt: '2026-01-01T00:00:00.000Z',
}

describe('validateGameState', () => {
  it('valid JSON を正しくパースして GameState を返す', () => {
    const result = validateGameState(JSON.stringify(validState))
    expect(result).not.toBeNull()
    expect(result?.version).toBe('1.0')
    expect(result?.parts).toHaveLength(2)
    expect(result?.camera.x).toBe(500)
  })

  it('version が不正な場合に null を返す', () => {
    const bad = { ...validState, version: '2.0' }
    expect(validateGameState(JSON.stringify(bad))).toBeNull()
  })

  it('parts が配列でない場合に null を返す', () => {
    const bad = { ...validState, parts: 'bad' }
    expect(validateGameState(JSON.stringify(bad))).toBeNull()
  })

  it('camera フィールドが欠損した場合に null を返す', () => {
    const { camera: _c, ...bad } = validState as unknown as Record<string, unknown>
    expect(validateGameState(JSON.stringify(bad))).toBeNull()
  })

  it('parts 内に id が欠損した要素があれば null を返す', () => {
    const bad: GameState = {
      ...validState,
      parts: [{ type: 'ball', x: 0, y: 0, angle: 0, options: {} } as never],
    }
    expect(validateGameState(JSON.stringify(bad))).toBeNull()
  })

  it('不正な JSON 文字列で null を返す', () => {
    expect(validateGameState('not-json')).toBeNull()
  })

  it('パースした PartData の型フィールドを保持する', () => {
    const result = validateGameState(JSON.stringify(validState))
    expect(result?.parts[0].type).toBe('ball')
    expect(result?.parts[1].type).toBe('platform')
  })
})
