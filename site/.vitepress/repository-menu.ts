import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DefaultTheme } from 'vitepress'

// 仓库笔记为唯一来源；保留相对路径，让文章内的图片与相对链接继续可用。
const root = fileURLToPath(new URL('../../', import.meta.url))
const destination = path.join(root, 'site', 'notes')
const excluded = new Set(['.github', '.pnpm-store', '.vscode', '.vsocde', '_template', 'code', 'site', 'node_modules', 'TASK.md'])
const collator = new Intl.Collator('zh-CN', { numeric: true })
const asset = /\.(?:md|markdown|png|jpe?g|gif|svg|webp|avif|ico|pdf|mp4|webm|mp3|wav)$/i
const generated = new Set<string>()
const cleanTitle = (name: string) => name.replace(/^\d+[.、_\s-]*/, '')

function prepareMarkdown(content: string, source: string) {
  // 只处理 Markdown 正文，代码围栏保持原样。
  return content.split(/(^\s*```[^\n]*\n[\s\S]*?^\s*```\s*$|^\s*~~~[^\n]*\n[\s\S]*?^\s*~~~\s*$)/m)
    .map((part, index) => index % 2 ? part : part.replace(/(!?)\[([^\]]*)\]\(([^\s)]+)\)/g, (match, image, label, href) => {
      if (href === 'url' || href === './url') return `${label}（待补充）`
      if (/^(?:[a-z]+:|#|\/)/i.test(href)) return match
      const resolved = path.resolve(path.dirname(source), decodeURI(href.split('#')[0]))
      const relative = path.relative(root, resolved)
      if (relative === 'code' || relative.startsWith('code' + path.sep)) {
        return `[${label || path.basename(resolved)}](https://github.com/Like-Su/me/blob/main/${relative.split(path.sep).map(encodeURIComponent).join('/')})`
      }
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        const pages = fs.readdirSync(resolved).filter(name => /\.md$/i.test(name)).sort(collator.compare)
        const landing = pages.find(name => /^(readme|index)\.md$/i.test(name)) || pages[0]
        if (landing) return `[${label || path.basename(resolved)}](${url(path.relative(root, path.join(resolved, landing)))})`
        return `[${label || path.basename(resolved)}](https://github.com/Like-Su/me/tree/main/${relative.split(path.sep).map(encodeURIComponent).join('/')})`
      }
      if (!fs.existsSync(resolved)) {
        const repaired = path.resolve(path.dirname(source), '..', decodeURI(href.split('#')[0]))
        if (fs.existsSync(repaired) && repaired.startsWith(root)) {
          return `${image}[${label}](../${href})`
        }
        if (!image) return `${label}（链接待补充）`
      }
      return match
    }).replace(/<a\b([^>]*?)href="([^"#]+)"([^>]*)>([\s\S]*?)<\/a>/g, (match, before, href, after, body) => {
      if (/^(?:[a-z]+:|#|\/)/i.test(href)) return match
      const converted = prepareMarkdown(`[链接](${href})`, source)
      let target = converted.match(/^\[链接\]\((.*)\)$/)?.[1]
      // 原始 HTML 不经过 VitePress 的 Markdown 链接处理，显式补齐部署路径。
      if (target?.startsWith('/notes/')) target = '/me' + target + '.html'
      else if (target && !/^[a-z]+:/i.test(target) && /\.md$/i.test(target)) {
        target = '/me' + url(path.relative(root, path.resolve(path.dirname(source), decodeURI(target)))) + '.html'
      }
      return target ? `<a ${before}href="${target}"${after}>${body}</a>` : `<span>${body}（链接待补充）</span>`
    })).join('')
}

function url(relative: string) {
  if (relative === 'README.md') return '/'
  return '/notes/' + relative.split(path.sep).map(encodeURIComponent).join('/').replace(/\.(md|markdown)$/i, '')
}

function scan(directory: string): DefaultTheme.SidebarItem[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => !entry.name.startsWith('.') && !excluded.has(entry.name) && !entry.isSymbolicLink())
    .sort((a, b) => collator.compare(a.name, b.name))
  const items: DefaultTheme.SidebarItem[] = []
  for (const entry of entries) {
    const source = path.join(directory, entry.name)
    const relative = path.relative(root, source)
    if (entry.isDirectory()) {
      const children = scan(source)
      if (children.length) {
        const overview = children.find(child => child.text === '概览')
        const remaining = children.filter(child => child !== overview)
        items.push({ text: cleanTitle(entry.name), ...(overview ? { link: overview.link } : {}), ...(remaining.length ? { collapsed: true, items: remaining } : {}) })
      }
    } else if (asset.test(entry.name)) {
      const target = path.join(destination, relative)
      generated.add(path.resolve(target))
      fs.mkdirSync(path.dirname(target), { recursive: true })
      // 避免配置热重载反复写入未变化文件。
      const content = /\.(md|markdown)$/i.test(entry.name)
        ? Buffer.from(prepareMarkdown(fs.readFileSync(source, 'utf8'), source))
        : fs.readFileSync(source)
      if (!fs.existsSync(target) || !content.equals(fs.readFileSync(target))) fs.writeFileSync(target, content)
      if (/\.(md|markdown)$/i.test(entry.name)) {
        const stem = entry.name.replace(/\.(md|markdown)$/i, '')
        items.push({ text: /^readme$/i.test(stem) ? '概览' : cleanTitle(stem), link: url(relative) })
      }
    }
  }
  return items
}

export const repositoryMenu = scan(root)

// 仅清理此模块生成的 notes 树；拒绝越界路径与符号链接。
function removeStale(directory: string) {
  if (!fs.existsSync(directory)) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.resolve(directory, entry.name)
    if (!target.startsWith(path.resolve(destination) + path.sep) || entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      removeStale(target)
      if (!fs.readdirSync(target).length) fs.rmdirSync(target)
    } else if (!generated.has(target)) fs.unlinkSync(target)
  }
}
removeStale(destination)
