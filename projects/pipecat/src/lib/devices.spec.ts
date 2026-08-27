import { TestBed } from '@angular/core/testing';
import { LogLevel, MediaState, type Participant, RTVIEvent } from '@pipecat-ai/client-js';
import { PipecatDevices } from './devices';
import { providePipecat } from './provider';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { FakeTransport } from './testing/fake-transport';

describe('PipecatDevices', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function setup(transport: FakeTransport = new FakeTransport()) {
    TestBed.configureTestingModule({
      providers: [providePipecat(), { provide: PIPECAT_TRANSPORT, useValue: transport }],
    });
    return {
      devices: TestBed.inject(PipecatDevices),
      client: TestBed.inject(PIPECAT_CLIENT),
      transport,
    };
  }

  describe('category A: plain void action methods', () => {
    it('setLogLevel() delegates to client.setLogLevel() with the same arg', () => {
      const { devices, client } = setup();
      const spy = vi.spyOn(client, 'setLogLevel').mockReturnValue(undefined);

      devices.setLogLevel(LogLevel.DEBUG);

      expect(spy).toHaveBeenCalledWith(LogLevel.DEBUG);
    });

    it('updateMic() delegates to client.updateMic() with the same arg', () => {
      const { devices, client } = setup();
      const spy = vi.spyOn(client, 'updateMic').mockReturnValue(undefined);

      devices.updateMic('mic-1');

      expect(spy).toHaveBeenCalledWith('mic-1');
    });

    it('updateCam() delegates to client.updateCam() with the same arg', () => {
      const { devices, client } = setup();
      const spy = vi.spyOn(client, 'updateCam').mockReturnValue(undefined);

      devices.updateCam('cam-1');

      expect(spy).toHaveBeenCalledWith('cam-1');
    });

    it('updateSpeaker() delegates to client.updateSpeaker() with the same arg', () => {
      const { devices, client } = setup();
      const spy = vi.spyOn(client, 'updateSpeaker').mockReturnValue(undefined);

      devices.updateSpeaker('speaker-1');

      expect(spy).toHaveBeenCalledWith('speaker-1');
    });

    it('enableMic() delegates to client.enableMic() with the same arg', () => {
      const { devices, client } = setup();
      const spy = vi.spyOn(client, 'enableMic').mockReturnValue(undefined);

      devices.enableMic(true);

      expect(spy).toHaveBeenCalledWith(true);
    });

    it('enableCam() delegates to client.enableCam() with the same arg', () => {
      const { devices, client } = setup();
      const spy = vi.spyOn(client, 'enableCam').mockReturnValue(undefined);

      devices.enableCam(true);

      expect(spy).toHaveBeenCalledWith(true);
    });

    it('enableScreenShare() delegates to client.enableScreenShare() with the same arg', () => {
      const { devices, client } = setup();
      const spy = vi.spyOn(client, 'enableScreenShare').mockReturnValue(undefined);

      devices.enableScreenShare(true);

      expect(spy).toHaveBeenCalledWith(true);
    });
  });

  describe('category B: async enumeration passthrough', () => {
    it('getAllMics() returns the same resolved value client.getAllMics() resolves with', async () => {
      const { devices, client } = setup();
      const sentinel = [{ deviceId: 'mic-1' } as MediaDeviceInfo];
      vi.spyOn(client, 'getAllMics').mockResolvedValue(sentinel);

      const result = await devices.getAllMics();

      expect(result).toBe(sentinel);
    });

    it('getAllCams() returns the same resolved value client.getAllCams() resolves with', async () => {
      const { devices, client } = setup();
      const sentinel = [{ deviceId: 'cam-1' } as MediaDeviceInfo];
      vi.spyOn(client, 'getAllCams').mockResolvedValue(sentinel);

      const result = await devices.getAllCams();

      expect(result).toBe(sentinel);
    });

    it('getAllSpeakers() returns the same resolved value client.getAllSpeakers() resolves with', async () => {
      const { devices, client } = setup();
      const sentinel = [{ deviceId: 'speaker-1' } as MediaDeviceInfo];
      vi.spyOn(client, 'getAllSpeakers').mockResolvedValue(sentinel);

      const result = await devices.getAllSpeakers();

      expect(result).toBe(sentinel);
    });
  });

  describe('initDevices(): fire-and-forget, rejection deliberately swallowed', () => {
    it('delegates to client.initDevices()', () => {
      const { devices, client } = setup();
      const spy = vi.spyOn(client, 'initDevices').mockResolvedValue(undefined);

      devices.initDevices();

      expect(spy).toHaveBeenCalled();
    });

    it('does not let a client.initDevices() rejection propagate', async () => {
      const { devices, client } = setup();
      const spy = vi.spyOn(client, 'initDevices').mockRejectedValue(new Error('init failed'));

      devices.initDevices();
      const settled = spy.mock.results[0]!.value as Promise<void>;
      await settled.catch(() => {});

      // No assertion target beyond "this test completed": the point is that
      // the rejection above was already handled by devices.ts's own .catch()
      // before we ever awaited it here, so it never became unhandled.
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('category C: curated signals', () => {
    it('reflects RTVIEvent.MediaStateUpdated events in mediaState()', () => {
      const { devices, client } = setup();
      const mediaState: MediaState = {
        mic: { state: 'granted' },
        cam: { state: 'granted' },
      };

      client.emit(RTVIEvent.MediaStateUpdated, mediaState);

      expect(devices.mediaState()).toBe(mediaState);
    });

    it('seeds mediaState() from the client mediaState at construction time', () => {
      // client.mediaState is a getter that returns a fresh object on every
      // access (verified: the two reads below are structurally identical but
      // never referentially equal), so this compares structurally rather
      // than with toBe.
      const { devices, client } = setup();

      expect(devices.mediaState()).toEqual(client.mediaState);
    });

    it('reflects RTVIEvent.MicUpdated events in selectedMic()', () => {
      const { devices, client } = setup();
      const mic = { deviceId: 'mic-1' } as MediaDeviceInfo;

      client.emit(RTVIEvent.MicUpdated, mic);

      expect(devices.selectedMic()).toBe(mic);
    });

    it('seeds selectedMic() from the client selectedMic at construction time', () => {
      // Same fresh-object-per-access getter behavior as mediaState above.
      const { devices, client } = setup();

      expect(devices.selectedMic()).toEqual(client.selectedMic);
    });

    it('reflects RTVIEvent.CamUpdated events in selectedCam()', () => {
      const { devices, client } = setup();
      const cam = { deviceId: 'cam-1' } as MediaDeviceInfo;

      client.emit(RTVIEvent.CamUpdated, cam);

      expect(devices.selectedCam()).toBe(cam);
    });

    it('seeds selectedCam() from the client selectedCam at construction time', () => {
      const { devices, client } = setup();

      expect(devices.selectedCam()).toEqual(client.selectedCam);
    });

    it('reflects RTVIEvent.SpeakerUpdated events in selectedSpeaker()', () => {
      const { devices, client } = setup();
      const speaker = { deviceId: 'speaker-1' } as MediaDeviceInfo;

      client.emit(RTVIEvent.SpeakerUpdated, speaker);

      expect(devices.selectedSpeaker()).toBe(speaker);
    });

    it('seeds selectedSpeaker() from the client selectedSpeaker at construction time', () => {
      const { devices, client } = setup();

      expect(devices.selectedSpeaker()).toEqual(client.selectedSpeaker);
    });
  });

  describe('getter methods: live passthrough, no signal', () => {
    it('isMicEnabled() reflects the live value on the underlying transport', () => {
      const { devices, transport } = setup();

      transport.isMicEnabled = true;

      expect(devices.isMicEnabled()).toBe(true);
    });

    it('isCamEnabled() reflects the live value on the underlying transport', () => {
      const { devices, transport } = setup();

      transport.isCamEnabled = true;

      expect(devices.isCamEnabled()).toBe(true);
    });

    it('isSharingScreen() reflects the live value on the underlying transport', () => {
      const { devices, transport } = setup();

      transport.isSharingScreen = true;

      expect(devices.isSharingScreen()).toBe(true);
    });

    it('tracks() delegates to client.tracks() and returns its live value', () => {
      const { devices, client } = setup();
      const sentinel = { local: { audio: undefined, video: undefined } };
      vi.spyOn(client, 'tracks').mockReturnValue(sentinel);

      expect(devices.tracks()).toBe(sentinel);
    });

    it('needsInit() delegates to client.needsInit() and returns its live value', () => {
      // Unlike the transport-backed getters above, needsInit() is computed on
      // PipecatClient itself from its internal MediaState (no corresponding
      // Transport field to drive through FakeTransport), so this is verified
      // via delegation rather than by mutating the fake.
      const { devices, client } = setup();
      vi.spyOn(client, 'needsInit').mockReturnValue(false);

      expect(devices.needsInit()).toBe(false);
    });
  });

  describe('category E: service-scoped enabled-state signals', () => {
    it('seeds micEnabled() from client.isMicEnabled at construction time', () => {
      const transport = new FakeTransport();
      transport.isMicEnabled = true;
      const { devices } = setup(transport);

      expect(devices.micEnabled()).toBe(true);
    });

    it('updates micEnabled() to the given value when enableMic() is called', () => {
      const { devices, client } = setup();
      vi.spyOn(client, 'enableMic').mockReturnValue(undefined);

      devices.enableMic(true);

      expect(devices.micEnabled()).toBe(true);
    });

    it('seeds camEnabled() from client.isCamEnabled at construction time', () => {
      const transport = new FakeTransport();
      transport.isCamEnabled = true;
      const { devices } = setup(transport);

      expect(devices.camEnabled()).toBe(true);
    });

    it('updates camEnabled() to the given value when enableCam() is called', () => {
      const { devices, client } = setup();
      vi.spyOn(client, 'enableCam').mockReturnValue(undefined);

      devices.enableCam(true);

      expect(devices.camEnabled()).toBe(true);
    });

    it('seeds sharingScreen() from client.isSharingScreen at construction time', () => {
      const transport = new FakeTransport();
      transport.isSharingScreen = true;
      const { devices } = setup(transport);

      expect(devices.sharingScreen()).toBe(true);
    });

    it('updates sharingScreen() to the given value when enableScreenShare() is called', () => {
      const { devices, client } = setup();
      vi.spyOn(client, 'enableScreenShare').mockReturnValue(undefined);

      devices.enableScreenShare(true);

      expect(devices.sharingScreen()).toBe(true);
    });
  });

  /**
   * `liveTracks` ACCUMULATES the four track-lifecycle events, reading
   * `client.tracks()` once as a seed; see the long comment on the signal for
   * why re-reading that snapshot per event was the bug rather than the
   * mechanism. These tests therefore drive events and assert the accumulated
   * `Tracks`, and the fixture below deliberately leaves `transport.tracks()` at
   * its `{ local: {} }` default so nothing can pass through the seed by
   * accident.
   */
  describe('category D: reactive liveTracks signal', () => {
    const LOCAL: Participant = { id: 'local', name: '', local: true };

    /**
     * Two reads of `client.tracks()` back this, and they fail separately: the
     * `toSignal` initial value covers the signal before any event arrives, and
     * the `scan` seed is what the first event accumulates ONTO. Asserting only
     * the value before any event is vacuous — proven by mutation: replacing the
     * scan seed with an empty `Tracks` left such an assertion green, because
     * the initial value was answering it. So this drives an unrelated event and
     * requires the seeded track to survive it.
     */
    it('seeds liveTracks() from client.tracks(), and keeps the seed across the first event', () => {
      const transport = new FakeTransport();
      const seeded = { kind: 'audio', id: 'seeded-audio' } as MediaStreamTrack;
      // Set BEFORE construction, and to something other than the FakeTransport
      // default, or this would pass against a signal that ignored the seed.
      transport.setTracks({ local: { audio: seeded } });
      const { devices, client } = setup(transport);
      expect(devices.liveTracks()).toEqual({ local: { audio: seeded } });

      const camVideo = { kind: 'video', id: 'cam-video-1' } as MediaStreamTrack;
      client.emit(RTVIEvent.TrackStarted, camVideo, LOCAL);

      expect(devices.liveTracks()).toEqual({ local: { audio: seeded, video: camVideo } });
    });

    it('files a track started by the local participant under local', () => {
      const { devices, client } = setup();
      const localAudio = { kind: 'audio', id: 'local-audio-1' } as MediaStreamTrack;

      client.emit(RTVIEvent.TrackStarted, localAudio, LOCAL);

      expect(devices.liveTracks()).toEqual({ local: { audio: localAudio } });
    });

    /**
     * The defect this whole change exists for. `@pipecat-ai/small-webrtc-transport`
     * announces the bot's audio track with NO participant and never puts it in
     * `tracks()` at all, so a signal that re-read that snapshot reported no bot
     * audio for the entire call.
     */
    it('files a track started with no participant under bot', () => {
      const { devices, client } = setup();
      const botAudio = { kind: 'audio', id: 'bot-audio-1' } as MediaStreamTrack;

      client.emit(RTVIEvent.TrackStarted, botAudio);

      expect(devices.liveTracks()).toEqual({ local: {}, bot: { audio: botAudio } });
    });

    it('clears the slot when RTVIEvent.TrackStopped names the track occupying it', () => {
      const { devices, client } = setup();
      const localVideo = { kind: 'video', id: 'local-video-1' } as MediaStreamTrack;
      client.emit(RTVIEvent.TrackStarted, localVideo, LOCAL);

      client.emit(RTVIEvent.TrackStopped, localVideo, LOCAL);

      expect(devices.liveTracks()).toEqual({ local: {} });
    });

    /**
     * Switching input device announces the replacement's start before the old
     * track's stop. Clearing the slot on any stop of the right kind would drop
     * the track that had just taken it over — silence, from a working device.
     */
    it('leaves the slot alone when RTVIEvent.TrackStopped names a track that no longer occupies it', () => {
      const { devices, client } = setup();
      const firstMic = { kind: 'audio', id: 'mic-1' } as MediaStreamTrack;
      const secondMic = { kind: 'audio', id: 'mic-2' } as MediaStreamTrack;
      client.emit(RTVIEvent.TrackStarted, firstMic, LOCAL);
      client.emit(RTVIEvent.TrackStarted, secondMic, LOCAL);

      client.emit(RTVIEvent.TrackStopped, firstMic, LOCAL);

      expect(devices.liveTracks()).toEqual({ local: { audio: secondMic } });
    });

    it('files a screen track under its own slot, by kind, on RTVIEvent.ScreenTrackStarted', () => {
      const { devices, client } = setup();
      const screenVideo = { kind: 'video', id: 'screen-video-1' } as MediaStreamTrack;
      const screenAudio = { kind: 'audio', id: 'screen-audio-1' } as MediaStreamTrack;

      client.emit(RTVIEvent.ScreenTrackStarted, screenVideo, LOCAL);
      client.emit(RTVIEvent.ScreenTrackStarted, screenAudio, LOCAL);

      expect(devices.liveTracks()).toEqual({ local: { screenVideo, screenAudio } });
    });

    it('clears the screen slot on RTVIEvent.ScreenTrackStopped', () => {
      const { devices, client } = setup();
      const screenVideo = { kind: 'video', id: 'screen-video-1' } as MediaStreamTrack;
      const camVideo = { kind: 'video', id: 'cam-video-1' } as MediaStreamTrack;
      client.emit(RTVIEvent.TrackStarted, camVideo, LOCAL);
      client.emit(RTVIEvent.ScreenTrackStarted, screenVideo, LOCAL);

      client.emit(RTVIEvent.ScreenTrackStopped, screenVideo, LOCAL);

      // The camera track survives: stopping a screen share must not reach the
      // plain video slot, which is what a shared "it is a video track" branch
      // would do.
      expect(devices.liveTracks()).toEqual({ local: { video: camVideo } });
    });

    /**
     * `Tracks['bot']` declares `screenAudio` and `screenVideo` as `undefined` —
     * the SDK models no remote screen share — so a remote screen track has
     * nowhere to be filed and must not be misfiled as the bot's camera or
     * microphone, which is the slot its `kind` would otherwise select.
     */
    it('ignores a screen track that has no local participant', () => {
      const { devices, client } = setup();
      const botAudio = { kind: 'audio', id: 'bot-audio-1' } as MediaStreamTrack;
      client.emit(RTVIEvent.TrackStarted, botAudio);

      client.emit(RTVIEvent.ScreenTrackStarted, {
        kind: 'video',
        id: 'remote-screen-1',
      } as MediaStreamTrack);

      expect(devices.liveTracks()).toEqual({ local: {}, bot: { audio: botAudio } });
    });
  });
});
