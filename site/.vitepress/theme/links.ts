export interface CodeSource { path: string; name: string; language: string; source: string }

export function normalizePage(path: string) {
  try { return decodeURIComponent(path).replace(/(?:\/index)?\.html$/, '').replace(/\/$/, '') || '/' }
  catch { return path }
}

export function codeReferenceFromUrl(url: URL, base: string) {
  const source = url.searchParams.get('code')
  if (source?.startsWith('code/')) return source
  if (url.pathname.startsWith(base + 'code/')) {
    try { return 'code/' + decodeURIComponent(url.pathname.slice((base + 'code/').length)).replace(/\.source\.html$/, '') }
    catch { return null }
  }
  return null
}
