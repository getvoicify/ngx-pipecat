import { DestroyRef, EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { PipecatClient } from '@pipecat-ai/client-js';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { PipecatClientConfig } from './types';

export function providePipecat(config: PipecatClientConfig = {}): EnvironmentProviders {
  const { persistOnRoute = false, ...options } = config;
  return makeEnvironmentProviders([
    {
      provide: PIPECAT_CLIENT,
      useFactory: () => {
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
