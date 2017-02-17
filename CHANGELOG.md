# Changelog

## Ideabox

Unreleased and unplanned todos

- [ ] 

## master

Released: TBA.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.26...master).

- [ ] 

## v0.0.26

Released: 2017-02-17.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.25...v0.0.26).

- [x] Add additional `is-travis` check as it seems to have a TTY

## v0.0.25

Released: 2017-02-17.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.24...v0.0.25).

- [x] Default to `passthru` `mode` when there is no TTY (such as on Travis)

## v0.0.24

Released: 2017-02-16.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.23...v0.0.24).

- [x] Add support for `extraComponents`

## v0.0.23

Released: 2017-02-16.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.22...v0.0.23).

- [x] Allow to change the `showCmd` via `opts` or `cbPreLinefeed`

## v0.0.22

Released: 2017-02-16.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.21...v0.0.22).

- [x] Fix bug where fullCmd did not include first item of passed array

## v0.0.21

Released: 2017-02-13.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.20...v0.0.21).

- [x] Fix bug that truncated lines too soon
- [x] Fix bug that could leave trailing checkmarks

## v0.0.20

Released: 2017-02-13.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.19...v0.0.20).

- [x] Use a String.repeat polyfil for Node 0.12 compat
- [x] Instead of truncating lines, break them off and insert new line at breakpoint (in case the line is sticky)

## v0.0.19

Released: 2017-02-11.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.18...v0.0.19).

- [x] Use older deps so it still works on legacy nodes (https://travis-ci.org/kvz/lanyon/jobs/200646703#L1043)
- [x] Fix `persistOpts` bug

## v0.0.18

Released: 2017-02-11.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.18...v0.0.17).

- [x] Fix `persistOpts` bug

## v0.0.17

Released: 2017-02-11.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.17...v0.0.16).

- [x] Introduce `success()`
- [x] Introduce a neutral sticky frame for when there is no exit `code`
- [x] Truncate by default when scrolling
- [x] Fix bug that could lead to duplicate sticky lines
- [x] Fix double spacing when there's no prefix
- [x] Do not inherit options between calls. Only listen to `persistOpts`
- [x] Add method: `failure`
- [x] Document `env`

## v0.0.16

Released: 2017-02-09.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.16...v0.0.15).

- [x] Make it safe (although not necessarily pretty) to run multiple executes at once
- [x] Add `setOpts` command
- [x] Fix bug where spinner would keep running if 2 commands are executed

## v0.0.15

Released: 2017-02-08.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.15...v0.0.14).

- [x] Add README and demo
- [x] Add global state

## v0.0.14

Released: 2017-02-03.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.14...v0.0.13).

- [x] Bugfixes

## v0.0.13

Released: 2017-02-02.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.13...v0.0.12).

- [x] Introduce `silent` mode

## v0.0.12

Released: 2017-02-02.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.11...v0.0.12).

- [x] Optionally flush `out`, instead of always

## v0.0.11

Released: 2017-02-02.
[Diff](https://github.com/kvz/scrolex/compare/v0.0.10...v0.0.11).

- [x] Fix bug when passing array to scrolex

## v0.0.10

Released: 2017-02-02.
[Diff](https://github.com/kvz/scrolex/compare/431c258605b96acbf1a1779d40bf2e0bfb944bd5...v0.0.10).

- [x] Started a CHANGELOG.md
