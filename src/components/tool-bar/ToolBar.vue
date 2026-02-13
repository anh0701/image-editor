<template>
    <div class="toolbar-sheet" :class="{ open: sheetOpen }">
        <div class="sheet-handle" @click="$emit('toggle-sheet')">
        </div>
        <div class="toolbar mobile">
            <div class="tool-group primary">
                <label class="file-btn">
                    Open image
                    <input type="file" accept="image/*" @change="$emit('open-image', $event)" hidden />
                </label>
            </div>

            <div class="tool-group primary">
                <button @click="$emit('set-tool', 'rect')" :class="{ active: currentTool === 'rect' }">Rect</button>
                <button @click="$emit('set-tool', 'pen')" :class="{ active: currentTool === 'pen' }">Pen</button>
                <button @click="$emit('set-tool', 'arrow')" :class="{ active: currentTool === 'arrow' }">Arrow</button>
            </div>

            <div class="tool-group">
                <input type="color" v-model="localStrokeColor" />
                <input type="range" min="1" max="10" v-model.number="localStrokeWidth" />
                <span class="value value-chip">{{ localStrokeWidth }}</span>
            </div>

            <div class="tool-group">
                <button @mousedown.prevent
                        @click="$emit('set-tool', 'text')"
                        :class="{ active: currentTool === 'text' }">
                    Text
                </button>
                <input type="number" min="10" max="72" v-model.number="localFontSize" />
            </div>

            <div class="tool-group">
                <button @click="$emit('undo')">Undo</button>
                <button @click="$emit('redo')">Redo</button>
                <button @click="$emit('clear')">Clear</button>
            </div>
            <!--          
            <div class="tool-group">
                <button @click="$emit('denoise')">Denoise</button>
            </div>
            -->

            <div class="tool-group">

                <div class="enhance-group" @click.stop>
                    <button class="enhance-btn" @click="toggleEnhance">
                        🪄 Enhance
                        <span class="arrow" :class="{ open: showEnhance }">▾</span>
                    </button>
    
                    <div v-if="showEnhance" class="enhance-panel">
                        <div class="enhance-section">
                        <label>Noise Reduction</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            v-model="denoise"
                            @input="emitEnhance"
                        />
                        <span>{{ denoise }}%</span>
                        </div>
    
                        <div class="enhance-section">
                        <label>Sharpness</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            v-model="sharpen"
                            @input="emitEnhance"
                        />
                        <span>{{ sharpen }}%</span>
                        </div>
    
                        <button class="reset-btn" @click="resetEnhance">
                        Reset
                        </button>
                    </div>
                </div>
            </div>

            <div class="tool-group">
                <div class="split-button" ref="saveWrapper">
                    <button class="main-btn" @click="$emit('save')">
                    Save
                    </button>

                    <button class="arrow-btn" @click="$emit('toggle-export-menu')">
                    ▼
                    </button>

                    <div v-if="exportMenuOpen" class="dropdown"
                        ref="exportMenuRef" :class="{ 'align-right': alignRight }">
                        <button @click="$emit('set-export-bg', 'white')">
                            Save (White)
                        </button>
                        <button @click="$emit('set-export-bg', 'transparent')">
                            Save (Transparent)
                        </button>
                    </div>
                </div>
                <button @click="$emit('copy')">Copy</button>
            </div>

        </div>
    </div>
</template>

<script setup lang="ts">
import { watch, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps<{
  currentTool: string
  strokeColor: string
  strokeWidth: number
  fontSize: number
  exportMenuOpen: boolean
  sheetOpen: boolean
}>()

const emit = defineEmits([
  'set-tool',
  'undo',
  'redo',
  'clear',
  'save',
  'copy',
  'denoise',
  'open-image',
  'toggle-export-menu',
  'set-export-bg',
  'toggle-sheet',
  'update:strokeColor',
  'update:strokeWidth',
  'update:fontSize',
  'close-export-menu',
  'enhance'
])

// local mirror để v-model không mutate trực tiếp props
const localStrokeColor = ref(props.strokeColor)
const localStrokeWidth = ref(props.strokeWidth)
const localFontSize = ref(props.fontSize)

watch(localStrokeColor, v => emit('update:strokeColor', v))
watch(localStrokeWidth, v => emit('update:strokeWidth', v))
watch(localFontSize, v => emit('update:fontSize', v))

const saveWrapper = ref<HTMLElement | null>(null)

function handleClickOutside(e: MouseEvent) {
  if (!saveWrapper.value?.contains(e.target as Node)) {
    emit('close-export-menu')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Auto flip dropdown

const exportMenuRef = ref<HTMLElement | null>(null)
const alignRight = ref(false)

watch(() => props.exportMenuOpen, (open) => {
  if (!open) return

  nextTick(() => {
    const rect = exportMenuRef.value?.getBoundingClientRect()
    if (!rect) return
    
    alignRight.value = rect.right > window.innerWidth
    console.log(alignRight.value)
  })
})

// 

const showEnhance = ref(false)
const denoise = ref(50)
const sharpen = ref(30)

function toggleEnhance() {
  showEnhance.value = !showEnhance.value
}

function emitEnhance() {
  emit("enhance", {
    denoise: denoise.value / 100,
    sharpen: sharpen.value / 100
  })
}

function resetEnhance() {
  denoise.value = 50
  sharpen.value = 30
  emitEnhance()
}

function handleEnhanceOutside(e: MouseEvent) {
  const el = document.querySelector('.enhance-group')
  if (el && !el.contains(e.target as Node)) {
    showEnhance.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleEnhanceOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleEnhanceOutside)
})


</script>


<style lang="css" src="./ToolBar.css" scoped></style>