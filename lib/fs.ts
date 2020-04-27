import { Dirent, NoParamCallback, WriteFileOptions, WriteStream } from 'fs'
import chokidar, { FSWatcher, WatchOptions } from 'chokidar'
import BlueBirdPromise from 'bluebird'
import { dirname, join, extname, basename } from 'path'
import { escapeRegExp } from 'hexo-util'

import fs from 'graceful-fs'

const fsPromises = fs.promises

const rEOL = /\r\n/g

function exists (path: string, callback?: (exist: boolean) => any) {
  if (!path) throw new TypeError('path is required!')
  const promise = fsPromises.access(path)
    .then(() => true, error => {
      if (error.code !== 'ENOENT') throw error
      return false
    })
    .then(exist => {
      if (typeof callback === 'function') callback(exist)
      return exist
    })

  return Promise.resolve(promise)
}

function existsSync (path: string) {
  if (!path) throw new TypeError('path is required!')

  try {
    fs.accessSync(path)
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    return false
  }

  return true
}

function mkdirs (path: string, callback: (path?: string) => void) {
  if (!path) throw new TypeError('path is required!')

  return BlueBirdPromise.resolve(fsPromises.mkdir(path, { recursive: true })).asCallback(callback)
}

function mkdirsSync (path: string) {
  if (!path) throw new TypeError('path is required!')

  fs.mkdirSync(path, { recursive: true })
}

const checkParent = (path: string) => BlueBirdPromise.resolve(fsPromises.mkdir(dirname(path), { recursive: true }))

function writeFile (path: string, data: any, options?: WriteFileOptions, callback?: (buffer: Buffer) => void) {
  if (!path) throw new TypeError('path is required!')

  if (!data) data = ''

  if (!callback && typeof options === 'function') {
    callback = options
    options = {}
  }

  return checkParent(path).then(() => fsPromises.writeFile(path, data, options)).asCallback(callback)
}

function writeFileSync (path: string, data: any, options?: WriteFileOptions) {
  if (!path) throw new TypeError('path is required!')

  fs.mkdirSync(dirname(path), { recursive: true })
  fs.writeFileSync(path, data, options)
}

function appendFile (path: string, data: any, options?: WriteFileOptions, callback?: NoParamCallback) {
  if (!path) throw new TypeError('path is required!')

  if (!callback && typeof options === 'function') {
    callback = options
    options = {}
  }

  return checkParent(path).then(() => fsPromises.appendFile(path, data, options)).asCallback(callback)
}

function appendFileSync (path: string, data: any, options?: WriteFileOptions) {
  if (!path) throw new TypeError('path is required!')

  fs.mkdirSync(dirname(path), { recursive: true })
  fs.appendFileSync(path, data, options)
}

function copyFile (src: string, dest: string, flags?: number, callback?: NoParamCallback) {
  if (!src) throw new TypeError('src is required!')
  if (!dest) throw new TypeError('dest is required!')
  if (typeof flags === 'function') {
    callback = flags
    flags = undefined
  }

  return checkParent(dest).then(() => fsPromises.copyFile(src, dest, flags)).asCallback(callback)
}

const trueFn = () => true

function ignoreHiddenFiles (ignore?: boolean) {
  if (!ignore) return trueFn

  return ({ name }) => !name.startsWith('.')
}

function ignoreFilesRegex (regex?: RegExp) {
  if (!regex) return trueFn

  return ({ name }) => !regex.test(name)
}

function ignoreExcludeFiles (arr: any[], parent: string) {
  if (!arr || !arr.length) return trueFn

  const set = new Set(arr)

  return ({ name }) => !set.has(join(parent, name))
}

type ReadDirOptions = {
  encoding?: BufferEncoding | null
  withFileTypes?: false
  ignoreHidden?: boolean
  ignorePattern?: RegExp
}

async function _readAndFilterDir (path: string, options: ReadDirOptions = {}): Promise<Dirent[]> {
  const { ignoreHidden = true, ignorePattern } = options
  return (await fsPromises.readdir(path, { ...options, withFileTypes: true }))
    .filter(ignoreHiddenFiles(ignoreHidden))
    .filter(ignoreFilesRegex(ignorePattern))
}

function _readAndFilterDirSync (path: string, options?: ReadDirOptions) {
  const { ignoreHidden = true, ignorePattern } = options
  return fs.readdirSync(path, { ...options, withFileTypes: true })
    .filter(ignoreHiddenFiles(ignoreHidden))
    .filter(ignoreFilesRegex(ignorePattern))
}

async function _copyDirWalker (src: string, dest: string, results: any[], parent: string, options: ReadDirOptions) {
  return BlueBirdPromise.map(_readAndFilterDir(src, options), item => {
    const childSrc = join(src, item.name)
    const childDest = join(dest, item.name)
    const currentPath = join(parent, item.name)

    if (item.isDirectory()) {
      return _copyDirWalker(childSrc, childDest, results, currentPath, options)
    }
    results.push(currentPath)
    return copyFile(childSrc, childDest)
  })
}

