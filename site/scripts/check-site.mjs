import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../.vitepress/dist')
const failures = []
let pages = 0
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) { walk(filename); continue }
    if (!entry.name.endsWith('.html')) continue
    pages++
    const html = fs.readFileSync(filename, 'utf8')
    for (const match of html.matchAll(/\b(?:href|src)="([^"#]+)"/g)) {
      const href = match[1].split(/[?#]/)[0]
      if (!href || /^(?:https?:|data:|mailto:|tel:|\/\/)/.test(href)) continue
      if (href.startsWith('/') && !href.startsWith('/me/')) { failures.push(`${filename}: base 路径错误 ${href}`); continue }
      let target
      try { target = href.startsWith('/me/') ? path.join(root, decodeURIComponent(href.slice(4))) : path.resolve(path.dirname(filename), decodeURIComponent(href)) }
      catch { failures.push(`${filename}: 无效 URL ${href}`); continue }
      const candidates = [target, target + '.html', path.join(target, 'index.html')]
      if (!candidates.some(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())) failures.push(`${filename}: 缺失 ${href}`)
    }
  }
}
walk(root)
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1 }
else console.log(`PASS: ${pages} 页的站内链接、图片和资源路径检查`)
