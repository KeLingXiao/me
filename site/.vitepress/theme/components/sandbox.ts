// The iframe has an opaque origin. Its blob worker inherits this CSP; user
// code never executes in the iframe or the site's origin.
export function createSandboxWorker() {
  const frame = document.createElement('iframe')
  frame.hidden = true
  frame.setAttribute('sandbox', 'allow-scripts')
  frame.setAttribute('referrerpolicy', 'no-referrer')
  frame.setAttribute('aria-hidden', 'true')
  const nonce = crypto.randomUUID().replaceAll('-', '')
  const runtime = `
    const send = self.postMessage.bind(self);
    self.onmessage = async ({data}) => {
      let count = 0;
      const format = value => {
        if (typeof value === 'string') return value.slice(0, 8000);
        try { return (JSON.stringify(value) ?? String(value)).slice(0, 8000) }
        catch { return '[无法序列化]' }
      };
      const log = (...values) => { if (count++ < 100) send({type:'log', text:values.slice(0,20).map(format).join(' ')}) };
      try {
        const execute = Object.getPrototypeOf(async function(){}).constructor;
        const result = await new execute('input', 'console', data.code)(JSON.parse(data.input), {log,info:log,warn:log,error:log});
        send({type:'done',text:result === undefined ? '执行完成' : '返回值：' + format(result)});
      } catch(error) { send({type:'error',text:String(error).slice(0,8000)}) }
    };`
  const bootstrap = `
    const worker = new Worker(URL.createObjectURL(new Blob([${JSON.stringify(runtime)}], {type:'text/javascript'})));
    let started = false, count = 0;
    worker.onmessage = ({data}) => {
      if (!data || !['log','done','error'].includes(data.type) || typeof data.text !== 'string') return;
      if (data.type === 'log' && count++ >= 100) return;
      parent.postMessage({type:data.type,text:data.text.slice(0,8000)}, '*');
      if (data.type !== 'log') worker.terminate();
    };
    worker.onerror = () => parent.postMessage({type:'error',text:'沙箱执行失败'}, '*');
    addEventListener('message', event => {
      if(event.source !== parent) return;
      if(event.data?.type === 'stop') { worker.terminate(); return }
      if(started || event.data?.type !== 'run') return;
      started = true;
      worker.postMessage(event.data.payload);
    });
    parent.postMessage({type:'ready'}, '*');`
  frame.srcdoc = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' 'unsafe-eval'; worker-src blob:; connect-src 'none'; child-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'"><script nonce="${nonce}">${bootstrap}</script>`
  let pending: unknown
  let ready = false
  let terminated = false
  let logs = 0
  let submitted = false
  function submit(payload: unknown) {
    if (terminated || submitted) return
    submitted = true
    instance.onmessage?.({ data: { type: 'ready', text: '' } })
    frame.contentWindow?.postMessage({ type: 'run', payload }, '*')
  }
  const instance = {
    onmessage: undefined as ((event: { data: { type: string; text: string } }) => void) | undefined,
    onerror: undefined as ((event: { message: string }) => void) | undefined,
    postMessage(payload: unknown) {
      pending = payload
      if (ready) submit(payload)
    },
    terminate() {
      terminated = true
      frame.contentWindow?.postMessage({ type: 'stop' }, '*')
      window.removeEventListener('message', receive)
      // Let the frame terminate its worker before destroying its context.
      setTimeout(() => frame.remove(), 0)
    }
  }
  function receive(event: MessageEvent) {
    if (terminated || event.source !== frame.contentWindow || event.origin !== 'null') return
    const data = event.data
    if (data?.type === 'ready' && !ready) {
      ready = true
      if (pending) submit(pending)
      return
    }
    if (!data || !['log', 'done', 'error'].includes(data.type) || typeof data.text !== 'string') return
    if (data.type === 'log' && logs++ >= 100) return
    instance.onmessage?.({ data: { type: data.type, text: data.text.slice(0, 8000) } })
  }
  window.addEventListener('message', receive)
  document.body.append(frame)
  return instance
}
