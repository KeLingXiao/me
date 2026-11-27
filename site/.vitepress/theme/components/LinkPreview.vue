<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useData, useRoute } from 'vitepress'
import { data as previews } from '../page-previews.data.mts'
import { codeReferenceFromUrl, normalizePage } from '../links'

type Kind = 'article' | 'section' | 'code' | 'resource' | 'external'
type Card = { kind: Kind; title: string; summary: string; detail: string; href: string; action: string; code?: string; snippet?: string; image?: string; target?: string }
const route = useRoute()
const { site } = useData()
const visible = ref(false)
const preview = ref<Card>()
const card = ref<HTMLElement>()
const left = ref(0)
const top = ref(0)
const labels: Record<Kind, string> = { article: '站内文章', section: '文章章节', code: '代码参考', resource: '站内资源', external: '外部链接' }
let anchor: HTMLAnchorElement | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let closeTimer: ReturnType<typeof setTimeout> | undefined
let serial = 0
function close() {
  clearTimeout(timer)
  clearTimeout(closeTimer)
  serial++
  anchor?.removeAttribute('aria-describedby')
  anchor = null
  visible.value = false
}
function keep() { clearTimeout(closeTimer) }
function leave() { clearTimeout(timer); closeTimer = setTimeout(close, 200) }
function decode(value: string) { try { return decodeURIComponent(value) } catch { return value } }
async function show(link: HTMLAnchorElement) {
  const current = ++serial
  const url = new URL(link.href)
  const internal = url.origin === location.origin
  const text = link.textContent?.trim() || link.getAttribute('aria-label') || ''
  const source = internal ? codeReferenceFromUrl(url, site.value.base) : null
  let result: Card
  if (source) {
    const { data: codes } = await import('../code-sources.data.mts')
    const code = codes[source]
    result = { kind: 'code', title: text || code?.name || '代码参考', summary: code ? `${code.language} · ${code.source.split('\n').length} 行 · 可编辑${['javascript', 'typescript'].includes(code.language) && url.searchParams.get('run') !== '0' ? ' · 可运行' : ''}` : '点击在当前文章旁查看代码。', detail: source, href: link.href, code: source, snippet: code?.source.trim().split('\n').slice(0, 6).join('\n').slice(0, 600), action: '在右侧打开代码' }
  } else if (!internal) {
    result = { kind: 'external', title: text || url.hostname, summary: '打开外部网站查看完整内容。', detail: url.hostname + decode(url.pathname).replace(/\/$/, ''), href: link.href, target: '_blank', action: '在新标签页打开' }
  } else {
    const withinSite = url.pathname.startsWith(site.value.base)
    const path = withinSite ? url.pathname.slice(site.value.base.length - 1) : url.pathname
    const entry = withinSite ? previews.find(item => normalizePage(item.url) === normalizePage(path)) : undefined
    const hash = decode(url.hash.slice(1))
    const section = hash ? entry?.sections?.find(item => decode(item.id) === hash) : undefined
    const currentHeading = hash && url.pathname === location.pathname ? document.getElementById(hash) : null
    const extension = url.pathname.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase()
    const resource = !!extension && !['html', 'md', 'markdown'].includes(extension)
    result = {
      kind: resource ? 'resource' : hash ? 'section' : 'article',
      title: section?.title || currentHeading?.textContent?.replace(/\s*#$/, '').trim() || entry?.title || text || decode(url.pathname.split('/').pop() || '首页'),
      summary: section?.summary || entry?.summary || (resource ? '点击查看或下载此资源。' : hash ? '跳转到文章中的对应章节。' : '点击打开站内页面查看完整内容。'),
      detail: resource ? `${extension?.toUpperCase()} · ${decode(url.pathname.split('/').pop() || '')}` : entry?.title || '本站内容',
      href: link.href, action: resource ? '查看资源' : hash ? '阅读这一节' : '阅读全文',
      image: resource && /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url.pathname) ? link.href : undefined,
      target: link.target || undefined
    }
  }
  if (anchor !== link || current !== serial) return
  preview.value = result
  visible.value = true
  anchor.setAttribute('aria-describedby', 'reference-preview')
  await nextTick()
  const rect = link.getBoundingClientRect()
  const width = card.value?.offsetWidth || 360
  const height = card.value?.offsetHeight || 200
  left.value = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))
  top.value = rect.bottom + 10 + height <= window.innerHeight - 12 ? rect.bottom + 10 : Math.max(12, rect.top - height - 10)
}
function enter(event: MouseEvent | FocusEvent) {
  if (event instanceof MouseEvent && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  if (!(event.target instanceof Element)) return
  const link = event.target.closest<HTMLAnchorElement>('a[href]')
  if (!link || link.closest('.link-preview, .code-reader') || link.classList.contains('header-anchor')) return
  const url = new URL(link.href)
  if (!['http:', 'https:'].includes(url.protocol)) return
  if (anchor === link) { keep(); return }
  close()
  anchor = link
  timer = setTimeout(() => { show(link).catch(close) }, 350)
}
function exit(event: MouseEvent | FocusEvent) {
  if (anchor?.contains(event.target as Node) && !anchor.contains(event.relatedTarget as Node)) leave()
}
function escape(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value) {
    const link = anchor
    close()
    if (card.value?.contains(document.activeElement)) link?.focus({ preventScroll: true })
  }
}
watch(() => route.path, close)
onMounted(() => {
  document.addEventListener('mouseover', enter)
  document.addEventListener('mouseout', exit)
  document.addEventListener('focusin', enter)
  document.addEventListener('focusout', exit)
  document.addEventListener('keydown', escape)
  document.addEventListener('click', close)
  document.addEventListener('reference-preview-close', close)
  window.addEventListener('scroll', close, { passive: true })
  window.addEventListener('resize', close)
})
onUnmounted(() => {
  close()
  document.removeEventListener('mouseover', enter)
  document.removeEventListener('mouseout', exit)
  document.removeEventListener('focusin', enter)
  document.removeEventListener('focusout', exit)
  document.removeEventListener('keydown', escape)
  document.removeEventListener('click', close)
  document.removeEventListener('reference-preview-close', close)
  window.removeEventListener('scroll', close)
  window.removeEventListener('resize', close)
})
</script>

