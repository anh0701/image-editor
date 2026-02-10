import type { Arrow } from "../types/Arrow"


export function useArrowTool() {
  let temp: Arrow | null = null

  function start(x: number, y: number, color: string, width: number) {
    temp = {
      type: 'arrow',
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      color,
      lineWidth: width
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
