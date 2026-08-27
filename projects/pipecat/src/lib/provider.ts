import { isPlatformServer } from '@angular/common';
import {
  DestroyRef,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  PLATFORM_ID,
} from '@angular/core';
import { PipecatClient } from '@pipecat-ai/client-js';
import { asPipecatClient, NoopPipecatClient } from './noop-pipecat-client';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
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
  ]);
}
