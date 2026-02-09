<template>
  <div class="editor-wrapper">

    <div class="toolbar">
      <div class="tool-group">
        <label class="file-btn">
          Open image
          <input type="file" accept="image/*" @change="onOpenImage" hidden />
        </label>
      </div>

      <div class="tool-group">
        <!-- <button @click="setTool('select')"
          :class="{ active: currentTool === 'select' }">Select</button> -->
        <button @click="setTool('rect')"
          :class="{ active: currentTool === 'rect' }">Rect</button>
        <button @click="setTool('pen')"
          :class="{ active: currentTool === 'pen' }">Pen</button>
        <button @click="setTool('arrow')"
          :class="{ active: currentTool === 'arrow' }">Arrow</button>
      </div>

      <div class="tool-group">
        <input type="color" v-model="strokeColor" />
        <input
          type="range"
          min="1"
          max="10"
          v-model.number="strokeWidth"
        />
        <span class="value value-chip">{{ strokeWidth }}</span>
      </div>

      <div class="tool-group">
        <button @click="setTool('text')">Text</button>
        <input
          type="number"
          min="10"
          max="72"
          v-model.number="fontSize"
        />
      </div>

      <div class="tool-group">
        <button @click="undo">Undo</button>
        <button @click="redo">Redo</button>
        <button @click="clearCanvas">Clear</button>
      </div>

    </div>
    <div>
      <canvas
          ref="canvasRef"
          width="1200"
          height="700"
          @mousedown="onDown"
          @mousemove="onMove"
          @mouseup="onUp"
          style="border:1px solid #ccc"
      />
  
      <input
          v-if="isTyping"
          v-model="textValue"
          :style="{
          position: 'absolute',
          left: textX + 'px',
          top: textY + 'px',
          fontSize: fontSize + 'px',
          color: strokeColor,
          border: '1px dashed #aaa',
          outline: 'none',
          background: 'transparent'
          }"
          @keydown.enter.prevent="commitText"
          @blur="commitText"
      />
    </div>
  </div>   

</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Rect } from '../types/Rect'
import type { PenStroke } from '../types/PenStroke'
import type { Arrow } from '../types/Arrow'
import { redraw } from '../utils/redraw'
import type { CanvasText } from '../types/Text'
import type { EditorState } from '../types/EditorState'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
const backgroundImage = ref<HTMLImageElement | null>(null)

function initHistory() {
  undoStack.length = 0
  redoStack.length = 0
  undoStack.push(snapshot()) 
}


onMounted(() => {
  ctx = canvasRef.value!.getContext('2d')
  if (!ctx) return
  initHistory()
  render()
})

type Tool = 'rect' | 'pen' | 'arrow' | 'text' | 'select'
const currentTool = ref<Tool>('rect')

const strokeColor = ref('#ff0000')
const strokeWidth = ref(3)
const fontSize = ref(18)

function setTool(tool: Tool) {
  currentTool.value = tool
  resetTemp()
}

const rects: Rect[] = []
const penStrokes: PenStroke[] = []
const arrows: Arrow[] = []
const texts: CanvasText[] = []
const undoStack: EditorState[] = []
const redoStack: EditorState[] = []


const isTyping = ref(false)
const textValue = ref('')
const textX = ref(0)
const textY = ref(0)


let isDrawing = false
let startX = 0
let startY = 0

let tempPen: PenStroke | null = null
let tempArrow: Arrow | null = null
let tempRect: Rect | null = null

function resetTemp() {
  isDrawing = false
  tempPen = null
  tempArrow = null
  tempRect = null
}

function onDown(e: MouseEvent) {
  if (!ctx) return

  if (currentTool.value === 'text') {
    textX.value = e.offsetX
    textY.value = e.offsetY
    textValue.value = ''
    isTyping.value = true
    return
  }
  
  isDrawing = true
  startX = e.offsetX
  startY = e.offsetY

  if (currentTool.value === 'pen') {
    tempPen = {
      type: 'pen',
      points: [{ x: startX, y: startY }],
      color: strokeColor.value,
      lineWidth: strokeWidth.value
    }
  }

  if (currentTool.value === 'arrow') {
    tempArrow = {
      type: 'arrow',
      startX,
      startY,
      endX: startX,
      endY: startY,
      color: strokeColor.value,
      lineWidth: strokeWidth.value
    }
  }

  if (currentTool.value === 'rect') {
    tempRect = {
      x: startX,
      y: startY,
      width: 0,
      height: 0,
      color: strokeColor.value,
      lineWidth: strokeWidth.value
    }
  }

}

function onMove(e: MouseEvent) {
  if (!ctx || !isDrawing) return

  if (tempPen) {
    tempPen.points.push({ x: e.offsetX, y: e.offsetY })
  }

  if (tempArrow) {
    tempArrow.endX = e.offsetX
    tempArrow.endY = e.offsetY
  }

  if (tempRect) {
    tempRect.width = e.offsetX - startX
    tempRect.height = e.offsetY - startY
  }

  render()
}

function onUp() {
  if (!ctx) return

  if (tempPen) penStrokes.push(tempPen)
  if (tempArrow) arrows.push(tempArrow)
  if (tempRect) rects.push(tempRect)

  resetTemp()
  pushHistory()
  render()
}

function onOpenImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const img = new Image()
  img.onload = () => {
    backgroundImage.value = img
    pushHistory()
    render()
  }
  img.src = URL.createObjectURL(file)
}


function render() {
  if (!ctx) return

  redraw({
    ctx,
    rects: tempRect ? [...rects, tempRect] : rects,
    penStrokes: tempPen ? [...penStrokes, tempPen] : penStrokes,
    arrows: tempArrow ? [...arrows, tempArrow] : arrows,
    texts,
    width: 1200,
    height: 700,
    backgroundImage: backgroundImage.value
  })
}

function commitText() {
  if (!textValue.value.trim()) {
    isTyping.value = false
    return
  }

  texts.push({
    type: 'text',
    x: textX.value,
    y: textY.value,
    value: textValue.value,
    color: strokeColor.value,
    fontSize: fontSize.value
  })

  isTyping.value = false

  pushHistory()
  render()
}

function snapshot(): EditorState {
  return {
    rects: structuredClone(rects),
    penStrokes: structuredClone(penStrokes),
    arrows: structuredClone(arrows),
    texts: structuredClone(texts),
    backgroundImage: backgroundImage.value
  }
}

function pushHistory() {
  undoStack.push(snapshot())
  redoStack.length = 0 
}

function undo() {
  if (undoStack.length === 0) return

  const current = snapshot()
  redoStack.push(current)

  const prev = undoStack.pop()!

  rects.length = 0
  penStrokes.length = 0
  arrows.length = 0
  texts.length = 0

  rects.push(...prev.rects)
  penStrokes.push(...prev.penStrokes)
  arrows.push(...prev.arrows)
  texts.push(...prev.texts)
  backgroundImage.value = prev.backgroundImage

  render()
}

function redo() {
  if (redoStack.length === 0) return

  const current = snapshot()
  undoStack.push(current)

  const next = redoStack.pop()!

  rects.length = 0
  penStrokes.length = 0
  arrows.length = 0
  texts.length = 0

  rects.push(...next.rects)
  penStrokes.push(...next.penStrokes)
  arrows.push(...next.arrows)
  texts.push(...next.texts)
  backgroundImage.value = next.backgroundImage

  render()
}

function clearCanvas() {
  pushHistory()

  rects.length = 0
  penStrokes.length = 0
  arrows.length = 0
  texts.length = 0
  backgroundImage.value = null

  render()
}


</script>

<style src="./Editor.css" scoped></style>

