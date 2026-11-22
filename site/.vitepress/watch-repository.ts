import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

// 仓库内容位于 Vite 根目录之外，显式监听并重新加载配置中的同步与导航。
export function watchRepository(): Plugin {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const inputs = ['README.md', '计算机基础', '编程语言', '开发技术', '工程能力', 'AI应用']
    .map(name => path.resolve(root, name))
  return {
    name: 'watch-repository-content',
    apply: 'serve',
    configureServer(server) {
      let timer: ReturnType<typeof setTimeout> | undefined
      const changed = (_event: string, file: string) => {
        const absolute = path.resolve(file)
        if (!inputs.some(input => absolute === input || absolute.startsWith(input + path.sep))) return
        clearTimeout(timer)
        timer = setTimeout(() => {
          server.restart().catch(error => server.config.logger.error(String(error)))
        }, 200)
      }
      server.watcher.add(inputs)
      server.watcher.on('all', changed)
      server.httpServer?.once('close', () => {
        clearTimeout(timer)
        server.watcher.off('all', changed)
      })
    }
  }
}
