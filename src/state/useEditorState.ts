import type { Arrow } from "../types/Arrow"
import type { CanvasImage } from "../types/CanvasImage"
import type { PenStroke } from "../types/PenStroke"
import type { Rect } from "../types/Rect"
import type { TextShape } from "../types/Text"


export function useEditorState() {
    const images: CanvasImage[] = []
    const rects: Rect[] = []
    const penStrokes: PenStroke[] = []
    const arrows: Arrow[] = []
    const texts: TextShape[] = []

    function clear() {
        images.length = 0
        rects.length = 0
        penStrokes.length = 0
        arrows.length = 0
        texts.length = 0
    }

    return {
        images,
        rects,
        penStrokes,
        arrows,
        texts,
        clear
    }
}
