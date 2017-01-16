require('babel-polyfill')
const ScrolexMock = require('./ScrolexMock').ScrolexMock
const sut         = new ScrolexMock()
const test        = require('ava')
// const debug    = require('depurar')('sut')

test.cb('callback', (t) => {
  const o = sut._defaults({a: 1})
  t.is(o, {a: 1})
})
