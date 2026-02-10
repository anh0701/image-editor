import type { Rect } from "../types/Rect"


export function useRectTool() {
  let temp: Rect | null = null

  function start(x: number, y: number, color: string, width: number) {
    temp = {
      type: 'rect',
      x,
      y,
      width: 0,
      height: 0,
      color,
      lineWidth: width
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
