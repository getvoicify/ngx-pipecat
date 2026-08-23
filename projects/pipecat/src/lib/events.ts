import { fromEvent, Observable } from 'rxjs';
import { PipecatClient, RTVIEvent, RTVIEventHandler } from '@pipecat-ai/client-js';

/**
 * Wraps a single `PipecatClient` event as an Observable, fully typed per-event
 * via the SDK's own `RTVIEventHandler` map — no manual type parameters needed
 * at call sites.
 *
 * Uses the `resultSelector`-overload of `fromEvent` (not the deprecated
 * `fromEvent<T>(target, eventName)` overload) since `PipecatClient` structurally
 * matches `NodeStyleEventEmitter`.
 *
 * Known limitation: only the first argument of multi-argument event handlers
 * (e.g. `trackStarted: (track, participant?) => void`) is captured. This is a
 * deliberate scope decision, not an oversight — returning a tuple of all args
 * would change the type shape for every single-argument event too.
 */
export function fromClientEvent<E extends RTVIEvent>(
  client: PipecatClient,
  event: E,
): Observable<Parameters<RTVIEventHandler<E>>[0]> {
  return fromEvent(client, event, (...args: Parameters<RTVIEventHandler<E>>) => args[0]);
}
