const limit    = process.argv[2] || process.env.MOCK_LIMIT || 10
const interval = process.argv[3] || process.env.MOCK_INTERVAL || 1000
const errorOut = process.env.MOCK_ERROR_OUT === '1'
let count      = 0

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
