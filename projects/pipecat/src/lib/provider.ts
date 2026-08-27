import { isPlatformServer } from '@angular/common';
import {
  DestroyRef,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  PLATFORM_ID,
} from '@angular/core';
import { PipecatClient } from '@pipecat-ai/client-js';
import { PipecatConversation } from './conversation';
import { PipecatDevices } from './devices';
import { PipecatFunctions } from './functions';
import { PipecatMessaging } from './messaging';
import { asPipecatClient, NoopPipecatClient } from './noop-pipecat-client';
import { Pipecat } from './pipecat';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { PipecatUICommands } from './ui-commands';
import { PipecatUIJobGroups } from './ui-job-groups';
import { PipecatClientConfig } from './types';

export function providePipecat(config: PipecatClientConfig = {}): EnvironmentProviders {
  const { persistOnRoute = false, ...options } = config;
  return makeEnvironmentProviders([
    {
      provide: PIPECAT_CLIENT,
      useFactory: () => {
        // On the server platform this library is inert end to end — neither half
        // of the pair is safe to construct under `@angular/ssr`:
        //
        //  * the transport, because inject(PIPECAT_TRANSPORT) runs the consumer's
        //    factory, which builds a real, concrete Transport implementation
        //    (Daily, WebSocket, etc.) that likely touches browser-only globals
        //    (WebRTC APIs, navigator.mediaDevices) just by being instantiated;
        //  * the client itself, because `new PipecatClient(...)` reaches the SDK's
        //    `learnAboutClient()` helper, which evaluates a bare
        //    `window?.navigator?.userAgent`. Optional chaining does NOT protect an
        //    *undeclared* identifier, so under Node that throws
        //    `ReferenceError: window is not defined` and takes the whole render
        //    down — substituting only the transport is not enough.
        //
        // So return an inert NoopPipecatClient (which owns a NoopTransport, and
        // therefore never triggers the consumer's factory) and construct the real
        // client on the browser platform only.
        if (isPlatformServer(inject(PLATFORM_ID))) {
          return asPipecatClient(new NoopPipecatClient());
        }
        const client = new PipecatClient({ ...options, transport: inject(PIPECAT_TRANSPORT) });
        if (!persistOnRoute) {
          inject(DestroyRef).onDestroy(() => {
            client.disconnect().catch(() => {});
          });
        }
        return client;
      },
    },
    // Every service is provided HERE rather than carrying `providedIn: 'root'`
    // (issue #22 §1). Angular instantiates a `providedIn: 'root'` service in the
    // ROOT environment injector no matter which injector asked for it, so a
    // `PIPECAT_CLIENT` supplied by `providePipecat()` inside a lazy route's
    // `providers` array was invisible to them and consumers hit
    // `NG0201: No provider found for InjectionToken Pipecat client`.
    // That forced registration at the application root, which drags the
    // consumer's transport factory — and its transitive vendor SDK, e.g.
    // `@daily-co/daily-js` — into the INITIAL bundle of every route, including
    // the routes that never touch voice. Listing the classes here binds them to
    // whichever environment injector ran `providePipecat()`, so the whole
    // library (and the transport it pulls in) can be confined to one lazy route.
    Pipecat,
    PipecatDevices,
    PipecatMessaging,
    PipecatFunctions,
    PipecatUICommands,
    PipecatUIJobGroups,
    PipecatConversation,
  ]);
}
