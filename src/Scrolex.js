const logUpdate      = require('log-update')
const cliSpinner     = require('cli-spinners').dots10
const logSymbols     = require('log-symbols')
// const cliTruncate = require('cli-truncate')
const chalk          = require('chalk')
const path           = require('path')
const osTmpdir       = require('os-tmpdir')
const fs             = require('fs')
// const debug          = require('depurar')('scrolex')
const spawn          = require('child_process').spawn
const _              = require('lodash')
const uuidV4         = require('uuid/v4')
const indentString   = require('./indentString')
const stripAnsi      = require('strip-ansi')

class Scrolex {
  constructor (opts) {
    this._applyOpts(opts)
  }

  _applyOpts (opts) {
    // Clone original opts object via defaults {}
    this._opts = this._normalizeOpts(this._defaults(this._opts, opts))

    if ('state' in this._opts) {
      this._state = this._opts.state
    } else {
      global.scrolex = global.scrolex || {}
      this._state    = global.scrolex
    }

    this._reject  = null
    this._resolve = null

    // Modify original state object via direct defaults
    this._state = _.defaults(this._state, {
      components       : [],
      frameCounter     : 0,
      lastLine         : null,
      lastLineIdx      : 0,
      lastStickyLineIdx: null,
      lastPrefix       : null,
      lastShowCmd      : null,
      lastLineFrame    : '',
      membuffers       : {},
      timer            : null,
      mode             : process.env.SCROLEX_MODE || 'singlescroll',
    })

    // Allow to set new components, even though global state has some already
    if ('components' in this._opts) {
      this._state.components = this._opts.components
    }
    // Allow to set new mode, even though global state has one already
    if ('mode' in this._opts) {
      this._state.mode = this._opts.mode
    }
  }

  _withTypes (obj, func, types = [ 'stdout', 'stderr' ]) {
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
      'shell'                : false,
      'dryrun'               : false,
      'fatal'                : false,
      'cbPreLinefeed'        : (type, line, { flush = false, code = undefined }, callback) => { return callback(null, line) },
      'cleanupTmpFiles'      : true,
      'cwd'                  : process.cwd(),
      'indent'               : 4,
      'interval'             : process.env.SCROLEX_INTERVAL || cliSpinner.interval,
      'tmpFiles'             : {
        'stdout'  : `${osTmpdir()}/scrolex-%showCmd%-stdout-%uuid%.log`,
        'stderr'  : `${osTmpdir()}/scrolex-%showCmd%-stderr-%uuid%.log`,
        'combined': `${osTmpdir()}/scrolex-%showCmd%-combined-%uuid%.log`,
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
      this._withTypes(opts.tmpFiles, (val, type) => { return false }, [ 'stdout', 'stderr', 'combined' ])
    }

    let allowed = [ 'singlescroll', 'passthru', 'silent', undefined ]
    if (allowed.indexOf(opts.mode) === -1) {
      throw new Error(`Unrecognized options.mode: "${opts.mode}". Pick one of: "${allowed.join('", "')}". `)
    }

    return opts
  }

  _normalizeArgs (origArgs) {
    let modArgs = origArgs
    let cmd     = ''
    let showCmd = ''
    let fullCmd = ''

    if (`${origArgs}` === origArgs) {
      if (this._opts.shell === true) {
        showCmd = modArgs.split(/\s+/)[0]
        cmd     = modArgs
        modArgs = []
      } else {
        cmd     = 'sh'
        showCmd = modArgs.split(/\s+/)[0]
        modArgs = ['-c'].concat(modArgs)
      }
    } else {
      cmd     = modArgs.shift()
      showCmd = cmd
    }

    showCmd = path.basename(showCmd)
    fullCmd = (_.isArray(origArgs) ? origArgs.join(' ') : origArgs)

    // console.log({ modArgs, cmd, fullCmd, showCmd })
    return { modArgs, cmd, fullCmd, showCmd }
  }

