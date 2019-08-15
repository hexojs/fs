'use strict';

require('chai').use(require('chai-as-promised')).should();

const { join, dirname } = require('path');
const Promise = require('bluebird');
const fs = require('../lib/fs');
const { tiferr } = require('iferr');

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
  };
  return Promise.map(Object.keys(filesMap), key => fs.writeFile(join(path, key), filesMap[key])).asCallback(callback);
}

describe('fs', () => {
  const tmpDir = join(__dirname, 'fs_tmp');

  before(() => fs.mkdirs(tmpDir));

  after(() => fs.rmdir(tmpDir));

  it('exists()', () => fs.exists(tmpDir).should.become(true));

  it('exists() - callback', callback => {
    fs.exists(tmpDir, exist => {
      try {
        exist.should.be.true;
      } catch (e) {
        callback(e);
        return;
      }
      callback();
    });
  });

  it('exists() - path is required', () => {
    fs.exists.should.to.throw('path is required!');
  });

  it('mkdirs()', () => {
    const target = join(tmpDir, 'a', 'b', 'c');

    return fs.mkdirs(target)
      .then(() => fs.exists(target))
      .should.become(true)
      .then(() => fs.rmdir(join(tmpDir, 'a')));
  });

  it('mkdirs() - callback', callback => {
    const target = join(tmpDir, 'a', 'b', 'c');

    fs.mkdirs(target, tiferr(callback, () => {
      fs.exists(target, exist => {
        exist.should.be.true;
        fs.rmdir(join(tmpDir, 'a'), callback);
      });
    }));
  });

  it('mkdirs() - path is required', () => {
    fs.mkdirs.should.to.throw('path is required!');
  });

  it('mkdirsSync()', () => {
    const target = join(tmpDir, 'a', 'b', 'c');

    fs.mkdirsSync(target);

    return fs.exists(target)
      .should.become(true)
      .then(() => fs.rmdir(join(tmpDir, 'a')));
  });

  it('mkdirsSync() - path is required', () => {
    fs.mkdirsSync.should.to.throw('path is required!');
  });

  it('writeFile()', () => {
    const target = join(tmpDir, 'a', 'b', 'test.txt');
    const body = 'foo';

    return fs.writeFile(target, body)
      .then(() => fs.readFile(target))
      .should.become(body)
      .then(() => fs.rmdir(join(tmpDir, 'a')));
  });

  it('writeFile() - callback', callback => {
    const target = join(tmpDir, 'a', 'b', 'test.txt');
    const body = 'foo';

    fs.writeFile(target, body, tiferr(callback, () => {
      fs.readFile(target, tiferr(callback, content => {
        content.should.eql(body);
        fs.rmdir(join(tmpDir, 'a'), callback);
      }));
    }));
  });

  it('writeFile() - path is required', () => {
    fs.writeFile.should.to.throw('path is required!');
  });

  it('writeFileSync()', () => {
    const target = join(tmpDir, 'a', 'b', 'test.txt');
    const body = 'foo';

    fs.writeFileSync(target, body);

    return fs.readFile(target)
      .should.become(body)
      .then(() => fs.rmdir(join(tmpDir, 'a')));
  });

  it('writeFileSync() - path is required', () => {
    fs.writeFileSync.should.to.throw('path is required!');
  });

  it('appendFile()', () => {
    const target = join(tmpDir, 'a', 'b', 'test.txt');
    const body = 'foo';
    const body2 = 'bar';

    return fs.writeFile(target, body)
      .then(() => fs.appendFile(target, body2))
      .then(() => fs.readFile(target))
      .should.become(body + body2)
      .then(() => fs.rmdir(join(tmpDir, 'a')));
  });

  it('appendFile() - callback', callback => {
    const target = join(tmpDir, 'a', 'b', 'test.txt');
    const body = 'foo';
    const body2 = 'bar';

    fs.writeFile(target, body, tiferr(callback, () => {
      fs.appendFile(target, body2, tiferr(callback, () => {
        fs.readFile(target, tiferr(callback, content => {
          content.should.eql(body + body2);
          fs.rmdir(join(tmpDir, 'a'), callback);
        }));
      }));
    }));
  });

  it('appendFile() - path is required', () => {
    fs.appendFile.should.to.throw('path is required!');
  });

  it('appendFileSync()', () => {
    const target = join(tmpDir, 'a', 'b', 'test.txt');
    const body = 'foo';
    const body2 = 'bar';

    return fs.writeFile(target, body).then(() => {
      fs.appendFileSync(target, body2);
      return fs.readFile(target);
    }).should.become(body + body2).then(() => {
      return fs.rmdir(join(tmpDir, 'a'));
    });
  });

  it('appendFileSync() - path is required', () => {
    fs.appendFileSync.should.to.throw('path is required!');
  });

  it('copyFile()', () => {
    const src = join(tmpDir, 'test.txt');
    const dest = join(tmpDir, 'a', 'b', 'test.txt');
    const body = 'foo';

    return fs.writeFile(src, body)
      .then(() => fs.copyFile(src, dest))
      .then(() => fs.readFile(dest))
      .should.become(body)
      .then(() => Promise.all([
        fs.unlink(src),
        fs.rmdir(join(tmpDir, 'a'))
      ]));
  });

  it('copyFile() - callback', callback => {
    const src = join(tmpDir, 'test.txt');
    const dest = join(tmpDir, 'a', 'b', 'test.txt');
    const body = 'foo';

    fs.writeFile(src, body, tiferr(callback, () => {
      fs.copyFile(src, dest, tiferr(callback, () => {
        fs.readFile(dest, tiferr(callback, content => {
          content.should.eql(body);

          Promise.all([
            fs.unlink(src),
            fs.rmdir(join(tmpDir, 'a'))
          ]).asCallback(callback);
        }));
      }));
    }));
  });

  it('copyFile() - src is required', () => {
    fs.copyFile.should.to.throw('src is required!');
  });

  it('copyFile() - dest is required', () => {
    (() => fs.copyFile('123')).should.to.throw('dest is required!');
  });

  it('copyDir()', () => {
    const src = join(tmpDir, 'a');
    const dest = join(tmpDir, 'b');

    const filenames = [
      'e.txt',
      'f.js',
      join('folder', 'h.txt'),
      join('folder', 'i.js')
    ];

    return createDummyFolder(src)
      .then(() => fs.copyDir(src, dest))
      .then(files => files.should.have.members(filenames))
      .thenReturn(filenames)
      .map(path => fs.readFile(join(dest, path)))
      .then(result => {
        result.should.eql(['e', 'f', 'h', 'i']);
        return Promise.all([fs.rmdir(src), fs.rmdir(dest)]);
      });
  });

  it('copyDir() - callback', callback => {
    const src = join(tmpDir, 'a');
    const dest = join(tmpDir, 'b');

    const finenames = [
      'e.txt',
      'f.js',
      join('folder', 'h.txt'),
      join('folder', 'i.js')
    ];

    createDummyFolder(src, tiferr(callback, () => {
      fs.copyDir(src, dest, tiferr(callback, files => {
        files.should.have.members(finenames);
        fs.rmdir(src, tiferr(callback, () => {
          Promise.map(finenames, path => fs.readFile(join(dest, path))).asCallback(tiferr(callback, result => {
            result.should.eql(['e', 'f', 'h', 'i']);
            fs.rmdir(dest, callback);
          }));
        }));
      }));
    }));
  });

  it('copyDir() - src is required', () => {
    fs.copyDir.should.to.throw('src is required!');
  });

  it('copyDir() - dest is required', () => {
    (() => fs.copyDir('123')).should.to.throw('dest is required!');
  });

  it('copyDir() - ignoreHidden off', () => {
    const src = join(tmpDir, 'a');
    const dest = join(tmpDir, 'b');

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
    ];

    return createDummyFolder(src)
      .then(() => fs.copyDir(src, dest, {ignoreHidden: false}))
      .then(files => files.should.have.members(filenames))
      .return(filenames)
      .map(path => fs.readFile(join(dest, path)))
      .should.become(['a', 'b', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])
      .then(() => Promise.all([fs.rmdir(src), fs.rmdir(dest)]));
  });

  it('copyDir() - ignorePattern', () => {
    const src = join(tmpDir, 'a');
    const dest = join(tmpDir, 'b');

    const filenames = ['e.txt', join('folder', 'h.txt')];

    return createDummyFolder(src)
      .then(() => fs.copyDir(src, dest, {ignorePattern: /\.js/}))
      .then(files => files.should.have.members(filenames))
      .return(filenames)
      .map(path => fs.readFile(join(dest, path)))
      .should.become(['e', 'h'])
      .then(() => Promise.all([fs.rmdir(src), fs.rmdir(dest)]));
  });

  it('listDir()', () => {
    const target = join(tmpDir, 'test');

    return createDummyFolder(target)
      .then(() => fs.listDir(target))
      .should.eventually.have.members([
        'e.txt',
        'f.js',
        join('folder', 'h.txt'),
        join('folder', 'i.js')
      ])
      .then(() => fs.rmdir(target));
  });

  it('listDir() - callback', callback => {
    const target = join(tmpDir, 'test');

    const filenames = [
      'e.txt',
      'f.js',
      join('folder', 'h.txt'),
      join('folder', 'i.js')
    ];

    createDummyFolder(target, tiferr(callback, () => {
      fs.listDir(target, tiferr(callback, paths => {
        paths.should.have.members(filenames);
        fs.rmdir(target, callback);
      }));
    }));
  });

  it('listDir() - path is required', () => {
    fs.listDir.should.to.throw('path is required!');
  });

  it('listDir() - ignoreHidden off', () => {
    const target = join(tmpDir, 'test');

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
    ];

    return createDummyFolder(target)
      .then(() => fs.listDir(target, {ignoreHidden: false}))
      .should.eventually.have.members(filenames)
      .then(() => fs.rmdir(target));
  });

  it('listDir() - ignorePattern', () => {
    const target = join(tmpDir, 'test');

    return createDummyFolder(target)
      .then(() => fs.listDir(target, {ignorePattern: /\.js/}))
      .should.eventually.have.members(['e.txt', join('folder', 'h.txt')])
      .then(() => fs.rmdir(target));
  });

  it('listDirSync()', () => {
    const target = join(tmpDir, 'test');

    const filenames = [
      'e.txt',
      'f.js',
      join('folder', 'h.txt'),
      join('folder', 'i.js')
    ];

    return createDummyFolder(target).then(() => {
      const files = fs.listDirSync(target);
      files.should.have.members(filenames);
      return fs.rmdir(target);
    });
  });

  it('listDirSync() - path is required', () => {
    fs.listDirSync.should.to.throw('path is required!');
  });

  it('listDirSync() - ignoreHidden off', () => {
    const target = join(tmpDir, 'test');

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
    ];

    return createDummyFolder(target).then(() => {
      const files = fs.listDirSync(target, {ignoreHidden: false});
      files.should.have.members(filenames);
      return fs.rmdir(target);
    });
  });

  it('listDirSync() - ignorePattern', () => {
    const target = join(tmpDir, 'test');

    return createDummyFolder(target).then(() => {
      const files = fs.listDirSync(target, {ignorePattern: /\.js/});
      files.should.have.members(['e.txt', join('folder', 'h.txt')]);
      return fs.rmdir(target);
    });
  });

  it('readFile()', () => {
    const target = join(tmpDir, 'test.txt');
    const body = 'test';

    return fs.writeFile(target, body)
      .then(() => fs.readFile(target))
      .should.become(body)
      .then(() => fs.unlink(target));
  });

  it('readFile() - callback', callback => {
    const target = join(tmpDir, 'test.txt');
    const body = 'test';

    fs.writeFile(target, body, tiferr(callback, () => {
      fs.readFile(target, tiferr(callback, content => {
        content.should.eql(body);
        fs.unlink(target, callback);
      }));
    }));
  });

  it('readFile() - path is required', () => {
    fs.readFile.should.to.throw('path is required!');
  });

  it('readFile() - escape BOM', () => {
    const target = join(tmpDir, 'test.txt');
    const body = '\ufefffoo';

    return fs.writeFile(target, body)
      .then(() => fs.readFile(target))
      .should.become('foo')
      .then(() => fs.unlink(target));
  });

  it('readFile() - escape Windows line ending', () => {
    const target = join(tmpDir, 'test.txt');
    const body = 'foo\r\nbar';

    return fs.writeFile(target, body)
      .then(() => fs.readFile(target))
      .should.become('foo\nbar')
      .then(() => fs.unlink(target));
  });

  it('readFileSync()', () => {
    const target = join(tmpDir, 'test.txt');
    const body = 'test';

    return fs.writeFile(target, body).then(() => {
      fs.readFileSync(target).should.eql(body);
      return fs.unlink(target);
    });
  });

  it('readFileSync() - path is required', () => {
    fs.readFileSync.should.to.throw('path is required!');
  });

  it('readFileSync() - escape BOM', () => {
    const target = join(tmpDir, 'test.txt');
    const body = '\ufefffoo';

    return fs.writeFile(target, body).then(() => {
      fs.readFileSync(target).should.eql('foo');
      return fs.unlink(target);
    });
  });

  it('readFileSync() - escape Windows line ending', () => {
    const target = join(tmpDir, 'test.txt');
    const body = 'foo\r\nbar';

    return fs.writeFile(target, body).then(() => {
      fs.readFileSync(target).should.eql('foo\nbar');
      return fs.unlink(target);
    });
  });

  it('unlink()', () => {
    const target = join(tmpDir, 'test-unlink');

    return fs.writeFile(target, '')
      .then(() => fs.exists(target))
      .should.become(true)
      .then(() => fs.unlink(target))
      .then(() => fs.exists(target))
      .should.become(false);
  });

  it('emptyDir()', () => {
    const target = join(tmpDir, 'test');

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
    };

    return createDummyFolder(target)
      .then(() => fs.emptyDir(target))
      .then(files => {
        files.should.have.members([
          'e.txt',
          'f.js',
          join('folder', 'h.txt'),
          join('folder', 'i.js')
        ]);

        return Object.keys(checkExistsMap);
      })
      .map(path => fs.exists(join(target, path)).should.become(checkExistsMap[path]))
      .then(() => fs.rmdir(target));
  });

  it('emptyDir() - callback', callback => {
    const target = join(tmpDir, 'test');

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
    };

    createDummyFolder(target, tiferr(callback, () => {
      fs.emptyDir(target, tiferr(callback, files => {
        files.should.have.members([
          'e.txt',
          'f.js',
          join('folder', 'h.txt'),
          join('folder', 'i.js')
        ]);

        return Promise.map(Object.keys(checkExistsMap), path => {
          return fs.exists(join(target, path)).should.become(checkExistsMap[path]);
        }).asCallback(tiferr(callback, () => {
          fs.rmdir(target, callback);
        }));
      }));
    }));
  });

  it('emptyDir() - path is required', () => {
    fs.emptyDir.should.to.throw('path is required!');
  });

  it('emptyDir() - ignoreHidden off', () => {
    const target = join(tmpDir, 'test');

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
    ];

    return createDummyFolder(target)
      .then(() => fs.emptyDir(target, {ignoreHidden: false}))
      .then(files => files.should.have.members(filenames))
      .return(filenames)
      .map(path => fs.exists(join(target, path)).should.become(false))
      .then(() => fs.rmdir(target));
  });

  it('emptyDir() - ignorePattern', () => {
    const target = join(tmpDir, 'test');

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
    };

    return createDummyFolder(target)
      .then(() => fs.emptyDir(target, {ignorePattern: /\.js/}))
      .then(files => files.should.have.members(['e.txt', join('folder', 'h.txt')]))
      .return(Object.keys(checkExistsMap))
      .map(path => fs.exists(join(target, path)).should.become(checkExistsMap[path]))
      .then(() => fs.rmdir(target));
  });

  it('emptyDir() - exclude', () => {
    const target = join(tmpDir, 'test');

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
    };

    return createDummyFolder(target)
      .then(() => fs.emptyDir(target, {exclude: ['e.txt', join('folder', 'i.js')]}))
      .then(files => files.should.have.members(['f.js', join('folder', 'h.txt')]))
      .return(Object.keys(checkExistsMap))
      .map(path => fs.exists(join(target, path)).should.become(checkExistsMap[path]))
      .then(() => fs.rmdir(target));
  });

  it('emptyDirSync()', () => {
    const target = join(tmpDir, 'test');

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
    };

    return createDummyFolder(target)
      .then(() => {
        const files = fs.emptyDirSync(target);
        files.should.have.members([
          'e.txt',
          'f.js',
          join('folder', 'h.txt'),
          join('folder', 'i.js')
        ]);

        return Object.keys(checkExistsMap);
      })
      .map(path => fs.exists(join(target, path)).should.become(checkExistsMap[path]))
      .then(() => fs.rmdir(target));
  });

  it('emptyDirSync() - path is required', () => {
    fs.emptyDirSync.should.to.throw('path is required!');
  });

  it('emptyDirSync() - ignoreHidden off', () => {
    const target = join(tmpDir, 'test');

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
    ];

    return createDummyFolder(target)
      .then(() => {
        const files = fs.emptyDirSync(target, {ignoreHidden: false});
        files.should.have.members(filenames);
        return filenames;
      })
      .map(path => fs.exists(join(target, path)).should.become(false))
      .then(() => fs.rmdir(target));
  });

  it('emptyDirSync() - ignorePattern', () => {
    const target = join(tmpDir, 'test');

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
    };

    return createDummyFolder(target)
      .then(() => {
        const files = fs.emptyDirSync(target, {ignorePattern: /\.js/});
        files.should.have.members(['e.txt', join('folder', 'h.txt')]);

        return Object.keys(checkExistsMap);
      })
      .map(path => fs.exists(join(target, path)).should.become(checkExistsMap[path]))
      .then(() => fs.rmdir(target));
  });

  it('emptyDirSync() - exclude', () => {
    const target = join(tmpDir, 'test');

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
    };

    return createDummyFolder(target)
      .then(() => {
        const files = fs.emptyDirSync(target, {exclude: ['e.txt', join('folder', 'i.js')]});
        files.should.have.members(['f.js', join('folder', 'h.txt')]);

        return Object.keys(checkExistsMap);
      })
      .map(path => fs.exists(join(target, path)).should.become(checkExistsMap[path]))
      .then(() => fs.rmdir(target));
  });

  it('rmdir()', () => {
    const target = join(tmpDir, 'test');

    return createDummyFolder(target)
      .then(() => fs.rmdir(target))
      .then(() => fs.exists(target))
      .should.become(false);
  });

  it('rmdir() - callback', callback => {
    const target = join(tmpDir, 'test');

    createDummyFolder(target, tiferr(callback, () => {
      fs.rmdir(target, tiferr(callback, () => {
        fs.exists(target, exist => {
          try {
            exist.should.be.false;
          } catch (e) {
            callback(e);
            return;
          }
          callback();
        });
      }));
    }));
  });

  it('rmdir() - path is required', () => {
    fs.rmdir.should.to.throw('path is required!');
  });

  it('rmdirSync()', () => {
    const target = join(tmpDir, 'test');

    return createDummyFolder(target).then(() => {
      fs.rmdirSync(target);
      return fs.exists(target);
    }).should.become(false);
  });

  it('rmdirSync() - path is required', () => {
    fs.rmdirSync.should.to.throw('path is required!');
  });

  it('watch()', () => {
    let watcher;
    const target = join(tmpDir, 'test.txt');

    const testerWrap = _watcher => new Promise((resolve, reject) => {
      _watcher.on('add', resolve).on('error', reject);
    });

    return fs.watch(tmpDir).then(watcher_ => {
      watcher = watcher_;

      return Promise.all([
        testerWrap(watcher).should.become(target),
        fs.writeFile(target, 'test')
      ]);
    }).finally(() => {
      if (watcher) {
        watcher.close();
      }
      return fs.unlink(target);
    });
  });

  it('watch() - path is required', () => {
    fs.watch.should.to.throw('path is required!');
  });

  it('ensurePath() - file exists', () => {
    const target = join(tmpDir, 'test');
    const filenames = ['foo.txt', 'foo-1.txt', 'foo-2.md', 'bar.txt'];

    return Promise.map(filenames, path => fs.writeFile(join(target, path)))
      .then(() => fs.ensurePath(join(target, 'foo.txt')))
      .should.become(join(target, 'foo-2.txt'))
      .then(() => fs.rmdir(target));
  });

  it('ensurePath() - file not exist', () => {
    const target = join(tmpDir, 'foo.txt');
    return fs.ensurePath(target).should.become(target);
  });

  it('ensurePath() - callback', callback => {
    const target = join(tmpDir, 'test');
    const filenames = ['foo.txt', 'foo-1.txt', 'foo-2.md', 'bar.txt'];

    Promise.map(filenames, path => fs.writeFile(join(target, path))).asCallback(tiferr(callback, () => {
      fs.ensurePath(join(target, 'foo.txt'), tiferr(callback, path => {
        path.should.eql(join(target, 'foo-2.txt'));
        fs.rmdir(target, callback);
      }));
    }));
  });

  it('ensurePath() - path is required', () => {
    fs.ensurePath.should.to.throw('path is required!');
  });

  it('ensurePathSync() - file exists', () => {
    const target = join(tmpDir, 'test');
    const filenames = ['foo.txt', 'foo-1.txt', 'foo-2.md', 'bar.txt'];

    return Promise.map(filenames, path => fs.writeFile(join(target, path))).then(() => {
      const path = fs.ensurePathSync(join(target, 'foo.txt'));
      path.should.eql(join(target, 'foo-2.txt'));

      return fs.rmdir(target);
    });
  });

  it('ensurePathSync() - file not exist', () => {
    const target = join(tmpDir, 'foo.txt');
    const path = fs.ensurePathSync(target);

    path.should.eql(target);
  });

  it('ensurePathSync() - path is required', () => {
    fs.ensurePathSync.should.to.throw('path is required!');
  });

  it('ensureWriteStream()', () => {
    const target = join(tmpDir, 'foo', 'bar.txt');

    return fs.ensureWriteStream(target).then(stream => {
      stream.path.should.eql(target);

      const streamPromise = new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('close', resolve);
      });

      stream.end();
      return streamPromise;
    }).then(() => fs.unlink(target));
  });

  it('ensureWriteStream() - callback', callback => {
    const target = join(tmpDir, 'foo', 'bar.txt');

    fs.ensureWriteStream(target, tiferr(callback, stream => {
      stream.path.should.eql(target);

      stream.on('error', callback);
      stream.on('close', () => {
        fs.unlink(target, callback);
      });

      stream.end();
    }));
  });

  it('ensureWriteStreamSync()', callback => {
    const target = join(tmpDir, 'foo', 'bar.txt');
    const stream = fs.ensureWriteStreamSync(target);

    stream.path.should.eql(target);

    stream.on('error', callback);
    stream.on('close', () => {
      fs.rmdir(dirname(target), callback);
    });

    stream.end();
  });
});
