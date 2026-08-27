# Changelog

## [0.3.1](https://github.com/getvoicify/ngx-pipecat/compare/v0.3.0...v0.3.1) (2026-08-27)


### Bug Fixes

* **devices:** accumulate liveTracks from the track events, not client.tracks() ([#30](https://github.com/getvoicify/ngx-pipecat/issues/30)) ([c7154dc](https://github.com/getvoicify/ngx-pipecat/commit/c7154dcd229730c5174eeec4d32f3f6a51d9ea21))

## [0.3.0](https://github.com/getvoicify/ngx-pipecat/compare/v0.2.0...v0.3.0) (2026-08-27)


### ⚠ BREAKING CHANGES

* the library's services are no longer available from the root injector by self-registration; `providePipecat()` must be called in the injector (application root or a route's `providers`) that resolves them.

### Features

* provide Pipecat services from providePipecat() instead of root ([#26](https://github.com/getvoicify/ngx-pipecat/issues/26)) ([1f30005](https://github.com/getvoicify/ngx-pipecat/commit/1f30005f65451d76dc7266708d2bc73990f79f29))


### Bug Fixes

* **deps:** narrow @pipecat-ai/client-js peer range to ~1.13.0 ([#23](https://github.com/getvoicify/ngx-pipecat/issues/23)) ([7c11aef](https://github.com/getvoicify/ngx-pipecat/commit/7c11aefa8be684883229ba42130dcd1bf114cab0))
* **ssr:** never construct PipecatClient on the server platform ([#25](https://github.com/getvoicify/ngx-pipecat/issues/25)) ([19ce0f5](https://github.com/getvoicify/ngx-pipecat/commit/19ce0f573f6ef7e82c473f3b671776f387c9cf09))

## [0.2.0](https://github.com/getvoicify/ngx-pipecat/compare/v0.1.0...v0.2.0) (2026-08-24)


### Features

* add PipecatConversation transcript service ([#20](https://github.com/getvoicify/ngx-pipecat/issues/20)) ([59407c7](https://github.com/getvoicify/ngx-pipecat/commit/59407c774cf372c7c30683a99a09a4c37f4a30ab))
* add UI Worker Protocol dispatch layer ([#18](https://github.com/getvoicify/ngx-pipecat/issues/18)) ([75a0920](https://github.com/getvoicify/ngx-pipecat/commit/75a0920d613b713f1bb72ae5634c46d53e9f6c01))

## [0.1.0](https://github.com/getvoicify/ngx-pipecat/compare/v0.0.1...v0.1.0) (2026-08-24)


### Features

* add mic/cam/screen-share toggle directives ([#12](https://github.com/getvoicify/ngx-pipecat/issues/12)) ([a42ec3b](https://github.com/getvoicify/ngx-pipecat/commit/a42ec3b46b72a8920c366e02c123404e8b09de35))
* add PipecatAudio and PipecatVideo components ([#11](https://github.com/getvoicify/ngx-pipecat/issues/11)) ([6512f61](https://github.com/getvoicify/ngx-pipecat/commit/6512f614132cf2117db5f6457d24fa26387a4ead))
* add PipecatVoiceVisualizer component ([#13](https://github.com/getvoicify/ngx-pipecat/issues/13)) ([b3183ad](https://github.com/getvoicify/ngx-pipecat/commit/b3183adb7bf6062c9d587fd8a9bbb06b9451749d))
* add SSR support via NoopTransport platform guard ([#9](https://github.com/getvoicify/ngx-pipecat/issues/9)) ([f5dba5f](https://github.com/getvoicify/ngx-pipecat/commit/f5dba5f5a8b6561e8b7942a7f9cbb711587deab6))
