import type { EditorState } from '../types/EditorState'
import { drawArrow } from '../utils/drawArrow'
import { drawPen } from '../utils/drawPen'
import { drawRect } from '../utils/drawRect'
import { drawText } from '../utils/drawText'

export function redraw(ctx: CanvasRenderingContext2D, state: EditorState) {
  const {
    images,
    rects,
    penStrokes,
    arrows,
    texts
  } = state

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  images.forEach(img => {
    const image = new Image()
    image.src = img.src
    ctx.drawImage(image, img.x, img.y, img.w, img.h)
  })


  rects.forEach(r => drawRect(ctx, r))

  penStrokes.forEach(s => drawPen(ctx, s))
  arrows.forEach(a => drawArrow(ctx, a))
  texts.forEach(t => drawText(ctx, t))
}

