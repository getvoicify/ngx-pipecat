import { PipecatClientOptions } from '@pipecat-ai/client-js';

export type PipecatClientConfig = Omit<PipecatClientOptions, 'transport'> & {
  persistOnRoute?: boolean;
};
