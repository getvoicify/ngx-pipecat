import { inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, merge, type Observable } from 'rxjs';
import { scan } from 'rxjs/operators';
import type { Participant, PipecatClient, Tracks } from '@pipecat-ai/client-js';
import { RTVIEvent } from '@pipecat-ai/client-js';
import { fromClientEvent } from './events';
import { PIPECAT_CLIENT } from './tokens';

/** Where a track sits within `Tracks['local']` or `Tracks['bot']`. */
type TrackSlot = 'audio' | 'video' | 'screenAudio' | 'screenVideo';

/** One participant's four slots, before the narrower `Tracks` shape is applied. */
type TrackSlots = Partial<Record<TrackSlot, MediaStreamTrack>>;

/** A single track-lifecycle event, normalised across the SDK's four of them. */
interface TrackChange {
  readonly track: MediaStreamTrack;
  readonly participant: Participant | undefined;
  readonly slot: TrackSlot;
  readonly started: boolean;
}

type TrackLifecycleEvent =
  | RTVIEvent.TrackStarted
  | RTVIEvent.TrackStopped
  | RTVIEvent.ScreenTrackStarted
  | RTVIEvent.ScreenTrackStopped;

/**
 * Like `fromClientEvent`, but keeps the SECOND handler argument as well.
 *
 * `fromClientEvent` documents dropping everything past `args[0]`, and for the
 * track events that argument is exactly what says whose track it is. Kept
 * private to this file rather than added to `events.ts` so the fix costs no
 * public API; if a second caller ever needs it, that is the time to promote it.
 */
function trackChanges(
  client: PipecatClient,
  event: TrackLifecycleEvent,
  started: boolean,
  screen: boolean,
): Observable<TrackChange> {
  return fromEvent(
    client,
    event,
    (track: MediaStreamTrack, participant?: Participant): TrackChange => ({
      track,
      participant,
      slot: screen
        ? track.kind === 'audio'
          ? 'screenAudio'
          : 'screenVideo'
        : track.kind === 'audio'
          ? 'audio'
          : 'video',
      started,
    }),
  );
}

function applySlot(
  slots: TrackSlots,
  slot: TrackSlot,
  track: MediaStreamTrack,
  started: boolean,
): TrackSlots {
  if (started) {
    return { ...slots, [slot]: track };
  }
  // Cleared only when this exact track still occupies the slot. Switching input
  // device announces the replacement's start before the old track's stop, so a
  // blind delete here would throw away the track that just took its place.
  if (slots[slot] !== track) {
    return slots;
  }
  const next = { ...slots };
  delete next[slot];
  return next;
}

function applyTrackChange(tracks: Tracks, change: TrackChange): Tracks {
  const { slot, track, started } = change;

  // The same discriminator the vendor's own `usePipecatClientMediaTrack`
  // (@pipecat-ai/client-react) uses, and it has to be this lenient one rather
  // than a check for a bot participant: SmallWebRTC announces a REMOTE track
  // with no participant at all (`onTrackStarted?.(evt.track)`), while every
  // local one carries `local: true`. Absent therefore means remote.
  if (change.participant?.local === true) {
    return { ...tracks, local: applySlot(tracks.local, slot, track, started) };
  }

  // `Tracks['bot']` types `screenAudio` and `screenVideo` as `undefined`: the
  // SDK does not model a remote screen share, so there is nowhere to put one.
  if (slot === 'screenAudio' || slot === 'screenVideo') {
    return tracks;
  }

  // Sound because of the guard above — only `audio` and `video` reach here, and
  // those are the two slots `Tracks['bot']` actually declares.
  return { ...tracks, bot: applySlot(tracks.bot ?? {}, slot, track, started) as Tracks['bot'] };
}

@Injectable()
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
  // The SDK emits no unified "tracks changed" event, so this is accumulated
  // from the four lifecycle events, with `client.tracks()` read once as the
  // seed. It USED to be the other way round — any event triggered a re-read of
  // `client.tracks()`, reusing the SDK's own computation rather than
  // reconstructing `{ local, bot? }` by hand. That reuse was the bug, because
  // the snapshot is not a complete account of what the transport has:
  //
  //   `SmallWebRTCTransport.tracks()` returns `this.mediaManager.tracks()`, and
  //   `DailyMediaManager.tracks()` builds `{ local: { ... } }` with no `bot`
  //   key at all. Remote tracks live in the transport's own `_incomingTracks`
  //   map, and the ONLY way out of it is `onTrackStarted` — fired from the peer
  //   connection's `track` handler on the track's `unmute` event, with no
  //   participant argument. (Read against @pipecat-ai/small-webrtc-transport
  //   1.10.6, which was the latest published version at the time.)
  //
  // So `liveTracks().bot?.audio` was permanently `undefined` under that
  // transport: `<gvo-pipecat-audio>` never got a `srcObject`, and the bot could
  // not be heard while its RTP was arriving perfectly well. Accumulating from
  // the events is also what `@pipecat-ai/client-react` does — its
  // `usePipecatClientMediaTrack` keys tracks by `Boolean(participant?.local)`
  // and consults `client.tracks()` only to seed.
  //
  // The one thing the seed cannot cover, stated rather than left to be
  // rediscovered: a track announced BEFORE this service is constructed is lost
  // on a transport whose `tracks()` omits it, because nothing re-announces it.
  // Construct `PipecatDevices` (or render a component that injects it) before
  // connecting, which `providePipecat()`'s injector-level provider makes the
  // ordinary case.
  readonly liveTracks = toSignal(
    merge(
      trackChanges(this.client, RTVIEvent.TrackStarted, true, false),
      trackChanges(this.client, RTVIEvent.TrackStopped, false, false),
      trackChanges(this.client, RTVIEvent.ScreenTrackStarted, true, true),
      trackChanges(this.client, RTVIEvent.ScreenTrackStopped, false, true),
    ).pipe(scan(applyTrackChange, this.client.tracks())),
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
