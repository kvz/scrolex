const Scrolex = require('./ScrolexMock')
const scrolex = new Scrolex()
describe('Scrolex', () => {
  describe('_normalizeOpts', () => {
    it('should normalize according to the snapshot', () => {
      expect(scrolex._normalizeOpts({
        mode      : 'singlescroll',
        components: 'a>b>c',
      })).toMatchSnapshot()
    })
  })
  describe('_defaults', () => {
    it('should default according to the snapshot', () => {
      expect(scrolex._defaults({
        cwd       : '/tmp',
        tmpFiles  : false,
        mode      : 'singlescroll',
        components: 'a>b>c',
      })).toMatchSnapshot()
    })
  })
})
