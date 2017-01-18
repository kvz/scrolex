const logUpdate   = require('log-update')
const cliSpinner  = require('cli-spinners').dots10
const logSymbols  = require('log-symbols')
const cliTruncate = require('cli-truncate')
const chalk       = require('chalk')
const path        = require('path')
const osTmpdir    = require('os-tmpdir')
const fs          = require('fs')
// const debug    = require('depurar')('scrolex')
const spawn       = require('child_process').spawn
const _           = require('lodash')
const uuidV4      = require('uuid/v4')

class Scrolex {
  constructor (origArgs, opts) {
    this._fullcmd = null
    this._cmd     = null
    this._opts    = null

    this._timer      = null
    this._lastPrefix = null
    this._lastLine   = null
    this._membuffers = {}

    this._reject  = null
    this._resolve = null

    this._modArgs = origArgs

    if (`${origArgs}` === origArgs) {
      this._cmd     = 'sh'
      this._showCmd = this._modArgs.split(/\s+/)[0]
      this._modArgs = ['-c'].concat(this._modArgs)
    } else {
      this._cmd     = this._modArgs.pop()
      this._showCmd = this._cmd
    }

    this._showCmd   = path.basename(this._showCmd)
    this._fullcmd   = (_.isArray(origArgs) ? origArgs.join(' ') : origArgs)
    this._cmd       = this._cmd
    this._opts      = this._normalize(this._defaults(opts, { showCmd: this._showCmd }))
    this._spawnOpts = this._spawnOpts(this._opts)
  }

  _withTypes (obj, func) {
    const types = [ 'stdout', 'stderr' ]
    types.forEach((type) => {
      const ret = func(obj[type], type)
      if (ret !== undefined) {
        obj[type] = ret
      }
    })
  }

  _defaults (inOpts = {}, prioDefaults = {}) {
    const outOpts = _.defaultsDeep({}, inOpts, prioDefaults, {
      'addCommandAsComponent': false,
      'announce'             : false,
      'dryrun'               : false,
      'cbPreLinefeed'        : (type, line, { flush = false, status = undefined }, callback) => { return callback(null, line) },
      'cleanupTmpFiles'      : true,
      'components'           : [],
      'cwd'                  : process.cwd(),
      'passthru'             : true,
      'singlescroll'         : true,
      'tmpFiles'             : {
        'stdout': `${osTmpdir()}/scrolex-%showCmd%-stdout-%uuid%.log`,
        'stderr': `${osTmpdir()}/scrolex-%showCmd%-stderr-%uuid%.log`,
      },
    })

    return outOpts
  }

  _normalize (opts) {
    if (`${opts.components}` === opts.components) {
      opts.components = opts.components.replace(/>>+/g, '>').split(/\s*>\s*/)
    }

    if (opts.addCommandAsComponent) {
      opts.components.push(opts.showCmd)
    }

    if (opts.tmpFiles === false) {
      this._withTypes(opts.tmpFiles, (val, type) => { return false })
    }

    return opts
  }

  _spawnOpts (opts) {
    const spawnOpts = {}
    if (opts.env !== undefined) {
      spawnOpts.env = opts.env
    } else {
      spawnOpts.env = {
        DEBUG   : process.env.DEBUG,
        HOME    : process.env.HOME,
        NODE_ENV: process.env.NODE_ENV,
        PATH    : process.env.PATH,
        USER    : process.env.USER,
      }
    }
    if (opts.cwd !== undefined) spawnOpts.cwd = opts.cwd
    if (opts.stdio !== undefined) spawnOpts.stdio = opts.stdio

    return spawnOpts
  }

  exe (cb) {
    const promise = new Promise((resolve, reject) => {
      this._reject  = reject
      this._resolve = resolve
    })

    this._startAnimation()
    if (this._opts.announce === true) {
      this._outputLine('stdout', `Executing: ${this._fullcmd}`)
    }

    // Put the PID into the file locations as a late normalization step
    this._withTypes(this._opts.tmpFiles, (val, type) => {
      return val.replace('%uuid%', uuidV4()).replace('%showCmd%', this._showCmd)
    })

    // Reset/empty out files
    this._withTypes(this._opts.tmpFiles, (val, type) => {
      this._filebufWrite(type, '')
    })

    if (this._opts.dryrun === true) {
      this._return({ status: 0, signal: null, pid: null, cb: cb })
    } else {
      const child = spawn(this._cmd, this._modArgs, this._spawnOpts)
      const pid   = child.pid

      // Pipe data to collect functions
      this._withTypes(child, (stream, type) => {
        stream.on('data', this._collectStream.bind(this, type))
      })

      // Handle exit
      child.on('close', (status, signal) => {
        this._return({ status, signal, pid, cb })
      })
    }

    // Return promise if callback was not provided
    if (!cb) { return promise }
  }

  scrollerWrite (line) {
    logUpdate(line)
  }
  scrollerClear (line) {
    logUpdate.clear()
  }
  scrollerPersist (line) {
    logUpdate.done()
  }

