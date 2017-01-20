// const debug   = require('depurar')('botty')
const Scrolex = require('./Scrolex')

// Scrolex, but replacing a few interfaces so we can use it for REPL and testing
class ScrolexMock extends Scrolex {
  scrollerWrite (line) {}
  scrollerClear (line) {}
  scrollerPersist (line) {}
}

module.exports = ScrolexMock
