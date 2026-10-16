import assert from 'node:assert/strict'
import { readFile, realpath, lstat } from 'node:fs/promises'
import { resolve, join, dirname, basename } from 'node:path'
import { createHash } from 'node:crypto'

async function directory(path) {
  const info = await lstat(path, { bigint: true })
  assert(info.isDirectory() && !info.isSymbolicLink(), 'Real directories only')
  assert.equal(await realpath(path), path, 'No symlink aliases')
  return { device: String(info.dev), inode: String(info.ino) }
}
async function json(path) {
  const info = await lstat(path)
  assert(info.isFile() && !info.isSymbolicLink() && info.size < 16 * 1024 * 1024, 'Regular bounded metadata only')
  return JSON.parse(await readFile(path, 'utf8'))
}
export async function guardWorkspace(input, { allowConfiguredModels = false } = {}) {
  assert(input, 'Supply the directory created by seed-demo.ts')
  const base = resolve(input)
  assert.equal(dirname(base), '/private/tmp')
  assert(basename(base).startsWith('shakeink-readme-'))
  await directory(base)
  const marker = await json(join(base, 'README-DEMO-ONLY.json'))
  assert.equal(marker.purpose, 'README photography')
  assert.equal(marker.originalFiction, true)
  const fixture = await json(join(base, 'fixture.json'))
  assert.equal(fixture.models, 0)
  assert.equal(fixture.contentSha256, createHash('sha256').update(await readFile(resolve('scripts/readme/demo-content.ts'))).digest('hex'), 'Re-seed after changing original content')
  assert.equal(fixture.books.length, 2)
  const root = join(base, 'data'), rootIdentity = await directory(root), bootstrap = root + '-bootstrap'
  const state = await json(join(root, 'state.json'))
  // Never compare or print model objects: they can contain encrypted secrets.
  assert(Array.isArray(state.value?.models), 'Expected a model list')
  const configuredModelCount = state.value.models.length
  if (!allowConfiguredModels) assert.equal(configuredModelCount, 0, 'Launch requires an unconfigured demo workspace')
  const catalog = await json(join(root, 'catalog.json'))
  assert.equal(catalog.value.length, 2)
  for (const [index, book] of fixture.books.entries()) {
    const work = catalog.value.find(work => work.id === book.workId)
    assert(work && work.novelId === book.novelId)
    assert.equal(work.path, join(base, 'book-' + index))
    assert.deepEqual(await directory(work.path), work.identity)
  }
  try {
    await directory(bootstrap)
    try {
      const pointer = await json(join(bootstrap, 'data-root.json'))
      assert.equal(pointer.root.path, root)
      assert.equal(pointer.root.device, rootIdentity.device)
      assert.equal(pointer.root.inode, rootIdentity.inode)
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  return { base, root, fixture, configuredModelCount }
}
