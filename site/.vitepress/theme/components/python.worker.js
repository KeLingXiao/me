// Pin the runtime so upstream updates cannot silently change execution behavior.
const runtimeURL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'
self.onmessage = async ({ data }) => {
  let count = 0
  const log = text => {
    if (count++ < 100) self.postMessage({ type: 'log', text: String(text).slice(0, 8000) })
  }
  let scope
  try {
    self.postMessage({ type: 'loading', text: '正在加载 Python 运行时，首次使用可能需要较长时间…' })
    const { loadPyodide } = await import(/* @vite-ignore */ `${runtimeURL}pyodide.mjs`)
    const py = await loadPyodide({ indexURL: runtimeURL, stdout: log, stderr: log })
    py.setStdin({ error: true })
    scope = py.toPy({ __name__: '__main__', __input_json__: data.input })
    self.postMessage({ type: 'ready' })
    await py.runPythonAsync('import json\ndata = json.loads(__input_json__)\n' + data.code, { globals: scope })
    self.postMessage({ type: 'done', text: '执行完成' })
  } catch (error) {
    self.postMessage({ type: 'error', text: `${error.name}: ${error.message}`.slice(0, 8000) })
  } finally { scope?.destroy() }
}
