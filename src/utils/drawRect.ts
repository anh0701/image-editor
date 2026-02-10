import type { Rect } from "../types/Rect"

export function drawRect(
  ctx: CanvasRenderingContext2D,
  rect: Rect
) {
  ctx.save()

  ctx.strokeStyle = rect.color
  ctx.lineWidth = rect.lineWidth

  ctx.strokeRect(
    rect.x,
    rect.y,
    rect.width,
    rect.height
  )

  ctx.restore()
}