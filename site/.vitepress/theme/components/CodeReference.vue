<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useData } from 'vitepress'
import CodeRunner from './CodeRunner.vue'
import HighlightedEditor from './HighlightedEditor.vue'
import { codeReferenceFromUrl, type CodeSource } from '../links'
const route = useRoute()
const { site } = useData()
const opened = ref(false)
const entry = ref<CodeSource>()
const sources = ref<Record<string, string>>({})
const draft = ref('')
const runnable = ref(false)
const loading = ref(false)
const error = ref('')
const copied = ref('复制代码')
const panel = ref<HTMLElement>()
const runner = ref<InstanceType<typeof CodeRunner>>()
const sourceHref = ref('')
let trigger: HTMLAnchorElement | null = null
let serial = 0
function close(restoreFocus = true, updateUrl = true) {
  serial++
  opened.value = false
  document.documentElement.classList.remove('code-panel-open')
  if (updateUrl) {
    const url = new URL(location.href)
    if (url.searchParams.has('code')) {
      for (const name of ['code', 'symbol', 'run']) url.searchParams.delete(name)
      history.replaceState(history.state, '', url)
    }
  }
  if (restoreFocus) trigger?.focus({ preventScroll: true })
}
async function open(url: URL, link?: HTMLAnchorElement, updateUrl = true) {
  const source = codeReferenceFromUrl(url, site.value.base)
  if (!source) return
  const request = ++serial
  trigger = link || null
  entry.value = undefined
  loading.value = true
  error.value = ''
  runnable.value = false
  copied.value = '复制代码'
  sourceHref.value = url.href
  opened.value = true
  document.documentElement.classList.add('code-panel-open')
  if (updateUrl) {
    const current = new URL(location.href)
    current.searchParams.set('code', source)
    for (const name of ['run', 'symbol']) {
      const value = url.searchParams.get(name)
      if (value) current.searchParams.set(name, value)
      else current.searchParams.delete(name)
    }
    history.replaceState(history.state, '', current)
  }
  await nextTick()
  panel.value?.focus({ preventScroll: true })
  try {
    const { data: codes } = await import('../code-sources.data.mts')
    if (request !== serial) return
    const code = codes[source]
    if (!code) throw new Error('未找到这份源码，请检查文章中的代码路径。')
    entry.value = code
    draft.value = code.source
    runnable.value = url.searchParams.get('run') !== '0' && ['javascript', 'typescript'].includes(code.language)
    sources.value = { [code.language]: code.source }
    loading.value = false
    await nextTick()
    const symbol = url.searchParams.get('symbol')
    if (symbol) {
      const field = panel.value?.querySelector('textarea')
      const position = field?.value.indexOf(symbol) ?? -1
      if (field && position >= 0) {
        field.setSelectionRange(position, position + symbol.length)
        field.scrollTop = Math.max(0, (field.value.slice(0, position).split('\n').length - 3) * 24)
        field.dispatchEvent(new Event('scroll'))
      }
    }
  } catch (cause) {
    if (request !== serial) return
    loading.value = false
    error.value = cause instanceof Error ? cause.message : '代码暂时无法加载，请稍后重试。'
  }
}
function click(event: MouseEvent) {
  if (event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return
  const link = event.target.closest<HTMLAnchorElement>('a[data-code-source], .vp-doc a[href]')
  if (!link || link.target === '_blank') return
  const url = new URL(link.href)
  if (url.origin !== location.origin || !codeReferenceFromUrl(url, site.value.base)) return
  event.preventDefault()
  event.stopPropagation()
  document.dispatchEvent(new CustomEvent('reference-preview-close'))
  open(url, link)
}
async function copy() {
  try {
    await navigator.clipboard.writeText(runnable.value ? runner.value?.getCode() || '' : draft.value)
    copied.value = '已复制'
  } catch { copied.value = '复制失败，请手动选择' }
}
function reset() {
  if (runnable.value) runner.value?.reset()
  else draft.value = entry.value?.source || ''
  copied.value = '复制代码'
}
function key(event: KeyboardEvent) {
  if (event.key === 'Escape' && opened.value && !document.querySelector('.link-preview')) { event.stopPropagation(); close() }
}
function syncUrl() {
  const url = new URL(location.href)
  if (codeReferenceFromUrl(url, site.value.base)) open(url, undefined, false)
  else if (opened.value) close(false, false)
}
watch(() => route.path, () => { close(false, false); nextTick(syncUrl) })
watch(draft, () => { copied.value = '复制代码' })
onMounted(() => {
  document.addEventListener('click', click, true)
  document.addEventListener('keydown', key, true)
  window.addEventListener('popstate', syncUrl)
  syncUrl()
})
onUnmounted(() => {
  close(false, false)
  document.removeEventListener('click', click, true)
  document.removeEventListener('keydown', key, true)
  window.removeEventListener('popstate', syncUrl)
})
</script>
<template>
  <aside v-if="opened" ref="panel" class="code-reader" role="region" aria-labelledby="code-reader-title" tabindex="-1">
    <header class="code-reader-header">
      <div class="code-reader-heading"><span class="reference-icon" aria-hidden="true">{ }</span><div><span class="reference-eyebrow">代码参考</span><h2 id="code-reader-title">{{ entry?.name || '加载源码' }}</h2></div></div>
      <button class="reference-button reference-close" @click="close()" aria-label="关闭代码面板" title="关闭 · Esc">×</button>
    </header>
    <div v-if="entry" class="code-reader-meta"><span class="reference-path" :title="entry.path">{{ entry.path }}</span><span class="reference-badge">{{ entry.language }}</span><span class="reference-badge">{{ runnable ? '可编辑 · 可运行' : '可编辑' }}</span></div>
    <nav v-if="entry" class="code-reader-actions" aria-label="代码工具"><span>修改不会写回仓库</span><button class="reference-button" @click="reset">恢复源码</button><button class="reference-button" @click="copy">{{ copied }}</button></nav>
    <div v-if="loading" class="code-reader-message" role="status">正在读取源码…</div>
    <div v-else-if="error" class="code-reader-message" role="alert"><p>{{ error }}</p><button class="reference-button" @click="open(new URL(sourceHref))">重试</button></div>
    <div v-else-if="entry" class="code-reader-body">
      <CodeRunner v-if="runnable" ref="runner" :key="entry.path" :title="entry.path" :sources="sources" embedded />
      <template v-else><p class="code-reader-hint">可直接编辑 · Tab 缩进</p><HighlightedEditor v-model="draft" :language="entry.language" /></template>
    </div>
  </aside>
</template>
<style>
.code-reader{position:fixed;right:0;top:var(--vp-nav-height,64px);bottom:0;width:46%;z-index:40;background:var(--vp-c-bg);border-left:1px solid var(--vp-c-divider);display:flex;flex-direction:column;outline:none;min-width:0}
.code-reader:focus-visible{outline:none}
.code-reader-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 24px 14px}
.code-reader-heading{display:flex;align-items:center;gap:12px;min-width:0}
.code-reader-heading>div{min-width:0}.code-reader-heading .reference-icon{width:36px;height:36px;flex-shrink:0}
.code-reader-heading h2{font-size:15px;font-weight:650;line-height:1.6;margin:2px 0 0;overflow-wrap:anywhere}
.code-reader-meta{display:flex;align-items:center;gap:8px;padding:0 24px 18px;flex-wrap:wrap}
.reference-path{flex:1;min-width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:11px/1.6 var(--vp-font-family-mono);color:var(--vp-c-text-3)}
.code-reader-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 24px;border-top:1px solid var(--vp-c-divider);border-bottom:1px solid var(--vp-c-divider);background:var(--vp-c-bg-soft)}
.code-reader-actions>span{margin-right:auto;font-size:11px;color:var(--vp-c-text-3)}
.code-reader-body{overflow:auto;flex:1;min-height:0;padding:20px 24px 32px;scrollbar-gutter:stable}
.code-reader-body .code-lab{margin:0;border:0;border-radius:0;background:transparent}
.code-reader-body .code-lab header{padding:0 0 14px;border:0;background:transparent}
.code-reader-body .lab-code-field{margin:0 0 16px}
.code-reader-body .code-lab label{margin:16px 0}
.code-reader-body .lab-input-details{margin:0 0 14px;border:1px solid var(--vp-c-divider);border-radius:4px;padding:10px 12px}
.code-reader-body .lab-input-details summary{cursor:pointer;font-size:12px;color:var(--vp-c-text-2)}
.code-reader-body .lab-input-details summary span{margin-left:8px;color:var(--vp-c-text-3);font-size:11px}
.code-reader-body .lab-input-details label{margin-bottom:0}
.code-reader-body .lab-actions{padding:0 0 16px;gap:8px}
.code-reader-body .lab-actions button{border-radius:4px}
.code-reader-body .lab-output{border:1px solid var(--vp-c-divider);border-radius:4px}
.code-reader-body .code-lab footer{border:0;padding:12px 0 0}
.code-reader-body .highlight-editor{height:clamp(240px,38vh,440px);border-radius:4px;overflow:hidden}
.code-reader-body .lab-draft{font-size:11px;color:var(--vp-c-text-3);line-height:1.7;margin-bottom:14px}
.code-reader-hint{font-size:11px;color:var(--vp-c-text-3);margin:0 0 10px}
.code-reader-message{padding:32px 24px;font-size:13px;color:var(--vp-c-text-2);line-height:1.8}
.code-reader-message button{margin-top:12px}
@media(min-width:960px){
  .code-panel-open .reader-shell .VPSidebar{display:none!important}
  .code-panel-open .reader-shell .VPContent,.code-panel-open .reader-shell .VPContent.has-sidebar{width:54%;margin-left:0;margin-right:46%;padding-left:0;padding-right:0;transition:none}
  .code-panel-open .reader-shell .VPDoc .aside{display:none}
  .code-panel-open .reader-shell .VPDoc{padding:32px clamp(24px,3vw,56px) 80px}
  .code-panel-open .reader-shell .VPDoc .container{display:block;width:100%;max-width:none;margin:0}
  .code-panel-open .reader-shell .VPDoc .content{width:100%;min-width:0;max-width:none;padding:0;margin:0}
  .code-panel-open .reader-shell .VPDoc .content-container{width:100%;max-width:none!important;margin:0}
  .code-panel-open .reader-shell .sidebar-toggle{display:none}
  .code-panel-open .reader-shell .reader-top{right:calc(46vw + 24px)}
}
@media(max-width:959px){.code-reader{top:18dvh;width:100%;border-top:1px solid var(--vp-c-divider);border-radius:14px 14px 0 0;z-index:60;box-shadow:0 -12px 40px #0002}.code-reader-header{padding:18px 18px 12px}.code-reader-meta{padding:0 18px 14px}.code-reader-actions{padding:10px 18px}.code-reader-actions>span{display:none}.code-reader-body{padding:18px}.code-reader-body .highlight-editor{height:280px}}
</style>
