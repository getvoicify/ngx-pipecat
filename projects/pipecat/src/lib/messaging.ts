import { inject, Injectable } from '@angular/core';
import type { PipecatClient } from '@pipecat-ai/client-js';
import { PIPECAT_CLIENT } from './tokens';

@Injectable({
  providedIn: 'root',
})
export class PipecatMessaging {
  private readonly client = inject(PIPECAT_CLIENT);

  sendClientMessage(
    msgType: Parameters<PipecatClient['sendClientMessage']>[0],
    data?: Parameters<PipecatClient['sendClientMessage']>[1],
  ): void {
    this.client.sendClientMessage(msgType, data);
  }

  sendUIEvent(
    event: Parameters<PipecatClient['sendUIEvent']>[0],
    payload?: Parameters<PipecatClient['sendUIEvent']>[1],
  ): void {
    this.client.sendUIEvent(event, payload);
  }

  sendDTMF(dtmf: Parameters<PipecatClient['sendDTMF']>[0]): void {
    this.client.sendDTMF(dtmf);
  }

  startUISnapshotStream(
    options?: Parameters<PipecatClient['startUISnapshotStream']>[0],
  ): void {
    this.client.startUISnapshotStream(options);
  }

  stopUISnapshotStream(): void {
    this.client.stopUISnapshotStream();
  }

  cancelUIJobGroup(
    jobId: Parameters<PipecatClient['cancelUIJobGroup']>[0],
    reason?: Parameters<PipecatClient['cancelUIJobGroup']>[1],
  ): void {
    this.client.cancelUIJobGroup(jobId, reason);
  }

  sendClientRequest(
    msgType: Parameters<PipecatClient['sendClientRequest']>[0],
    data: Parameters<PipecatClient['sendClientRequest']>[1],
    timeout?: Parameters<PipecatClient['sendClientRequest']>[2],
  ): ReturnType<PipecatClient['sendClientRequest']> {
    return this.client.sendClientRequest(msgType, data, timeout);
  }

  appendToContext(
    context: Parameters<PipecatClient['appendToContext']>[0],
  ): ReturnType<PipecatClient['appendToContext']> {
    return this.client.appendToContext(context);
  }

  // Unlike PipecatDevices.initDevices() (silently swallowed because
  // mediaState already narrates the outcome in full detail), nothing
  // already narrates whether sendText() succeeded — there is no existing
  // signal for it — so returning the promise directly is the only way the
  // caller finds out, and swallowing it would be a real loss of
  // information with nothing replacing it.
  sendText(
    content: Parameters<PipecatClient['sendText']>[0],
    options?: Parameters<PipecatClient['sendText']>[1],
  ): ReturnType<PipecatClient['sendText']> {
    return this.client.sendText(content, options);
  }
}
