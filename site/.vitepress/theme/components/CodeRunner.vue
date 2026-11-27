<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import HighlightedEditor from './HighlightedEditor.vue'
import { createSandboxWorker } from './sandbox'
type Language = 'javascript' | 'typescript' | 'python'
const props = withDefaults(defineProps<{ code?: string; input?: string; title?: string; embedded?: boolean; sources?: Partial<Record<Language, string>>; cases?: { name: string; input: string; expected: string }[] }>(), { code: '', input: '{}', title: '算法实验区' })
const available = computed(() => (Object.keys(props.sources || { javascript: props.code }) as Language[]).filter(lang => ['javascript', 'typescript', 'python'].includes(lang)))
const language = ref<Language>(available.value[0] || 'javascript')
const drafts = ref<Partial<Record<Language, string>>>({ ...props.sources, ...(!props.sources ? { javascript: props.code } : {}) })
const code = computed({ get: () => drafts.value[language.value] || '', set: value => { drafts.value[language.value] = value } })
const input = ref(props.input)
const output = ref<string[]>([])
const status = ref('就绪')
const running = ref(false)
const testing = ref(false)
const results = ref<{ name: string; passed: boolean; actual: string; expected: string }[]>([])
const copyStatus = ref('复制代码')
let settle: ((value: string[] | null) => void) | undefined
let logs: string[] = []
let cancelled = false
const route = useRoute()
const draftNotice = ref('')
const undo = ref<{ language: Language; code: string; input: string }>()
let undoTimer: ReturnType<typeof setTimeout> | undefined
let draftKey = ''
let loaded = false
function saveDraft() {
  if (!loaded || testing.value) return
  try { localStorage.setItem(draftKey, JSON.stringify({ drafts: drafts.value, input: input.value })); draftNotice.value = '草稿已自动保存到当前浏览器' }
  catch { draftNotice.value = '草稿无法保存，请复制代码备份' }
}
onMounted(() => {
  draftKey = 'code-draft-v1:' + route.path + ':' + props.title
  try {
    const stored = JSON.parse(localStorage.getItem(draftKey) || 'null')
    if (stored) {
      for (const lang of available.value) if (typeof stored.drafts?.[lang] === 'string') drafts.value[lang] = stored.drafts[lang]
      if (typeof stored.input === 'string') input.value = stored.input
      draftNotice.value = '已恢复本地草稿'
    }
  } catch { draftNotice.value = '无法读取本地草稿' }
  loaded = true
})
watch([drafts, input], saveDraft, { deep: true, flush: 'sync' })
function undoReset() {
  if (!undo.value) return
  drafts.value[undo.value.language] = undo.value.code
  input.value = undo.value.input
  undo.value = undefined
  clearTimeout(undoTimer)
}

async function copyCode() {
  try { await navigator.clipboard.writeText(code.value); copyStatus.value = '已复制' }
  catch { copyStatus.value = '复制失败，请手动选择代码' }
}
async function testAll() {
  if (running.value || testing.value) return
  testing.value = true
  cancelled = false
  results.value = []
  const original = input.value
  try {
    for (const example of props.cases || []) {
      if (cancelled) break
      input.value = example.input
      const actual = await new Promise<string[] | null>(resolve => { run(); if (!running.value) resolve(null); else settle = resolve })
      if (cancelled) break
      const value = actual ? actual.join('\n').trim() : '执行失败或超时'
      results.value.push({ name: example.name, passed: actual !== null && value === example.expected.trim(), actual: value, expected: example.expected })
    }
  } finally { input.value = original; testing.value = false }
}
let worker: ReturnType<typeof createSandboxWorker> | undefined
let timer: ReturnType<typeof setTimeout> | undefined
function cleanup() { worker?.terminate(); worker = undefined; clearTimeout(timer); running.value = false; settle?.(null); settle = undefined }
function stop() { cancelled = true; cleanup(); status.value = '已停止'; output.value.push('已停止运行') }
function reset() { undo.value = { language: language.value, code: code.value, input: input.value }; clearTimeout(undoTimer); undoTimer = setTimeout(() => { undo.value = undefined }, 10000); cleanup(); code.value = props.sources?.[language.value] ?? props.code; input.value = props.input; output.value = []; status.value = '就绪' }
function executionTimer() {
  clearTimeout(timer)
  timer = setTimeout(() => { cleanup(); status.value = '已超时'; output.value.push('执行超过 3 秒，已终止。') }, 3000)
}
async function run() {
  cleanup()
  output.value = []
  logs = []
  try {
    JSON.parse(input.value)
    if (language.value === 'python') throw new Error('Python 暂仅支持编辑，隔离执行尚未开放。')
    const current = createSandboxWorker()
    worker = current
    running.value = true
    status.value = language.value === 'typescript' ? '加载编译器…' : '准备隔离环境…'
    current.onmessage = ({ data }) => {
      if (worker !== current) return
      if (data.type === 'ready') { status.value = '运行中'; executionTimer(); return }
      output.value.push(String(data.text))
      if (data.type === 'log') logs.push(String(data.text))
      if (data.type === 'done') { settle?.([...logs]); settle = undefined }
      if (data.type === 'done' || data.type === 'error') { status.value = data.type === 'done' ? '已完成' : '执行失败'; cleanup() }
    }
    current.onerror = event => { if (worker !== current) return; output.value.push(`运行错误：${event.message}`); status.value = '执行失败'; cleanup() }
    // Preparing the sandbox/compiler is separate from the execution budget.
    // The sandbox emits ready only when it submits code to its worker.
    timer = setTimeout(() => { cleanup(); status.value = '加载失败'; output.value.push('运行环境准备超过 30 秒，请稍后重试。') }, 30000)
    let executable = code.value
    if (language.value === 'typescript') {
      const module = await import('typescript/lib/typescript.js')
      if (worker !== current) return
      const ts = module.default || module
      const compiled = ts.transpileModule(executable, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }, reportDiagnostics: true
      })
      const errors = compiled.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error) || []
      if (errors.length) throw new SyntaxError(errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'))
      executable = compiled.outputText
    }
    current.postMessage({ code: executable, input: input.value })
  } catch (error) { cleanup(); output.value.push(`无法运行：${error instanceof Error ? error.message : String(error)}`); status.value = '执行失败' }
}
watch(language, () => { cleanup(); output.value = []; results.value = []; status.value = '就绪' })
watch(code, () => { results.value = []; copyStatus.value = '复制代码' })
onUnmounted(() => { clearTimeout(undoTimer); saveDraft(); cancelled = true; cleanup() })
defineExpose({ getCode: () => code.value, reset })
</script>