function copyDir (src: string, dest: string, options: ReadDirOptions = {}, callback: (res: any) => void) {
  if (!src) throw new TypeError('src is required!')
  if (!dest) throw new TypeError('dest is required!')

  if (!callback && typeof options === 'function') {
    callback = options
    options = {}
  }
  const results = []

  return checkParent(dest).then(() => _copyDirWalker(src, dest, results, '', options)).return(results).asCallback(callback)
}

async function _listDirWalker (path: string, results: any[], parent?: string, options?: ReadDirOptions) {
  const promises = []

  for (const item of await _readAndFilterDir(path, options)) {
    const currentPath = join(parent, item.name)

    if (item.isDirectory()) {
      promises.push(_listDirWalker(join(path, item.name), results, currentPath, options))
    } else {
      results.push(currentPath)
    }
  }

  await Promise.all(promises)
}

function listDir (path: string, options: ReadDirOptions = {}, callback: (res: any) => void) {
  if (!path) throw new TypeError('path is required!')

  if (!callback && typeof options === 'function') {
    callback = options
    options = {}
  }
  const results = []

  return BlueBirdPromise.resolve(_listDirWalker(path, results, '', options)).return(results).asCallback(callback)
}

function _listDirSyncWalker (path: string, results: any[], parent: string, options: ReadDirOptions) {
  for (const item of _readAndFilterDirSync(path, options)) {
    const currentPath = join(parent, item.name)

    if (item.isDirectory()) {
      _listDirSyncWalker(join(path, item.name), results, currentPath, options)
    } else {
      results.push(currentPath)
    }
  }
}

function listDirSync (path: string, options: ReadDirOptions = {}) {
  if (!path) throw new TypeError('path is required!')
  const results = []

  _listDirSyncWalker(path, results, '', options)

  return results
}

function escapeEOL (str: string) {
  return str.replace(rEOL, '\n')
}

function escapeBOM (str: string) {
  return str.charCodeAt(0) === 0xFEFF ? str.substring(1) : str
}

function escapeFileContent (content) {
  return escapeBOM(escapeEOL(content))
}

type ReadFileOptions = { encoding?: string | null; flag?: string; escape?: string }

async function _readFile (path: string, options: ReadFileOptions | null = {}) {
  if (!Object.prototype.hasOwnProperty.call(options, 'encoding')) options.encoding = 'utf8'

  const content = await fsPromises.readFile(path, options)

  if (options.escape == null || options.escape) {
    return escapeFileContent(content)
  }

  return content
}

function readFile (path: string, options?: ReadFileOptions | null, callback?: (value: any) => void) {
  if (!path) throw new TypeError('path is required!')

  if (!callback && typeof options === 'function') {
    callback = options
    options = {}
  }

  return BlueBirdPromise.resolve(_readFile(path, options)).asCallback(callback)
}

function readFileSync (path: string, options: ReadFileOptions | null = {}) {
  if (!path) throw new TypeError('path is required!')

  if (!Object.prototype.hasOwnProperty.call(options, 'encoding')) options.encoding = 'utf8'

  const content = fs.readFileSync(path, options)

  if (options.escape == null || options.escape) {
    return escapeFileContent(content)
  }

  return content
}

async function _emptyDir (path: string, parent?: string, options?: ReadDirOptions & { exclude?: any[] }) {
  const entrys = (await _readAndFilterDir(path, options))
    .filter(ignoreExcludeFiles(options.exclude, parent))
  const results = []

  await BlueBirdPromise.map(entrys, (item: Dirent) => {
    const fullPath = join(path, item.name)
    const currentPath = join(parent, item.name)

    if (item.isDirectory()) {
      return _emptyDir(fullPath, currentPath, options).then(files => {
        if (!files.length) {
          return fsPromises.rmdir(fullPath)
        }
        results.push(...files)
      })
    }
    results.push(currentPath)
    return fsPromises.unlink(fullPath)
  })

  return results
}

function emptyDir (path: string, options: ReadDirOptions & { exclude?: any[] } = {}, callback?: (value: any) => void) {
  if (!path) throw new TypeError('path is required!')

  if (!callback && typeof options === 'function') {
    callback = options
    options = {}
  }

  return BlueBirdPromise.resolve(_emptyDir(path, '', options)).asCallback(callback)
}

