import { createContentLoader } from 'vitepress'

export interface Preview { url: string; title: string; summary: string; sections: { id: string; title: string; summary: string }[] }
export declare const data: Preview[]

export default createContentLoader('notes/**/*.md', {
  includeSrc: true,
  render: true,
  transform(pages): Preview[] {
    return pages.map(page => {
      const source = page.src || ''
      const heading = source.match(/^#\s+(.+)$/m)?.[1]
      const paragraphs = source
        .replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/^#{1,6}\s+.*$/gm, '\n')
        .replace(/^\s*\|.*$/gm, '\n')
        .replace(/^\s*(?:[-*_]\s*){3,}$/gm, '\n')
        .replace(/^\s*(?:[-+*]|\d+\.)\s+.*$/gm, '\n')
        .replace(/^\s*(?:\[\[toc\]\]|:::+.*|\[[^\]]+\]:.*)\s*$/gim, '\n')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/<[^>]*>/g, '')
        .replace(/[*`>|]/g, '')
        .split(/\n\s*\n/)
        .map(text => text.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
      const description = String(page.frontmatter.description || paragraphs[0] || '')
      const summary = description.length > 140 ? description.slice(0, 140) + '…' : description
      const html = page.html || ''
      const plain = (value: string) => value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
      const headings = [...html.matchAll(/<h([1-6])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)]
      const sections = headings.map((match, index) => {
        const body = html.slice(match.index! + match[0].length, headings[index + 1]?.index)
        return { id: match[2], title: plain(match[3]).replace(/\s*#$/, ''), summary: plain(body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1] || '').slice(0, 140) }
      })
      return { url: page.url, title: page.frontmatter.title || heading || '文章预览', summary: summary || '打开文章查看完整内容。', sections }
    })
  }
})
