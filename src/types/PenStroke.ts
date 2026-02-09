import type { Point } from "./Point"

export interface PenStroke {
  type: 'pen'
  points: Point[]
  color: string
  lineWidth: number
}