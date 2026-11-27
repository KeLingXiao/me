import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { normalizePage, codeReferenceFromUrl } from '../.vitepress/theme/links.ts'

const site = path.resolve(import.meta.dirname, '..')
const root = path.dirname(site)
const directory = fs.mkdtempSync(path.join(root, 'reference-check-'))
const codeDirectory = fs.mkdtempSync(path.join(root, 'code', '.reference-check-'))
const note = path.join(directory, 'note.md')
const source = path.join(codeDirectory, 'example.ts')
const manifest = path.join(site, '.vitepress/generated/code-references.json')
const sourceKey = path.relative(root, source).split(path.sep).join('/')
const relativeLink = path.relative(directory, source).split(path.sep).join('/')
const generatedNote = path.join(site, 'notes', path.basename(directory), 'note.md')
let sequence = 0
const sync = () => import(pathToFileURL(path.join(site, '.vitepress/repository-menu.ts')).href + '?references=' + sequence++)
try {
  fs.writeFileSync(source, 'const value: number = 42\n')
  fs.writeFileSync(note, `# Test\n\n[example](${relativeLink}?run=0#value)\n`)
  await sync()
  const markdown = fs.readFileSync(generatedNote, 'utf8')
  assert.ok(markdown.includes('?code='))
  assert.ok(markdown.includes('run=0'))
  assert.ok(markdown.includes('symbol=value'))
  assert.ok(markdown.includes('/notes/' + path.basename(directory) + '/note.html?'))
  assert.ok(!markdown.includes('.source.html'))
  let entries = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  assert.equal(entries[sourceKey].source, 'const value: number = 42\n')
  assert.equal(entries[sourceKey].language, 'typescript')
  assert.ok(!fs.existsSync(path.join(site, 'code', path.relative(path.join(root, 'code'), source) + '.source.md')))
  fs.writeFileSync(source, 'const value: number = 43\n')
  await sync()
  entries = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  assert.equal(entries[sourceKey].source, 'const value: number = 43\n')
  fs.writeFileSync(note, '# Test\n')
  await sync()
  entries = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  assert.ok(!entries[sourceKey])
} finally {
  fs.rmSync(note, { force: true })
  fs.rmSync(source, { force: true })
  fs.rmdirSync(directory)
  fs.rmdirSync(codeDirectory)
  await sync()
}
assert.equal(normalizePage('/notes/1.design.html'), '/notes/1.design')
assert.equal(normalizePage('/notes/topic/index.html'), normalizePage('/notes/topic/'))
assert.equal(normalizePage('/index.html'), '/')
assert.equal(codeReferenceFromUrl(new URL('https://example.com/me/article.html?code=code%2Fexample.ts'), '/me/'), 'code/example.ts')
assert.equal(codeReferenceFromUrl(new URL('https://example.com/me/notes/1.design.html'), '/me/'), null)
console.log('PASS: code references remain on the article, source updates/removals, no generated code pages, URL matching')
