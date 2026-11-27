import { createContentLoader } from 'vitepress'
import { normalizePage } from './links'
export default createContentLoader('notes/**/*.md', {
  includeSrc: true, render: true,
  transform(pages) {
    const nodes = pages.map(p => ({ id: normalizePage(p.url), url: p.url, title: p.frontmatter.title || p.src?.match(/^#\s+(.+)$/m)?.[1] || decodeURIComponent(p.url.split('/').pop() || ''), group: decodeURIComponent(p.url).split('/')[2] || '首页' }))
    const ids = new Set(nodes.map(n => n.id))
    const edges = new Map()
    for (const page of pages) {
      const from = normalizePage(page.url)
      for (const match of (page.html || '').matchAll(/href="([^"]+)"/g)) {
        const url = new URL(match[1].replace(/&amp;/g, '&'), 'https://graph.local' + page.url)
        if (url.origin !== 'https://graph.local' || url.searchParams.has('code')) continue
        const to = normalizePage(url.pathname.replace(/^\/me\//, '/'))
        if (to === from || !ids.has(to)) continue
        const key = [from, to].sort().join('|')
        edges.set(key, { from, to })
      }
    }
    return { nodes, edges: [...edges.values()] }
  }
})
