import { PipecatClient, Transport } from '@pipecat-ai/client-js';
import { InjectionToken } from '@angular/core';

export const PIPECAT_TRANSPORT = new InjectionToken<Transport>('Pipecat transport');
export const PIPECAT_CLIENT = new InjectionToken<PipecatClient>('Pipecat client');
