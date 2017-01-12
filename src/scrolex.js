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
    this._opts = null
    this._cmd  = null

    this._types      = [ 'stdout', 'stderr' ]
    this._pid        = null
    this._error      = null
    this._timer      = null
    this._lastPrefix = null
    this._lastLine   = ''
    this._buffers    = {
      stdout: '',
      stderr: '',
    }
    this._results = {
      stdout: null,
      stderr: null,
    }

    this._reject  = null
    this._resolve = null
  }

  async exe (args, opts, cb) {
    this._startAnimation()
    let cmd         = ''
    let showCommand = ''
    let modArgs     = args

    if (`${args}` === args) {
      cmd         = 'sh'
      showCommand = modArgs.split(/\s+/)[0]
      modArgs       = ['-c'].concat(modArgs)
    } else {
      cmd         = modArgs.pop()
      showCommand = cmd
    }

    opts = _.defaults(opts, {
      'showCommand'          : showCommand,
      'addCommandAsComponent': false,
      'components'           : [],
      'singlescroll'         : true,
      'cleanupTmpFiles'      : true,
      'announce'             : true,
      'passthru'             : true,
      'tmpFiles'             : {},
      'cwd'                  : process.cwd(),
    })

    if (`${opts.components}` === opts.components) {
      opts.components = opts.components.split('/')
    }

    if (opts.addCommandAsComponent) {
      opts.components.push(opts.showCommand)
    }

    const spawnOpts = {}
    if (opts.env !== undefined) {
      spawnOpts.env = opts.env
    } else {
      spawnOpts.env = {
        DEBUG   : process.env.DEBUG,
        NODE_ENV: process.env.NODE_ENV,
        HOME    : process.env.HOME,
        USER    : process.env.USER,
        PATH    : process.env.PATH,
      }
    }
    if (opts.cwd !== undefined) spawnOpts.cwd = opts.cwd
    if (opts.stdio !== undefined) spawnOpts.stdio = opts.stdio

    this._fullcmd = (_.isArray(args) ? args.join(' ') : args)
    this._cmd     = cmd
    this._opts    = opts
    this._cb      = cb

    if (this._opts.announce === true) {
      this._linefeed('stdout', `Executing: ${this._fullcmd}`)
    }

    const child = spawn(cmd, modArgs, spawnOpts)
    this._pid = child.pid

    this._types.forEach((type) => {
      if (this._opts.tmpFiles === false) {
        this._opts.tmpFiles[type] = false
      } else {
        if (!this._opts.tmpFiles[type] && this._opts.tmpFiles[type] !== false) {
          this._opts.tmpFiles[type] = `${osTmpdir()}/scrolex-${this._opts.showCommand}-${type}-${this._pid}.log`
        }
        if (this._opts.tmpFiles[type]) {
          fs.writeFileSync(this._opts.tmpFiles[type], '', 'utf-8')
        }
        if (child[type]) {
          child[type].on('data', this._out.bind(this, type))
        }
      }
    })

    child.on('close', (status) => {
      this._return({status})
    })

    if (this._cb) {
      return
    }

    return new Promise((resolve, reject) => {
      this._reject  = reject
      this._resolve = resolve
    })
  }

  _out (type, data) {
    if (!data) {
      return
    }

    this._buffers[type] += data
    if (this._opts.tmpFiles[type]) {
      fs.appendFileSync(this._opts.tmpFiles[type], data, 'utf-8')
    }
    this._outputBuffer(type)
  }

  _startAnimation () {
    let i      = 0
    let frames = cliSpinner.frames
    let that   = this
    this._timer = setInterval(() => {
      let frame = frames[i++ % frames.length]
      this._drawAnimation.bind(that)(frame)
    }, cliSpinner.interval)
  }

  _drawAnimation (frame, { flush = false, status = undefined } = {}) {
    if (!frame) {
      frame = cliSpinner.frames[0]
    }

    let prefix = this._prefix()
    let line   = prefix + frame + ' '

    line += cliTruncate(this._lastLine.trim(), process.stdout.columns - (line.length + (flush ? 2 : 0)))

    if (flush) {
      if (status === 0) {
        logUpdate.clear()
        line = prefix + chalk.reset('') + logSymbols.success
      } else {
        line += logSymbols.error
      }
    }

    logUpdate(line)
    if (flush && prefix !== this._lastPrefix && this._lastPrefix !== null) {
      logUpdate.done()
    }
    this._lastPrefix = prefix
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

  _linefeed (type, line, {flush = false, status = undefined}) {
    if (line) {
      this._lastLine = line
    }

    if (this._opts.passthru === true) {
      if (this._opts.singlescroll === true) {
          // handled by lastline + animation, unless the command exited before the interval
        return this._drawAnimation(undefined, { flush, status })
      }
      if (line) {
        return process[type].write(line)
      }
    }
  }

  _outputBuffer (type, { flush = false, status = undefined } = {}) {
    let pos = -1
    while ((pos = this._buffers[type].indexOf('\n')) > -1) {
      let line = this._buffers[type].substr(0, pos + 1)
      this._linefeed(type, line)
      this._buffers[type] = this._buffers[type].substr(pos + 1, this._buffers[type].length - 1)
    }

    if (flush) {
      this._linefeed(type, this._buffers[type], { flush, status })
      this._buffers[type] = ''
    }
  }

  _return ({ status }) {
    this._types.forEach((type) => {
      if (this._opts.tmpFiles[type]) {
        this._results[type] = fs.readFileSync(this._opts.tmpFiles[type], 'utf-8')
        if (this._opts.cleanupTmpFiles === true) {
          fs.unlinkSync(this._opts.tmpFiles[type])
        }
      }
    })

    let err = null
    if (this._error || status !== 0) {
      let msgs = [ `Fault while executing "${this._fullcmd}"` ]

      if (this._error) {
        msgs.push(this._error)
      }
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
    this._outputBuffer('stdout', { flush, status })
    this._outputBuffer('stderr', { flush, status })
    this._stopAnimation()

    if (this._cb) {
      return this._cb(err, out)
    }

    if (err) {
      return this._reject(err)
    }
    this._resolve(out)
  }

  _stopAnimation () {
    clearInterval(this._timer)
    this._timer = null
  }
}

module.exports = (args, opts, cb) => {
  const exec = new Scrolex()
  return exec.exe(args, opts, cb)
}
