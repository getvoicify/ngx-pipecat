# Pipecat

Built on [Pipecat](https://github.com/pipecat-ai/pipecat).

An Angular-native wrapper around [`@pipecat-ai/client-js`](https://www.npmjs.com/package/@pipecat-ai/client-js).
It exposes the Pipecat client SDK as injectable Angular services backed by
signals and observables — connection state, device state, and messaging as
reactive state instead of a raw imperative client — while still giving full
event parity with the underlying SDK via `on()`.

## Install

Install alongside the SDK it wraps and a transport implementation of your
choice (e.g. Daily):

```bash
npm install @getvoicify/pipecat @pipecat-ai/client-js @pipecat-ai/daily-transport
```

`@angular/core` and `@angular/common` `^21.2.0` and `@pipecat-ai/client-js`
`~1.13.0` are peer dependencies. The `client-js` range is a tilde, not a
caret, because the official transports pin `~1.13.0` themselves — a caret
here would let you resolve a `client-js` minor your transport does not
support. The transport package (Daily, or any other `Transport`
implementation supported by `@pipecat-ai/client-js`) is a separate install —
this library has no dependency on any specific one.

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

### Scoping it to a lazy route

`providePipecat()` supplies every service in this library, so it works equally
well in a lazy route's `providers` array as at the application root. The
laziness has to reach the file holding the transport import, though: the
`import { DailyTransport }` statement is what pulls the vendor SDK in, so a
`providers` array that sits in an eagerly-imported route config buys you
nothing. `app.config.ts` calls `provideRouter(routes)`, which makes
`app.routes.ts` part of the initial chunk — and any static import at the top of
it too, however lazy the `loadComponent` below is.

So keep the transport out of `app.routes.ts` and point it at a route file that
is itself lazily loaded:

```typescript
// app.routes.ts — eagerly imported by app.config.ts, so no transport here.
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'voice',
    loadChildren: () => import('./voice/voice.routes').then((m) => m.VOICE_ROUTES),
  },
];
```

```typescript
// voice/voice.routes.ts — fetched only when someone visits /voice.
import { Routes } from '@angular/router';
import { providePipecat, PIPECAT_TRANSPORT } from '@getvoicify/pipecat';
import { DailyTransport } from '@pipecat-ai/daily-transport';

export const VOICE_ROUTES: Routes = [
  {
    path: '',
    providers: [
      providePipecat(),
      { provide: PIPECAT_TRANSPORT, useFactory: () => new DailyTransport() },
    ],
    loadComponent: () => import('./voice-page').then((m) => m.VoicePage),
  },
];
```

Measured on this repo's demo app with `ng build` (production) and the Daily
transport:

| where the providers and the transport import live | initial bundle |
| --- | --- |
| no voice route at all (baseline) | 218.81 kB |
| `app.routes.ts` (eagerly imported) | 616.77 kB |
| `voice.routes.ts` (behind `loadChildren`) | 223.30 kB |

The middle row is the trap: it reads as lazy and is not. `loadComponent` duly
defers the component — all 402 bytes of it — while the SDK it was meant to
defer has already shipped in the initial chunk, overshooting Angular's default
500 kB initial budget by 116.77 kB. The same two providers behind
`loadChildren` leave the initial bundle 4.49 kB above the no-voice baseline and
move ~394 kB into chunks that are fetched only when someone visits `/voice`.

Both forms are supported; use the root one when the client should be available
application-wide.

By default, `providePipecat()` disconnects the client automatically when its
providing injector is destroyed, and `{ persistOnRoute: true }` opts out of
that. Neither applies to route-scoped usage. Angular does not destroy the
environment injector it creates for a `Route.providers` array when you navigate
away from that route: probed on Angular 21.2 with a real `provideRouter`, the
route client's `disconnect()` was called 0 times after navigating to another
route, 0 times after `Router.resetConfig([])`, and 0 times after the whole test
environment was torn down — while destroying an environment injector directly
called it once, so the teardown hook itself works. On a route, therefore, the
automatic disconnect never fires and `persistOnRoute` has no effect: leaving
the voice route keeps the microphone and the connection live. Disconnect
explicitly from the component's own teardown instead.

```typescript
import { Component, DestroyRef, inject } from '@angular/core';
import { Pipecat } from '@getvoicify/pipecat';

@Component({ /* ... */ })
export class VoicePage {
  private readonly pipecat = inject(Pipecat);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pipecat.disconnect());
  }
}
```

## Service surface

### `Pipecat`

The main facade, covering connection lifecycle:

- `connect(params?)` / `disconnect()`
- `startBot(params)` — starts a bot without connecting a transport, returns the SDK's response promise
- `startBotAndConnect(params)` — starts a bot and connects in one call
- `disconnectBot()`
- `state` / `error` — signals derived from `TransportStateChanged` and `Error` events (and from rejected promises on the calls above)
- `on(event)` — full event parity, see below
- `.devices`, `.messaging`, `.functions`, `.uiCommands`, `.jobGroups`, `.conversation` — the sibling services below, aggregated for convenience

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

### `Pipecat.conversation` (`PipecatConversation`)

Builds a text transcript from the bot's transcription/LLM-output event
stream:

- `turns` — a signal of committed `{ role: 'user' | 'bot', text, timestamp }`
  entries, in chronological order.
- `currentUserPartial` / `currentBotPartial` — live in-flight text: interim
  speech-to-text while the user is talking, and the bot's response as it
  streams in, before either commits to `turns`.
- `clear()` — resets everything.

A user turn commits when the transcription event is marked final; a bot turn
commits when the bot's LLM finishes generating (an LLM-stop with no
accumulated text produces no phantom empty turn). This is scoped to text
content only — it does not track speaking-activity events (no "user
started/stopped speaking" indicators).

```html
@for (turn of pipecat.conversation.turns(); track turn.timestamp) {
  <p [class]="turn.role">{{ turn.text }}</p>
}
@if (pipecat.conversation.currentUserPartial(); as partial) {
  <p class="user pending">{{ partial }}</p>
}
@if (pipecat.conversation.currentBotPartial(); as partial) {
  <p class="bot pending">{{ partial }}</p>
}
```

### `Pipecat.uiCommands` (`PipecatUICommands`)

Dispatches inbound `ui-command` bot messages to handlers registered by name:
`registerCommandHandler(command, handler)` /
`unregisterCommandHandler(command)` — the same idiom as
`PipecatFunctions.registerFunctionCallHandler`. A command with no registered
handler warns instead of throwing, and a handler that throws doesn't break
dispatch for subsequent commands.

### `Pipecat.jobGroups` (`PipecatUIJobGroups`)

Aggregates the bot's `ui-job-group` event stream — a multi-worker async job
lifecycle: started → per-worker updates → per-worker completed → group
completed — into a `jobGroups` signal keyed by job id, with per-worker
`status`/`latestUpdate`/`response`. Completed groups stay in state until the
app explicitly clears them via `clearJobGroup(jobId)` /
`clearCompletedJobGroups()` — they are not auto-removed.
`Pipecat.messaging.cancelUIJobGroup(jobId, reason?)` is the way to ask the
server to cancel one.

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

## UI Worker Protocol

`registerDefaultUICommandHandlers(uiCommands)` registers the three standard
built-in commands the protocol documents — `click`, `set_input_value`,
`select_text` — letting the bot click elements, write into form fields, and
change text selection on the page. This is real DOM-mutating behavior, which
is exactly why it's opt-in rather than automatic: nothing in the library
calls it for you.

It resolves target elements via `ref` (a snapshot-assigned reference id, from
the SDK's accessibility-snapshot system) or `target_id` (a plain DOM element
id), trying `ref` first. It refuses to write into `disabled`/`readonly`/
`hidden` inputs. It's SSR-safe: it no-ops on the server, and never throws.

```ts
import { inject } from '@angular/core';
import { PipecatUICommands, registerDefaultUICommandHandlers } from '@getvoicify/pipecat';

// once, e.g. in a root component or app initializer
registerDefaultUICommandHandlers(inject(PipecatUICommands));

// registering your own custom command, alongside the built-ins
inject(PipecatUICommands).registerCommandHandler('open_settings_dialog', (payload) => {
  // ...
});
```

Job-group state — multi-step async worker jobs the bot dispatches — is
tracked separately via `Pipecat.jobGroups`, documented above in the service
surface section.

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

On the server platform this library is **inert**. `providePipecat()` resolves
a no-op stand-in client: no transport is constructed (your transport factory
is never invoked), no `PipecatClient` is constructed, no events ever fire, and
every signal stays at its initial value. Server-rendered markup therefore
shows the disconnected/initial state, and the real `PipecatClient` — backed by
your `PIPECAT_TRANSPORT` — is constructed on the browser platform only. It is
built fresh once the application hydrates and carries no state across from the
server render: the application hydrates, the client does not.

Both halves of that guard are load-bearing. Your transport (Daily, WebSocket,
or any other `Transport` implementation) touches browser-only APIs like WebRTC
and `navigator.mediaDevices` just by being instantiated; the SDK's
`PipecatClient` constructor separately evaluates a bare `window` reference,
which throws `ReferenceError` under Node rather than resolving to `undefined`.

One consequence is worth knowing: on the server the lifecycle calls resolve
without doing anything. `connect()` and `startBotAndConnect()` resolve a
placeholder `BotReadyData` of `{ version: '' }` and `startBot()` resolves
`undefined`, having connected nothing. They resolve rather than reject because
`Pipecat.connect()` and `startBotAndConnect()` are fire-and-forget — they only
attach a `.catch()` to a promise they never hand back — so a server-side
rejection would push a spurious error into `error` on every render, and any
consumer calling the client directly without a handler would raise an
unhandled rejection. Code that `await`s these calls must therefore not treat
resolution as proof of a connection; read `state` instead.

You don't need to guard `providePipecat()` or your transport factory against
the server platform yourself.

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
