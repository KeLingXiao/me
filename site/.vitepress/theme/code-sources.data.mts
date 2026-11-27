import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { CodeSource } from './links'

export declare const data: Record<string, CodeSource>

export default {
  watch: ['../generated/code-references.json'],
  load(): Record<string, CodeSource> {
    const file = fileURLToPath(new URL('../generated/code-references.json', import.meta.url))
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  }
}