<template>
  <Teleport to="body">
    <aside v-if="visible && preview" id="reference-preview" ref="card" class="link-preview" :data-kind="preview.kind" aria-label="链接预览" :style="{ left: `${left}px`, top: `${top}px` }" @mouseenter="keep" @mouseleave="leave" @focusin="keep" @focusout="leave">
      <div class="link-preview-heading"><span class="reference-icon" aria-hidden="true">{{ preview.kind === 'code' ? '{ }' : preview.kind === 'external' ? '↗' : preview.kind === 'section' ? '#' : '☰' }}</span><span class="reference-eyebrow">{{ labels[preview.kind] }}</span><span v-if="preview.kind === 'external'" class="reference-badge">站外</span></div>
      <a class="link-preview-title" :class="{ 'vp-raw': preview.code }" :data-code-source="preview.code" :href="preview.href" :target="preview.target" :rel="preview.target === '_blank' ? 'noopener noreferrer' : undefined">{{ preview.title }}</a>
      <p>{{ preview.summary }}</p>
      <pre v-if="preview.snippet" class="link-preview-code">{{ preview.snippet }}</pre>
      <img v-if="preview.image" :src="preview.image" alt="资源预览" @error="preview.image = undefined" />
      <div class="link-preview-footer"><span :title="preview.detail">{{ preview.detail }}</span><a :class="{ 'vp-raw': preview.code }" :data-code-source="preview.code" :href="preview.href" :target="preview.target" :rel="preview.target === '_blank' ? 'noopener noreferrer' : undefined">{{ preview.action }} <span aria-hidden="true">→</span></a></div>
    </aside>
  </Teleport>
</template>

<style scoped>
.link-preview { position:fixed; z-index:100; width:min(380px,calc(100vw - 24px)); max-height:calc(100dvh - 24px); overflow:auto; padding:18px; border:1px solid var(--vp-c-divider); border-radius:5px; background:var(--vp-c-bg-elv); color:var(--vp-c-text-1); box-shadow:0 4px 16px #0001; }
.link-preview-heading{display:flex;align-items:center;gap:9px;margin-bottom:12px}
.reference-icon{display:grid;place-items:center;width:28px;height:28px;border-radius:3px;background:transparent;color:var(--vp-c-brand-1);font:600 13px var(--vp-font-family-mono)}
.reference-badge{margin-left:auto;border:1px solid var(--vp-c-divider);border-radius:5px;padding:1px 6px;font-size:10px;color:var(--vp-c-text-3)}
.link-preview-title{display:block;font-size:15px;font-weight:650;line-height:1.6;color:var(--vp-c-text-1);overflow-wrap:anywhere;text-decoration:none}
.link-preview-title:hover{color:var(--vp-c-brand-1)}
.link-preview p{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;margin:8px 0 14px;font-size:13px;line-height:1.75;overflow-wrap:anywhere;color:var(--vp-c-text-2)}
.link-preview-code{margin:0 0 14px;padding:12px;border:1px solid var(--vp-c-divider);border-radius:8px;background:var(--vp-c-bg-soft);font:11px/1.7 var(--vp-font-family-mono);white-space:pre;overflow:auto;max-height:150px}
.link-preview img{width:100%;max-height:180px;object-fit:contain;border-radius:8px;margin-bottom:12px;background:var(--vp-c-bg-soft)}
.link-preview-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:12px;border-top:1px solid var(--vp-c-divider);font-size:11px;line-height:1.6}
.link-preview-footer>span{color:var(--vp-c-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.link-preview-footer a{flex-shrink:0;color:var(--vp-c-brand-1);font-weight:550}
</style>
