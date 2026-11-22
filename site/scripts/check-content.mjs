import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const site = path.resolve(import.meta.dirname, '..')
const repository = path.dirname(site)
const source = fs.readFileSync(path.join(site, '.vitepress/theme/components/runner.worker.js'), 'utf8')
const algorithm = fs.readFileSync(path.join(site, 'scripts/fixtures/binary-search.js'), 'utf8')
async function execute(code, input) {
  const messages = []
  const self = { postMessage: value => messages.push(value) }
  vm.runInNewContext(source, { self })
  await self.onmessage({ data: { code, input } })
  return messages
}
for (const [nums, target, expected] of [[[1,3,5,7,9],7,'3'],[[],1,'-1'],[[5],5,'0'],[[1,3,5],4,'-1'],[[1,3,5],1,'0'],[[1,3,5],5,'2']]) {
  assert.equal((await execute(algorithm, JSON.stringify({ nums, target })))[0].text, expected)
}
assert.equal((await execute('throw Error("test")', '{}'))[0].type, 'error')
assert.equal((await execute('let = ;', '{}'))[0].type, 'error')
assert.equal((await execute('', 'invalid'))[0].type, 'error')
assert.equal((await execute('for(let i=0;i<200;i++)console.log(i)', '{}')).filter(message => message.type === 'log').length, 100)

// 在独立临时源目录验证新增、修改、改名和删除；不操作用户文章。
const temporary = fs.mkdtempSync(path.join(repository, 'sync-check-'))
const first = path.join(temporary, 'first.md')
const second = path.join(temporary, 'second.md')
const generated = path.join(site, 'notes', path.basename(temporary))
let sequence = 0
const sync = () => import(pathToFileURL(path.join(site, '.vitepress/repository-menu.ts')).href + `?test=${sequence++}`)
try {
  fs.writeFileSync(first, '# First\n')
  await sync()
  assert.ok(fs.existsSync(path.join(generated, 'first.md')))
  fs.writeFileSync(first, '# Updated\n')
  await sync()
  assert.equal(fs.readFileSync(path.join(generated, 'first.md'), 'utf8'), '# Updated\n')
  fs.renameSync(first, second)
  await sync()
  assert.ok(!fs.existsSync(path.join(generated, 'first.md')))
  assert.ok(fs.existsSync(path.join(generated, 'second.md')))
  fs.unlinkSync(second)
  await sync()
  assert.ok(!fs.existsSync(generated))
} finally {
  for (const filename of [first, second]) if (fs.existsSync(filename)) fs.unlinkSync(filename)
  fs.rmdirSync(temporary)
}
console.log('PASS: 算法边界、错误与日志限制；文章新增、修改、改名和删除同步')

