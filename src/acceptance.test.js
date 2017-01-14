require('babel-polyfill')
const scrolex  = require('./scrolex')
const test     = require('ava')
// const debug = require('depurar')('sut')

test.cb('callback', (t) => {
  scrolex(`MOCK_ERROR_OUT=0 MOCK_LIMIT=2 node ${__dirname}/fakecmd.js`, { singlescroll: true, components: 'lanyon/postinstall' }, (err, out) => {
    t.ifError(err, 'should respond without error')
    // t.regex(response.text, /Hi mock-friend!/, 'response should match "Hi mock-friend!"')
    t.end()
  })
})

test.cb('sync-no-error', (t) => {
  ;(async function () {
    await scrolex(`MOCK_ERROR_OUT=0 MOCK_LIMIT=2 node ${__dirname}/fakecmd.js`, { singlescroll: true, components: 'lanyon/postinstall' })
    t.end()
  }())
})

test.cb('sync-catch-error', (t) => {
  ;(async function () {
    try {
      await scrolex(`MOCK_ERROR_OUT=1 MOCK_LIMIT=1 node ${__dirname}/fakecmd.js`, { singlescroll: true, components: 'lanyon/postinstall' })
    } catch (err) {
    }

    // @todo fail if err wasn't thrown & caught
    t.end()
  }())
})

test.cb('promise-catch-error', (t) => {
  scrolex(`MOCK_ERROR_OUT=1 MOCK_LIMIT=1 node ${__dirname}/fakecmd.js`, { singlescroll: true, components: 'lanyon/postinstall' })
    .then(() => {
      // @todo fail
      t.end()
    })
    .catch((err) => {
      // @todo pass
      console.log(err)
      t.end()
    })
})
