import type { LevelData, AllProgress, LevelProgress } from '../types/LevelTypes'
import { LEVELS } from '../levels/levelData'

const PROGRESS_KEY = 'pitagora_progress_v1'

export class LevelManager {
  private _currentIndex = -1
  private _progress: AllProgress = {}

  constructor() {
    this._loadProgress()
  }

  getLevels(): LevelData[] { return LEVELS }
  getCurrentLevel(): LevelData | null { return LEVELS[this._currentIndex] ?? null }
  getCurrentIndex(): number { return this._currentIndex }
  inLevelMode(): boolean { return this._currentIndex >= 0 }

  setCurrentIndex(i: number): void { this._currentIndex = i }
  exitLevelMode(): void { this._currentIndex = -1 }

  getProgress(levelId: string): LevelProgress {
    return this._progress[levelId] ?? { stars: 0, partsUsed: 0 }
  }

  saveProgress(levelId: string, stars: number, partsUsed: number): void {
    const prev = this._progress[levelId]
    const bestStars = Math.max(stars, prev?.stars ?? 0)
    const bestParts = prev?.partsUsed
      ? Math.min(partsUsed, prev.partsUsed)
      : partsUsed
    this._progress[levelId] = { stars: bestStars, partsUsed: bestParts }
    this._persist()
  }

  hasNextLevel(): boolean { return this._currentIndex < LEVELS.length - 1 }
  getNextIndex(): number { return this._currentIndex + 1 }

  private _loadProgress(): void {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY)
      if (raw) this._progress = JSON.parse(raw) as AllProgress
    } catch { /* ignore */ }
  }

  private _persist(): void {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(this._progress)) } catch { /* ignore */ }
  }
}
