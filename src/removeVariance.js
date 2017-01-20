const stripAnsi = require('strip-ansi')
const path      = require('path')

const removeVariance = (str) => {
  if (str && str.message) {
    str.message = removeVariance(str.message)
  }
  if (`${str}` !== str) {
    for (let k in str) {
      str[k] = removeVariance(str[k])
    }
    return str
  }

  // // @todo: Remove this hack when stolex no longer adds trailing spinner frames:
  // cliSpinner.frames.forEach((frame) => {
  //   while (str.indexOf(frame) !== -1) {
  //     // console.log({str, frame})
  //     str = str.replace(frame, '---spinnerframe---')
  //   }
  // })

  const map = {
    SCROLEX_ROOT: path.resolve(path.join(__dirname, '..')),
    PWD         : process.cwd(),
    HOME        : process.env.HOME,
    USER        : process.env.USER,
  }

  for (let key in map) {
    let val = map[key]
    while (str.indexOf(val) !== -1) {
      str = str.replace(val, `#{${key}}`)
    }
  }

  str = stripAnsi(str)

  return str
}

module.exports = removeVariance
