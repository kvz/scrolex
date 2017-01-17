const Scrolex = require('./Scrolex')
const Chainer = require('./Chainer')

module.exports.Scrolex = Scrolex

module.exports.stdout = (opts) => { return new Chainer('stdout', opts) }

module.exports.exe = (args, opts, cb) => {
  const s = new Scrolex()
  return s.exe(args, opts, cb)
}
