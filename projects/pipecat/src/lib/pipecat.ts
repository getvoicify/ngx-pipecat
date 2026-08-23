import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { merge, Observable, Subject } from 'rxjs';
import { map, scan } from 'rxjs/operators';
import type { PipecatClient } from '@pipecat-ai/client-js';
import {
  RTVIEvent,
  RTVIEventHandler,
  RTVIMessage,
  TransportState,
} from '@pipecat-ai/client-js';
import { fromClientEvent } from './events';
import { PIPECAT_CLIENT } from './tokens';

interface PipecatStatus {
  state: TransportState;
  error: RTVIMessage | null;
}

type ConnectParams = Parameters<PipecatClient['connect']>[0];

@Injectable({
  providedIn: 'root',
})
export class Pipecat {
  private readonly client = inject(PIPECAT_CLIENT);
  private readonly manualError$ = new Subject<RTVIMessage>();

  private readonly status$: Observable<PipecatStatus> = merge(
    fromClientEvent(this.client, RTVIEvent.TransportStateChanged).pipe(
      map((state): Partial<PipecatStatus> =>
        state === 'error' ? { state } : { state, error: null },
      ),
    ),
    fromClientEvent(this.client, RTVIEvent.Error).pipe(
      map((error): Partial<PipecatStatus> => ({ error })),
    ),
    this.manualError$.pipe(map((error): Partial<PipecatStatus> => ({ error }))),
  ).pipe(
    scan(
      (acc, patch) => ({ ...acc, ...patch }),
      { state: this.client.state, error: null } as PipecatStatus,
    ),
  );

  private readonly status = toSignal(this.status$, {
    initialValue: { state: this.client.state, error: null } as PipecatStatus,
  });

  readonly state = computed(() => this.status().state);
  readonly error = computed(() => this.status().error);

  connect(params?: ConnectParams): void {
    this.client.connect(params).catch((err: unknown) => {
      this.manualError$.next(RTVIMessage.error(err instanceof Error ? err.message : String(err)));
    });
  }

  disconnect(): void {
    this.client.disconnect().catch((err: unknown) => {
      this.manualError$.next(RTVIMessage.error(err instanceof Error ? err.message : String(err)));
    });
  }

  /**
   * Mirrors the underlying SDK's `client.on(event, callback)` as an Observable,
   * giving 1:1 access to every raw `RTVIEvent` the client emits.
   */
  on<E extends RTVIEvent>(event: E): Observable<Parameters<RTVIEventHandler<E>>[0]> {
    return fromClientEvent(this.client, event);
  }
}
