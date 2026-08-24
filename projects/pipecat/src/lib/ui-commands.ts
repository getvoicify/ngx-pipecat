import { inject, Injectable } from '@angular/core';
import { RTVIEvent } from '@pipecat-ai/client-js';
import { fromClientEvent } from './events';
import { PIPECAT_CLIENT } from './tokens';

@Injectable({
  providedIn: 'root',
})
export class PipecatUICommands {
  private readonly client = inject(PIPECAT_CLIENT);

  private readonly handlers = new Map<string, (payload: unknown) => void>();

  constructor() {
    fromClientEvent(this.client, RTVIEvent.UICommand).subscribe((data) => {
      const handler = this.handlers.get(data.command);
      if (!handler) {
        console.warn(`PipecatUICommands: no handler registered for command "${data.command}"`);
        return;
      }
      try {
        handler(data.payload);
      } catch (error) {
        console.error(data.command, error);
      }
    });
  }

  registerCommandHandler(command: string, handler: (payload: unknown) => void): void {
    this.handlers.set(command, handler);
  }

  unregisterCommandHandler(command: string): void {
    this.handlers.delete(command);
  }
}
