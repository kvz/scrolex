require('babel-polyfill')
const scrolex = require('./Scrolex').exe
const test    = require('ava')
// const debug = require('depurar')('sut')

test.cb('callback', (t) => {
  scrolex(`MOCK_ERROR_OUT=0 MOCK_LIMIT=2 node ${__dirname}/fakecmd.js`, { singlescroll: false, components: 'lanyon/postinstall' }, (err, out) => {
    t.ifError(err, 'should respond without error')
    t.regex(out, /Doing thing 2/, 'output should match: Doing thing 2')
    t.end()
  })
})

test.cb('sync-no-error', (t) => {
  ;(async function () {
    let out = await scrolex(`MOCK_ERROR_OUT=0 MOCK_LIMIT=2 node ${__dirname}/fakecmd.js`, { singlescroll: true, components: 'lanyon/postinstall' })
    t.regex(out, /Doing thing 2/, 'output should match: Doing thing 2')
    t.end()
  }())
})

test.cb('sync-catch-error', (t) => {
  ;(async function () {
    try {
      await scrolex(`MOCK_ERROR_OUT=1 MOCK_LIMIT=1 node ${__dirname}/fakecmd.js`, { singlescroll: true, components: 'lanyon/postinstall' })
    } catch (e) {
      t.pass()
      t.end()
    }
    t.fail()
    t.end()
  }())
})

test.cb('promise-catch-error', (t) => {
  scrolex(`MOCK_ERROR_OUT=1 MOCK_LIMIT=1 node ${__dirname}/fakecmd.js`, { singlescroll: true, components: 'lanyon/postinstall' })
    .then(() => {
      t.fail()
      t.end()
    })
    .catch((err) => {
      t.regex(err.message, /Fault while executing/, 'err should should match: Fault while executing')
      t.pass()
      t.end()
    })
})
