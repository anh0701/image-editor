import { drawArrow } from './drawArrow'
import { drawPen } from './drawPen'
import { drawText } from './drawText'

export function redraw({
  ctx,
  rects,
  penStrokes,
  arrows,
  texts,
  width,
  height
}: {
  ctx: CanvasRenderingContext2D
  rects: any[]
  penStrokes: any[]
  arrows: any[]
  texts: any[]
  width: number
  height: number
}) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, width, height)

  rects.forEach(r => {
    ctx.strokeStyle = r.color
    ctx.lineWidth = r.lineWidth
    ctx.strokeRect(r.x, r.y, r.width, r.height)
  })

  penStrokes.forEach(s => drawPen(ctx, s))
  arrows.forEach(a => drawArrow(ctx, a))
  texts.forEach(t => drawText(ctx, t))
}
