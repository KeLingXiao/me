import { defineConfig } from 'vitepress'
import { sidebar, topicNavigation } from './sidebar'
import { highlightText } from './markdown-highlight'
import { watchRepository } from './watch-repository'

export default defineConfig({
  lang: 'zh-CN',
  title: 'CS 通关',
  description: '记录学习面试与思考实践',
  base: '/me/',
  // Keep local dependency workspaces out of page discovery and dependency scanning.
  srcExclude: ['.math-install/**', '.pnpm-local/**', '.pnpm-store/**', '.ci-check/**', 'code/**'],
  vite: {
    worker: { format: 'es' },
    plugins: [watchRepository()],
    server: {
      host: '127.0.0.1',
      port: 3000,
      watch: { ignored: ['**/.math-install/**', '**/.pnpm-local/**', '**/.pnpm-store/**', '**/.ci-check/**'] }
    },
    optimizeDeps: { entries: ['.vitepress/theme/index.ts'], include: ['typescript/lib/typescript.js'] }
  },
  head: [['link', { rel: 'icon', type: 'image/png', href: '/me/cs-pass.png' }]],
  rewrites: { 'notes/README.md': 'index.md' },
  markdown: {
    lineNumbers: true, math: true, languageAlias: { gitignore: 'ini' },
    config(md) {
      highlightText(md)
      const renderFence = md.renderer.rules.fence!
      md.renderer.rules.fence = (tokens, index, options, env, renderer) => {
        const [language, ...flags] = tokens[index].info.trim().split(/\s+/)
        if (flags.includes('run') && !flags.includes('no-run') && ['js', 'javascript', 'ts', 'typescript', 'py', 'python'].includes(language)) {
          const lang = ['py', 'python'].includes(language) ? 'python' : ['ts', 'typescript'].includes(language) ? 'typescript' : 'javascript'
          const sources = md.utils.escapeHtml(JSON.stringify({ [lang]: tokens[index].content }))
          return `<CodeRunner title="代码片段 ${tokens[index].map?.[0] ?? index}" :sources="${sources}" />\n`
        }
        return renderFence(tokens, index, options, env, renderer)
      }
      const renderLink = md.renderer.rules.link_open || ((tokens, index, options, _env, renderer) => renderer.renderToken(tokens, index, options))
      md.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
        const href = tokens[index].attrGet('href') || ''
        // VitePress handles clicks on window capture, before the panel's
        // document listener. Opt these links out of its router explicitly.
        if (/^(?:\/me)?\/code\//.test(href)) tokens[index].attrJoin('class', 'vp-raw')
        const source = new URL(href, 'https://site.invalid/').searchParams.get('code')
        if (source) {
          tokens[index].attrJoin('class', 'vp-raw code-reference-link')
          tokens[index].attrSet('data-code-source', source)
        }
        return renderLink(tokens, index, options, env, renderer)
      }
    }
  },
  themeConfig: {
    logo: { src: '/cs-pass.png', alt: 'CS 通关：知识阶梯与通关之门' },
    nav: [
      { text: '首页', link: '/' },
      { text: '知识图谱', link: '/graph' },
      { text: '学习路线', link: '/notes/路线' },
      { text: '学习主题', items: topicNavigation }
    ],
    sidebar,
    socialLinks: [{ icon: 'github', link: 'https://github.com/Like-Su/me' }],
    search: { provider: 'local', options: { translations: { button: { buttonText: '搜索本站', buttonAriaLabel: '搜索本站文章' }, modal: { noResultsText: '没有找到相关内容', resetButtonTitle: '清空搜索', footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' } } } } },
    outline: { label: '本页目录', level: [1, 3] },
    docFooter: { prev: '上一篇', next: '下一篇' },
    sidebarMenuLabel: '目录',
    returnToTopLabel: '返回顶部',
    darkModeSwitchLabel: '切换主题',
    footer: { message: '记录学习面试与思考实践' }
  }
})
