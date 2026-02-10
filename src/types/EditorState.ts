import type { Arrow } from "./Arrow"
import type { CanvasImage } from "./CanvasImage"
import type { PenStroke } from "./PenStroke"
import type { Rect } from "./Rect"
import type { TextShape } from "./Text"


export interface EditorState {
  rects: Rect[]
  penStrokes: PenStroke[]
  arrows: Arrow[]
  texts: TextShape[]
  images: CanvasImage[]
}
