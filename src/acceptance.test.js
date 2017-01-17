require('babel-polyfill')
const scrolex = require('./index').exe
const test    = require('ava')
const debug   = require('depurar')('sut')

test.serial.cb('callback', (t) => {
  scrolex(`MOCK_ERROR_OUT=0 MOCK_LIMIT=2 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, singlescroll: false, components: 'lanyon/postinstall' }, (err, out) => {
    t.ifError(err, 'should respond without error')
    t.regex(out, /Doing thing 2/, 'output should match: Doing thing 2')
    t.end()
  })
})

test.serial.cb('promise-catch-error', (t) => {
  scrolex(`MOCK_ERROR_OUT=1 MOCK_LIMIT=1 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, singlescroll: true, components: 'lanyon/postinstall' })
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

test.serial('sync-no-error', async (t) => {
  let out = await scrolex(`MOCK_ERROR_OUT=0 MOCK_LIMIT=2 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, singlescroll: true, components: 'lanyon/postinstall' })
  t.regex(out, /Doing thing 2/, 'output should match: Doing thing 2')
})

test.serial('sync-catch-error', async (t) => {
  let threw = false
  try {
    await scrolex(`MOCK_ERROR_OUT=1 MOCK_LIMIT=1 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, singlescroll: true, components: 'lanyon/postinstall' })
  } catch (err) {
    threw = err
  }
  // debug({out, threw})
  if (!threw) {
    t.fail()
  } else {
    t.pass()
  }
})