function _emptyDirSync (path: string, options: ReadDirOptions & { exclude?: any[] }, parent?: string) {
  const entrys = _readAndFilterDirSync(path, options)
    .filter(ignoreExcludeFiles(options.exclude, parent))

  const results = []

  for (const item of entrys) {
    const childPath = join(path, item.name)
    const currentPath = join(parent, item.name)

    if (item.isDirectory()) {
      const removed = _emptyDirSync(childPath, options, currentPath)

      if (!fs.readdirSync(childPath).length) {
        rmdirSync(childPath)
      }

      results.push(...removed)
    } else {
      fs.unlinkSync(childPath)
      results.push(currentPath)
    }
  }

  return results
}

function emptyDirSync (path: string, options: ReadDirOptions & { exclude?: any[] } = {}) {
  if (!path) throw new TypeError('path is required!')

  return _emptyDirSync(path, options, '')
}

async function _rmdir (path: string) {
  const files = fsPromises.readdir(path, { withFileTypes: true })
  await BlueBirdPromise.map(files, (item: Dirent) => {
    const childPath = join(path, item.name)

    return item.isDirectory() ? _rmdir(childPath) : fsPromises.unlink(childPath)
  })
  return fsPromises.rmdir(path)
}

function rmdir (path: string, callback: (value: any) => void) {
  if (!path) throw new TypeError('path is required!')

  return BlueBirdPromise.resolve(_rmdir(path)).asCallback(callback)
}

function _rmdirSync (path: string) {
  const files = fs.readdirSync(path, { withFileTypes: true })

  for (let i = 0, len = files.length; i < len; i++) {
    const item = files[i]
    const childPath = join(path, item.name)

    if (item.isDirectory()) {
      _rmdirSync(childPath)
    } else {
      fs.unlinkSync(childPath)
    }
  }

  fs.rmdirSync(path)
}

function rmdirSync (path: string) {
  if (!path) throw new TypeError('path is required!')

  _rmdirSync(path)
}

function watch (path: string | ReadonlyArray<string>, options?: WatchOptions, callback?: (watcher: FSWatcher) => void) {
  if (!path) throw new TypeError('path is required!')

  if (!callback && typeof options === 'function') {
    callback = options
    options = {}
  }

  const watcher = chokidar.watch(path, options)

  return new BlueBirdPromise((resolve, reject) => {
    watcher.on('ready', resolve)
    watcher.on('error', reject)
  }).thenReturn(watcher).asCallback(callback)
}

function _findUnusedPath (path: string, files: string[]): string {
  const ext = extname(path)
  const base = basename(path, ext)
  const regex = new RegExp(`^${escapeRegExp(base)}(?:-(\\d+))?${escapeRegExp(ext)}$`)
  let num = -1

  for (let i = 0, len = files.length; i < len; i++) {
    const item = files[i]
    const match = item.match(regex)

    if (match == null) continue
    const matchNum = match[1] ? parseInt(match[1], 10) : 0

    if (matchNum > num) {
      num = matchNum
    }
  }

  return join(dirname(path), `${base}-${num + 1}${ext}`)
}

async function _ensurePath (path: string): Promise<string> {
  if (!await exists(path)) return path

  const files = await fsPromises.readdir(dirname(path))
  return _findUnusedPath(path, files)
}

function ensurePath (path: string, callback: (res: string) => void) {
  if (!path) throw new TypeError('path is required!')

  return BlueBirdPromise.resolve(_ensurePath(path)).asCallback(callback)
}

function ensurePathSync (path: string) {
  if (!path) throw new TypeError('path is required!')
  if (!fs.existsSync(path)) return path

  const files = fs.readdirSync(dirname(path))

  return _findUnusedPath(path, files)
}

function ensureWriteStream (path: string, options?: string | {
  flags?: string;
  encoding?: string;
  fd?: number;
  mode?: number;
  autoClose?: boolean;
  emitClose?: boolean;
  start?: number;
  highWaterMark?: number;
}, callback?: (stream: WriteStream) => void) {
  if (!path) throw new TypeError('path is required!')

  if (!callback && typeof options === 'function') {
    callback = options
    options = {}
  }

  return checkParent(path).then(() => fs.createWriteStream(path, options)).asCallback(callback)
}

function ensureWriteStreamSync (path: string, options?: string | {
  flags?: string;
  encoding?: string;
  fd?: number;
  mode?: number;
  autoClose?: boolean;
  emitClose?: boolean;
  start?: number;
  highWaterMark?: number;
}) {
  if (!path) throw new TypeError('path is required!')

  fs.mkdirSync(dirname(path), { recursive: true })
  return fs.createWriteStream(path, options)
}

// access
['F_OK', 'R_OK', 'W_OK', 'X_OK'].forEach(key => {
  Object.defineProperty(exports, key, {
    enumerable: true,
    value: fs.constants[key],
    writable: false
  })
})

exports.access = BlueBirdPromise.promisify(fs.access)
exports.accessSync = fs.accessSync

