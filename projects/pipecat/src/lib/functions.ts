import { inject, Injectable } from '@angular/core';
import type { PipecatClient } from '@pipecat-ai/client-js';
import { PIPECAT_CLIENT } from './tokens';

@Injectable()
export class PipecatFunctions {
  private readonly client = inject(PIPECAT_CLIENT);

  registerFunctionCallHandler(
    functionName: Parameters<PipecatClient['registerFunctionCallHandler']>[0],
    callback: Parameters<PipecatClient['registerFunctionCallHandler']>[1],
  ): void {
    this.client.registerFunctionCallHandler(functionName, callback);
  }

  unregisterFunctionCallHandler(
    functionName: Parameters<PipecatClient['unregisterFunctionCallHandler']>[0],
  ): void {
    this.client.unregisterFunctionCallHandler(functionName);
  }

  unregisterAllFunctionCallHandlers(): void {
    this.client.unregisterAllFunctionCallHandlers();
  }
}
