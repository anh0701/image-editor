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
          <button @click="denoise">Denoise</button>
        </div>

        <div class="tool-group">
          <div class="split-button" ref="saveWrapper">
            <button class="main-btn" @click="saveImage">
              Save
            </button>

            <button class="arrow-btn" @click.stop="toggleExportMenu">
              ▼
            </button>

            <div v-if="exportMenuOpen" class="dropdown">
              <button @click="setExportBg('white')">
                Save (White)
              </button>
              <button @click="setExportBg('transparent')">
                Save (Transparent)
              </button>
            </div>
          </div>
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
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useEditorState } from '../state/useEditorState'
import { useHistory } from '../state/useHistory'
import { useCanvas } from '../canvas/useCanvas'
import { usePenTool } from '../tools/usePenTool'
import { useArrowTool } from '../tools/useArrowTool'
import { useRectTool } from '../tools/useRectTool'
import { useTextTool } from '../tools/useTextTool'
import type { EditorState } from '../types/EditorState.ts'
import { usePointerController } from '../state/usePointerController.ts'
import type { ShapeMap } from '../types/ShapeMap.ts'
import { useImageManager } from '../state/useImageManager.ts'
import { useExporter } from '../state/useExporter.ts'
import { medianDenoise } from '../tools/medianDenoise.ts'

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
let exporter: ReturnType<typeof useExporter>
const exportMenuOpen = ref(false)
const saveWrapper = ref<HTMLElement | null>(null)

function toggleExportMenu() {
  console.log(exportMenuOpen.value)
  exportMenuOpen.value = !exportMenuOpen.value
}

function setExportBg(value: 'white' | 'transparent') {
  exportBg.value = value
  exportMenuOpen.value = false
  saveImage()
}

function handleClickOutside(e: MouseEvent) {
  if (!saveWrapper.value?.contains(e.target as Node)) {
    exportMenuOpen.value = false
  }
}

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

function getCurrentState(): EditorState {
  return {
    images,
    rects,
    arrows,
    penStrokes,
    texts
  }
}

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
  exporter = useExporter(canvasRef)

  history.reset()
  render()

  window.addEventListener('paste', onPaste)
  document.addEventListener("click", handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside)
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
  exporter.save(
    { background: exportBg.value },
    getCurrentState()
  )
}

function copyImage() {
  exporter.copy(
    { background: exportBg.value },
    getCurrentState()
  )
}

async function onPaste(e: ClipboardEvent) {
  console.log("paste triggered")
  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
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

async function denoise() {
  const canvasEl = canvasRef.value!
  const offscreen = document.createElement('canvas')
  offscreen.width = canvasEl.width
  offscreen.height = canvasEl.height

  const offCtx = offscreen.getContext('2d')!

  // vẽ hiện tại sang offscreen
  offCtx.drawImage(canvasEl, 0, 0)

  // apply median
  medianDenoise(offCtx, offscreen.width, offscreen.height)

  // apply new image
  const blob: Blob = await new Promise(resolve =>
    offscreen.toBlob(b => resolve(b!), 'image/png')
  )

  const newImage = await imageManager.fromBlob(blob)

  images.splice(0, images.length, newImage)

  history.push()
  render()
}


</script>

<style src="./Editor.css" scoped></style>