// appendFile
exports.appendFile = appendFile
exports.appendFileSync = appendFileSync

// chmod
exports.chmod = BlueBirdPromise.promisify(fs.chmod)
exports.chmodSync = fs.chmodSync
exports.fchmod = BlueBirdPromise.promisify(fs.fchmod)
exports.fchmodSync = fs.fchmodSync
exports.lchmod = BlueBirdPromise.promisify(fs.lchmod)
exports.lchmodSync = fs.lchmodSync

// chown
exports.chown = BlueBirdPromise.promisify(fs.chown)
exports.chownSync = fs.chownSync
exports.fchown = BlueBirdPromise.promisify(fs.fchown)
exports.fchownSync = fs.fchownSync
exports.lchown = BlueBirdPromise.promisify(fs.lchown)
exports.lchownSync = fs.lchownSync

// close
exports.close = BlueBirdPromise.promisify(fs.close)
exports.closeSync = fs.closeSync

// copy
exports.copyDir = copyDir
exports.copyFile = copyFile

// createStream
exports.createReadStream = fs.createReadStream
exports.createWriteStream = fs.createWriteStream

// emptyDir
exports.emptyDir = emptyDir
exports.emptyDirSync = emptyDirSync

// ensurePath
exports.ensurePath = ensurePath
exports.ensurePathSync = ensurePathSync

// ensureWriteStream
exports.ensureWriteStream = ensureWriteStream
exports.ensureWriteStreamSync = ensureWriteStreamSync

// exists
exports.exists = exists
exports.existsSync = existsSync

// fsync
exports.fsync = BlueBirdPromise.promisify(fs.fsync)
exports.fsyncSync = fs.fsyncSync

// link
exports.link = BlueBirdPromise.promisify(fs.link)
exports.linkSync = fs.linkSync

// listDir
exports.listDir = listDir
exports.listDirSync = listDirSync

// mkdir
exports.mkdir = BlueBirdPromise.promisify(fs.mkdir)
exports.mkdirSync = fs.mkdirSync

// mkdirs
exports.mkdirs = mkdirs
exports.mkdirsSync = mkdirsSync

// open
exports.open = BlueBirdPromise.promisify(fs.open)
exports.openSync = fs.openSync

// symlink
exports.symlink = BlueBirdPromise.promisify(fs.symlink)
exports.symlinkSync = fs.symlinkSync

// read
exports.read = BlueBirdPromise.promisify(fs.read)
exports.readSync = fs.readSync

// readdir
exports.readdir = BlueBirdPromise.promisify(fs.readdir)
exports.readdirSync = fs.readdirSync

// readFile
exports.readFile = readFile
exports.readFileSync = readFileSync

// readlink
exports.readlink = BlueBirdPromise.promisify(fs.readlink)
exports.readlinkSync = fs.readlinkSync

// realpath
exports.realpath = BlueBirdPromise.promisify(fs.realpath)
exports.realpathSync = fs.realpathSync

// rename
exports.rename = BlueBirdPromise.promisify(fs.rename)
exports.renameSync = fs.renameSync

// rmdir
exports.rmdir = rmdir
exports.rmdirSync = rmdirSync

// stat
exports.stat = BlueBirdPromise.promisify(fs.stat)
exports.statSync = fs.statSync
exports.fstat = BlueBirdPromise.promisify(fs.fstat)
exports.fstatSync = fs.fstatSync
exports.lstat = BlueBirdPromise.promisify(fs.lstat)
exports.lstatSync = fs.lstatSync

// truncate
exports.truncate = BlueBirdPromise.promisify(fs.truncate)
exports.truncateSync = fs.truncateSync
exports.ftruncate = BlueBirdPromise.promisify(fs.ftruncate)
exports.ftruncateSync = fs.ftruncateSync

// unlink
exports.unlink = BlueBirdPromise.promisify(fs.unlink)
exports.unlinkSync = fs.unlinkSync

// utimes
exports.utimes = BlueBirdPromise.promisify(fs.utimes)
exports.utimesSync = fs.utimesSync
exports.futimes = BlueBirdPromise.promisify(fs.futimes)
exports.futimesSync = fs.futimesSync

// watch
exports.watch = watch
exports.watchFile = fs.watchFile
exports.unwatchFile = fs.unwatchFile

// write
exports.write = BlueBirdPromise.promisify(fs.write)
exports.writeSync = fs.writeSync

// writeFile
exports.writeFile = writeFile
exports.writeFileSync = writeFileSync

// Static classes
exports.Stats = fs.Stats
exports.ReadStream = fs.ReadStream
exports.WriteStream = fs.WriteStream
exports.FileReadStream = fs.FileReadStream
exports.FileWriteStream = fs.FileWriteStream

// util
exports.escapeBOM = escapeBOM
exports.escapeEOL = escapeEOL