  _membufShiftLine (type) {
    if (!this._membuffers) { this._membuffers = {} }
    if (!this._membuffers[type]) { this._membuffers[type] = '' }

    let pos = this._membuffers[type].indexOf('\n')
    if (pos === -1) {
      return false
    }

    let line = this._membuffers[type].substr(0, pos + 1)
    this._membuffers[type] = this._membuffers[type].substr(pos + 1, this._membuffers[type].length - 1)

    return line
  }
  _membufRead (type) {
    if (!this._membuffers) { this._membuffers = {} }
    if (!this._membuffers[type]) { this._membuffers[type] = '' }
    return this._membuffers[type]
  }
  _membufWrite (type, data) {
    if (!this._membuffers) { this._membuffers = {} }
    if (!this._membuffers[type]) { this._membuffers[type] = '' }
    this._membuffers[type] = ''
  }
  _membufAppend (type, data) {
    if (!this._membuffers) { this._membuffers = {} }
    if (!this._membuffers[type]) { this._membuffers[type] = '' }
    this._membuffers[type] += data
  }
  _membufOutputLines (type, { flush = false, status = undefined } = {}) {
    let line = ''
    while ((line = this._membufShiftLine()) !== false) {
      this._outputLine(type, line)
    }

    if (flush) {
      this._outputLine(type, this._membufRead(), { flush, status })
      this._membufWrite(type, '')
    }
  }

  _filebufReadAndUnlink (type) {
    if (this._opts.tmpFiles[type]) {
      const buf = fs.readFileSync(this._opts.tmpFiles[type], 'utf-8')
      if (this._opts.cleanupTmpFiles === true) {
        fs.unlinkSync(this._opts.tmpFiles[type])
      }
      return buf
    }
  }
  _filebufRead (type) {
    if (this._opts.tmpFiles[type]) {
      return fs.readFileSync(this._opts.tmpFiles[type], 'utf-8')
    }
  }
  _filebufWrite (type, data) {
    if (this._opts.tmpFiles[type]) {
      fs.writeFileSync(this._opts.tmpFiles[type], data, 'utf-8')
    }
  }
  _filebufAppend (type, data) {
    if (this._opts.tmpFiles[type]) {
      fs.appendFileSync(this._opts.tmpFiles[type], data, 'utf-8')
    }
  }

  _collectStream (type, data) {
    this._membufAppend(type, data)
    this._filebufAppend(type, data)
    this._membufOutputLines(type)
  }

  _startAnimation () {
    let i      = 0
    let frames = cliSpinner.frames
    let that   = this
    this._timer = setInterval(() => {
      let frame = frames[i++ % frames.length]
      this._drawFrame.bind(that)(frame)
    }, cliSpinner.interval)
  }

  _prefix () {
    let buf = ''
    this._opts.components.forEach((component) => {
      buf += `${chalk.dim(component)} \u276f `
    })

    buf = buf.trim()

    return buf
  }

  _outputLine (type, line, { flush = false, status = undefined } = {}) {
    this._opts.cbPreLinefeed(type, line, { flush, status }, (err, modifiedLine) => { // eslint-disable-line handle-callback-err
      if (this._opts.passthru === true) {
        if (this._opts.singlescroll === true) {
          // Force the animation of a frame, which triggers a scrollWrite()
          // so that we'll see the output immediately regardless of the animation interval
          if (modifiedLine) {
            this._lastLine = modifiedLine
          }
          return this._drawFrame(undefined, { flush, status })
        } else {
          // Just write to stdout (or stderr)
          return process[type].write(modifiedLine)
        }
      }
    })
  }

  _drawFrame (frame, { flush = false, status = undefined } = {}) {
    const needsToPersist = flush || (prefix !== this._lastPrefix && this._lastPrefix)
    if (!frame) {
      frame = cliSpinner.frames[0]
    }

    if (this._lastLine === null) {
      return
    }

    if (flush) {
      if (status === 0) {
        frame = logSymbols.success
      } else {
        frame = logSymbols.error
      }
    }

    let prefix = this._prefix()
    let line   = ` ${frame} ${prefix} `
    line      += cliTruncate(this._lastLine.trim(), process.stdout.columns)

    this.scrollerWrite(line)
    if (needsToPersist) {
      this.scrollerPersist()
      this._lastLine = null
    }
    this._lastPrefix = prefix
  }

  _stopAnimation () {
    clearInterval(this._timer)
    this._timer = null
  }

  _return ({ status, signal, pid, cb }) {
    const results = { stdout: '', stderr: '' }
    this._withTypes(results, (val, type) => {
      return this._filebufReadAndUnlink(type)
    })

    let err = null
    if (status !== 0) {
      let msgs = [ `Fault while executing "${this._fullcmd}"` ]

      if (results.stderr) {
        msgs.push(results.stderr)
      }

      if (msgs.length === 1) {
        msgs.push(`Exit code: ${status}`)
        if (results.stdout) {
          msgs.push(`\n\n${results.stdout}\n\n`)
        }
      }

      err = new Error(msgs.join('. '))
    }

    let out = results.stdout.trim()

    const flush = true
    this._membufOutputLines('stdout', { flush, status })
    this._membufOutputLines('stderr', { flush, status })
    this._stopAnimation()

    if (cb) {
      return cb(err, out)
    }

    if (err) {
      return this._reject(err)
    }
    this._resolve(out)
  }
}

module.exports = Scrolex
