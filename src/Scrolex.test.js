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
  describe('_countSymbols', () => {
    it('should count symbols', () => {
      expect(s._countSymbols(` ⢄ \u001b[2mmyapp\u001b[22m`)).toBe(8)
    })
    it('should count symbols 2', () => {
      expect(s._countSymbols(` ⡠ myapp › prepare ›`)).toBe(20)
    })
  })
})

describe('ScrolexExports', () => {
  describe('exe', () => {
    it('should accept callback', () => {
      scrolex.exe(`FAKECMD_CRASH=0 FAKECMD_RUNS=2 node ${__dirname}/fakecmd.js`, { mode: 'passthru', components: 'lanyon>postinstall' }, (err, out) => {
        expect(err).toBeNull()
        expect(removeVariance(out)).toMatchSnapshot()
      })
    })
    it('should accept an array', () => {
      scrolex.exe([process.argv[0], `${__dirname}/fakecmd.js`], {
        mode      : 'passthru',
        components: 'lanyon>postinstall',
        env       : Object.assign({}, process.env, {
          FAKECMD_CRASH: 0,
          FAKECMD_RUNS : 2,
        }),
      }, (err, out) => {
        expect(err).toBeNull()
        expect(removeVariance(out)).toMatchSnapshot()
      })
    })
    it('should accept promise and catch an error', () => {
      scrolex.exe(`FAKECMD_CRASH=1 FAKECMD_RUNS=1 node ${__dirname}/fakecmd.js`, { mode: 'singlescroll', components: 'lanyon>postinstall' })
        .then(() => {
          expect(true).toBe(false)
        })
        .catch(({message}) => {
          expect(removeVariance(message)).toMatchSnapshot()
        })
    })
    it('should accept async/await', async () => {
      let out = await scrolex.exe(`FAKECMD_CRASH=0 FAKECMD_RUNS=2 node ${__dirname}/fakecmd.js`, { mode: 'singlescroll', components: 'lanyon>postinstall' })
      expect(removeVariance(out)).toMatchSnapshot()
    })
    it('should accept async/await and catch an error', async () => {
      let threw = false
      try {
        await scrolex.exe(`FAKECMD_CRASH=1 FAKECMD_RUNS=1 node ${__dirname}/fakecmd.js`, { mode: 'singlescroll', components: 'lanyon>postinstall' })
      } catch (err) {
        threw = true
        expect(removeVariance(err)).toMatchSnapshot()
      }
      expect(threw).toBe(true)
    })
  })
})
