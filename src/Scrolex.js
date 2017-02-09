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
  constructor (opts = {}) {
    this._applyOpts(opts)
  }

  _applyOpts (opts = {}) {
    // Clone original opts object via defaults {}
    this._opts = this._normalizeOpts(this._defaults(this._opts, opts))

    if ('state' in this._opts) {
      this._state = this._opts.state
    } else {
      global.scrolex = global.scrolex || {}
      this._state    = global.scrolex
    }

    // Modify original state object via direct defaults
    _.defaults(this._state, {
      lastFrameCnt : 0,
      lastLineFrame: '',
      lastTimer    : null,
    })

    this._local = _.defaults({}, this._local, {
      lastLine         : null,
      lastLineIdx      : 0,
      lastStickyLineIdx: null,
      lastPrefix       : null,
      lastShowCmd      : null,
      lastBuffs        : {},
    })

    // Allow to set new opts, even though global state has them already
    for (let key in this._opts) {
      if (key === 'tmpFiles') {
        // persist locally only
        this._local[key] = this._opts[key]
      } else {
        // opts here means set by user, vs a default. We don't want to override state with default
        if (key in opts || !(key in this._state)) {
          // but then we do take them from the property as that is normalized
          this._state[key] = this._opts[key]
        }
      }
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
      'components'           : [],
      'mode'                 : process.env.SCROLEX_MODE || 'singlescroll',
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

    if (`${modArgs}` === modArgs) {
      let parts   = modArgs.split(/&&/)
      let lastCmd = parts.pop().replace(/^[\s([]+|[\s\])]+$/g, '')
      showCmd     = lastCmd.split(/\s+/)[0]
      if (this._state.shell === true) {
        cmd     = modArgs
        modArgs = []
      } else {
        cmd     = 'sh'
        modArgs = ['-c'].concat(modArgs)
      }
    } else {
      cmd     = modArgs.shift()
      showCmd = cmd
    }

    showCmd = path.basename(showCmd)
    fullCmd = (_.isArray(origArgs) ? origArgs.join(' ') : origArgs)

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
    this._local.lastShowCmd = showCmd
    this._state.lastFullCmd = fullCmd

    const spawnOpts = this._spawnOpts(this._state)
    let hasReturned = false

    let promiseReject = null
    let promiseResolve = null
    const promise = new Promise((resolve, reject) => {
      promiseReject  = reject
      promiseResolve = resolve
    })

    if (this._state.mode === 'singlescroll') {
      this._startAnimation()
    }
    if (this._state.announce === true) {
      this._outputLine('stdout', `Executing: ${fullCmd}`)
    }

    // Put the PID into the file locations as a late normalization step
    this._withTypes(this._local.tmpFiles, (val, type) => {
      return val.replace('%uuid%', uuidV4()).replace('%showCmd%', showCmd)
    }, [ 'stdout', 'stderr', 'combined' ])

    // Reset/empty out files
    this._withTypes(this._local.tmpFiles, (val, type) => {
      this._filebufWrite(type, '')
    }, [ 'stdout', 'stderr', 'combined' ])

    if (this._state.dryrun === true) {
      this._return({ spawnErr: null, code: 0, signal: null, pid: null, cb, promiseResolve, promiseReject })
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
          this._return({ spawnErr, pid, cb, fullCmd, promiseResolve, promiseReject })
        }
      })
      child.on('close', (code, signal) => {
        if (!hasReturned) {
          hasReturned = true
          this._return({ code, signal, pid, cb, fullCmd, promiseResolve, promiseReject })
        }
      })
      child.on('exit', (code, signal) => {
        if (!hasReturned) {
          hasReturned = true
          this._return({ code, signal, pid, cb, fullCmd, promiseResolve, promiseReject })
        }
      })
    }

    // Return promise if callback was not provided
    if (!cb) {
      return promise
    }
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
    if (!this._local.lastBuffs) { this._local.lastBuffs = {} }
    if (!this._local.lastBuffs[type]) { this._local.lastBuffs[type] = '' }

    let pos = this._local.lastBuffs[type].indexOf('\n')

    if (pos === -1) {
      return false
    }

    let line = this._local.lastBuffs[type].substr(0, pos + 1)
    this._local.lastBuffs[type] = this._local.lastBuffs[type].substr(pos + 1, this._local.lastBuffs[type].length - 1)
    return line
  }
  _membufRead (type) {
    if (!this._local.lastBuffs) { this._local.lastBuffs = {} }
    if (!this._local.lastBuffs[type]) { this._local.lastBuffs[type] = '' }
    return this._local.lastBuffs[type]
  }
  _membufWrite (type, data) {
    if (!this._local.lastBuffs) { this._local.lastBuffs = {} }
    if (!this._local.lastBuffs[type]) { this._local.lastBuffs[type] = '' }
    this._local.lastBuffs[type] = ''
  }
  _membufAppend (type, data) {
    if (!this._local.lastBuffs) { this._local.lastBuffs = {} }
    if (!this._local.lastBuffs[type]) { this._local.lastBuffs[type] = '' }
    this._local.lastBuffs[type] += data
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
    if (this._local.tmpFiles[type]) {
      let buf = ''
      if (fs.existsSync(this._local.tmpFiles[type])) {
        buf = fs.readFileSync(this._local.tmpFiles[type], 'utf-8')
        if (this._state.cleanupTmpFiles === true) {
          fs.unlinkSync(this._local.tmpFiles[type])
        }
      }

      return buf
    }
  }
  _filebufRead (type) {
    if (this._local.tmpFiles[type]) {
      return fs.readFileSync(this._local.tmpFiles[type], 'utf-8')
    }
  }
  _filebufWrite (type, data) {
    if (this._local.tmpFiles[type]) {
      fs.writeFileSync(this._local.tmpFiles[type], data, 'utf-8')
    }
  }
  _filebufAppend (type, data) {
    if (this._local.tmpFiles[type]) {
      fs.appendFileSync(this._local.tmpFiles[type], data, 'utf-8')
    }
    if (this._local.tmpFiles.combined) {
      fs.appendFileSync(this._local.tmpFiles.combined, data, 'utf-8')
    }
  }

  _collectStream (type, data) {
    this._membufAppend(type, data)
    this._filebufAppend(type, data)
    this._membufOutputLines(type)
  }

  _startAnimation () {
    let that = this

    clearInterval(this._state.lastTimer)
    this._state.lastTimer = null

    this._state.lastTimer = setInterval(() => {
      let frame = cliSpinner.frames[this._state.lastFrameCnt++ % cliSpinner.frames.length]
      this._drawFrame.bind(that)(frame)
    }, this._state.interval)
  }

  _prefix () {
    let buf = ''

    const components = _.cloneDeep(this._state.components)

    if (this._state.addCommandAsComponent && this._local.lastShowCmd) {
      components.push(this._local.lastShowCmd)
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
    this._state.cbPreLinefeed(type, line, { flush, code }, (err, modifiedLine) => { // eslint-disable-line handle-callback-err
      if (modifiedLine) {
        this._local.lastLine = stripAnsi(modifiedLine.trim())
        this._local.lastLineIdx++
      }
      // Force the animation of a frame or just write to stdout
      this._drawFrame(undefined, { flush, code })
    })
  }

  _drawFrame (frame, opts = {}) {
    const { type = 'stdout', flush = false, code = undefined } = opts
    let prefix        = this._prefix()
    let buff          = ''
    let prefixNew     = (prefix !== this._local.lastPrefix)
    let prefixChanged = (prefixNew && this._local.lastPrefix !== null)
    let haveNewLine   = (this._local.lastLineIdx > this._local.lastStickyLineIdx)
    let announced     = ''
    let makePrevStick = prefixChanged
    let makeThisStick = flush && haveNewLine

    this._local.lastPrefix = prefix

    if (this._local.lastLine === null) {
      return
    }

    if (!frame) {
      frame = cliSpinner.frames[this._state.lastFrameCnt++ % cliSpinner.frames.length]
    }
    if (flush) {
      if (code === 0 || code === undefined || code === null) {
        frame = logSymbols.success
        if (this._state.announce === true) {
          if (code === 0) {
            announced = `Successfully executed: ${this._state.lastFullCmd}`
          }
        }
      } else {
        frame = logSymbols.error
        if (this._state.announce === true) {
          announced = `Failed to execute: ${this._state.lastFullCmd}`
        }
      }
    }

    if (this._state.mode === 'singlescroll') {
      buff += ` ${frame} `
      if (haveNewLine) {
        buff += `${prefix} `
        if (announced === '') {
          buff += this._local.lastLine
        } else {
          buff += announced
        }
      }
      if (makePrevStick) {
        this.scrollerClear()
        this.scrollerWrite(` ${logSymbols.success} ${this._local.lastLineFrame.substr(3)}`)
        this.scrollerStick()
      }
      this.scrollerWrite(buff)
      if (makeThisStick) {
        this.scrollerStick()
        this._local.lastLine          = ''
        this._local.lastStickyLineIdx = this._local.lastLineIdx
      }
      this._local.lastLineFrame = buff
    } else {
      if (haveNewLine) {
        // Just write to stdout (or stderr)
        buff += indentString(`${this._local.lastLine}`, this._state.indent)
        this._local.lastLine = ''
        this._local.lastStickyLineIdx = this._local.lastLineIdx

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
    clearInterval(this._state.lastTimer)
    this._state.lastTimer = null
  }

  _return ({ spawnErr, code, signal, pid, cb, fullCmd, promiseResolve, promiseReject }) {
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
        errorMessages.push(`\n\n${indentString(results.combined, this._state.indent)}\n\n`)
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
      if (this._state.fatal === true) {
        process.exit(1)
      }
    }

    if (cb) {
      return cb(retErr, results.stdout)
    }

    if (retErr) {
      return promiseReject(retErr)
    }

    return promiseResolve(results.stdout)
  }
}

module.exports.Scrolex = Scrolex

// module.exports.stdout = (opts = {}) => {
//   return new Chainer('stdout', opts)
// }

module.exports.exe = (args, opts = {}, cb) => {
  return new Scrolex(opts).exe(args, cb)
}

module.exports.setOpts = (opts = {}) => {
  return new Scrolex(opts)
}

module.exports.scroll = (str, opts = {}) => {
  return new Scrolex(opts).scroll(str)
}

module.exports.stick = (str, opts = {}) => {
  return new Scrolex(opts).stick(str)
}
