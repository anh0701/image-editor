import { useCanvas } from "../canvas/useCanvas"
import type { Arrow } from "../types/Arrow"
import type { CanvasImage } from "../types/CanvasImage"
import type { ExportOptions } from "../types/ExportOptions"
import type { PenStroke } from "../types/PenStroke"
import type { Rect } from "../types/Rect"
import type { TextShape } from "../types/Text"
import { computeBounds } from "../utils/computeBounds"

export function exportImage(
  options: ExportOptions,
  images: CanvasImage[],
  rects: Rect[],
  arrows: Arrow[],
  penStrokes: PenStroke[],
  texts: TextShape[],
  sourceCanvas?: HTMLCanvasElement
) {
  const hasImage = images.length > 0

  // ko image
  if (!hasImage && sourceCanvas) {
    const outCanvas = document.createElement('canvas')
    outCanvas.width = sourceCanvas.width
    outCanvas.height = sourceCanvas.height

    const outCtx = outCanvas.getContext('2d')!

    if (options.background === 'white') {
      outCtx.fillStyle = '#fff'
      outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height)
    }

    const renderer = useCanvas(outCtx)
    renderer.render({
      images,
      rects,
      arrows,
      penStrokes,
      texts
    })

    return outCanvas
  }

  // có image 
  const bounds = computeBounds(images, rects, arrows, penStrokes, texts)
  if (!bounds) return

  const padding = options.padding ?? 10

  const w = Math.ceil(bounds.maxX - bounds.minX + padding * 2)
  const h = Math.ceil(bounds.maxY - bounds.minY + padding * 2)

  if (w <= 0 || h <= 0) return

  const outCanvas = document.createElement('canvas')
  outCanvas.width = w
  outCanvas.height = h

  const outCtx = outCanvas.getContext('2d')!

  if (options.background === 'white') {
    outCtx.fillStyle = '#fff'
    outCtx.fillRect(0, 0, w, h)
  }

  outCtx.translate(
    -bounds.minX + padding,
    -bounds.minY + padding
  )

  const renderer = useCanvas(outCtx)
  renderer.render({
    images,
    rects,
    arrows,
    penStrokes,
    texts
  })

  return outCanvas
}
