import type { Ref } from "vue"
import type { EditorState } from "../types/EditorState"
import { exportImage } from "../tools/exportImage"
import { generateImageFileNameWithMs } from "../state/generateImageFileNameWithMs"
import type { ExportOptions } from "../types/ExportOptions"

export function useExporter(
  canvasRef: Ref<HTMLCanvasElement | null>
) {

  function buildCanvas(
    options: ExportOptions,
    state: EditorState
  ) {
    return exportImage(
      options,
      state.images,
      state.rects,
      state.arrows,
      state.penStrokes,
      state.texts,
      canvasRef.value!
    )
  }

  async function save(
    options: ExportOptions,
    state: EditorState
  ) {

    const canvas = buildCanvas(options, state)
    if (!canvas) return

    const blob = await new Promise<Blob | null>(r =>
      canvas.toBlob(r, "image/png")
    )

    if (!blob) return

    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = generateImageFileNameWithMs()
    a.click()

    URL.revokeObjectURL(url)
  }

  async function copy(
    options: ExportOptions,
    state: EditorState
  ) {

    const canvas = buildCanvas(options, state)
    if (!canvas) return

    const blob = await new Promise<Blob | null>(r =>
      canvas.toBlob(r, "image/png")
    )

    if (!blob) return

    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ])
  }

  return {
    save,
    copy
  }
}
