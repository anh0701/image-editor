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

import { useEditorState } from '../state/useEditorState'
import { useHistory } from '../state/useHistory'
import { useCanvas } from '../canvas/useCanvas'

import { usePenTool } from '../tools/usePenTool'
import { useArrowTool } from '../tools/useArrowTool'
import { useRectTool } from '../tools/useRectTool'
import { useTextTool } from '../tools/useTextTool'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D

const currentTool = ref<'pen' | 'rect' | 'arrow' | 'text'>('pen')
const strokeColor = ref('#ff0000')
const strokeWidth = ref(2)
const fontSize = ref(16)

const { images, rects, penStrokes, arrows, texts, clear } = useEditorState()

function snapshot() {
  return {
    images: structuredClone(images),
    rects: structuredClone(rects),
    penStrokes: structuredClone(penStrokes),
    arrows: structuredClone(arrows),
    texts: structuredClone(texts)
  }
}

const history = useHistory(snapshot)

const penTool = usePenTool()
const arrowTool = useArrowTool()
const rectTool = useRectTool()
const textTool = useTextTool()

let canvas: ReturnType<typeof useCanvas>

function render() {
  canvas.render(snapshot())
}

function getPos(e: MouseEvent) {
  const rect = canvasRef.value!.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

function onDown(e: MouseEvent) {
  const { x, y } = getPos(e)

  if (currentTool.value === 'pen') {
    penTool.start(x, y, strokeColor.value, strokeWidth.value)
  }

  if (currentTool.value === 'arrow') {
    arrowTool.start(x, y, strokeColor.value, strokeWidth.value)
  }

  if (currentTool.value === 'rect') {
    rectTool.start(x, y, strokeColor.value, strokeWidth.value)
  }

  if (currentTool.value === 'text') {
    startText(x, y)
  }
}

function onMove(e: MouseEvent) {
  const { x, y } = getPos(e)

  if (currentTool.value === 'pen') {
    penTool.move(x, y)
    renderPreview()
  }

  if (currentTool.value === 'arrow') {
    arrowTool.move(x, y)
    renderPreview()
  }

  if (currentTool.value === 'rect') {
    rectTool.move(x, y)
    renderPreview()
  }
}

function onUp() {
  let done

  if (currentTool.value === 'pen') {
    done = penTool.end()
    if (done) penStrokes.push(done)
  }

  if (currentTool.value === 'arrow') {
    done = arrowTool.end()
    if (done) arrows.push(done)
  }

  if (currentTool.value === 'rect') {
    done = rectTool.end()
    if (done) rects.push(done)
  }

  if (done) {
    history.push()
    render()
  }
}

function renderPreview() {
  canvas.render({
    images,
    rects: rectTool.preview(rects),
    arrows: arrowTool.preview(arrows),
    penStrokes: penTool.preview(penStrokes),
    texts
  })
}

const isTyping = ref(false)
const textValue = ref('')
const textX = ref(0)
const textY = ref(0)

function startText(x: number, y: number) {
  isTyping.value = true
  textValue.value = ''
  textX.value = x
  textY.value = y
}

function commitText() {

  console.log({
    textTool,
    textValue: textValue.value,
    x: textX.value,
    y: textY.value
  })

  if (!textValue.value.trim()) {
    isTyping.value = false
    return
  }

  texts.push(
    textTool.create(
      textX.value,
      textY.value,
      textValue.value,
      strokeColor.value,
      fontSize.value
    )
  )

  isTyping.value = false
  history.push()
  render()
}

function setTool(tool: typeof currentTool.value) {
  currentTool.value = tool
}

function undo() {
  history.undo(state => {
    rects.splice(0, rects.length, ...state.rects)
    arrows.splice(0, arrows.length, ...state.arrows)
    penStrokes.splice(0, penStrokes.length, ...state.penStrokes)
    texts.splice(0, texts.length, ...state.texts)
    render()
  })
}

function redo() {
  history.redo(state => {
    rects.splice(0, rects.length, ...state.rects)
    arrows.splice(0, arrows.length, ...state.arrows)
    penStrokes.splice(0, penStrokes.length, ...state.penStrokes)
    texts.splice(0, texts.length, ...state.texts)
    render()
  })
}

function clearCanvas() {
  clear()
  history.push()
  render()
}

onMounted(() => {
  ctx = canvasRef.value!.getContext('2d')!
  canvas = useCanvas(ctx)
  history.reset()
  render()
})

function onOpenImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const img = new Image()
  img.onload = () => {
    images.push({
      type: 'image',
      src: img.src,
      x: 0,
      y: 0,
      w: img.width,
      h: img.height
    })

    history.push()
    render()
  }

  img.src = URL.createObjectURL(file)
}

</script>


<style src="./Editor.css" scoped></style>

