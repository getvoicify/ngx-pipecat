# Pipecat

Built on [Pipecat](https://github.com/pipecat-ai/pipecat).

An Angular-native wrapper around [`@pipecat-ai/client-js`](https://www.npmjs.com/package/@pipecat-ai/client-js).
It exposes the Pipecat client SDK as injectable Angular services backed by
signals and observables — connection state, device state, and messaging as
reactive state instead of a raw imperative client — while still giving full
event parity with the underlying SDK via `on()`.

## Install

This library is not yet published to npm; this section will be filled in
once it is. Once published, install alongside the SDK it wraps and a
transport implementation of your choice (e.g. Daily):

```bash
npm install @getvoicify/pipecat @pipecat-ai/client-js @pipecat-ai/daily-transport
```

`@angular/core` and `@angular/common` `^21.2.0` and `@pipecat-ai/client-js`
`^1.13.0` are peer dependencies. The transport package (Daily, or any other
`Transport` implementation supported by `@pipecat-ai/client-js`) is a
separate install — this library has no dependency on any specific one.

## Quick start

Provide the client in your app config with `providePipecat()`, and provide
`PIPECAT_TRANSPORT` with a concrete `Transport` instance:

```typescript
import { ApplicationConfig } from '@angular/core';
import { providePipecat, PIPECAT_TRANSPORT } from '@getvoicify/pipecat';
import { DailyTransport } from '@pipecat-ai/daily-transport';

export const appConfig: ApplicationConfig = {
  providers: [
    providePipecat({
      /* PipecatClientOptions, minus `transport` */
    }),
    { provide: PIPECAT_TRANSPORT, useFactory: () => new DailyTransport() },
  ],
};
```

Then inject `Pipecat` and connect:

```typescript
import { Component, inject } from '@angular/core';
import { Pipecat } from '@getvoicify/pipecat';

@Component({ /* ... */ })
export class VoiceWidget {
  private readonly pipecat = inject(Pipecat);

  readonly state = this.pipecat.state;
  readonly error = this.pipecat.error;

  start(): void {
    this.pipecat.startBotAndConnect({ endpoint: '/api/start-bot' });
  }
}
```

`state` and `error` are signals derived from the client's own transport-state
and error events, so templates can react to connection status directly
without subscribing to anything manually.

By default, `providePipecat()` disconnects the client automatically when its
providing injector is destroyed. Pass `{ persistOnRoute: true }` to opt out
(e.g. for a client that should survive route changes).

## Service surface

### `Pipecat`

The main facade, covering connection lifecycle:

- `connect(params?)` / `disconnect()`
- `startBot(params)` — starts a bot without connecting a transport, returns the SDK's response promise
- `startBotAndConnect(params)` — starts a bot and connects in one call
- `disconnectBot()`
- `state` / `error` — signals derived from `TransportStateChanged` and `Error` events (and from rejected promises on the calls above)
- `on(event)` — full event parity, see below
- `.devices`, `.messaging`, `.functions` — the sibling services below, aggregated for convenience

### `Pipecat.devices` (`PipecatDevices`)

Microphone/camera/speaker/screen-share state and control: signals for
`mediaState`, `selectedMic`, `selectedCam`, `selectedSpeaker`, plus methods
to enumerate devices (`getAllMics`/`getAllCams`/`getAllSpeakers`), select or
toggle them (`updateMic`/`updateCam`/`updateSpeaker`,
`enableMic`/`enableCam`/`enableScreenShare`), and query current state
(`isMicEnabled`, `isCamEnabled`, `isSharingScreen`, `tracks`, `needsInit`,
`initDevices`).

Two more signal pairs worth calling out:

- `micEnabled`, `camEnabled`, `sharingScreen` — readonly signals mirroring
  `isMicEnabled()`/`isCamEnabled()`/`isSharingScreen()`, but reactive: they
  update whenever `enableMic()`/`enableCam()`/`enableScreenShare()` (or the
  toggle directives below, which call the same methods) change the
  corresponding state, so templates can bind to them directly instead of
  polling the method form.
- `liveTracks` — a signal snapshot of `tracks()` that re-emits on every
  track-lifecycle event (mic/cam/screen-share started or stopped, for both
  the local participant and the bot). This is what `PipecatAudio` and
  `PipecatVideo` (below) bind to internally.

### `Pipecat.messaging` (`PipecatMessaging`)

Sending data to and from the bot: `sendClientMessage`, `sendUIEvent`,
`sendDTMF`, `sendClientRequest`, `sendText`, `appendToContext`, plus the UI
snapshot streaming controls (`startUISnapshotStream`,
`stopUISnapshotStream`, `cancelUIJobGroup`).

### `Pipecat.functions` (`PipecatFunctions`)

Registering handlers the bot can invoke as function/tool calls:
`registerFunctionCallHandler`, `unregisterFunctionCallHandler`,
`unregisterAllFunctionCallHandlers`.

## DOM components

### `PipecatAudio`

Renders the bot's audio track (if any) into an `<audio autoplay>` element via
`srcObject`. It has no inputs — drop it in wherever you want bot audio to
play:

```html
<gvo-pipecat-audio />
```

### `PipecatVideo`

Renders a participant's video track (if any) into a `<video autoplay>`
element via `srcObject`. The `participantType` input selects whose video:
`'local'` for the local participant, `'bot'` for the bot.

```html
<gvo-pipecat-video participantType="local" />
<gvo-pipecat-video participantType="bot" />
```

Both components read from `Pipecat.devices`' live track state, so a track
starting or ending — mic, camera, or screen-share, for either participant —
is reflected automatically without any manual wiring.

## Toggle directives

`PipecatMicToggle` (`gvoPipecatMicToggle`), `PipecatCamToggle`
(`gvoPipecatCamToggle`), and `PipecatScreenShareToggle`
(`gvoPipecatScreenShareToggle`) are attribute directives, not components —
apply one to your own element (typically a `<button>`) and it imposes no
styling of its own. Each toggles the corresponding device on click and
exposes its live `enabled` signal through the directive's `exportAs` name,
readable via a template-reference variable:

```html
<button gvoPipecatMicToggle #t="gvoPipecatMicToggle">
  {{ t.enabled() ? 'Mute' : 'Unmute' }}
</button>

<button gvoPipecatCamToggle #c="gvoPipecatCamToggle">
  {{ c.enabled() ? 'Stop video' : 'Start video' }}
</button>

<button gvoPipecatScreenShareToggle #s="gvoPipecatScreenShareToggle">
  {{ s.enabled() ? 'Stop sharing' : 'Share screen' }}
</button>
```

## `PipecatVoiceVisualizer`

Renders a bar-style visualization of a participant's audio level onto a
`<canvas>`. The `participantType` input selects whether the bars are driven
by the local participant's or the bot's audio level.

```html
<gvo-pipecat-voice-visualizer participantType="bot" />
```

Optional inputs tune the bars: `barCount` (default `5`), `barGap` (`12`),
`barWidth` (`30`), `barMaxHeight` (`120`), `barLineCap`
(`'round' | 'square'`, default `'round'`), and `barOrigin`
(`'bottom' | 'center' | 'top'`, default `'center'`).

### Theming

Bar and background color aren't hardcoded — they resolve through CSS custom
properties, so the visualizer picks up your design tokens with zero
component configuration:

```css
gvo-pipecat-voice-visualizer {
  --gvo-pipecat-visualizer-bar-color: #6366f1;
  --gvo-pipecat-visualizer-background-color: #1e1b4b;
}
```

If a custom property isn't set, the bar color falls back to the element's
computed `color` (so it inherits ambient text color for free) and the
background stays `transparent`. For the rare case a CSS custom property
isn't practical — e.g. a color computed at runtime — the `barColor` and
`backgroundColor` inputs take precedence over the CSS custom property
whenever they're provided.

## SSR

This library works out of the box under `@angular/ssr` — no configuration
needed. Constructing your transport (Daily, WebSocket, or any other
`Transport` implementation) touches browser-only APIs like WebRTC and
`navigator.mediaDevices`, so `providePipecat()` defers that construction
until the app is actually running in the browser. You don't need to guard
`providePipecat()` or your transport factory against the server platform
yourself.

## Full event parity: `on()` / `fromClientEvent()`

The services above curate the events that map naturally to signals, but the
underlying SDK emits a much larger set of `RTVIEvent`s. `Pipecat.on(event)`
mirrors the client's own `client.on(event, callback)` as an Observable, so
any `RTVIEvent` is reachable reactively even if it isn't exposed as a
dedicated signal:

```typescript
this.pipecat.on(RTVIEvent.BotTranscript).subscribe((data) => {
  /* ... */
});
```

This is built on the standalone `fromClientEvent(client, event)` helper
(`projects/pipecat/src/lib/events.ts`), which is fully typed per-event via
the SDK's own `RTVIEventHandler` map — no manual type parameters needed at
call sites. Note it only captures the first argument of multi-argument event
handlers.

## Caveat: `HttpClient` / interceptor bypass

`connect()` (when passed the deprecated `ConnectionEndpoint`-shaped param,
not the common `TransportConnectionParams` case), `startBot()`, and
`startBotAndConnect()` all end up calling the SDK's internal request helper,
which issues a raw `fetch()` call directly rather than going through
Angular's `HttpClient`. That means registered `HttpInterceptor`s — auth
header injection, XSRF protection, retry, logging — never run for these
specific requests. If your endpoint needs auth or other headers an
interceptor would normally add, attach them manually via the call's
`headers` param.

## Testing

To execute unit tests, run:

```bash
ng test pipecat
```

## Releasing

Releases are automated with [release-please](https://github.com/googleapis/release-please).
Commits on `main` must follow [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `chore:`, `docs:`, etc.); a breaking change is `feat!:`/`fix!:`
or a `BREAKING CHANGE:` footer. release-please keeps an open "release PR" that
accumulates the pending version bump and changelog for every conventional
commit since the last release — merging that PR cuts the release (tags
`v{version}` and updates `CHANGELOG.md`), which triggers the existing
`publish.yml` workflow to build and publish to npm automatically. No manual
tagging or `npm publish` is needed.

## License

[BSD-2-Clause](./LICENSE)
