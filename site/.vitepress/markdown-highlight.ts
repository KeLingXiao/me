// Inline highlight syntax: ==text== or ==text=={#RRGGBB}. Code spans and fenced code stay literal.
export function highlightText(md: any) {
  md.inline.ruler.before('emphasis', 'background-highlight', (state: any, silent: boolean) => {
    const start = state.pos
    if (state.src.slice(start, start + 2) !== '==') return false
    let end = start + 2
    while ((end = state.src.indexOf('==', end)) !== -1) {
      let escapes = 0
      for (let i = end - 1; i >= start + 2 && state.src[i] === '\\'; i--) escapes++
      if (escapes % 2 === 0) break
      end += 2
    }
    if (end < 0 || end >= state.posMax) return false
    const content = state.src.slice(start + 2, end)
    if (!content.trim() || content.includes('\n')) return false
    const suffix = state.src.slice(end + 2, state.posMax).match(/^\{(#[0-9a-f]{6}|#[0-9a-f]{3})\}/i)
    if (!silent) {
      const token = state.push('mark_open', 'mark', 1)
      if (suffix) {
        const color = suffix[1]
        const hex = color.length === 4 ? color.slice(1).split('').map((c: string) => c + c).join('') : color.slice(1)
        const channels = [0, 2, 4].map(i => {
          const value = parseInt(hex.slice(i, i + 2), 16) / 255
          return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
        })
        const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
        token.attrSet('style', `background-color:${color};color:${luminance > .179 ? '#000000' : '#ffffff'}`)
      }
      const children: any[] = []
      state.md.inline.parse(content, state.md, state.env, children)
      state.tokens.push(...children)
      state.push('mark_close', 'mark', -1)
    }
    state.pos = end + 2 + (suffix?.[0].length ?? 0)
    return true
  })
}
