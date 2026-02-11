<template>
  <div class="editor-wrapper">
    <div
      class="toolbar-sheet"
      :class="{ open: sheetOpen }"
    >
      <div class="sheet-handle" @click="toggleSheet"></div>
      <div class="toolbar mobile">
        <div class="tool-group primary">
          <label class="file-btn">
            Open image
            <input type="file" accept="image/*" @change="onOpenImage" hidden />
          </label>
        </div>

        <div class="tool-group primary">
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
          <button 
            @mousedown.prevent
            @click="setTool('text')"
            :class="{ active: currentTool === 'text' }">Text</button>
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

        <div class="tool-group">
          <select v-model="exportBg">
            <option value="white">White</option>
            <option value="transparent">Transparent</option>
          </select>

          <button @click="saveImage">Save</button>
          <button @click="copyImage">Copy</button>
        </div>


      </div>
    </div>
    <div>
      <canvas
        ref="canvasRef"
        width="1200"
        height="700"
        @pointerdown="pointer.onPointerDown"
        @pointermove="pointer.onPointerMove"
        @pointerup="pointer.onPointerUp"
      />

  
      <input
          v-if="isTyping"
          v-model="textValue"
          ref="inputRef"
          @mousedown.stop
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
          @keydown.esc="isTyping = false"
      />
    </div>
  </div>   

</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useEditorState } from '../state/useEditorState'
import { useHistory } from '../state/useHistory'
import { useCanvas } from '../canvas/useCanvas'
import { usePenTool } from '../tools/usePenTool'
import { useArrowTool } from '../tools/useArrowTool'
import { useRectTool } from '../tools/useRectTool'
import { useTextTool } from '../tools/useTextTool'
import type { EditorState } from '../types/EditorState.ts'
import { exportImage } from '../tools/exportImage.ts'
import { generateImageFileNameWithMs } from '../state/generateImageFileNameWithMs.ts'
import { usePointerController } from '../state/usePointerController.ts'
import type { ShapeMap } from '../types/ShapeMap.ts'
import { useImageManager } from '../state/useImageManager.ts'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D

const currentTool = ref<'pen' | 'rect' | 'arrow' | 'text'>('pen')
const strokeColor = ref('#ff0000')
const strokeWidth = ref(2)
const fontSize = ref(16)
const exportBg = ref<'white' | 'transparent'>('white')
const sheetOpen = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const canvasTextX = ref(0)
const canvasTextY = ref(0)
const isTyping = ref(false)
const textValue = ref('')
const textX = ref(0)
const textY = ref(0)
const history = useHistory(snapshot)
const { images, rects, penStrokes, arrows, texts, clear } = useEditorState()

const penTool = usePenTool()
const arrowTool = useArrowTool()
const rectTool = useRectTool()
const textTool = useTextTool()

let canvas: ReturnType<typeof useCanvas>
let imageManager: ReturnType<typeof useImageManager>

function render() {
  canvas.render({
    images,
    rects,
    penStrokes,
    arrows,
    texts
  })
}

const addShapeMap: {
  [K in keyof ShapeMap]: (shape: ShapeMap[K]) => void
} = {
  pen: shape => penStrokes.push(shape),
  rect: shape => rects.push(shape),
  arrow: shape => arrows.push(shape)
}


const toolMap = {
  pen: penTool,
  rect: rectTool,
  arrow: arrowTool
}

const pointer = usePointerController<ShapeMap>({
  canvasRef,
  currentTool,
  strokeColor,
  strokeWidth,
  isTyping,
  toolMap,

  onAddShape(tool, shape) {
    addShapeMap[tool](shape)
  },

  onRenderPreview: renderPreview,
  onRender: render,
  onHistoryPush: () => history.push(),
  onStartText: startText
})


function toggleSheet() {
  sheetOpen.value = !sheetOpen.value
}

function snapshot() : EditorState{
  return {
    images: images.map(img => ({
      type: 'image',
      src: img.src,
      x: img.x,
      y: img.y,
      w: img.w,
      h: img.h
    })),
    rects: structuredClone(rects),
    penStrokes: structuredClone(penStrokes),
    arrows: structuredClone(arrows),
    texts: structuredClone(texts)
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

function startText(x: number, y: number) {
  console.log(document.activeElement)

  render()

  const canvasEl = canvasRef.value!
  const rect = canvasEl.getBoundingClientRect()

  const scaleX = rect.width / canvasEl.width
  const scaleY = rect.height / canvasEl.height

  isTyping.value = true
  textValue.value = ''

  canvasTextX.value = x
  canvasTextY.value = y

  textX.value = x * scaleX
  textY.value = y * scaleY

  nextTick(() => {
    requestAnimationFrame(() => {
      inputRef.value?.focus()
    })
  })
}

function commitText() {

  console.log({
    textTool,
    textValue: textValue.value,
    x: textX.value,
    y: textY.value,
    x1: canvasTextX.value,
    y2: canvasTextY.value
  })

  if (!textValue.value.trim()) {
    isTyping.value = false
    return
  }

  texts.push(
    textTool.create(
      canvasTextX.value,
      canvasTextY.value,
      textValue.value.trim(),
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
    imageManager.rehydrate(state.images)
    images.splice(0, images.length, ...state.images)
    rects.splice(0, rects.length, ...state.rects)
    arrows.splice(0, arrows.length, ...state.arrows)
    penStrokes.splice(0, penStrokes.length, ...state.penStrokes)
    texts.splice(0, texts.length, ...state.texts)
    render()
  })
}

function redo() {
  history.redo(state => {
    imageManager.rehydrate(state.images)
    images.splice(0, images.length, ...state.images)
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
  imageManager = useImageManager(ctx)

  history.reset()
  render()

  window.addEventListener('paste', onPaste)
})

async function onOpenImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const image = await imageManager.fromFile(file)

  images.splice(0)
  images.push(image)

  history.push()
  render()
}

function saveImage() {
  const canvas = exportImage({ background: exportBg.value }, images, rects, 
    arrows, penStrokes, texts, canvasRef.value!)
  if (!canvas) return

  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = generateImageFileNameWithMs()
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}


async function copyImage() {
  const canvas = exportImage({ background: exportBg.value }, images, rects,
    arrows, penStrokes, texts, canvasRef.value! )
  if (!canvas) return

  const blob = await new Promise<Blob | null>(r =>
    canvas.toBlob(r, 'image/png')
  )
  if (!blob) return

  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob })
  ])
}


async function onPaste(e: ClipboardEvent) {
  console.log("paste triggered")
  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    console.log("item type:", item.type)
    if (item.type.startsWith('image/')) {
      console.log("image detected")
      const blob = item.getAsFile()
      if (!blob) continue

      const image = await imageManager.fromBlob(blob)

      images.push(image)

      history.push()
      render()

      e.preventDefault()
      break
    }
  }
}

</script>


<style src="./Editor.css" scoped></style>

