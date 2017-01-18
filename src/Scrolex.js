const logUpdate    = require('log-update')
const cliSpinner   = require('cli-spinners').dots10
const logSymbols   = require('log-symbols')
const cliTruncate  = require('cli-truncate')
const chalk        = require('chalk')
const path         = require('path')
const osTmpdir     = require('os-tmpdir')
const fs           = require('fs')
// const debug     = require('depurar')('scrolex')
const spawn        = require('child_process').spawn
const _            = require('lodash')
const uuidV4       = require('uuid/v4')
const indentString = require('indent-string')

class Scrolex {
  constructor (opts) {
    this._timer       = null
    this._lastPrefix  = null
    this._lastLine    = null
    this._lastShowCmd = null
    this._membuffers  = {}

    this._reject      = null
    this._resolve     = null

    this.applyOpts(opts)
  }

  applyOpts (opts) {
    this._opts = this._normalizeOpts(this._defaults(this._opts, opts))
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

  _defaults (opts = {}, prioOpts = {}) {
    const outOpts = _.defaultsDeep({}, prioOpts, opts, {
      'addCommandAsComponent': false,
      'announce'             : false,
      'dryrun'               : false,
      'cbPreLinefeed'        : (type, line, { flush = false, status = undefined }, callback) => { return callback(null, line) },
      'cleanupTmpFiles'      : true,
      'components'           : [],
      'cwd'                  : process.cwd(),
      'indent'               : 4,
      'passthru'             : true,
      'singlescroll'         : true,
      'tmpFiles'             : {
        'stdout': `${osTmpdir()}/scrolex-%showCmd%-stdout-%uuid%.log`,
        'stderr': `${osTmpdir()}/scrolex-%showCmd%-stderr-%uuid%.log`,
      },
    })

    return outOpts
  }

  _normalizeOpts (opts) {
    if (`${opts.components}` === opts.components) {
      opts.components = opts.components.replace(/>>+/g, '>').split(/\s*>\s*/)
    }

    if (!opts.indent) {
      opts.indent = 0
    }

    if (opts.tmpFiles === false) {
      this._withTypes(opts.tmpFiles, (val, type) => { return false })
    }

    return opts
  }

  _normalizeArgs (origArgs) {
    let modArgs = origArgs
    let cmd     = ''
    let showCmd = ''
    let fullCmd = ''

    if (`${origArgs}` === origArgs) {
      cmd     = 'sh'
      showCmd = modArgs.split(/\s+/)[0]
      modArgs = ['-c'].concat(modArgs)
    } else {
      cmd     = modArgs.pop()
      showCmd = cmd
    }

    showCmd = path.basename(showCmd)
    fullCmd = (_.isArray(origArgs) ? origArgs.join(' ') : origArgs)

    return { modArgs, cmd, fullCmd, showCmd }
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

  out (str) {
    this._outputLine('stdout', str)
  }

  exe (origArgs, cb) {
    const { modArgs, cmd, fullCmd, showCmd } = this._normalizeArgs(origArgs)
    const spawnOpts = this._spawnOpts(this._opts)

    this._lastShowCmd = showCmd

    const promise = new Promise((resolve, reject) => {
      this._reject  = reject
      this._resolve = resolve
    })

    if (this._opts.singlescroll === true) {
      this._startAnimation()
    }
    if (this._opts.announce === true) {
      this._outputLine('stdout', `Executing: ${fullCmd}`)
    }

    // Put the PID into the file locations as a late normalization step
    this._withTypes(this._opts.tmpFiles, (val, type) => {
      return val.replace('%uuid%', uuidV4()).replace('%showCmd%', showCmd)
    })

    // Reset/empty out files
    this._withTypes(this._opts.tmpFiles, (val, type) => {
      this._filebufWrite(type, '')
    })

    if (this._opts.dryrun === true) {
      this._return({ status: 0, signal: null, pid: null, cb: cb })
    } else {
      const child = spawn(cmd, modArgs, spawnOpts)
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
    while ((line = this._membufShiftLine(type)) !== false) {
      this._outputLine(type, line)
    }

    if (flush) {
      this._membufRead().split('\n').forEach((line) => {
        this._outputLine(type, line, { flush, status })
      })
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

    const components = this._opts.components

    if (this._opts.addCommandAsComponent) {
      components.push(this._lastShowCmd)
    }

    if (this._opts.singlescroll === false) {
      buf += `\u276f `
    }

    components.forEach((component) => {
      buf += `${chalk.dim(component)} \u276f `
    })

    buf = buf.trim()

    return buf
  }

  _outputLine (type, line, { flush = false, status = undefined } = {}) {
    // console.log(this.)
    if (this._opts.passthru !== true) {
      return
    }
    if (!line) {
      return
    }
    this._opts.cbPreLinefeed(type, line, { flush, status }, (err, modifiedLine) => { // eslint-disable-line handle-callback-err
      this._lastLine = modifiedLine
      // Force the animation of a frame or just write to stdout
      this._drawFrame(undefined, { flush, status })
    })
  }

  _drawFrame (frame, { type = 'stdout', flush = false, status = undefined } = {}) {
    const closeCategory = flush || (prefix !== this._lastPrefix && this._lastPrefix)
    const openCategory  = (prefix !== this._lastPrefix)

    if (this._lastLine === null) {
      return
    }

    if (!frame) {
      frame = cliSpinner.frames[0]
    }
    if (closeCategory) {
      frame = (status === 0 || status === undefined || status === null ? logSymbols.success : logSymbols.error)
    }

    let prefix = this._prefix()
    let buff   = ''

    if (this._opts.singlescroll === true) {
      let head = ` ${frame} ${prefix} `
      // buff += head + cliTruncate(this._lastLine.trim(), process.stdout.columns - head.length)
      buff += head + this._lastLine.trim()
      this.scrollerWrite(buff)
      if (closeCategory) {
        this.scrollerPersist()
        this._lastLine = null
      }
    } else {
      let tail = ''
      if (closeCategory) {
        tail = ` ${frame}`
      }
      // Just write to stdout (or stderr)
      buff += indentString(this._lastLine.trim(), this._opts.indent)
      if (openCategory) {
        process[type].write(`${prefix}\n\n`)
      }
      process[type].write(`${buff}${tail}\n`)
      if (closeCategory) {
        process[type].write('\n')
      }
    }

    this._lastPrefix = prefix
  }

  _stopAnimation () {
    clearInterval(this._timer)
    this._timer = null
  }

  _return ({ status, signal, pid, cb, fullCmd }) {
    const results = { stdout: '', stderr: '' }
    this._withTypes(results, (val, type) => {
      return this._filebufReadAndUnlink(type)
    })

    let err = null
    if (status !== 0) {
      let msgs = [ `Fault while executing "${fullCmd}"` ]

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
    if (this._opts.singlescroll === true) {
      this._stopAnimation()
    }

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
