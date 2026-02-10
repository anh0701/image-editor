export function drawText(
  ctx: CanvasRenderingContext2D,
  t: {
    x: number
    y: number
    text: string
    color: string
    fontSize: number
  }
) {
  ctx.fillStyle = t.color
  ctx.font = `${t.fontSize}px sans-serif`
  ctx.fillText(t.text, t.x, t.y)
}
