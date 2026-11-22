import type { DefaultTheme } from 'vitepress'
import { repositoryMenu } from './repository-menu'

type Item = DefaultTheme.SidebarItem
type Article = { text: string; link: string; source: string }
const articles: Article[] = []
const aliases: Record<string, string> = {
  array: '数组：原理与应用', linklist: '链表：原理与应用',
  'Node与JS': 'Node.js 与 JavaScript', 'TCP-IP': 'TCP/IP 协议',
  'URL到页面全流程': '从 URL 到页面呈现', 'Tool&MCP': '工具调用与 MCP',
  'DI与IOC': '依赖注入与控制反转', 'Mutirepo和Monorepo': '多仓库与 Monorepo',
  '1.两数之和': '两数之和'
}
function collect(items: Item[]) {
  for (const item of items) {
    if (item.link) {
      const source = decodeURIComponent(item.link).replace('/notes/', '')
      // 图片资料目录不进入阅读导航；原文仍可通过搜索访问。
      if (!source.includes('/images/') && !source.includes('/assets/') && source !== 'README') {
        const title = item.text || '未命名笔记'
        articles.push({ text: aliases[title] || title.replace(/ 引导页$/, ''), link: item.link, source })
      }
    }
    if (item.items) collect(item.items)
  }
}
collect(repositoryMenu)

const topics = [
  { title: '算法与数据结构', home: '/algorithms/', roots: ['计算机基础/数据结构与算法/'], sections: [
    ['数据结构', /数组|链表|栈|队列|树|堆|复杂度/], ['刷题实践', /LeetCode/i]
  ] },
  { title: '计算机基础', home: '/network/', roots: ['计算机基础/计算机网络/', '计算机基础/操作系统/'], sections: [
    ['网络协议与通信', /计算机网络\//], ['操作系统', /操作系统\//]
  ] },
  { title: '前端开发', home: '/frontend/', roots: ['开发技术/前端/'], sections: [
    ['JavaScript 基础', /\/JS\//], ['样式与类型系统', /\/CSS\/|\/TS\//],
    ['Vue 原理与实践', /\/vue\//i], ['React 原理与实践', /\/react\//i], ['工程化', /工程化/]
  ] },
  { title: '语言与运行时', home: '/languages/', roots: ['编程语言/', '开发技术/Node.js/'], sections: [
    ['Node.js 运行机制', /Node\.js\//], ['Python', /Python\//], ['JavaScript 与 TypeScript', /JavaScript\/|TypeScript\//],
    ['其他语言', /C\+\+\/|Java\/|Rust\//]
  ] },
  { title: '后端与架构', home: '/backend/', roots: ['开发技术/后端/', '开发技术/数据库/'], sections: [
    ['数据库与存储', /数据库\//], ['部署与容器', /Docker\//], ['并发与通信', /并发|消息队列/]
  ] },
  { title: '工程实践', home: '/engineering/', roots: ['工程能力/'], sections: [
    ['代码质量与模式入门', /代码质量|代码评判|\/[1-4]\./],
    ['创建型模式', /单例|工厂|建造者|原型/],
    ['结构型模式', /适配器|桥接|组合|装饰器|外观|享元|代理/],
    ['行为型模式', /责任链|命令|解释器|迭代器|中介者|备忘录|观察者|状态|策略|模板方法|访问者/],
    ['部署与交付', /部署与交付\//], ['测试与调试', /测试与调试\//], ['业务与工程方案', /项目实践\//]
  ] },
  { title: 'AI 应用开发', home: '/ai/', roots: ['AI应用/'], sections: [
    ['模型与 Agent 基础', /模型基础\/|基础调用方式|Agent开发\/README/],
    ['工具、检索与记忆', /Tool&MCP|RAG|Memory/],
    ['框架与实现', /LangChain|LangGraph|Mini-Agent/],
    ['VibeCoding', /VibeCoding\//]
  ] }
] satisfies { title: string; home: string; roots: string[]; sections: [string, RegExp][] }[]

for (const topic of topics) {
  const landing = articles.find(article => topic.roots.some(root => article.source === root + 'README'))
    || articles.find(article => topic.roots.some(root => article.source.startsWith(root)))
  topic.home = landing?.link || '/'
}
export const topicNavigation = topics.filter(topic => topic.home !== '/').map(topic => ({ text: topic.title, link: topic.home }))

const topicLinks: Item[] = topics.map(topic => ({ text: topic.title, link: topic.home }))
const overview: Item[] = [
  { text: '开始阅读', items: [{ text: '首页', link: '/' }, { text: '学习路线', link: '/notes/路线' }] },
  { text: '学习主题', items: topicLinks },
  { text: '仓库', items: [{ text: '源码与附件', link: 'https://github.com/Like-Su/me' }] }
]
const navigation = (): Item => ({ text: '导航', items: [{ text: '首页', link: '/' }, { text: '学习路线', link: '/notes/路线' }] })
export const sidebar: DefaultTheme.Sidebar = { '/': overview }
for (const topic of topics) {
  const selected = articles.filter(article => topic.roots.some(root => article.source.startsWith(root)))
  const used = new Set<string>()
  const sections: Item[] = []
  for (const [title, pattern] of topic.sections) {
    const matches = selected.filter(article => !used.has(article.link) && pattern.test(article.source))
    if (!matches.length) continue
    matches.forEach(article => used.add(article.link))
    sections.push({ text: title, collapsed: matches.length > 6, items: matches.map(({ text, link }) => ({ text, link })) })
  }
  const rest = selected.filter(article => !used.has(article.link))
  sections.push(...rest.filter(article => article.link !== topic.home).map(({ text, link }) => ({ text, link })))
  const menu: Item[] = [navigation(), { text: topic.title, items: [{ text: '主题概览', link: topic.home }] }, ...sections]
  sidebar[topic.home] = menu
  for (const root of topic.roots) {
    sidebar['/notes/' + root] = menu
    sidebar['/notes/' + root.split('/').map(encodeURIComponent).join('/')] = menu
  }
}
