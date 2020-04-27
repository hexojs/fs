'use strict'

require('chai').use(require('chai-as-promised')).should()
const { should } = require('chai')

const { join, dirname } = require('path')
const Promise = require('bluebird')
const fs = require('../lib/fs.ts')
const { tiferr } = require('iferr')

function createDummyFolder(path, callback) {
  const filesMap = {
    // Normal files in a hidden folder
    [join('.hidden', 'a.txt')]: 'a',
    [join('.hidden', 'b.js')]: 'b',
    // Normal folder in a hidden folder
    [join('.hidden', 'c', 'd')]: 'd',
    // Top-class files
    'e.txt': 'e',
    'f.js': 'f',
    // A hidden file
    '.g': 'g',
    // Files in a normal folder
    [join('folder', 'h.txt')]: 'h',
    [join('folder', 'i.js')]: 'i',
    // A hidden files in a normal folder
    [join('folder', '.j')]: 'j'
  }
  return Promise.map(Object.keys(filesMap), key => fs.writeFile(join(path, key), filesMap[key])).asCallback(callback)
}

describe('fs', () => {
  const tmpDir = join(__dirname, 'fs_tmp')

  before(() => fs.mkdirs(tmpDir))

  after(() => fs.rmdir(tmpDir))

  it('exists()', async () => {
    const exist = await fs.exists(tmpDir)
    exist.should.eql(true)
  })

  it('exists() - callback', callback => {
    fs.exists(tmpDir, exist => {
      try {
        exist.should.be.true
      } catch (e) {
        callback(e)
        return
      }
      callback()
    })
  })

  it('exists() - path is required', async () => {
    try {
      await fs.exists()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('mkdirs()', async () => {
    const target = join(tmpDir, 'a', 'b', 'c')

    await fs.mkdirs(target)
    const exist = await fs.exists(target)
    exist.should.eql(true)

    await fs.rmdir(join(tmpDir, 'a'))
  })

  it('mkdirs() - callback', callback => {
    const target = join(tmpDir, 'a', 'b', 'c')

    fs.mkdirs(target, tiferr(callback, () => {
      fs.exists(target, exist => {
        exist.should.be.true
        fs.rmdir(join(tmpDir, 'a'), callback)
      })
    }))
  })

  it('mkdirs() - path is required', async () => {
    try {
      await fs.mkdirs()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('mkdirsSync()', async () => {
    const target = join(tmpDir, 'a', 'b', 'c')

    fs.mkdirsSync(target)

    const exist = await fs.exists(target)
    exist.should.eql(true)

    await fs.rmdir(join(tmpDir, 'a'))
  })

  it('mkdirsSync() - path is required', () => {
    try {
      fs.mkdirsSync()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('writeFile()', async () => {
    const target = join(tmpDir, 'a', 'b', 'test.txt')
    const body = 'foo'

    await fs.writeFile(target, body)
    const result = await fs.readFile(target)

    result.should.eql(body)

    await fs.rmdir(join(tmpDir, 'a'))
  })

  it('writeFile() - callback', callback => {
    const target = join(tmpDir, 'a', 'b', 'test.txt')
    const body = 'foo'

    fs.writeFile(target, body, tiferr(callback, () => {
      fs.readFile(target, tiferr(callback, content => {
        content.should.eql(body)
        fs.rmdir(join(tmpDir, 'a'), callback)
      }))
    }))
  })

  it('writeFile() - path is required', async () => {
    try {
      await fs.writeFile()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('writeFileSync()', async () => {
    const target = join(tmpDir, 'a', 'b', 'test.txt')
    const body = 'foo'

    fs.writeFileSync(target, body)

    const result = await fs.readFile(target)
    result.should.eql(body)

    await fs.rmdir(join(tmpDir, 'a'))
  })

  it('writeFileSync() - path is required', () => {
    try {
      fs.writeFileSync()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('appendFile()', async () => {
    const target = join(tmpDir, 'a', 'b', 'test.txt')
    const body = 'foo'
    const body2 = 'bar'

    await fs.writeFile(target, body)
    await fs.appendFile(target, body2)

    const result = await fs.readFile(target)

    result.should.eql(body + body2)

    await fs.rmdir(join(tmpDir, 'a'))
  })

  it('appendFile() - callback', callback => {
    const target = join(tmpDir, 'a', 'b', 'test.txt')
    const body = 'foo'
    const body2 = 'bar'

    fs.writeFile(target, body, tiferr(callback, () => {
      fs.appendFile(target, body2, tiferr(callback, () => {
        fs.readFile(target, tiferr(callback, content => {
          content.should.eql(body + body2)
          fs.rmdir(join(tmpDir, 'a'), callback)
        }))
      }))
    }))
  })

  it('appendFile() - path is required', async () => {
    try {
      await fs.appendFile()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('appendFileSync()', async () => {
    const target = join(tmpDir, 'a', 'b', 'test.txt')
    const body = 'foo'
    const body2 = 'bar'

    await fs.writeFile(target, body)
    fs.appendFileSync(target, body2)

    const result = await fs.readFile(target)
    result.should.eql(body + body2)

    await fs.rmdir(join(tmpDir, 'a'))
  })

  it('appendFileSync() - path is required', () => {
    try {
      fs.appendFileSync()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('copyFile()', async () => {
    const src = join(tmpDir, 'test.txt')
    const dest = join(tmpDir, 'a', 'b', 'test.txt')
    const body = 'foo'

    await fs.writeFile(src, body)
    await fs.copyFile(src, dest)

    const result = await fs.readFile(dest)
    result.should.eql(body)

    await Promise.all([
      fs.unlink(src),
      fs.rmdir(join(tmpDir, 'a'))
    ])
  })

  it('copyFile() - callback', callback => {
    const src = join(tmpDir, 'test.txt')
    const dest = join(tmpDir, 'a', 'b', 'test.txt')
    const body = 'foo'

    fs.writeFile(src, body, tiferr(callback, () => {
      fs.copyFile(src, dest, tiferr(callback, () => {
        fs.readFile(dest, tiferr(callback, content => {
          content.should.eql(body)

          Promise.all([
            fs.unlink(src),
            fs.rmdir(join(tmpDir, 'a'))
          ]).asCallback(callback)
        }))
      }))
    }))
  })

  it('copyFile() - src is required', async () => {
    try {
      await fs.copyFile()
      should.fail()
    } catch (err) {
      err.message.should.eql('src is required!')
    }
  })

  it('copyFile() - dest is required', async () => {
    try {
      await fs.copyFile('123')
      should.fail()
    } catch (err) {
      err.message.should.eql('dest is required!')
    }
  })

  it('copyDir()', async () => {
    const src = join(tmpDir, 'a')
    const dest = join(tmpDir, 'b')

    const filenames = [
      'e.txt',
      'f.js',
      join('folder', 'h.txt'),
      join('folder', 'i.js')
    ]

    await createDummyFolder(src)
    const files = await fs.copyDir(src, dest)
    files.should.eql(filenames)

    const result = []
    for (const file of files) {
      const output = await fs.readFile(join(dest, file))
      result.push(output)
    }
    result.should.eql(['e', 'f', 'h', 'i'])

    await Promise.all([fs.rmdir(src), fs.rmdir(dest)])
  })

  it('copyDir() - callback', callback => {
    const src = join(tmpDir, 'a')
    const dest = join(tmpDir, 'b')

    const finenames = [
      'e.txt',
      'f.js',
      join('folder', 'h.txt'),
      join('folder', 'i.js')
    ]

    createDummyFolder(src, tiferr(callback, () => {
      fs.copyDir(src, dest, tiferr(callback, files => {
        files.should.have.members(finenames)
        fs.rmdir(src, tiferr(callback, () => {
          Promise.map(finenames, path => fs.readFile(join(dest, path))).asCallback(tiferr(callback, result => {
            result.should.eql(['e', 'f', 'h', 'i'])
            fs.rmdir(dest, callback)
          }))
        }))
      }))
    }))
  })

  it('copyDir() - src is required', async () => {
    try {
      await fs.copyDir()
      should.fail()
    } catch (err) {
      err.message.should.eql('src is required!')
    }
  })

  it('copyDir() - dest is required', async () => {
    try {
      await fs.copyDir('123')
      should.fail()
    } catch (err) {
      err.message.should.eql('dest is required!')
    }
  })

  it('copyDir() - ignoreHidden off', async () => {
    const src = join(tmpDir, 'a')
    const dest = join(tmpDir, 'b')

    const filenames = [
      join('.hidden', 'a.txt'),
      join('.hidden', 'b.js'),
      join('.hidden', 'c', 'd'),
      'e.txt',
      'f.js',
      '.g',
      join('folder', 'h.txt'),
      join('folder', 'i.js'),
      join('folder', '.j')
    ]

    await createDummyFolder(src)
    const files = await fs.copyDir(src, dest, { ignoreHidden: false })
    files.should.have.members(filenames)

    const result = []
    for (const file of files) {
      const output = await fs.readFile(join(dest, file))
      result.push(output)
    }
    result.should.have.members(['a', 'b', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])

    await Promise.all([fs.rmdir(src), fs.rmdir(dest)])
  })

  it('copyDir() - ignorePattern', async () => {
    const src = join(tmpDir, 'a')
    const dest = join(tmpDir, 'b')

    const filenames = ['e.txt', join('folder', 'h.txt')]

    await createDummyFolder(src)
    const files = await fs.copyDir(src, dest, { ignorePattern: /\.js/ })
    files.should.eql(filenames)

    const result = []
    for (const file of files) {
      const output = await fs.readFile(join(dest, file))
      result.push(output)
    }
    result.should.eql(['e', 'h'])

    await Promise.all([fs.rmdir(src), fs.rmdir(dest)])
  })

  it('listDir()', async () => {
    const expected = [
      'e.txt',
      'f.js',
      join('folder', 'h.txt'),
      join('folder', 'i.js')
    ]
    const target = join(tmpDir, 'test')

    await createDummyFolder(target)
    const dir = await fs.listDir(target)
    dir.should.eql(expected)

    await fs.rmdir(target)
  })

  it('listDir() - callback', callback => {
    const target = join(tmpDir, 'test')

    const filenames = [
      'e.txt',
      'f.js',
      join('folder', 'h.txt'),
      join('folder', 'i.js')
    ]

    createDummyFolder(target, tiferr(callback, () => {
      fs.listDir(target, tiferr(callback, paths => {
        paths.should.have.members(filenames)
        fs.rmdir(target, callback)
      }))
    }))
  })

  it('listDir() - path is required', async () => {
    try {
      await fs.listDir()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('listDir() - ignoreHidden off', async () => {
    const target = join(tmpDir, 'test')

    const filenames = [
      join('.hidden', 'a.txt'),
      join('.hidden', 'b.js'),
      join('.hidden', 'c', 'd'),
      'e.txt',
      'f.js',
      '.g',
      join('folder', 'h.txt'),
      join('folder', 'i.js'),
      join('folder', '.j')
    ]

    await createDummyFolder(target)
    const dir = await fs.listDir(target, { ignoreHidden: false })
    dir.should.have.members(filenames)

    await fs.rmdir(target)
  })

  it('listDir() - ignorePattern', async () => {
    const target = join(tmpDir, 'test')

    await createDummyFolder(target)
    const dir = await fs.listDir(target, { ignorePattern: /\.js/ })
    dir.should.eql(['e.txt', join('folder', 'h.txt')])

    await fs.rmdir(target)
  })

  it('listDirSync()', async () => {
    const target = join(tmpDir, 'test')

    const filenames = [
      'e.txt',
      'f.js',
      join('folder', 'h.txt'),
      join('folder', 'i.js')
    ]

    await createDummyFolder(target)
    const files = fs.listDirSync(target)
    files.should.eql(filenames)

    await fs.rmdir(target)
  })

  it('listDirSync() - path is required', () => {
    try {
      fs.listDirSync()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('listDirSync() - ignoreHidden off', async () => {
    const target = join(tmpDir, 'test')

    const filenames = [
      join('.hidden', 'a.txt'),
      join('.hidden', 'b.js'),
      join('.hidden', 'c', 'd'),
      'e.txt',
      'f.js',
      '.g',
      join('folder', 'h.txt'),
      join('folder', 'i.js'),
      join('folder', '.j')
    ]

    await createDummyFolder(target)
    const files = fs.listDirSync(target, { ignoreHidden: false })
    files.should.have.members(filenames)

    await fs.rmdir(target)
  })

  it('listDirSync() - ignorePattern', async () => {
    const target = join(tmpDir, 'test')

    await createDummyFolder(target)
    const files = fs.listDirSync(target, { ignorePattern: /\.js/ })
    files.should.eql(['e.txt', join('folder', 'h.txt')])

    await fs.rmdir(target)
  })

  it('readFile()', async () => {
    const target = join(tmpDir, 'test.txt')
    const body = 'test'

    await fs.writeFile(target, body)
    const result = await fs.readFile(target)
    result.should.eql(body)

    await fs.unlink(target)
  })

  it('readFile() - callback', callback => {
    const target = join(tmpDir, 'test.txt')
    const body = 'test'

    fs.writeFile(target, body, tiferr(callback, () => {
      fs.readFile(target, tiferr(callback, content => {
        content.should.eql(body)
        fs.unlink(target, callback)
      }))
    }))
  })

  it('readFile() - path is required', async () => {
    try {
      await fs.readFile()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('readFile() - escape BOM', async () => {
    const target = join(tmpDir, 'test.txt')
    const body = '\ufefffoo'

    await fs.writeFile(target, body)
    const result = await fs.readFile(target)

    result.should.eql('foo')

    await fs.unlink(target)
  })

  it('readFile() - escape Windows line ending', async () => {
    const target = join(tmpDir, 'test.txt')
    const body = 'foo\r\nbar'

    await fs.writeFile(target, body)
    const result = await fs.readFile(target)
    result.should.eql('foo\nbar')

    await fs.unlink(target)
  })

  it('readFileSync()', async () => {
    const target = join(tmpDir, 'test.txt')
    const body = 'test'

    await fs.writeFile(target, body)
    const result = fs.readFileSync(target)
    result.should.eql(body)

    await fs.unlink(target)
  })

  it('readFileSync() - path is required', () => {
    try {
      fs.readFileSync()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('readFileSync() - escape BOM', async () => {
    const target = join(tmpDir, 'test.txt')
    const body = '\ufefffoo'

    await fs.writeFile(target, body)
    const result = fs.readFileSync(target)
    result.should.eql('foo')

    await fs.unlink(target)
  })

  it('readFileSync() - escape Windows line ending', async () => {
    const target = join(tmpDir, 'test.txt')
    const body = 'foo\r\nbar'

    await fs.writeFile(target, body)
    const result = fs.readFileSync(target)
    result.should.eql('foo\nbar')

    await fs.unlink(target)
  })

  it('unlink()', async () => {
    const target = join(tmpDir, 'test-unlink')

    await fs.writeFile(target, '')
    let exist = await fs.exists(target)
    exist.should.eql(true)

    await fs.unlink(target)
    exist = await fs.exists(target)
    exist.should.eql(false)
  })

  it('emptyDir()', async () => {
    const target = join(tmpDir, 'test')

    const checkExistsMap = {
      [join('.hidden', 'a.txt')]: true,
      [join('.hidden', 'b.js')]: true,
      [join('.hidden', 'c', 'd')]: true,
      'e.txt': false,
      'f.js': false,
      '.g': true,
      [join('folder', 'h.txt')]: false,
      [join('folder', 'i.js')]: false,
      [join('folder', '.j')]: true
    }

    await createDummyFolder(target)
    const files = await fs.emptyDir(target)
    files.should.eql([
      'e.txt',
      'f.js',
      join('folder', 'h.txt'),
      join('folder', 'i.js')
    ])

    const paths = Object.keys(checkExistsMap)
    for (const path of paths) {
      const exist = await fs.exists(join(target, path))
      exist.should.eql(checkExistsMap[path])
    }

    await fs.rmdir(target)
  })

  it('emptyDir() - callback', callback => {
    const target = join(tmpDir, 'test')

    const checkExistsMap = {
      [join('.hidden', 'a.txt')]: true,
      [join('.hidden', 'b.js')]: true,
      [join('.hidden', 'c', 'd')]: true,
      'e.txt': false,
      'f.js': false,
      '.g': true,
      [join('folder', 'h.txt')]: false,
      [join('folder', 'i.js')]: false,
      [join('folder', '.j')]: true
    }

    createDummyFolder(target, tiferr(callback, () => {
      fs.emptyDir(target, tiferr(callback, files => {
        files.should.have.members([
          'e.txt',
          'f.js',
          join('folder', 'h.txt'),
          join('folder', 'i.js')
        ])

        return Promise.map(Object.keys(checkExistsMap), path => {
          return fs.exists(join(target, path)).should.become(checkExistsMap[path])
        }).asCallback(tiferr(callback, () => {
          fs.rmdir(target, callback)
        }))
      }))
    }))
  })

  it('emptyDir() - path is required', async () => {
    try {
      await fs.emptyDir()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('emptyDir() - ignoreHidden off', async () => {
    const target = join(tmpDir, 'test')

    const filenames = [
      join('.hidden', 'a.txt'),
      join('.hidden', 'b.js'),
      join('.hidden', 'c', 'd'),
      'e.txt',
      'f.js',
      '.g',
      join('folder', 'h.txt'),
      join('folder', 'i.js'),
      join('folder', '.j')
    ]

    await createDummyFolder(target)
    const files = await fs.emptyDir(target, { ignoreHidden: false })
    files.should.have.members(filenames)

    for (const file of files) {
      const exist = await fs.exists(join(target, file))
      exist.should.eql(false)
    }

    await fs.rmdir(target)
  })

  it('emptyDir() - ignorePattern', async () => {
    const target = join(tmpDir, 'test')

    const checkExistsMap = {
      [join('.hidden', 'a.txt')]: true,
      [join('.hidden', 'b.js')]: true,
      [join('.hidden', 'c', 'd')]: true,
      'e.txt': false,
      'f.js': true,
      '.g': true,
      [join('folder', 'h.txt')]: false,
      [join('folder', 'i.js')]: true,
      [join('folder', '.j')]: true
    }

    await createDummyFolder(target)
    const files = await fs.emptyDir(target, { ignorePattern: /\.js/ })
    files.should.eql(['e.txt', join('folder', 'h.txt')])

    const paths = Object.keys(checkExistsMap)
    for (const path of paths) {
      const exist = await fs.exists(join(target, path))
      exist.should.eql(checkExistsMap[path])
    }

    await fs.rmdir(target)
  })

  it('emptyDir() - exclude', async () => {
    const target = join(tmpDir, 'test')

    const checkExistsMap = {
      [join('.hidden', 'a.txt')]: true,
      [join('.hidden', 'b.js')]: true,
      [join('.hidden', 'c', 'd')]: true,
      'e.txt': true,
      'f.js': false,
      '.g': true,
      [join('folder', 'h.txt')]: false,
      [join('folder', 'i.js')]: true,
      [join('folder', '.j')]: true
    }

    await createDummyFolder(target)
    const files = await fs.emptyDir(target, { exclude: ['e.txt', join('folder', 'i.js')] })
    files.should.eql(['f.js', join('folder', 'h.txt')])

    const paths = Object.keys(checkExistsMap)
    for (const path of paths) {
      const exist = await fs.exists(join(target, path))
      exist.should.eql(checkExistsMap[path])
    }

    await fs.rmdir(target)
  })

  it('emptyDirSync()', async () => {
    const target = join(tmpDir, 'test')

    const checkExistsMap = {
      [join('.hidden', 'a.txt')]: true,
      [join('.hidden', 'b.js')]: true,
      [join('.hidden', 'c', 'd')]: true,
      'e.txt': false,
      'f.js': false,
      '.g': true,
      [join('folder', 'h.txt')]: false,
      [join('folder', 'i.js')]: false,
      [join('folder', '.j')]: true
    }

    await createDummyFolder(target)
    const files = fs.emptyDirSync(target)
    files.should.eql([
      'e.txt',
      'f.js',
      join('folder', 'h.txt'),
      join('folder', 'i.js')
    ])

    const paths = Object.keys(checkExistsMap)
    for (const path of paths) {
      const exist = await fs.exists(join(target, path))
      exist.should.eql(checkExistsMap[path])
    }

    await fs.rmdir(target)
  })

  it('emptyDirSync() - path is required', () => {
    try {
      fs.emptyDirSync()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('emptyDirSync() - ignoreHidden off', async () => {
    const target = join(tmpDir, 'test')

    const filenames = [
      join('.hidden', 'a.txt'),
      join('.hidden', 'b.js'),
      join('.hidden', 'c', 'd'),
      'e.txt',
      'f.js',
      '.g',
      join('folder', 'h.txt'),
      join('folder', 'i.js'),
      join('folder', '.j')
    ]

    await createDummyFolder(target)
    const files = fs.emptyDirSync(target, { ignoreHidden: false })
    files.should.have.members(filenames)

    for (const file of files) {
      const exist = await fs.exists(join(target, file))
      exist.should.eql(false)
    }

    await fs.rmdir(target)
  })

  it('emptyDirSync() - ignorePattern', async () => {
    const target = join(tmpDir, 'test')

    const checkExistsMap = {
      [join('.hidden', 'a.txt')]: true,
      [join('.hidden', 'b.js')]: true,
      [join('.hidden', 'c', 'd')]: true,
      'e.txt': false,
      'f.js': true,
      '.g': true,
      [join('folder', 'h.txt')]: false,
      [join('folder', 'i.js')]: true,
      [join('folder', '.j')]: true
    }

    await createDummyFolder(target)
    const files = fs.emptyDirSync(target, { ignorePattern: /\.js/ })
    files.should.eql(['e.txt', join('folder', 'h.txt')])

    const paths = Object.keys(checkExistsMap)
    for (const path of paths) {
      const exist = await fs.exists(join(target, path))
      exist.should.eql(checkExistsMap[path])
    }

    await fs.rmdir(target)
  })

  it('emptyDirSync() - exclude', async () => {
    const target = join(tmpDir, 'test')

    const checkExistsMap = {
      [join('.hidden', 'a.txt')]: true,
      [join('.hidden', 'b.js')]: true,
      [join('.hidden', 'c', 'd')]: true,
      'e.txt': true,
      'f.js': false,
      '.g': true,
      [join('folder', 'h.txt')]: false,
      [join('folder', 'i.js')]: true,
      [join('folder', '.j')]: true
    }

    await createDummyFolder(target)
    const files = fs.emptyDirSync(target, { exclude: ['e.txt', join('folder', 'i.js')] })
    files.should.eql(['f.js', join('folder', 'h.txt')])

    const paths = Object.keys(checkExistsMap)
    for (const path of paths) {
      const exist = await fs.exists(join(target, path))
      exist.should.eql(checkExistsMap[path])
    }

    await fs.rmdir(target)
  })

  it('rmdir()', async () => {
    const target = join(tmpDir, 'test')

    await createDummyFolder(target)
    await fs.rmdir(target)
    const exist = await fs.exists(target)
    exist.should.eql(false)
  })

  it('rmdir() - callback', callback => {
    const target = join(tmpDir, 'test')

    createDummyFolder(target, tiferr(callback, () => {
      fs.rmdir(target, tiferr(callback, () => {
        fs.exists(target, exist => {
          try {
            exist.should.be.false
          } catch (e) {
            callback(e)
            return
          }
          callback()
        })
      }))
    }))
  })

  it('rmdir() - path is required', async () => {
    try {
      await fs.rmdir()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('rmdirSync()', async () => {
    const target = join(tmpDir, 'test')

    await createDummyFolder(target)
    fs.rmdirSync(target)
    const exist = await fs.exists(target)
    exist.should.eql(false)
  })

  it('rmdirSync() - path is required', () => {
    try {
      fs.rmdirSync()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('watch()', async () => {
    const target = join(tmpDir, 'test.txt')

    const testerWrap = _watcher => new Promise((resolve, reject) => {
      _watcher.on('add', resolve).on('error', reject)
    })

    const watcher = await fs.watch(tmpDir)
    const result = await Promise.all([
      testerWrap(watcher),
      fs.writeFile(target, 'test')
    ])
    result[0].should.eql(target)

    if (watcher) {
      watcher.close()
    }
    await fs.unlink(target)
  })

  it('watch() - path is required', async () => {
    try {
      await fs.watch()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('ensurePath() - file exists', async () => {
    const target = join(tmpDir, 'test')
    const filenames = ['foo.txt', 'foo-1.txt', 'foo-2.md', 'bar.txt']

    await Promise.map(filenames, path => fs.writeFile(join(target, path)))
    const result = await fs.ensurePath(join(target, 'foo.txt'))
    result.should.eql(join(target, 'foo-2.txt'))

    await fs.rmdir(target)
  })

  it('ensurePath() - file not exist', async () => {
    const target = join(tmpDir, 'foo.txt')
    const result = await fs.ensurePath(target)
    result.should.eql(target)
  })

  it('ensurePath() - callback', callback => {
    const target = join(tmpDir, 'test')
    const filenames = ['foo.txt', 'foo-1.txt', 'foo-2.md', 'bar.txt']

    Promise.map(filenames, path => fs.writeFile(join(target, path))).asCallback(tiferr(callback, () => {
      fs.ensurePath(join(target, 'foo.txt'), tiferr(callback, path => {
        path.should.eql(join(target, 'foo-2.txt'))
        fs.rmdir(target, callback)
      }))
    }))
  })

  it('ensurePath() - path is required', async () => {
    try {
      await fs.ensurePath()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('ensurePathSync() - file exists', async () => {
    const target = join(tmpDir, 'test')
    const filenames = ['foo.txt', 'foo-1.txt', 'foo-2.md', 'bar.txt']

    await Promise.map(filenames, path => fs.writeFile(join(target, path)))
    const path = fs.ensurePathSync(join(target, 'foo.txt'))
    path.should.eql(join(target, 'foo-2.txt'))

    await fs.rmdir(target)
  })

  it('ensurePathSync() - file not exist', () => {
    const target = join(tmpDir, 'foo.txt')
    const path = fs.ensurePathSync(target)

    path.should.eql(target)
  })

  it('ensurePathSync() - path is required', () => {
    try {
      fs.ensurePathSync()
      should.fail()
    } catch (err) {
      err.message.should.eql('path is required!')
    }
  })

  it('ensureWriteStream()', async () => {
    const { promisify } = require('util')
    const streamFn = require('stream')
    const finished = promisify(streamFn.finished)

    const target = join(tmpDir, 'foo', 'bar.txt')

    const stream = await fs.ensureWriteStream(target)
    stream.path.should.eql(target)

    stream.end()
    await finished(stream)

    await fs.unlink(target)
  })

  it('ensureWriteStream() - callback', callback => {
    const target = join(tmpDir, 'foo', 'bar.txt')

    fs.ensureWriteStream(target, tiferr(callback, stream => {
      stream.path.should.eql(target)

      stream.on('error', callback)
      stream.on('close', () => {
        fs.unlink(target, callback)
      })

      stream.end()
    }))
  })

  it('ensureWriteStreamSync()', callback => {
    const target = join(tmpDir, 'foo', 'bar.txt')
    const stream = fs.ensureWriteStreamSync(target)

    stream.path.should.eql(target)

    stream.on('error', callback)
    stream.on('close', () => {
      fs.rmdir(dirname(target), callback)
    })

    stream.end()
  })
})
