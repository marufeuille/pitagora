import type { PartData } from './PartTypes'

export interface GameState {
  version: '1.0'
  parts: PartData[]
  camera: { x: number; y: number; zoom: number }
  savedAt: string
}

export interface SaveSlot {
  name: string
  savedAt: string
  partCount: number
}

export function validateGameState(json: string): GameState | null {
  try {
    const obj = JSON.parse(json)
    if (obj.version !== '1.0') return null
    if (!Array.isArray(obj.parts)) return null
    if (!obj.camera || typeof obj.camera.x !== 'number') return null
    for (const p of obj.parts) {
      if (!p.id || !p.type || typeof p.x !== 'number' || typeof p.y !== 'number') return null
    }
    return obj as GameState
  } catch {
    return null
  }
}
