import type { CanvasText } from '../types/Text'

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: CanvasText
) {
  ctx.fillStyle = text.color
  ctx.font = `${text.fontSize}px ${text.fontFamily ?? 'Arial'}`
  ctx.textBaseline = 'top'
  ctx.fillText(text.value, text.x, text.y)
}
