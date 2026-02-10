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
        <button @click="setTool('text')"
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
    <div>
      <canvas
          ref="canvasRef"
          width="1200"
          height="700"
          @mousedown="onDown"
          @mousemove="onMove"
          @mouseup="onUp"
          style="border:1px solid #ccc; background: #fff;"
      />
  
      <input
          v-if="isTyping"
          v-model="textValue"
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
import type { CanvasImage } from '../types/CanvasImage'
import { imageCache } from '../types/imageCache.ts.ts'
import type { EditorState } from '../types/EditorState.ts'
import { exportImage } from '../tools/exportImage.ts'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D

const currentTool = ref<'pen' | 'rect' | 'arrow' | 'text'>('pen')
const strokeColor = ref('#ff0000')
const strokeWidth = ref(2)
const fontSize = ref(16)
const exportBg = ref<'white' | 'transparent'>('white')

const { images, rects, penStrokes, arrows, texts, clear } = useEditorState()

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

const history = useHistory(snapshot)

const penTool = usePenTool()
const arrowTool = useArrowTool()
const rectTool = useRectTool()
const textTool = useTextTool()

let canvas: ReturnType<typeof useCanvas>

function render() {
  canvas.render({
    images,
    rects,
    penStrokes,
    arrows,
    texts
  })
}

function getPos(e: MouseEvent) {
  const rect = canvasRef.value!.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

function onDown(e: MouseEvent) {
  if (isTyping.value) return
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
  render()

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
    rehydrateImages(state.images)
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
    rehydrateImages(state.images)
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
  history.reset()
  render()

  window.addEventListener('paste', onPaste)
})

function onOpenImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  const img = new Image()
  
  img.onload = () => {
    imageCache.set(img.src, img)
    const canvasW = ctx.canvas.width
    const canvasH = ctx.canvas.height

    const scale = Math.min(
      canvasW / img.width,
      canvasH / img.height,
      1
    )

    const w = img.width * scale
    const h = img.height * scale

    images.splice(0)
    images.push({
      type: 'image',
      src: img.src,
      element: img, //  cache 
      x: (canvasW - w) / 2,
      y: (canvasH - h) / 2,
      w,
      h
    })

    history.push()
    render()
  }

  img.src = URL.createObjectURL(file)
}

function rehydrateImages(stateImages: CanvasImage[]) {
  stateImages.forEach(img => {
    if (!img.element) {
      const cached = imageCache.get(img.src)
      if (cached) {
        img.element = cached
      }
    }
  })
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
    a.download = 'edited.png'
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


function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile()
      if (!blob) continue

      const img = new Image()
      const url = URL.createObjectURL(blob)

      img.onload = () => {
        imageCache.set(url, img)

        const canvasW = ctx.canvas.width
        const canvasH = ctx.canvas.height

        const scale = Math.min(
          canvasW / img.width,
          canvasH / img.height,
          1
        )

        const w = img.width * scale
        const h = img.height * scale

        images.push({
          type: 'image',
          src: url,
          element: img,
          x: (canvasW - w) / 2,
          y: (canvasH - h) / 2,
          w,
          h
        })

        history.push()
        render()
      }

      img.src = url
      e.preventDefault()
      break
    }
  }
}


</script>


<style src="./Editor.css" scoped></style>

