import type { EditorState } from '../types/EditorState'
import { redraw } from './redraw'


export function useCanvas(
  ctx: CanvasRenderingContext2D
) {
  function render(state: EditorState) {
    redraw(ctx, state)
  }

  return { render }
}
