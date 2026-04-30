import { validateGameState, type GameState, type SaveSlot } from '../types/GameState'
import type { EditManager } from './EditManager'

const SLOT_PREFIX = 'pitagora_slot_'
const INDEX_KEY = 'pitagora_slots'

export class SaveLoadManager {
  constructor(private readonly _editManager: EditManager) {}

  save(slotName: string, cameraX: number, cameraY: number, cameraZoom: number): void {
    const state: GameState = {
      version: '1.0',
      parts: this._editManager.getAllParts().map(p => p.serialize()),
      camera: { x: cameraX, y: cameraY, zoom: cameraZoom },
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(SLOT_PREFIX + slotName, JSON.stringify(state))
    this._upsertIndex(slotName, state.savedAt, state.parts.length)
  }

  load(slotName: string): GameState | null {
    const raw = localStorage.getItem(SLOT_PREFIX + slotName)
    if (!raw) return null
    return validateGameState(raw)
  }

  listSlots(): SaveSlot[] {
    try {
      const idx = localStorage.getItem(INDEX_KEY)
      return idx ? (JSON.parse(idx) as SaveSlot[]) : []
    } catch {
      return []
    }
  }

  deleteSlot(slotName: string): void {
    localStorage.removeItem(SLOT_PREFIX + slotName)
    const slots = this.listSlots().filter(s => s.name !== slotName)
    localStorage.setItem(INDEX_KEY, JSON.stringify(slots))
  }

  exportJSON(cameraX: number, cameraY: number, cameraZoom: number): void {
    const state: GameState = {
      version: '1.0',
      parts: this._editManager.getAllParts().map(p => p.serialize()),
      camera: { x: cameraX, y: cameraY, zoom: cameraZoom },
      savedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pitagora_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  importJSON(json: string): GameState | null {
    return validateGameState(json)
  }

  private _upsertIndex(name: string, savedAt: string, partCount: number): void {
    const slots = this.listSlots().filter(s => s.name !== name)
    slots.unshift({ name, savedAt, partCount })
    localStorage.setItem(INDEX_KEY, JSON.stringify(slots))
  }
}
