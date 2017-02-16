const mode     = process.argv[2] || 'singlescroll'
const runs     = process.argv[3] || process.env.FAKECMD_RUNS || 5
const interval = process.argv[4] || process.env.FAKECMD_INTERVAL || 1000

const scrolex = require('./Scrolex')

scrolex.persistOpts({
  mode      : mode,
  components: 'myapp>prepare',
  announce  : true,
})

let opts1 = {
  addCommandAsComponent: true,
  cbPreLinefeed        : function (type, line, { flush = false, code = undefined }, callback) {
    let parts = (line + '').split(/\s+/)
    let leader = parts.shift()
    let remain = parts.join(' ')

    this._local.lastShowCmd = leader

    return callback(null, remain)
  },
}

scrolex.stick('Welcome')
scrolex.exe(['ls', '-al'], opts1, (err, stdout) => {
  if (err) { throw err }
  scrolex.scroll('I get overwritten: a')
  scrolex.scroll('I get overwritten: b')
  scrolex.scroll('I get overwritten: c')
  scrolex.scroll('I get overwritten: d')
  scrolex.stick('I stick around: e -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line')
  scrolex.scroll('I get overwritten: f')
  scrolex.scroll('I get overwritten: g (except the prefix changed, so i stick around, after all)')
  scrolex.exe(`node ${__dirname}/fakecmd.js ${runs} ${interval}`, { components: 'myapp>install' }, (err, stdout) => {
    if (err) { throw err }
    scrolex.stick('I stick around: h')
    scrolex.scroll('I get overwritten: i')
    scrolex.scroll('I get overwritten: k')
    scrolex.scroll('I get overwritten: l')
    scrolex.stick('I stick around: m')
    scrolex.scroll('I get overwritten: n')
    scrolex.scroll('I get overwritten: o')
    scrolex.stick('I stick around: p')
    scrolex.stick('I stick around: q')

    scrolex.exe('ls -al', { mode: 'passthru' }, (err, stdout) => {
      if (err) { throw err }
      scrolex.success('oh yes')
      scrolex.failure('oh noes')
      scrolex.scroll('I stick around: e -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line -- very long line')
      process.exit(0)
    })

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

scrolex.stick('I stick around: 0')
scrolex.stick('I stick around: 1')
