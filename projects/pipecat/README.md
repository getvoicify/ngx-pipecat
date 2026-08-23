# Pipecat

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
npm install pipecat @pipecat-ai/client-js @pipecat-ai/daily-transport
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
import { providePipecat, PIPECAT_TRANSPORT } from 'pipecat';
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
import { Pipecat } from 'pipecat';

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

### `Pipecat.messaging` (`PipecatMessaging`)

Sending data to and from the bot: `sendClientMessage`, `sendUIEvent`,
`sendDTMF`, `sendClientRequest`, `sendText`, `appendToContext`, plus the UI
snapshot streaming controls (`startUISnapshotStream`,
`stopUISnapshotStream`, `cancelUIJobGroup`).

### `Pipecat.functions` (`PipecatFunctions`)

Registering handlers the bot can invoke as function/tool calls:
`registerFunctionCallHandler`, `unregisterFunctionCallHandler`,
`unregisterAllFunctionCallHandlers`.

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
