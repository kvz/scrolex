require('babel-polyfill')
const scrolex        = require('./Scrolex')
const Scrolex        = scrolex.Scrolex
const s              = new Scrolex()
const removeVariance = require('./removeVariance')
// const debug       = require('depurar')('sut')

describe('Scrolex', () => {
  describe('_normalizeOpts', () => {
    it('should normalize according to the snapshot', () => {
      expect(removeVariance(s._normalizeOpts({
        mode      : 'singlescroll',
        components: 'a>b>c',
      }))).toMatchSnapshot()
    })
  })

  describe('_defaults', () => {
    it('should default according to the snapshot', () => {
      expect(removeVariance(s._defaults({
        cwd       : '/tmp',
        tmpFiles  : false,
        mode      : 'singlescroll',
        components: 'a>b>c',
      }))).toMatchSnapshot()
    })
  })
})

describe('ScrolexExports', () => {
  describe('exe', () => {
    it('should accept callback', () => {
      scrolex.exe(`FAKECMD_CRASH=0 FAKECMD_RUNS=2 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, mode: 'passthru', components: 'lanyon>postinstall' }, (err, out) => {
        expect(err).toBeNull()
        expect(removeVariance(out)).toMatchSnapshot()
      })
    })
    it('should accept an array', () => {
      scrolex.exe([process.argv[0], `${__dirname}/fakecmd.js`], {
        env: {
          FAKECMD_CRASH: 0,
          FAKECMD_RUNS : 2,
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
      scrolex.exe(`FAKECMD_CRASH=1 FAKECMD_RUNS=1 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, mode: 'singlescroll', components: 'lanyon>postinstall' })
        .then(() => {
          expect(true).toBe(false)
        })
        .catch(({message}) => {
          expect(removeVariance(message)).toMatchSnapshot()
        })
    })
    it('should accept async/await', async () => {
      let out = await scrolex.exe(`FAKECMD_CRASH=0 FAKECMD_RUNS=2 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, mode: 'singlescroll', components: 'lanyon>postinstall' })
      expect(removeVariance(out)).toMatchSnapshot()
    })
    it('should accept async/await and catch an error', async () => {
      let threw = false
      try {
        await scrolex.exe(`FAKECMD_CRASH=1 FAKECMD_RUNS=1 node ${__dirname}/fakecmd.js`, { cleanupTmpFiles: false, mode: 'singlescroll', components: 'lanyon>postinstall' })
      } catch (err) {
        threw = true
        expect(removeVariance(err)).toMatchSnapshot()
      }
      expect(threw).toBe(true)
    })
  })
})
