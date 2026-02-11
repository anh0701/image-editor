import type { CanvasImage } from "../types/CanvasImage"
import { imageCache } from "../types/imageCache.ts"

export function useImageManager(
  ctx: CanvasRenderingContext2D
) {

  function computeFitSize(img: HTMLImageElement) {
    const canvasW = ctx.canvas.width
    const canvasH = ctx.canvas.height

    const scale = Math.min(
      canvasW / img.width,
      canvasH / img.height,
      1
    )

    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)

    return {
      x: (canvasW - w) / 2,
      y: (canvasH - h) / 2,
      w,
      h
    }
  }

  function createCanvasImage(
    img: HTMLImageElement,
    src: string
  ): CanvasImage {

    imageCache.set(src, img)

    const { x, y, w, h } = computeFitSize(img)

    return {
      type: "image",
      src,
      element: img,
      x,
      y,
      w,
      h
    }
  }

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  async function fromFile(file: File): Promise<CanvasImage> {
    const url = URL.createObjectURL(file)
    const img = await loadImage(url)
    return createCanvasImage(img, url)
  }

  async function fromBlob(blob: Blob): Promise<CanvasImage> {
    const url = URL.createObjectURL(blob)
    const img = await loadImage(url)
    return createCanvasImage(img, url)
  }

  function rehydrate(images: CanvasImage[]) {
    images.forEach(img => {
      if (!img.element) {
        const cached = imageCache.get(img.src)
        if (cached) {
          img.element = cached
        }
      }
    })
  }

  return {
    fromFile,
    fromBlob,
    rehydrate
  }
}