<template>
  <section class="code-lab" :aria-label="title">
    <header><strong v-if="!embedded">{{ title }}</strong><span role="status">{{ status }} · 执行限时 3 秒</span></header>
    <div v-if="!embedded || available.length > 1" class="lab-languages" aria-label="运行语言">
      <button v-for="lang in available" :key="lang" :disabled="testing" :aria-pressed="language === lang" @click="language = lang">{{ lang === 'python' ? 'Python' : lang === 'typescript' ? 'TypeScript' : 'JavaScript' }}</button>
    </div>
    <div class="lab-code-field"><p class="lab-hint">{{ language === 'python' ? '使用 data 读取 JSON 输入，print() 输出结果' : '使用 input 读取 JSON 输入，console.log() 输出结果' }} · Tab 缩进 · Ctrl/⌘ + Enter 运行</p><HighlightedEditor v-model="code" :language="language" :disabled="running || testing" @run="language !== 'python' && !running && !testing && run()" /></div>
    <details v-if="embedded" class="lab-input-details" :open="props.input !== '{}'">
      <summary>输入数据 <span>JSON · 可选</span></summary>
      <label><span class="sr-only">输入数据 · JSON</span><textarea v-model="input" class="lab-input" aria-label="JSON 输入数据" spellcheck="false" :disabled="running || testing" /></label>
    </details>
    <label v-else><span>输入数据 · JSON</span><textarea v-model="input" class="lab-input" aria-label="JSON 输入数据" spellcheck="false" :disabled="running || testing" /></label>
    <p class="lab-draft" role="status">{{ draftNotice }} <button v-if="undo" :disabled="running || testing" @click="undoReset">撤销恢复示例（10 秒内）</button></p>
    <div class="lab-actions"><button :disabled="running || testing || language === 'python'" @click="run()">{{ running ? '运行中…' : '▶ 运行代码' }}</button><button v-if="running || testing" @click="stop">停止</button><button v-if="!embedded" :disabled="testing" @click="reset">恢复当前语言示例</button><button v-if="!embedded" @click="copyCode">{{ copyStatus }}</button><button v-if="cases?.length" :disabled="running || testing || language === 'python'" @click="testAll">{{ testing ? '测试中…' : `运行全部 ${cases.length} 组用例` }}</button></div>
    <div v-if="results.length" class="lab-results" aria-live="polite"><p v-for="result in results" :key="result.name"><strong>{{ result.passed ? '✓ 通过' : '✗ 未通过' }} · {{ result.name }}</strong><span>预期：{{ result.expected }} / 实际：{{ result.actual }}</span></p></div>
    <div class="lab-output" role="log" aria-live="polite" aria-label="运行输出"><pre>{{ output.length ? output.join('\n') : '运行结果将显示在这里。' }}</pre></div>
    <footer>隔离执行：禁止联网与访问本站数据，最多 100 条日志，执行限时 3 秒。Python 暂仅支持编辑。</footer>
  </section>
</template>
