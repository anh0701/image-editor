import type { Arrow } from "./Arrow"
import type { PenStroke } from "./PenStroke"
import type { Rect } from "./Rect"
import type { CanvasText } from "./Text"

export type EditorState = {
  rects: Rect[]
  penStrokes: PenStroke[]
  arrows: Arrow[]
  texts: CanvasText[]
  backgroundImage: HTMLImageElement | null
}
