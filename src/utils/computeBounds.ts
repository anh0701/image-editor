import type { Arrow } from "../types/Arrow"
import type { CanvasImage } from "../types/CanvasImage"
import type { PenStroke } from "../types/PenStroke"
import type { Rect } from "../types/Rect"
import type { TextShape } from "../types/Text"

export function computeBounds(images: CanvasImage[], rects: Rect[],
    arrows: Arrow[], penStrokes: PenStroke[], texts: TextShape[]) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    const measureCtx = document
        .createElement('canvas')
        .getContext('2d')!

    // images
    images.forEach(img => {
        minX = Math.min(minX, img.x)
        minY = Math.min(minY, img.y)
        maxX = Math.max(maxX, img.x + img.w)
        maxY = Math.max(maxY, img.y + img.h)
    })

    // rects
    rects.forEach(r => {
        minX = Math.min(minX, r.x)
        minY = Math.min(minY, r.y)
        maxX = Math.max(maxX, r.x + r.width)
        maxY = Math.max(maxY, r.y + r.height)
    })

    // arrows
    arrows.forEach(a => {
        minX = Math.min(minX, a.startX, a.endX)
        minY = Math.min(minY, a.startY, a.endY)
        maxX = Math.max(maxX, a.startX, a.endX)
        maxY = Math.max(maxY, a.startY, a.endY)
    })

    // pen
    penStrokes.forEach(p => {
        p.points.forEach(pt => {
            minX = Math.min(minX, pt.x)
            minY = Math.min(minY, pt.y)
            maxX = Math.max(maxX, pt.x)
            maxY = Math.max(maxY, pt.y)
        })
    })

    // text
    texts.forEach(t => {
        measureCtx.font = `${t.fontSize}px sans-serif`
        const metrics = measureCtx.measureText(t.text)

        minX = Math.min(minX, t.x)
        minY = Math.min(minY, t.y - t.fontSize)
        maxX = Math.max(maxX, t.x + metrics.width)
        maxY = Math.max(maxY, t.y)
    })

    if (minX === Infinity) return null

    return { minX, minY, maxX, maxY }
}
