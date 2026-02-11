import type { PenStroke } from "../types/PenStroke"
import type { StartOptions } from "../types/StartOptions"


export function usePenTool() {
  let temp: PenStroke | null = null

  function start(x: number, y: number, options: StartOptions) {
    temp = {
      type: 'pen',
      points: [{ x, y }],
      color: options.color,
      lineWidth: options.width
    }
  }

  function move(x: number, y: number) {
    temp?.points.push({ x, y })
  }

  function end() {
    const done = temp
    temp = null
    return done
  }

  function preview(list: PenStroke[]) {
    return temp ? [...list, temp] : list
  }

  return { start, move, end, preview }
}
