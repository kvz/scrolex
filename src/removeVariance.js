const stripAnsi = require('strip-ansi')
const path      = require('path')

const removeVariance = (input) => {
  if (input && input.message) {
    input.message = removeVariance(input.message)
  }
  if (`${input}` !== input) {
    for (let k in input) {
      input[k] = removeVariance(input[k])
    }
    return input
  }

  const map = {
    SCROLEX_ROOT: path.resolve(path.join(__dirname, '..')),
    PWD         : process.cwd(),
    HOME        : process.env.HOME,
    USER        : process.env.USER,
  }

  for (let key in map) {
    let val = map[key]
    while (input.indexOf(val) !== -1) {
      input = input.replace(val, `#{${key}}`)
    }
  }

  input = stripAnsi(input)

  return input
}

module.exports = removeVariance
