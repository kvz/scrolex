const Scrolex = require('./Scrolex')
module.exports = (args, opts, cb) => {
  const s = new Scrolex()
  return s.exe(args, opts, cb)
}
