const spawn = require('child_process').spawn
const child = spawn('node', [`${__dirname}/playground.js`], { stdio: 'pipe' })
child.stdout.on('data', (data) => {
  process.stdout.write(`${data}`)
})
child.stderr.on('data', (data) => {
  process.stderr.write(`${data}`)
})
child.on('close', (code) => {
  if (code !== 0) {
    console.log(`child process exited with code ${code}`)
  }
  console.log(`Done`)
})
child.on('error', (err) => {
  console.error(err)
})
