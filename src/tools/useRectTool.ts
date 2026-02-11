import type { Rect } from "../types/Rect"
import type { StartOptions } from "../types/StartOptions"


export function useRectTool() {
  let temp: Rect | null = null

  function start(x: number, y: number, options: StartOptions) {
    temp = {
      type: 'rect',
      x,
      y,
      width: 0,
      height: 0,
      color: options.color,
      lineWidth: options.width
    }
  }

  function move(x: number, y: number) {
    if (!temp) return
    temp.width = x - temp.x
    temp.height = y - temp.y
  }

  function end() {
    const done = temp
    temp = null
    return done
  }

  function preview(list: Rect[]) {
    return temp ? [...list, temp] : list
  }

  return { start, move, end, preview }
}
