import { defineConfig } from 'vitepress'
import { sidebar, topicNavigation } from './sidebar'
import { watchRepository } from './watch-repository'

export default defineConfig({
  lang: 'zh-CN',
  title: 'CS 通关',
  description: '记录学习面试与思考实践',
  base: '/me/',
  vite: { plugins: [watchRepository()] },
  head: [['link', { rel: 'icon', type: 'image/png', href: '/me/cs-pass.png' }]],
  rewrites: { 'notes/README.md': 'index.md' },
  markdown: { lineNumbers: true, math: true },
  themeConfig: {
    logo: { src: '/cs-pass.png', alt: 'CS 通关：知识阶梯与通关之门' },
    nav: [
      { text: '首页', link: '/' },
      { text: '学习路线', link: '/notes/路线' },
      { text: '学习主题', items: topicNavigation }
    ],
    sidebar,
    socialLinks: [{ icon: 'github', link: 'https://github.com/Like-Su/me' }],
    search: { provider: 'local' },
    outline: { label: '本页目录', level: [2, 3] },
    docFooter: { prev: '上一篇', next: '下一篇' },
    sidebarMenuLabel: '目录',
    returnToTopLabel: '返回顶部',
    darkModeSwitchLabel: '切换主题',
    footer: { message: '记录学习面试与思考实践' }
  }
})
