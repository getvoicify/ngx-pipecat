import { inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { merge, type Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
    fromClientEvent(this.client, RTVIEvent.MicUpdated) as Observable<PipecatClient['selectedMic']>,
    { initialValue: this.client.selectedMic },
  );
  readonly selectedCam = toSignal(
    fromClientEvent(this.client, RTVIEvent.CamUpdated) as Observable<PipecatClient['selectedCam']>,
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

  // Service-scoped enabled-state signals: `isMicEnabled`/etc. below have no
  // corresponding SDK change-event, so there is nothing to build a signal
  // from directly (see the comment on `needsInit()` further down). Instead,
  // these three signals are updated by this service's OWN enableMic()/etc.
  // methods, seeded from the current snapshot at construction time. Any
  // caller that goes through these methods — a toggle directive, a keyboard
  // shortcut handler, anything — updates the SAME shared signal, so every UI
  // element reading it stays consistent with every other one. This doesn't
  // solve reactivity in general: if the Transport changes enabled state on
  // its own outside of these methods, the tracked signal won't see it — but
  // that's the same already-accepted limitation `isMicEnabled()` itself has,
  // not a new one.
  private readonly _micEnabled = signal(this.client.isMicEnabled);
  readonly micEnabled = this._micEnabled.asReadonly();

  private readonly _camEnabled = signal(this.client.isCamEnabled);
  readonly camEnabled = this._camEnabled.asReadonly();

  private readonly _sharingScreen = signal(this.client.isSharingScreen);
  readonly sharingScreen = this._sharingScreen.asReadonly();

  enableMic(enable: Parameters<PipecatClient['enableMic']>[0]): void {
    this.client.enableMic(enable);
    this._micEnabled.set(enable);
  }

  enableCam(enable: Parameters<PipecatClient['enableCam']>[0]): void {
    this.client.enableCam(enable);
    this._camEnabled.set(enable);
  }

  enableScreenShare(enable: Parameters<PipecatClient['enableScreenShare']>[0]): void {
    this.client.enableScreenShare(enable);
    this._sharingScreen.set(enable);
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

  // Reactive counterpart to tracks() above. Named `liveTracks` rather than
  // `tracks` because a class cannot declare both a method and a same-named
  // field (TS2300: Duplicate identifier) — the plain tracks() delegate stays
  // as-is for callers that just want a synchronous snapshot.
  //
  // The SDK doesn't emit a single unified "tracks changed" event, and the
  // four lifecycle events below carry differently-shaped payloads that don't
  // map cleanly onto `Tracks`' `{ local, bot? }` structure. Rather than
  // reconstruct that structure by hand from each event, any one of them
  // firing just triggers a re-read of the SDK's own snapshot via
  // client.tracks() — reusing its correct computation instead of duplicating
  // it.
  readonly liveTracks = toSignal(
    merge(
      fromClientEvent(this.client, RTVIEvent.TrackStarted),
      fromClientEvent(this.client, RTVIEvent.TrackStopped),
      fromClientEvent(this.client, RTVIEvent.ScreenTrackStarted),
      fromClientEvent(this.client, RTVIEvent.ScreenTrackStopped),
    ).pipe(map(() => this.client.tracks())),
    { initialValue: this.client.tracks() },
  );

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
