import type { TextShape } from "../types/Text"


export function useTextTool() {
    function create(
        x: number,
        y: number,
        text: string,
        color: string,
        fontSize = 16
    ): TextShape {
        return {
            type: 'text',
            x,
            y,
            text,
            color,
            fontSize
        }
    }

    return { create }
}
