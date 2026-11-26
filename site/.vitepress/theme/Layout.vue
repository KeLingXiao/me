<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import ArticleSearch from './components/ArticleSearch.vue'
import { useData, useRoute, useRouter } from 'vitepress'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

type Entry = { path: string; title: string }
const { page } = useData()
const route = useRoute()
const router = useRouter()
const size = ref(16)
const focus = ref(false)
const sidebarCollapsed = ref(false)
const progress = ref(0)
const bookmarks = ref<Entry[]>([])
const storageKey = 'interview-reader-v1'
const saved = computed(() => bookmarks.value.some(item => item.path === route.path))
const minutes = ref(1)
const resume = ref(0)
let activePath = ''
let positionTimer: ReturnType<typeof setTimeout> | undefined
let ready = false
function savePosition() {
  if (!activePath || resume.value || !document.querySelector('.VPDoc .vp-doc')) return
  try { localStorage.setItem('reader-position:' + activePath, String(window.scrollY)) } catch {}
}
function onScroll() {
  updateProgress()
  clearTimeout(positionTimer)
  positionTimer = setTimeout(savePosition, 250)
}
function continueReading() {
  const position = resume.value
  resume.value = 0
  window.scrollTo({ top: position, behavior: 'instant' })
}
function startReading() { resume.value = 0; window.scrollTo({ top: 0, behavior: 'instant' }); savePosition() }


function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify({ size: size.value, sidebarCollapsed: sidebarCollapsed.value, bookmarks: bookmarks.value })) } catch { /* Reading remains available when storage is disabled. */ }
}
function updateProgress() {
  const end = document.querySelector('.VPDoc .content-container')?.getBoundingClientRect().bottom ?? 0
  const total = end + window.scrollY - window.innerHeight
  progress.value = total <= 0 ? 100 : Math.min(100, Math.max(0, Math.round(window.scrollY / total * 100)))
}
async function trackPage() {
  await nextTick()
  if (!ready || page.value.isNotFound) return
  activePath = route.path
  resume.value = 0
  try {
    const position = Number(localStorage.getItem('reader-position:' + activePath))
    if (Number.isFinite(position) && position > 200 && !window.location.hash) resume.value = position
  } catch {}
  const text = document.querySelector('.vp-doc')?.textContent ?? ''
  minutes.value = Math.max(1, Math.ceil(text.length / 450))
  persist()
  updateProgress()
}
function toggleBookmark() {
  bookmarks.value = saved.value
    ? bookmarks.value.filter(item => item.path !== route.path)
    : [...bookmarks.value, { path: route.path, title: page.value.title || 'CS 通关' }]
  persist()
}
function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value; persist() }
function setSize(delta: number) { size.value = Math.min(22, Math.max(14, size.value + delta)); persist(); nextTick(updateProgress) }
function top() { window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }
function escape(event: KeyboardEvent) { if (event.key === 'Escape') focus.value = false }
function validEntries(value: unknown): Entry[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item.path === 'string' && item.path.startsWith('/') && !item.path.startsWith('//') && typeof item.title === 'string').slice(0, 100) : []
}
onMounted(() => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}')
    if (Number.isFinite(stored.size)) size.value = Math.max(14, Math.min(22, stored.size))
    bookmarks.value = validEntries(stored.bookmarks)
    sidebarCollapsed.value = stored.sidebarCollapsed === true
  } catch { /* Ignore invalid or unavailable local storage. */ }
  window.addEventListener('pagehide', savePosition)
  ready = true
  trackPage()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', updateProgress)
  window.addEventListener('keydown', escape)
})
watch(() => route.path, () => { clearTimeout(positionTimer); savePosition(); trackPage() }, { flush: 'pre' })
onUnmounted(() => {
  clearTimeout(positionTimer)
  savePosition()
  window.removeEventListener('pagehide', savePosition)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', updateProgress)
  window.removeEventListener('keydown', escape)
})
</script>

<template>
  <div class="reader-shell" :class="{ 'reader-focus': focus, 'sidebar-collapsed': sidebarCollapsed }" :style="{ '--reader-size': `${size}px` }">
    <DefaultTheme.Layout>
      <template #nav-bar-content-before>
        <button v-if="!page.isNotFound && !focus" class="sidebar-toggle" :aria-expanded="!sidebarCollapsed" :aria-label="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'" :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'" @click="toggleSidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/><path class="sidebar-toggle-arrow" :d="sidebarCollapsed ? 'm13 9 3 3-3 3' : 'm16 9-3 3 3 3'"/></svg>
        </button>
      </template>
      <template #doc-before>
        <div v-if="resume" class="reader-resume" role="status"><span>上次读到这里，继续学习？</span><button @click="continueReading">继续阅读</button><button @click="startReading">从头开始</button></div>
        <div class="reader-meta"><span>学习笔记</span><span>约 {{ minutes }} 分钟阅读</span></div>
        <div class="reader-toolbar" aria-label="阅读工具">
          <div class="reader-type"><button aria-label="缩小字号" :disabled="size <= 14" @click="setSize(-1)">A−</button><span>{{ size }}</span><button aria-label="放大字号" :disabled="size >= 22" @click="setSize(1)">A+</button></div>
          <button :aria-pressed="saved" @click="toggleBookmark">{{ saved ? '★ 已收藏' : '☆ 收藏本文' }}</button>
          <ArticleSearch />
          <button :aria-pressed="focus" @click="focus = !focus">{{ focus ? '退出专注 · Esc' : '专注阅读' }}</button>
        </div>
      </template>
      <template #sidebar-nav-after>
        <section class="reader-library" aria-label="个人书架">
          <h2>我的收藏 <span>{{ bookmarks.length }}</span></h2>
          <p v-if="!bookmarks.length">文章上方点击 ☆，留待复习。</p>
          <a v-for="item in bookmarks" :key="item.path" :href="item.path" @click.prevent="router.go(item.path)">{{ item.title }}</a>
          <small>收藏仅保存在当前浏览器</small>
        </section>
      </template>
      <template #layout-bottom>

        <button v-if="progress > 10" class="reader-top" aria-label="返回顶部" @click="top">↑ <span>{{ progress }}%</span></button>
        <div class="reader-progress" aria-hidden="true" :style="{ width: `${progress}%` }" />
      </template>
    </DefaultTheme.Layout>
  </div>
</template>
