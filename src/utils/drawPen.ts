import type { PenStroke } from "../types/PenStroke"

export function drawPen(ctx: CanvasRenderingContext2D, stroke: PenStroke) {
  if (stroke.points.length < 2) return

  const firstPoint = stroke?.points[0];
  if (!firstPoint) return;

  ctx.save()

  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.lineWidth
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.moveTo(firstPoint.x, firstPoint.y)

  for (const p of stroke.points) {
    ctx.lineTo(p.x, p.y)
  }

  ctx.stroke()

  ctx.restore()
}
