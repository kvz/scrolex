[![Build Status](https://travis-ci.org/kvz/scrolex.svg?branch=master)](https://travis-ci.org/kvz/scrolex)

# scrolex

It's like a ⌚ Rolex, except it has nothing to do with Rolexes and executes commands instead.

Scrolex executes commands, captures & scrolls back the output, optionally prefixing and overwriting each last line with the next. Here, a demo works better:

## Demo

<div align="center">
Let's run scrolex in our `playground.js` to demo three of its modes: `silent`, `passthru`, and `singlescroll`.

<br>
<img alt="Scrolex demo" src="https://github.com/kvz/scrolex/raw/master/scripts/demo1.gif">
<br>
</div>

## Install

```bash
yarn add scrolex || npm install scrolex --save
```

## Use

First, require scrolex:

```js
const scrolex = require('scrolex')
```

Execute a shell command:

```js
scrolex.exe('ls -al', { }, (err, stdout) => {
  const lsOutput = stdout
})
```

Execute without a shell:

```js
scrolex.exe(['/bin/sh', 'ls', '-al'], { }, (err, stdout) => {
  const lsOutput = stdout
})
```

Do not copy the command's output to the terminal:

```js
scrolex.exe('ls -al', { mode: 'silent' }, (err, stdout) => {
  const lsOutput = stdout
})
```

Overrule environment

```js
scrolex.exe('ls -al', { env: { YOUR_SECRET: 'not-safe-with-me' } }, (err, stdout) => {
  const lsOutput = stdout
})
```

Announce the command you are executing:

```js
scrolex.exe('ls -al', { announce: true }, (err, stdout) => {
  const lsOutput = stdout
})

// Announce also leaves a sticky line: `Successfully executed: ls -al` or `Failed to execute: ls -al`
```

Prefix output with ` ✔ myapp ❯ prepare ❯`:

```js
scrolex.exe('ls -al', { components: 'myapp>prepare' }, (err, stdout) => {
  const lsOutput = stdout
})
```

Add some ephemeral output, respecting the currently set prefix:

```js
scrolex.scroll('i will be overwritten by anything with the same prefix')
```

Add some sticky output, respecting the currently set prefix:

```js
scrolex.stick('i will stick around, no matter what')
```

Use `async/await` for shell-scripting super-powers ⚡

```js
const serialExecution = async () => {
  try {
    const cores = await scrolex.exe('getconf _NPROCESSORS_ONLN')
    if (cores > 10) {
      await scrolex.stick(`You have ${cores} cpu cores. Amazing!`)
    }
    const processTree = await scrolex.exe('ps auxf', { silent: true })
  } catch (err) {
    throw new Error(err)
  }  
}
serialExecution()
```

Use `Promises` for ... yeah why would you. But the important thing is you _can_!:

```js
scrolex.exe('ls -al')
  .then((stdout) => {
    const lsOutput = stdout
  })
  .catch((err) => {
    throw new Error(err)
  })
```

## Options

### `fatal`

If set to `true`, whenever `exe` yields a non-zero exit code, the whole process stops with a dump of the combined
stderr & stdout on-screen. Useful for shell-scripting tasks. Default: `false`.

### `env`

Allows to specify the executed program's environment. If you want to add environment on top of the current environment use something like:

```js
env: Object.assign({}, process.env, {
  YOUR_SECRET: 'not-safe-with-me',
}),
```

Default: `process.env`.

## Global State (?!?!!!?‼️❓)

Yes, by default Scrolex uses global state (`global.scrolex`) within a Node process to keep track of output
and so that options can be re-used across instances if you set them with `persistOpts`. This makes it so
that consequent calls can be lightweight, as well as the output consistent looking.

If you'd rather ditch convenience in favor of strictness, or this causes a hard time testing, 
you are welcome to pass in your own state object, and Scrolex will happily use that instead:

```js
const myLocalStateObject = {}
scrolex.exe('ls -al', { state: myLocalStateObject })
```

You can even pass a new state object each time to avoid any kind of magic inheritance:


```js
scrolex.exe('ls -al', { state: {} })
```

Here's how to make all subsequent `scrolex.exe()` calls add their currently executing command
to the prefix:

```js
scrolex.persistOpts({
  addCommandAsComponent: true
})
```

You can also persist upon requiring:

```js
const scrolex = require('./Scrolex').persistOpts({
  mode: 'silent',
})
scrolex.exe('ls -al', (err, out) => {
  
})
```

## Todo

See [CHANGELOG.md](CHANGELOG.md)

## Changelog

See [CHANGELOG.md](CHANGELOG.md)

## Authors

- [Kevin van Zonneveld](https://transloadit.com/about/#kevin)

## License

Copyright (c) 2017 Kevin van Zonneveld. Licenses under [MIT](LICENSE).
