import type { Arrow } from "../types/Arrow"
import type { CanvasImage } from "../types/CanvasImage"
import type { PenStroke } from "../types/PenStroke"
import type { Rect } from "../types/Rect"
import type { TextShape } from "../types/Text"

export function computeBounds(
    images: CanvasImage[],
    rects: Rect[],
    arrows: Arrow[],
    penStrokes: PenStroke[],
    texts: TextShape[]
) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    const measureCtx = document.createElement('canvas').getContext('2d')!

    // images
    images.forEach(img => {
        minX = Math.min(minX, img.x)
        minY = Math.min(minY, img.y)
        maxX = Math.max(maxX, img.x + img.w)
        maxY = Math.max(maxY, img.y + img.h)
    })

    // rects 
    rects.forEach(r => {
        const half = (r.lineWidth ?? 0) / 2
        minX = Math.min(minX, r.x - half)
        minY = Math.min(minY, r.y - half)
        maxX = Math.max(maxX, r.x + r.width + half)
        maxY = Math.max(maxY, r.y + r.height + half)
    })

    // arrows 
    arrows.forEach(a => {
        const half = a.lineWidth / 2

        minX = Math.min(minX, a.startX - half, a.endX - half)
        minY = Math.min(minY, a.startY - half, a.endY - half)
        maxX = Math.max(maxX, a.startX + half, a.endX + half)
        maxY = Math.max(maxY, a.startY + half, a.endY + half)
    })


    // pen 
    penStrokes.forEach(p => {
        const half = (p.lineWidth ?? 0) / 2
        p.points.forEach(pt => {
            minX = Math.min(minX, pt.x - half)
            minY = Math.min(minY, pt.y - half)
            maxX = Math.max(maxX, pt.x + half)
            maxY = Math.max(maxY, pt.y + half)
        })
    })

    // text 
    texts.forEach(t => {
        measureCtx.font = `${t.fontSize}px sans-serif`
        const metrics = measureCtx.measureText(t.text)

        let x1 = t.x
        let x2 = t.x + metrics.width

        if (t.textAlign === 'center') {
            x1 = t.x - metrics.width / 2
            x2 = t.x + metrics.width / 2
        } else if (t.textAlign === 'right') {
            x1 = t.x - metrics.width
            x2 = t.x
        }

        minX = Math.min(minX, x1)
        minY = Math.min(minY, t.y - t.fontSize)
        maxX = Math.max(maxX, x2)
        maxY = Math.max(maxY, t.y)
    })


    if (minX === Infinity) return null
    return { minX, minY, maxX, maxY }
}
