const scrolex = require('./Scrolex')

scrolex.exe('ls -al', { components: 'myapp>prepare', 'announce': true }, (err, stdout) => {
  if (err) { throw err }
  scrolex.scroll('I get overwritten: a')
  scrolex.scroll('I get overwritten: b')
  scrolex.scroll('I get overwritten: c')
  scrolex.scroll('I get overwritten: d')
  scrolex.stick('I stick around: e')
  scrolex.scroll('I get overwritten: f')
  scrolex.scroll('I get overwritten: g (except the leader changes, so i stick around, after all)')
  scrolex.exe(`node ${__dirname}/fakecmd.js`, { components: 'myapp>install', 'announce': true }, (err, stdout) => {
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
  })
})
