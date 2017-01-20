require('babel-polyfill')
const Scrolex = require('./index')
// const debug   = require('depurar')('sut')

describe('index', () => {
  describe('exe', () => {
    it('should accept callback', () => {
      Scrolex.exe(`MOCK_ERROR_OUT=0 MOCK_LIMIT=2 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, mode: 'passthru', components: 'lanyon>postinstall' }, (err, out) => {
        expect(err).toBeNull()
        expect(out).toMatchSnapshot()
      })
    })
    it('should accept promise and catch an error', () => {
      Scrolex.exe(`MOCK_ERROR_OUT=1 MOCK_LIMIT=1 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, mode: 'singlescroll', components: 'lanyon>postinstall' })
        .then(() => {
          expect(true).toBe(false)
        })
        .catch(({message}) => {
          expect(message).toMatchSnapshot()
        })
    })
    it('should accept async/await', async () => {
      let out = await Scrolex.exe(`MOCK_ERROR_OUT=0 MOCK_LIMIT=2 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, mode: 'singlescroll', components: 'lanyon>postinstall' })
      expect(out).toMatchSnapshot()
    })
    it('should accept async/await and catch an error', () => {
      expect(async () => {
        await Scrolex.exe(`MOCK_ERROR_OUT=1 MOCK_LIMIT=1 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, mode: 'singlescroll', components: 'lanyon>postinstall' })
      }).toThrowErrorMatchingSnapshot
    })
  })
})
