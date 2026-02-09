import type { Arrow } from "../types/Arrow"

export function drawArrow(ctx: CanvasRenderingContext2D, arrow: Arrow) {
  ctx.save()

  const { startX, startY, endX, endY, color, lineWidth } = arrow

  const headLength = 12
  const angle = Math.atan2(endY - startY, endX - startX)

  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth

  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(endX, endY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(endX, endY)
  ctx.lineTo(
    endX - headLength * Math.cos(angle - Math.PI / 6),
    endY - headLength * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    endX - headLength * Math.cos(angle + Math.PI / 6),
    endY - headLength * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()

  ctx.restore()
}
