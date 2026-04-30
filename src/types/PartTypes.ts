export type PartType = 'ball' | 'ramp' | 'platform' | 'domino' | 'seesaw' | 'goal' | 'spring' | 'bell'

export interface PartOptions {
  width?: number
  height?: number
  radius?: number
  angle?: number
  [key: string]: unknown
}

export interface PartData {
  id: string
  type: PartType
  x: number
  y: number
  angle: number
  options: PartOptions
  isFixed?: boolean
}
