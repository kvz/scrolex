class Chainer {
  constructor (opts) {
    this.opts = opts
  }
  stdout (val) {
    this.opts.stdout = !!val
    return new Chainer(this.opts)
  }
}

module.exports = Chainer
