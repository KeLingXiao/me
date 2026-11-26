import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

// 仓库内容位于 Vite 根目录之外，显式监听并重新加载配置中的同步与导航。
export function watchRepository(): Plugin {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const excluded = new Set(['site', '.git', 'node_modules', 'dist', '.math-install', '.pnpm-local', '.pnpm-store', '.ci-check'])
  return {
    name: 'watch-repository-content',
    apply: 'serve',
    configureServer(server) {
      let timer: ReturnType<typeof setTimeout> | undefined
      const changed = (_event: string, file: string | null) => {
        if (!file || file.split(/[\\/]/).some(part => excluded.has(part))) return
        clearTimeout(timer)
        timer = setTimeout(() => {
          // Vite restart reuses resolved VitePress config; request its own reload.
          const config = path.join(root, 'site', '.vitepress', 'config.mts')
          try {
            const now = new Date()
            fs.utimesSync(config, now, now)
          } catch (error) { server.config.logger.error(String(error)) }
        }, 200)
      }
      // Separate watcher: excluding site here must not disable Vite's own HMR.
      const watcher = fs.watch(root, { recursive: true }, changed)
      watcher.on('error', error => server.config.logger.error(String(error)))
      server.httpServer?.once('close', () => {
        clearTimeout(timer)
        watcher.close()
      })
    }
  }
}
