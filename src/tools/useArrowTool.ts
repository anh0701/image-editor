import type { Arrow } from "../types/Arrow"
import type { StartOptions } from "../types/StartOptions"


export function useArrowTool() {
  let temp: Arrow | null = null

  function start(x: number, y: number, options: StartOptions) {
    temp = {
      type: 'arrow',
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      color: options.color,
      lineWidth: options.width
    }
  }

  function move(x: number, y: number) {
    if (!temp) return
    temp.endX = x
    temp.endY = y
  }

  function end() {
    const done = temp
    temp = null
    return done
  }

  function preview(list: Arrow[]) {
    return temp ? [...list, temp] : list
  }

  return { start, move, end, preview }
}
