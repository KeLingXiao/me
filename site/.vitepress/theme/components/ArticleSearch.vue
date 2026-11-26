<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const open = ref(false)
const query = ref('')
const count = ref(0)
const current = ref(0)
const field = ref<HTMLInputElement>()
const trigger = ref<HTMLButtonElement>()
let ranges: Range[] = []
let timer: ReturnType<typeof setTimeout> | undefined
const registry = () => (CSS as typeof CSS & { highlights?: Map<string, unknown> }).highlights
function clear() {
  if (typeof CSS !== 'undefined') {
    registry()?.delete('article-find')
    registry()?.delete('article-current')
  }
  ranges = []; count.value = 0; current.value = 0
}
async function toggle() {
  if (open.value) { close(); return }
  open.value = true
  await nextTick()
  field.value?.focus()
}
function close() { open.value = false; clearTimeout(timer); query.value = ''; clear(); trigger.value?.focus() }
function jump(delta: number) {
  if (!ranges.length) return
  current.value = current.value === 0 ? (delta < 0 ? ranges.length : 1) : ((current.value - 1 + delta + ranges.length) % ranges.length) + 1
  const range = ranges[current.value - 1]
  const Highlight = (window as any).Highlight
  if (Highlight && registry()) registry()!.set('article-current', new Highlight(range))
  else { const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range) }
  const node = range.startContainer.parentElement
  node?.scrollIntoView({ block: 'center', behavior: 'instant' })
}
function search() {
  clear()
  const keyword = query.value.trim()
  const article = document.querySelector('.VPDoc .vp-doc')
  if (!keyword || !article || !open.value) return
  const nodes: { node: Text; start: number; end: number }[] = []
  let text = ''
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      return !parent || parent.closest('script, style, textarea, button, .code-lab, .header-anchor, .line-numbers-wrapper, [aria-hidden="true"]') || !parent.getClientRects().length
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    }
  })
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const start = text.length
    text += node.data
    nodes.push({ node, start, end: text.length })
  }
  const pattern = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  for (const match of text.matchAll(pattern)) {
    const start = match.index!
    const end = start + match[0].length
    const first = nodes.find(item => item.end > start)
    const last = nodes.find(item => item.end >= end)
    if (!first || !last) continue
    const range = document.createRange()
    range.setStart(first.node, start - first.start)
    range.setEnd(last.node, end - last.start)
    ranges.push(range)
    if (ranges.length >= 500) break
  }
  count.value = ranges.length
  const Highlight = (window as any).Highlight
  if (Highlight && registry()) registry()!.set('article-find', new Highlight(...ranges))
  // Keep the viewport stable while typing; Enter selects the first match.
}
function keyboard(event: KeyboardEvent) {
  if (event.altKey && event.key.toLowerCase() === 'f') { event.preventDefault(); toggle() }
  if (event.key === 'Escape' && open.value) { event.preventDefault(); close() }
}
watch(query, () => { clearTimeout(timer); timer = setTimeout(search, 120) })
watch(() => route.path, () => { open.value = false; query.value = ''; clearTimeout(timer); clear() })
onMounted(() => window.addEventListener('keydown', keyboard))
onUnmounted(() => { clearTimeout(timer); clear(); window.removeEventListener('keydown', keyboard) })
</script>

<template>
  <button ref="trigger" :aria-expanded="open" aria-controls="article-search-panel" title="搜索本文（Alt + F）" @click="toggle">搜索本文</button>
  <section v-if="open" id="article-search-panel" class="article-search" aria-label="文章内搜索">
    <div class="article-search-row">
      <input ref="field" v-model="query" type="search" aria-label="文章内关键词" placeholder="在本文中查找…" @keydown.enter.prevent="jump($event.shiftKey ? -1 : 1)" />
      <span role="status">{{ count ? `${current}/${count}${count === 500 ? '+' : ''}` : query.trim() ? '无匹配' : '0/0' }}</span>
      <button :disabled="!count" aria-label="上一个匹配" title="上一个（Shift + Enter）" @click="jump(-1)">↑</button>
      <button :disabled="!count" aria-label="下一个匹配" title="下一个（Enter）" @click="jump(1)">↓</button>
      <button aria-label="关闭文章搜索" title="关闭（Esc）" @click="close">×</button>
    </div>
    <small>仅搜索当前文章 · Enter 跳转匹配 · 搜索全站请用顶部“搜索本站”</small>
  </section>
</template>
