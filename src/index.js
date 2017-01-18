const Scrolex = require('./Scrolex')
const Chainer = require('./Chainer')

let globalScrolex = null

module.exports.Scrolex = Scrolex

module.exports.stdout = (opts) => { return new Chainer('stdout', opts) }

module.exports.exe = (args, opts, cb) => {
  if (!globalScrolex) {
    globalScrolex = new Scrolex(opts)
  } else {
    globalScrolex.applyOpts(opts)
  }
  return globalScrolex.exe(args, cb)
}

module.exports.out = (str, opts, cb) => {
  if (!globalScrolex) {
    globalScrolex = new Scrolex(opts)
  } else {
    globalScrolex.applyOpts(opts)
  }
  return globalScrolex.out(str, cb)
}