  _spawnOpts ({env, shell, cwd, stdio}) {
    const spawnOpts = {}
    if (env !== undefined) {
      spawnOpts.env = env
    } else {
      spawnOpts.env = process.env
    }
    if (shell !== undefined) spawnOpts.shell = shell
    if (cwd !== undefined) spawnOpts.cwd = cwd
    if (stdio !== undefined) spawnOpts.stdio = stdio

    return spawnOpts
  }

  scroll (str) {
    this._outputLine('stdout', str, { flush: false })
  }

  stick (str) {
    this._outputLine('stdout', str, { flush: true })
  }

  exe (origArgs, cb) {
    const { modArgs, cmd, fullCmd, showCmd } = this._normalizeArgs(origArgs)
    this._state.lastShowCmd = showCmd
    this._state.lastFullCmd = fullCmd

    const spawnOpts = this._spawnOpts(this._opts)
    let hasReturned = false

    // console.log({opts: this._opts, modArgs, cmd, fullCmd})

    const promise = new Promise((resolve, reject) => {
      this._reject  = reject
      this._resolve = resolve
    })

    if (this._state.mode === 'singlescroll') {
      this._startAnimation()
    }
    if (this._opts.announce === true) {
      this._outputLine('stdout', `Executing: ${fullCmd}`)
    }

    // Put the PID into the file locations as a late normalization step
    this._withTypes(this._opts.tmpFiles, (val, type) => {
      return val.replace('%uuid%', uuidV4()).replace('%showCmd%', showCmd)
    }, [ 'stdout', 'stderr', 'combined' ])

    // Reset/empty out files
    this._withTypes(this._opts.tmpFiles, (val, type) => {
      this._filebufWrite(type, '')
    }, [ 'stdout', 'stderr', 'combined' ])

    if (this._opts.dryrun === true) {
      this._return({ spawnErr: null, code: 0, signal: null, pid: null, cb })
    } else {
      const child = spawn(cmd, modArgs, spawnOpts)
      const pid   = child.pid

      // Pipe data to collect functions
      this._withTypes(child, (stream, type) => {
        if (stream) {
          stream.on('data', this._collectStream.bind(this, type))
        }
      })

      // Handle exit
      child.on('error', (spawnErr) => {
        if (!hasReturned) {
          hasReturned = true
          this._return({ spawnErr, pid, cb, fullCmd })
        }
      })
      child.on('close', (code, signal) => {
        if (!hasReturned) {
          hasReturned = true
          this._return({ code, signal, pid, cb, fullCmd })
        }
      })
      child.on('exit', (code, signal) => {
        if (!hasReturned) {
          hasReturned = true
          this._return({ code, signal, pid, cb, fullCmd })
        }
      })
    }

    // Return promise if callback was not provided
    if (!cb) { return promise }
  }

  scrollerWrite (line) {
    logUpdate(line)
  }
  scrollerClear () {
    logUpdate.clear()
  }
  scrollerStick () {
    logUpdate.done()
  }

  _membufShiftLine (type) {
    if (!this._state.membuffers) { this._state.membuffers = {} }
    if (!this._state.membuffers[type]) { this._state.membuffers[type] = '' }

    let pos = this._state.membuffers[type].indexOf('\n')

    if (pos === -1) {
      return false
    }

    let line = this._state.membuffers[type].substr(0, pos + 1)
    this._state.membuffers[type] = this._state.membuffers[type].substr(pos + 1, this._state.membuffers[type].length - 1)
    return line
  }
  _membufRead (type) {
    if (!this._state.membuffers) { this._state.membuffers = {} }
    if (!this._state.membuffers[type]) { this._state.membuffers[type] = '' }
    return this._state.membuffers[type]
  }
  _membufWrite (type, data) {
    if (!this._state.membuffers) { this._state.membuffers = {} }
    if (!this._state.membuffers[type]) { this._state.membuffers[type] = '' }
    this._state.membuffers[type] = ''
  }
  _membufAppend (type, data) {
    if (!this._state.membuffers) { this._state.membuffers = {} }
    if (!this._state.membuffers[type]) { this._state.membuffers[type] = '' }
    this._state.membuffers[type] += data
  }
  _membufOutputLines (type, { flush = false, code = undefined } = {}) {
    let line = ''
    while ((line = this._membufShiftLine(type)) !== false) {
      this._outputLine(type, line)
    }

    if (flush) {
      this._membufRead().split('\n').forEach((line) => {
        this._outputLine(type, line, { flush, code })
      })
      this._membufWrite(type, '')
    }
  }

