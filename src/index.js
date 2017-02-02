const Scrolex     = require('./Scrolex')
const Chainer     = require('./Chainer')
let globalScrolex = null

module.exports.Scrolex = Scrolex

module.exports.stdout = (opts) => { return new Chainer('stdout', opts) }

module.exports.exe = (args, opts, cb) => {
  // Every execute gets its own Scrollex instance
  globalScrolex = new Scrolex(opts)
  return globalScrolex.exe(args, cb)
}

module.exports.out = (str, opts, cb) => {
  // out calls are able to tap into existing Scrollex instances, or create new ones if needed
  if (!globalScrolex) {
    globalScrolex = new Scrolex(opts)
  } else {
    globalScrolex.applyOpts(opts)
  }
  return globalScrolex.out(str, opts.flush, cb)
}
