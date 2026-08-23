import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';
import type { PipecatClient } from '@pipecat-ai/client-js';
import { RTVIEvent } from '@pipecat-ai/client-js';
import { fromClientEvent } from './events';
import { PIPECAT_CLIENT } from './tokens';

@Injectable({
  providedIn: 'root',
})
export class PipecatDevices {
  private readonly client = inject(PIPECAT_CLIENT);

  readonly mediaState = toSignal(fromClientEvent(this.client, RTVIEvent.MediaStateUpdated), {
    initialValue: this.client.mediaState,
  });
  // RTVIEventHandler types the event payload as bare `MediaDeviceInfo`, narrower
  // than the getter's own `MediaDeviceInfo | Record<string, never>` return type
  // (the empty-object sentinel for "nothing selected yet" never appears on the
  // event itself). Widening the observable to the getter's type is a safe
  // upcast, not a hand-copied type — both sides still come straight from
  // `PipecatClient`.
  readonly selectedMic = toSignal(
    fromClientEvent(this.client, RTVIEvent.MicUpdated) as Observable<
      PipecatClient['selectedMic']
    >,
    { initialValue: this.client.selectedMic },
  );
  readonly selectedCam = toSignal(
    fromClientEvent(this.client, RTVIEvent.CamUpdated) as Observable<
      PipecatClient['selectedCam']
    >,
    { initialValue: this.client.selectedCam },
  );
  readonly selectedSpeaker = toSignal(
    fromClientEvent(this.client, RTVIEvent.SpeakerUpdated) as Observable<
      PipecatClient['selectedSpeaker']
    >,
    { initialValue: this.client.selectedSpeaker },
  );

  setLogLevel(level: Parameters<PipecatClient['setLogLevel']>[0]): void {
    this.client.setLogLevel(level);
  }

  updateMic(micId: Parameters<PipecatClient['updateMic']>[0]): void {
    this.client.updateMic(micId);
  }

  updateCam(camId: Parameters<PipecatClient['updateCam']>[0]): void {
    this.client.updateCam(camId);
  }

  updateSpeaker(speakerId: Parameters<PipecatClient['updateSpeaker']>[0]): void {
    this.client.updateSpeaker(speakerId);
  }

  enableMic(enable: Parameters<PipecatClient['enableMic']>[0]): void {
    this.client.enableMic(enable);
  }

  enableCam(enable: Parameters<PipecatClient['enableCam']>[0]): void {
    this.client.enableCam(enable);
  }

  enableScreenShare(enable: Parameters<PipecatClient['enableScreenShare']>[0]): void {
    this.client.enableScreenShare(enable);
  }

  getAllMics(): ReturnType<PipecatClient['getAllMics']> {
    return this.client.getAllMics();
  }

  getAllCams(): ReturnType<PipecatClient['getAllCams']> {
    return this.client.getAllCams();
  }

  getAllSpeakers(): ReturnType<PipecatClient['getAllSpeakers']> {
    return this.client.getAllSpeakers();
  }

  initDevices(): void {
    this.client.initDevices().catch(() => {
      // mediaState already carries per-device error detail (DeviceStatus.reason);
      // there is nothing additional to surface via a separate error channel.
    });
  }

  // No signal here: `isMicEnabled` (and its siblings below) is a live
  // passthrough straight to the Transport implementation, with no
  // corresponding change event anywhere the SDK emits — a signal couldn't
  // detect a change driven by the Transport itself, since Transport is the
  // OCP seam and callers other than this service's own enableMic()/etc. can
  // mutate it.
  needsInit(): ReturnType<PipecatClient['needsInit']> {
    return this.client.needsInit();
  }

  tracks(): ReturnType<PipecatClient['tracks']> {
    return this.client.tracks();
  }

  isMicEnabled(): PipecatClient['isMicEnabled'] {
    return this.client.isMicEnabled;
  }

  isCamEnabled(): PipecatClient['isCamEnabled'] {
    return this.client.isCamEnabled;
  }

  isSharingScreen(): PipecatClient['isSharingScreen'] {
    return this.client.isSharingScreen;
  }
}
