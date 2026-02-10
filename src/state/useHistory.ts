import type { EditorState } from "../types/EditorState"


export function useHistory(snapshot: () => EditorState) {
  const undoStack: EditorState[] = []
  const redoStack: EditorState[] = []

  function push() {
    undoStack.push(snapshot())
    redoStack.length = 0
  }

  function undo(apply: (s: EditorState) => void) {
    if (!undoStack.length) return
    redoStack.push(snapshot())
    apply(undoStack.pop()!)
  }

  function redo(apply: (s: EditorState) => void) {
    if (!redoStack.length) return
    undoStack.push(snapshot())
    apply(redoStack.pop()!)
  }

  function reset() {
    undoStack.length = 0
    redoStack.length = 0
    undoStack.push(snapshot())
  }

  return { push, undo, redo, reset }
}
