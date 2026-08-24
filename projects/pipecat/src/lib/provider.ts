import { isPlatformServer } from '@angular/common';
import {
  DestroyRef,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  PLATFORM_ID,
} from '@angular/core';
import { PipecatClient } from '@pipecat-ai/client-js';
import { NoopTransport } from './noop-transport';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { PipecatClientConfig } from './types';

export function providePipecat(config: PipecatClientConfig = {}): EnvironmentProviders {
  const { persistOnRoute = false, ...options } = config;
  return makeEnvironmentProviders([
    {
      provide: PIPECAT_CLIENT,
      useFactory: () => {
        // On the server platform, never call inject(PIPECAT_TRANSPORT) at all — the
        // consumer's factory constructs a real, concrete Transport implementation
        // (Daily, WebSocket, etc.) that likely touches browser-only globals (WebRTC
        // APIs, navigator.mediaDevices) just by being instantiated. Substitute an
        // inert NoopTransport instead so the real factory is never triggered during SSR.
        const transport = isPlatformServer(inject(PLATFORM_ID))
          ? new NoopTransport()
          : inject(PIPECAT_TRANSPORT);
        const client = new PipecatClient({ ...options, transport });
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
