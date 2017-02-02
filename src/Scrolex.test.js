const Scrolex        = require('./ScrolexMock')
const removeVariance = require('./removeVariance')
const scrolex        = new Scrolex()

describe('Scrolex', () => {
  describe('_normalizeOpts', () => {
    it('should normalize according to the snapshot', () => {
      expect(removeVariance(scrolex._normalizeOpts({
        mode      : 'singlescroll',
        components: 'a>b>c',
      }))).toMatchSnapshot()
    })
  })

  describe('_defaults', () => {
    it('should default according to the snapshot', () => {
      expect(removeVariance(scrolex._defaults({
        cwd       : '/tmp',
        tmpFiles  : false,
        mode      : 'singlescroll',
        components: 'a>b>c',
      }))).toMatchSnapshot()
    })
  })
})
