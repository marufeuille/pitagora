import type { PartType, PartData } from './PartTypes'

export type PartConstraints = Partial<Record<PartType, number>>

export interface LevelData {
  id: string
  title: string
  description: string
  difficulty: 1 | 2 | 3 | 4 | 5
  parts: PartData[]
  constraints: PartConstraints
  parParts: number
}

export interface LevelProgress {
  stars: number
  partsUsed: number
}

export type AllProgress = Record<string, LevelProgress>
