// const debug   = require('depurar')('botty')
const Scrolex = require('./Scrolex')

// Scrolex, but replacing a few interfaces so we can use it for REPL and testing
class ScrolexMock extends Scrolex {
}

module.exports = ScrolexMock
