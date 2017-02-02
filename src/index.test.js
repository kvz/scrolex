require('babel-polyfill')
const Scrolex        = require('./index')
const removeVariance = require('./removeVariance')
// const debug       = require('depurar')('sut')

describe('index', () => {
  describe('exe', () => {
    it('should accept callback', () => {
      Scrolex.exe(`MOCK_ERROR_OUT=0 MOCK_LIMIT=2 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, mode: 'passthru', components: 'lanyon>postinstall' }, (err, out) => {
        expect(err).toBeNull()
        expect(removeVariance(out)).toMatchSnapshot()
      })
    })
    it('should accept an array', () => {
      Scrolex.exe([process.argv[0], `${__dirname}/fakecmd.js`], {
        env: {
          MOCK_ERROR_OUT: 0,
          MOCK_LIMIT    : 2,
        },
        cleanupTmpFiles: false,
        mode           : 'passthru',
        components     : 'lanyon>postinstall',
      }, (err, out) => {
        expect(err).toBeNull()
        expect(removeVariance(out)).toMatchSnapshot()
      })
    })
    it('should accept promise and catch an error', () => {
      Scrolex.exe(`MOCK_ERROR_OUT=1 MOCK_LIMIT=1 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, mode: 'singlescroll', components: 'lanyon>postinstall' })
        .then(() => {
          expect(true).toBe(false)
        })
        .catch(({message}) => {
          expect(removeVariance(message)).toMatchSnapshot()
        })
    })
    it('should accept async/await', async () => {
      let out = await Scrolex.exe(`MOCK_ERROR_OUT=0 MOCK_LIMIT=2 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, mode: 'singlescroll', components: 'lanyon>postinstall' })
      expect(removeVariance(out)).toMatchSnapshot()
    })
    it('should accept async/await and catch an error', async () => {
      let threw = false
      try {
        await Scrolex.exe(`MOCK_ERROR_OUT=1 MOCK_LIMIT=1 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, mode: 'singlescroll', components: 'lanyon>postinstall' })
      } catch (err) {
        threw = true
        expect(removeVariance(err)).toMatchSnapshot()
      }
      expect(threw).toBe(true)
    })
  })
})
