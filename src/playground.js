const scrolex = require('./Scrolex')

const mode     = process.argv[2] || 'singlescroll'
const runs     = process.argv[3] || process.env.FAKECMD_RUNS || 5
const interval = process.argv[4] || process.env.FAKECMD_INTERVAL || 1000

scrolex.exe('ls -al', { mode: mode, components: 'myapp>prepare', 'announce': true }, (err, stdout) => {
  if (err) { throw err }
  scrolex.scroll('I get overwritten: a')
  scrolex.scroll('I get overwritten: b')
  scrolex.scroll('I get overwritten: c')
  scrolex.scroll('I get overwritten: d')
  scrolex.stick('I stick around: e')
  scrolex.scroll('I get overwritten: f')
  scrolex.scroll('I get overwritten: g (except the prefix changed, so i stick around, after all)')
  scrolex.exe(`node ${__dirname}/fakecmd.js ${runs} ${interval}`, { mode: mode, components: 'myapp>install', 'announce': true }, (err, stdout) => {
    if (err) { throw err }
    scrolex.scroll('I get overwritten: h')
    scrolex.scroll('I get overwritten: i')
    scrolex.scroll('I get overwritten: k')
    scrolex.scroll('I get overwritten: l')
    scrolex.stick('I stick around: m')
    scrolex.scroll('I get overwritten: n')
    scrolex.scroll('I get overwritten: o')
    scrolex.stick('I stick around: p')
    scrolex.stick('I stick around: q')

    // ;(async () => {
    //   try {
    //     const cores = await scrolex.exe('getconf _NPROCESSORS_ONLN')
    //     scrolex.exe(`echo "You have ${cores} cpu cores"`)
    //   } catch (err) {
    //     throw new Error(err)
    //   }
    // })()
  })
})
