import type { LevelData } from '../types/LevelTypes'

const KEY = 'pitagora_custom_levels'

export class CustomLevelManager {
  list(): LevelData[] {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as LevelData[]) : []
    } catch {
      return []
    }
  }

  save(level: LevelData): void {
    const levels = this.list().filter(l => l.id !== level.id)
    levels.push(level)
    localStorage.setItem(KEY, JSON.stringify(levels))
  }

  delete(id: string): void {
    const levels = this.list().filter(l => l.id !== id)
    localStorage.setItem(KEY, JSON.stringify(levels))
  }

  exportJSON(level: LevelData): void {
    const json = JSON.stringify(level, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stage_${level.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  importJSON(json: string): LevelData | null {
    try {
      const data = JSON.parse(json) as Partial<LevelData>
      if (typeof data.title !== 'string' || !Array.isArray(data.parts)) return null
      return {
        id: data.id ?? `custom_${Date.now()}`,
        title: data.title,
        description: data.description ?? '',
        difficulty: ([1, 2, 3, 4, 5].includes(data.difficulty as number)
          ? data.difficulty
          : 1) as 1 | 2 | 3 | 4 | 5,
        parParts: data.parParts ?? 10,
        constraints: data.constraints ?? {},
        parts: data.parts,
      }
    } catch {
      return null
    }
  }
}
