<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
const props = defineProps<{ modelValue: string; language: 'javascript' | 'python'; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; run: [] }>()
const lineCount = computed(() => props.modelValue.split('\n').length)
const scrollTop = ref(0)
async function keyboard(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); emit('run'); return }
  if (event.key !== 'Tab' || event.shiftKey || props.disabled) return
  event.preventDefault()
  const field = event.target as HTMLTextAreaElement
  const start = field.selectionStart
  const end = field.selectionEnd
  emit('update:modelValue', props.modelValue.slice(0, start) + '  ' + props.modelValue.slice(end))
  await nextTick()
  field.setSelectionRange(start + 2, start + 2)
}
const highlighted = ref('')
const warning = ref('')
const layer = ref<HTMLElement>()
let active = true
let serial = 0
async function highlight() {
  const current = ++serial
  try {
    const { highlighter } = await import('./highlighter')
    const engine = await highlighter
    if (!active || current !== serial) return
    highlighted.value = engine.codeToHtml(props.modelValue + '\n', {
      lang: props.language, themes: { light: 'github-light', dark: 'github-dark' }
    })
  } catch { warning.value = '高亮暂不可用，仍可编辑和运行。' }
}
function sync(event: Event) {
  const textarea = event.target as HTMLTextAreaElement
  scrollTop.value = textarea.scrollTop
  if (layer.value) { layer.value.scrollTop = textarea.scrollTop; layer.value.scrollLeft = textarea.scrollLeft }
}
onMounted(highlight)
watch(() => [props.modelValue, props.language], highlight)
onUnmounted(() => { active = false })
</script>

<template>
  <div class="highlight-editor" :class="{ 'is-highlighted': highlighted }">
    <div class="editor-gutter" aria-hidden="true"><div :style="{ transform: `translateY(-${scrollTop}px)` }"><span v-for="line in lineCount" :key="line">{{ line }}</span></div></div>
    <div ref="layer" class="highlight-layer" aria-hidden="true" v-html="highlighted" />
    <textarea :value="modelValue" aria-label="代码编辑器" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" :disabled="disabled" @keydown="keyboard" @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)" @scroll="sync" />
  </div>
  <small v-if="warning">{{ warning }}</small>
</template>
