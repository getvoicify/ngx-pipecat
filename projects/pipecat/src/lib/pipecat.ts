import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, merge, Observable, Subject } from 'rxjs';
import { map, scan } from 'rxjs/operators';
import {
  ConnectionEndpoint,
  RTVIEvent,
  RTVIMessage,
  TransportConnectionParams,
  TransportState,
} from '@pipecat-ai/client-js';
import { PIPECAT_CLIENT } from './tokens';

interface PipecatStatus {
  state: TransportState;
  error: RTVIMessage | null;
}

@Injectable({
  providedIn: 'root',
})
export class Pipecat {
  private readonly client = inject(PIPECAT_CLIENT);
  private readonly manualError$ = new Subject<RTVIMessage>();

  private readonly status$: Observable<PipecatStatus> = merge(
    fromEvent<TransportState>(this.client, RTVIEvent.TransportStateChanged).pipe(
      map((state): Partial<PipecatStatus> =>
        state === 'error' ? { state } : { state, error: null },
      ),
    ),
    fromEvent<RTVIMessage>(this.client, RTVIEvent.Error).pipe(
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

  connect(params?: TransportConnectionParams | ConnectionEndpoint): void {
    this.client.connect(params).catch((err: unknown) => {
      this.manualError$.next(RTVIMessage.error(err instanceof Error ? err.message : String(err)));
    });
  }
}
