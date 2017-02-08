const limit    = process.argv[2] || process.env.FAKECMD_RUNS || 10
const interval = process.argv[3] || process.env.FAKECMD_INTERVAL || 1000
const errorOut = process.env.FAKECMD_CRASH === '1'
let count      = 0

console.log({limit, p: process.argv, e: process.env})

console.log(`Starting with limit=${limit}, interval=${interval}, errorOut=${errorOut}`)
setInterval(() => {
  count++
  if (count < limit) {
    console.log(`Doing thing ${count}`)
    return
  }
  console.log(`Doing thing ${count}. fakecmd with limit=${limit}, interval=${interval}, errorOut=${errorOut} done. `)
  if (errorOut) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}, interval)
