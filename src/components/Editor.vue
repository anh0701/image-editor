<template>
  <div class="toolbar">
    <button @click="setTool('select')">Select</button>
    <button @click="setTool('rect')">Rect</button>
    <button @click="setTool('pen')">Pen</button>
    <button @click="setTool('arrow')">Arrow</button>

    <input type="color" v-model="strokeColor" />
    <input type="range" min="1" max="10" v-model.number="strokeWidth" />
    <span>{{ strokeWidth }}</span>
  </div>

  <canvas
    ref="canvasRef"
    width="1200"
    height="700"
    @mousedown="onDown"
    @mousemove="onMove"
    @mouseup="onUp"
    style="border:1px solid #ccc"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Rect } from '../types/Rect'
import type { PenStroke } from '../types/PenStroke'
import type { Arrow } from '../types/Arrow'
import { redraw } from '../utils/redraw'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

onMounted(() => {
  ctx = canvasRef.value!.getContext('2d')
  if (!ctx) return
  render()
})

type Tool = 'rect' | 'pen' | 'arrow' | 'select'
const currentTool = ref<Tool>('rect')

const strokeColor = ref('#ff0000')
const strokeWidth = ref(3)

function setTool(tool: Tool) {
  currentTool.value = tool
  resetTemp()
}

const rects: Rect[] = []
const penStrokes: PenStroke[] = []
const arrows: Arrow[] = []

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
  render()
}

function render() {
  if (!ctx) return

  redraw({
    ctx,
    rects: tempRect ? [...rects, tempRect] : rects,
    penStrokes: tempPen ? [...penStrokes, tempPen] : penStrokes,
    arrows: tempArrow ? [...arrows, tempArrow] : arrows,
    width: 1200,
    height: 700
  })
}
</script>

<style>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
