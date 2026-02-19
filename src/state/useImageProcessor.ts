import { blend, medianDenoise } from "../tools/medianDenoise";
import { unsharpMask } from "../tools/unsharpMask";

export function useImageProcessor(ctx: CanvasRenderingContext2D) {
  let original: ImageData | null = null

  function captureOriginal(width: number, height: number) {
    original = ctx.getImageData(0, 0, width, height)
  }

  function applyEnhance(
    width: number,
    height: number,
    opts: { denoise: number; sharpen: number }
  ) {
    if (!original) return

    let working = new ImageData(
      new Uint8ClampedArray(original.data),
      width,
      height
    )

    if (opts.denoise > 0) {
      const denoised = medianDenoise(working, width, height)
      working = blend(working, denoised, opts.denoise)
    }

    if (opts.sharpen > 0) {
      working = unsharpMask(working, width, height, opts.sharpen)
    }

    ctx.putImageData(working, 0, 0)
  }

  return {
    captureOriginal,
    applyEnhance
  }
}
