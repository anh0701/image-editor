import type { Ref } from "vue"

export type ToolName = 'pen' | 'rect' | 'arrow' | 'text'
export type DrawToolName = Exclude<ToolName, 'text'>

export type DrawTool<TShape> = {
  start: (
    x: number,
    y: number,
    options: {
      color: string
      width: number
    }
  ) => void

  move: (x: number, y: number) => void

  end: () => TShape | null
}

function isDrawTool(tool: ToolName): tool is DrawToolName {
  return tool !== 'text'
}

interface Options<TShapeMap extends Record<DrawToolName, unknown>> {
  canvasRef: Ref<HTMLCanvasElement | null>
  currentTool: Ref<ToolName>
  strokeColor: Ref<string>
  strokeWidth: Ref<number>
  isTyping: Ref<boolean>

  toolMap: {
    [K in keyof TShapeMap]: DrawTool<TShapeMap[K]>
  }

  onAddShape: <K extends keyof TShapeMap>(
    tool: K,
    shape: TShapeMap[K]
  ) => void

  onRenderPreview: () => void
  onRender: () => void
  onHistoryPush: () => void
  onStartText: (x: number, y: number) => void
}

export function usePointerController<
  TShapeMap extends Record<DrawToolName, unknown>
>(options: Options<TShapeMap>) {
  const {
    canvasRef,
    currentTool,
    strokeColor,
    strokeWidth,
    isTyping,
    toolMap,
    onAddShape,
    onRenderPreview,
    onRender,
    onHistoryPush,
    onStartText
  } = options

  function getPointerPos(e: PointerEvent) {
    const canvas = canvasRef.value
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()

    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  function onPointerDown(e: PointerEvent) {
    if (isTyping.value) return

    const pos = getPointerPos(e)
    if (!pos) return

    const { x, y } = pos

    if (!isDrawTool(currentTool.value)) {
      onStartText(x, y)
      return
    }

    const tool = toolMap[currentTool.value]

    tool.start(x, y, {
      color: strokeColor.value,
      width: strokeWidth.value
    })
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDrawTool(currentTool.value)) return

    const tool = toolMap[currentTool.value]
    const pos = getPointerPos(e)
    if (!pos) return

    tool.move(pos.x, pos.y)

    onRenderPreview()
  }

  function onPointerUp() {
    if (!isDrawTool(currentTool.value)) return

    const tool = toolMap[currentTool.value]
    const shape = tool.end()
    if (!shape) return

    onAddShape(currentTool.value, shape)
    onHistoryPush()
    onRender()
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp
  }
}