  _filebufReadAndUnlink (type) {
    if (this._opts.tmpFiles[type]) {
      let buf = ''
      if (fs.existsSync(this._opts.tmpFiles[type])) {
        buf = fs.readFileSync(this._opts.tmpFiles[type], 'utf-8')
        if (this._opts.cleanupTmpFiles === true) {
          fs.unlinkSync(this._opts.tmpFiles[type])
        }
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
    if (this._opts.tmpFiles.combined) {
      fs.appendFileSync(this._opts.tmpFiles.combined, data, 'utf-8')
    }
  }

  _collectStream (type, data) {
    this._membufAppend(type, data)
    this._filebufAppend(type, data)
    this._membufOutputLines(type)
  }

  _startAnimation () {
    let that = this
    this._state.timer = setInterval(() => {
      let frame = cliSpinner.frames[this._state.frameCounter++ % cliSpinner.frames.length]
      this._drawFrame.bind(that)(frame)
    }, this._opts.interval)
  }

  _prefix () {
    let buf = ''

    const components = _.clone(this._state.components)

    if (this._opts.addCommandAsComponent && this._state.lastShowCmd) {
      components.push(this._state.lastShowCmd)
    }

    if (this._state.mode === 'passthru') {
      buf += `\u276f `
    }

    components.forEach((component) => {
      buf += `${chalk.dim(component)} \u276f `
    })

    buf = buf.trim()

    return buf
  }

  _outputLine (type, line, { flush = false, code = undefined } = {}) {
    if (this._state.mode === 'silent') {
      return
    }
    this._opts.cbPreLinefeed(type, line, { flush, code }, (err, modifiedLine) => { // eslint-disable-line handle-callback-err
      if (modifiedLine) {
        this._state.lastLine = stripAnsi(modifiedLine.trim())
        this._state.lastLineIdx++
      }
      // Force the animation of a frame or just write to stdout
      this._drawFrame(undefined, { flush, code })
    })
  }

  _drawFrame (frame, opts = {}) {
    const { type = 'stdout', flush = false, code = undefined } = opts
    let prefix        = this._prefix()
    let buff          = ''
    let prefixNew     = (prefix !== this._state.lastPrefix)
    let prefixChanged = (prefixNew && this._state.lastPrefix !== null)
    let haveNewLine   = (this._state.lastLineIdx > this._state.lastStickyLineIdx)
    let announced     = ''
    let makePrevStick = prefixChanged
    let makeThisStick = flush && haveNewLine

    // console.log({prefixChanged, haveNewLine, prefix, lp: this._state.lastPrefix})
    // console.log({makePrevStick, makeThisStick, announced, haveNewLine, prefixChanged, flush, 'void': false})

    this._state.lastPrefix = prefix

    if (this._state.lastLine === null) {
      return
    }

    if (!frame) {
      frame = cliSpinner.frames[this._state.frameCounter++ % cliSpinner.frames.length]
    }
    if (flush) {
      if (code === 0 || code === undefined || code === null) {
        frame = logSymbols.success
        if (this._opts.announce === true) {
          if (code === 0) {
            announced = `Successfully executed: ${this._state.lastFullCmd}`
          }
        }
      } else {
        frame = logSymbols.error
        if (this._opts.announce === true) {
          announced = `Failed to execute: ${this._state.lastFullCmd}`
        }
      }
    }

    if (this._state.mode === 'singlescroll') {
      buff += ` ${frame} `
      if (haveNewLine) {
        buff += `${prefix} `
        if (announced === '') {
          buff += this._state.lastLine
        } else {
          buff += announced
        }
      }
      if (makePrevStick) {
        this.scrollerClear()
        this.scrollerWrite(` ${logSymbols.success} ${this._state.lastLineFrame.substr(3)}`)
        this.scrollerStick()
      }
      this.scrollerWrite(buff)
      if (makeThisStick) {
        this.scrollerStick()
        this._state.lastLine          = ''
        this._state.lastStickyLineIdx = this._state.lastLineIdx
      }
      this._state.lastLineFrame = buff
    } else {
      if (haveNewLine) {
        // Just write to stdout (or stderr)
        buff += indentString(`${this._state.lastLine}`, this._opts.indent)
        this._state.lastLine = ''
        this._state.lastStickyLineIdx = this._state.lastLineIdx

        if (prefixChanged) {
          process[type].write(`\n${prefix}\n\n`)
        } else if (prefixNew) {
          process[type].write(`${prefix}\n\n`)
        }
        process[type].write(`${buff}\n`)
      }
    }
  }

  _stopAnimation () {
    clearInterval(this._state.timer)
    this._state.timer = null
  }

  _return ({ spawnErr, code, signal, pid, cb, fullCmd }) {
    const results = { stdout: '', stderr: '', combined: '' }

    this._withTypes(results, (val, type) => {
      // @todo: Handle the case where the file is too big to buffer in memory
      // maybe the handling should be in `_filebufReadAndUnlink` so that we can
      // return the last X bytes, with a reference to the tmp file, and not delete it.
      const buf = this._filebufReadAndUnlink(type)
      return (buf ? buf.trim() : '')
    }, [ 'stdout', 'stderr', 'combined' ])

    if (this._state.mode !== 'singlescroll') {
      // when mode is passthru, the combined output will already have been on-screen
      // when mode is silent, we want no automated dumps on screen
      results.combined = null
    }

    let retErr        = null
    let strAllErrors  = ''
    let errorMessages = []
    if (code !== 0) {
      if (results.combined) {
        errorMessages.push(`\n\n${indentString(results.combined, this._opts.indent)}\n\n`)
      }

      errorMessages.push(`Fault while executing "${fullCmd}"`)
      if (spawnErr) {
        errorMessages.push(`Spawn error: ${spawnErr}`)
      }
      if (code !== 0) {
        errorMessages.push(`Exit code: ${code}`)
      }
      if (signal) {
        errorMessages.push(`Signal: ${signal}`)
      }
    }
    if (errorMessages.length) {
      strAllErrors = errorMessages.join('. ')
      retErr       = new Error(strAllErrors)
    }

    const flush = true
    this._membufOutputLines('stdout', { flush, code })
    this._membufOutputLines('stderr', { flush, code })
    if (this._state.mode === 'singlescroll') {
      this._stopAnimation()
    }

    if (strAllErrors.length > 0) {
      if (this._state.mode !== 'silent') {
        process.stderr.write(`${strAllErrors}\n`)
      }
      if (this._opts.fatal === true) {
        process.exit(1)
      }
    }

    if (cb) {
      return cb(retErr, results.stdout)
    }

    if (retErr) {
      return this._reject(retErr)
    }

    this._resolve(results.stdout)
  }
}

module.exports.Scrolex = Scrolex

// module.exports.stdout = (opts = {}) => {
//   return new Chainer('stdout', opts)
// }

module.exports.exe = (args, opts = {}, cb) => {
  return new Scrolex(opts).exe(args, cb)
}

module.exports.scroll = (str, opts = {}) => {
  return new Scrolex(opts).scroll(str)
}

module.exports.stick = (str, opts = {}) => {
  return new Scrolex(opts).stick(str)
}
