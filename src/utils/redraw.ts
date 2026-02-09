import type { Rect } from '../types/Rect'
import type { PenStroke } from '../types/PenStroke'
import type { Arrow } from '../types/Arrow'
import { drawPen } from './drawPen'
import { drawArrow } from './drawArrow'

interface RedrawParams {
  ctx: CanvasRenderingContext2D
  rects: Rect[]
  penStrokes: PenStroke[]
  arrows: Arrow[]
  width: number
  height: number
}

export function redraw({
  ctx,
  rects,
  penStrokes,
  arrows,
  width,
  height
}: RedrawParams) {
  ctx.clearRect(0, 0, width, height)

  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, width, height)

  // Rect
  for (const r of rects) {
    ctx.save()
    ctx.strokeStyle = r.color
    ctx.lineWidth = r.lineWidth
    ctx.strokeRect(r.x, r.y, r.width, r.height)
    ctx.restore()
  }

  // Pen
  for (const stroke of penStrokes) {
    drawPen(ctx, stroke)
  }

  // Arrow
  for (const arrow of arrows) {
    drawArrow(ctx, arrow)
  }
}
