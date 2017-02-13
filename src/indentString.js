// Taken from: https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/repeat#Polyfill
// for node 0.12 compat
const repeat = function (str, count) {
  'use strict'
  if (str == null) {
    throw new TypeError('can\'t convert ' + str + ' to object')
  }
  str = '' + str
  count = +count
  if (!count) {
    count = 0
  }
  if (count < 0) {
    throw new RangeError('repeat count must be non-negative')
  }
  if (count === Infinity) {
    throw new RangeError('repeat count must be less than infinity')
  }
  count = Math.floor(count)
  if (str.length === 0 || count === 0) {
    return ''
  }
  // Ensuring count is a 31-bit integer allows us to heavily optimize the
  // main part. But anyway, most current (August 2014) browsers can't handle
  // strings 1 << 28 chars or longer, so:
  if (str.length * count >= 1 << 28) {
    throw new RangeError('repeat count must not overflow maximum string size')
  }
  var rpt = ''
  for (;;) {
    if ((count & 1) === 1) {
      rpt += str
    }
    count >>>= 1
    if (count === 0) {
      break
    }
    str += str
  }
  // Could we try:
  // return Array(count + 1).join(str);
  return rpt
}

// Taken from https://github.com/sindresorhus/indent-string/blob/master/index.js
// Inlined so we can build it, and gain ES5 compatibility: https://travis-ci.org/kvz/lanyon/jobs/197398189#L1127
module.exports = (str, count, indent) => {
  indent = indent === undefined ? ' ' : indent
  count = count === undefined ? 1 : count

  if (typeof str !== 'string') {
    throw new TypeError(`Expected \`input\` to be a \`string\`, got \`${typeof str}\``)
  }

  if (typeof count !== 'number') {
    throw new TypeError(`Expected \`count\` to be a \`number\`, got \`${typeof count}\``)
  }

  if (typeof indent !== 'string') {
    throw new TypeError(`Expected \`indent\` to be a \`string\`, got \`${typeof indent}\``)
  }

  if (count === 0) {
    return str
  }

  return str.replace(/^(?!\s*$)/mg, repeat(indent, count))
}
