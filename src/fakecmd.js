const runs     = process.argv[2] || process.env.FAKECMD_RUNS || 5
const interval = process.argv[3] || process.env.FAKECMD_INTERVAL || 1000
const crash    = process.env.FAKECMD_CRASH === '1'
let count      = 0

console.log(`Starting with runs=${runs}, interval=${interval}, crash=${crash}`)
setInterval(() => {
  count++
  if (count < runs) {
    console.log(`Doing thing ${count}`)
    return
  }
  console.log(`Doing thing ${count}. fakecmd with runs=${runs}, interval=${interval}, crash=${crash} done. `)
  if (crash) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}, interval)
