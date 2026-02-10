
import { imageCache } from "../state/imageCache.ts"
import type { CanvasImage } from "../types/CanvasImage"

export function drawCanvasImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImage
) {
  let el = image.element

  if (!el) {
    el = imageCache.get(image.src)
    if (el) {
      image.element = el 
    }
  }

  if (!el) return

  ctx.drawImage(el, image.x, image.y, image.w, image.h)
}
