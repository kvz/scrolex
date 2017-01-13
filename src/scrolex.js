require('babel-polyfill')
const logUpdate   = require('log-update')
const cliSpinner  = require('cli-spinners').dots10
const logSymbols  = require('log-symbols')
const cliTruncate = require('cli-truncate')
const chalk       = require('chalk')
const osTmpdir    = require('os-tmpdir')
const fs          = require('fs')
const spawn       = require('child_process').spawn
const _           = require('lodash')

class Scrolex {
  constructor () {
    this._fullcmd = null
    this._cmd     = null
    this._opts    = null
    this._cb      = null

    this._timer      = null
    this._lastPrefix = null
    this._lastLine   = ''
    this._membuffers = {}

    this._reject  = null
    this._resolve = null
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

  _defaults (opts, prioDefaults = {}) {
    opts = _.defaultsDeep(opts, prioDefaults, {
      'addCommandAsComponent': false,
      'announce'             : true,
      'cbPreLinefeed'        : (type, line, {flush = false, status = undefined}, callback) => { return callback(null, line) },
      'cleanupTmpFiles'      : true,
      'components'           : [],
      'cwd'                  : process.cwd(),
      'passthru'             : true,
      'singlescroll'         : true,
      'tmpFiles'             : {
        'stdout': `${osTmpdir()}/scrolex-%showCommand%-stdout-%pid%.log`,
        'stderr': `${osTmpdir()}/scrolex-%showCommand%-stderr-%pid%.log`,
      },
    })
  }
  _normalize (opts) {
    if (`${opts.components}` === opts.components) {
      opts.components = opts.components.split('/')
    }

    if (opts.addCommandAsComponent) {
      opts.components.push(opts.showCommand)
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

  async exe (origArgs, opts, cb) {
    let cmd         = ''
    let showCommand = ''
    let modArgs     = origArgs

    if (`${origArgs}` === origArgs) {
      cmd         = 'sh'
      showCommand = modArgs.split(/\s+/)[0]
      modArgs     = ['-c'].concat(modArgs)
    } else {
      cmd         = modArgs.pop()
      showCommand = cmd
    }

    this._fullcmd = (_.isArray(origArgs) ? origArgs.join(' ') : origArgs)
    this._cmd     = cmd
    this._opts    = this._normalize(this._defaults(opts, { showCommand }))
    this._cb      = cb

    this._startAnimation()
    if (this._opts.announce === true) {
      this._linefeed('stdout', `Executing: ${this._fullcmd}`)
    }
    const spawnOpts = this._spawnOpts(opts)
    const child     = spawn(cmd, modArgs, spawnOpts)
    const pid       = child.pid

    this._withTypes(this._opts.tmpFiles, (val, type) => {
      this._filebufWrite(type, '')
      return val.replace('%pid%', pid).replace('%showCommand%', showCommand)
    })

    this._withTypes(child, (val, type) => {
      val.on('data', this._collect.bind(this, type))
    })

    child.on('close', (status, signal) => {
      this._return({ status, signal })
    })

    if (this._cb) {
      return
    }

    return new Promise((resolve, reject) => {
      this._reject  = reject
      this._resolve = resolve
    })
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

  _filebufAppend (type, data) {
    if (this._opts.tmpFiles[type]) {
      fs.appendFileSync(this._opts.tmpFiles[type], data, 'utf-8')
    }
  }
  _filebufWrite (type, data) {
    if (this._opts.tmpFiles[type]) {
      fs.writeFileSync(this._opts.tmpFiles[type], data, 'utf-8')
    }
  }
  _filebufRead (type) {
    if (this._opts.tmpFiles[type]) {
      return fs.readFileSync(this._opts.tmpFiles[type], 'utf-8')
    }
  }
  _filebufUnlink (type, data) {
    if (this._opts.cleanupTmpFiles === true) {
      if (this._opts.tmpFiles[type]) {
        fs.unlinkSync(this._opts.tmpFiles[type])
      }
    }
  }

  _collect (type, data) {
    this._membufAppend(type, data)
    this._filebufAppend(type, data)
    this._outputMembuffer(type)
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

  _outputMembuffer (type, { flush = false, status = undefined } = {}) {
    let line = ''
    while ((line = this._membufShiftLine()) !== false) {
      this._linefeed(type, line)
    }

    if (flush) {
      this._linefeed(type, this._membufRead(), { flush, status })
      this._membufWrite(type, '')
    }
  }

  _prefix () {
    let buf = ''
    this._opts.components.forEach((component) => {
      buf += `${chalk.dim(component)} \u276f`
    })

    if (buf) {
      buf += ' '
    }

    return buf
  }

  _linefeed (type, line, { flush = false, status = undefined } = {}) {
    this._opts.cbPreLinefeed.bind(this)(type, line, { flush, status }, (err, modifiedLine) => { // eslint-disable-line handle-callback-err
      if (modifiedLine) {
        this._lastLine = modifiedLine
      }

      if (this._opts.passthru === true) {
        if (this._opts.singlescroll === true) {
          // Force the animation of a frame, which triggers a scrollWrite()
          // so that we'll see the output immediately regardless of the animation interval
          return this._drawFrame(undefined, { flush, status })
        } else if (modifiedLine) {
          // Just write to stdout (or stderr)
          return process[type].write(line)
        }
      }
    })
  }

  _drawFrame (frame, { flush = false, status = undefined } = {}) {
    if (!frame) {
      frame = cliSpinner.frames[0]
    }

    let prefix = this._prefix()
    let line   = prefix + frame + ' '

    line += cliTruncate(this._lastLine.trim(), process.stdout.columns - (line.length + (flush ? 2 : 0)))

    if (flush) {
      if (status === 0) {
        this.scrollerClear()
        line = prefix + chalk.reset('') + logSymbols.success
      } else {
        line += logSymbols.error
      }
    }

    this.scrollerWrite(line)
    if (flush && prefix !== this._lastPrefix && this._lastPrefix !== null) {
      this.scrollerPersist()
    }
    this._lastPrefix = prefix
  }

  _stopAnimation () {
    clearInterval(this._timer)
    this._timer = null
  }

  _return ({ status, error }) {
    this._types.forEach((type) => {
      this._results[type] = this._filebufRead(type)
      this._filebufUnlink(type)
    })

    let err = null
    if (status !== 0) {
      let msgs = [ `Fault while executing "${this._fullcmd}"` ]

      if (this._results.stderr) {
        msgs.push(this._results.stderr)
      }

      if (msgs.length === 1) {
        msgs.push(`Exit code: ${status}`)
        if (this._results.stdout) {
          msgs.push(`\n\n${this._results.stdout}\n\n`)
        }
      }

      err = new Error(msgs.join('. '))
    }

    let out = this._results.stdout.trim()

    const flush = true
    this._outputMembuffer('stdout', { flush, status })
    this._outputMembuffer('stderr', { flush, status })
    this._stopAnimation()

    if (this._cb) {
      return this._cb(err, out)
    }

    if (err) {
      return this._reject(err)
    }
    this._resolve(out)
  }
}

module.exports = (args, opts, cb) => {
  const exec = new Scrolex()
  return exec.exe(args, opts, cb)
}
