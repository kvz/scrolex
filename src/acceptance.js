require('babel-polyfill')
const scrolex = require('./scrolex')
const logs    = []

scrolex(`MOCK_ERROR_OUT=0 MOCK_LIMIT=2 node ${__dirname}/mockcmd.js`, { singlescroll: true, components: 'lanyon/postinstall' }, (err, out) => {
  if (err) {
    console.log('--> 0: error happened')
  } else {
    console.log('--> 0: callback works')
  }
})

;(async function () {
  // await scrolex(`MOCK_ERROR_OUT=0 MOCK_LIMIT=2 node ${__dirname}/mockcmd.js`, { singlescroll: true, components: 'lanyon/postinstall' })
  // logs.push('--> 1: ran without errors')
  // try {
  //   await scrolex(`MOCK_ERROR_OUT=1 MOCK_LIMIT=1 node ${__dirname}/mockcmd.js`, { singlescroll: true, components: 'lanyon/postinstall' })
  // } catch (err) {
  //   logs.push('--> 2: error happened & caught as expected: ' + err)
  // }
  //
  // logs.push('--> 3: async test')

  scrolex(`MOCK_ERROR_OUT=1 MOCK_LIMIT=1 node ${__dirname}/mockcmd.js`, { singlescroll: true, components: 'lanyon/postinstall' })
    .catch((err) => {
      logs.push('--> 5: error happened & caught as expected: ' + err)
    })

  logs.push('--> 4: async test')

  console.log(logs)
}())
