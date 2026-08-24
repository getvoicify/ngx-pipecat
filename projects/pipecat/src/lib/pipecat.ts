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
import { PipecatDevices } from './devices';
import { PipecatMessaging } from './messaging';
import { PipecatFunctions } from './functions';
import { PipecatUICommands } from './ui-commands';
import { PipecatUIJobGroups } from './ui-job-groups';
import { PipecatConversation } from './conversation';

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
  readonly devices = inject(PipecatDevices);
  readonly messaging = inject(PipecatMessaging);
  readonly functions = inject(PipecatFunctions);
  readonly uiCommands = inject(PipecatUICommands);
  readonly jobGroups = inject(PipecatUIJobGroups);
  readonly conversation = inject(PipecatConversation);
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

  /**
   * When `params` is the deprecated `ConnectionEndpoint`-shaped object (not
   * the common `TransportConnectionParams` case), this bypasses Angular's
   * `HttpClient` — the SDK makes that request via a raw `fetch()` call
   * internally, so registered `HttpInterceptor`s (auth headers, XSRF, retry,
   * logging) never run for it. If the endpoint requires auth or other
   * headers an interceptor would normally add, attach them manually via
   * `params.headers`.
   */
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
   * Bypasses Angular's `HttpClient` — the SDK makes this request via a raw
   * `fetch()` call internally, so registered `HttpInterceptor`s (auth
   * headers, XSRF, retry, logging) never run for it. If the endpoint
   * requires auth or other headers an interceptor would normally add,
   * attach them manually via `params.headers`.
   */
  startBotAndConnect(params: Parameters<PipecatClient['startBotAndConnect']>[0]): void {
    this.client.startBotAndConnect(params).catch((err: unknown) => {
      this.manualError$.next(RTVIMessage.error(err instanceof Error ? err.message : String(err)));
    });
  }

  disconnectBot(): void {
    this.client.disconnectBot();
  }

  /**
   * Bypasses Angular's `HttpClient` — the SDK makes this request via a raw
   * `fetch()` call internally, so registered `HttpInterceptor`s (auth
   * headers, XSRF, retry, logging) never run for it. If the endpoint
   * requires auth or other headers an interceptor would normally add,
   * attach them manually via `params.headers`.
   */
  startBot(params: Parameters<PipecatClient['startBot']>[0]): Promise<unknown> {
    const result = this.client.startBot(params);
    result.catch((err: unknown) => {
      this.manualError$.next(RTVIMessage.error(err instanceof Error ? err.message : String(err)));
    });
    return result;
  }

  /**
   * Mirrors the underlying SDK's `client.on(event, callback)` as an Observable,
   * giving 1:1 access to every raw `RTVIEvent` the client emits.
   */
  on<E extends RTVIEvent>(event: E): Observable<Parameters<RTVIEventHandler<E>>[0]> {
    return fromClientEvent(this.client, event);
  }
}
