import { createHighlighterCore } from 'shiki/core'
import javascript from 'shiki/langs/javascript.mjs'
import python from 'shiki/langs/python.mjs'
import light from 'shiki/themes/github-light.mjs'
import dark from 'shiki/themes/github-dark.mjs'

export const highlighter = createHighlighterCore({
  themes: [light, dark],
  langs: [javascript, python],
  loadWasm: import('shiki/wasm')
})
