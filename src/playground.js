const scrolex = require('./Scrolex')
const debug   = require('depurar')('scrolex')

debug('Start')

scrolex.exe('ls -al', { components: 'frey>prepare', 'announce': true }, (err, stdout) => {
  if (err) { throw err }
  scrolex.scroll('a')
  scrolex.scroll('b')
  scrolex.scroll('c')
  scrolex.scroll('d')
  scrolex.stick('e')
  scrolex.scroll('f')
  scrolex.scroll('g')
  scrolex.exe(`node ${__dirname}/fakecmd.js 10`, { components: 'frey>install', 'announce': true }, (err, stdout) => {
    if (err) { throw err }
    scrolex.scroll('a')
    scrolex.scroll('b')
    scrolex.scroll('c')
    scrolex.scroll('d')
    scrolex.stick('e')
    scrolex.scroll('f')
    scrolex.scroll('g')
    scrolex.stick('yeah')
    scrolex.stick('yeah')
  })
})
