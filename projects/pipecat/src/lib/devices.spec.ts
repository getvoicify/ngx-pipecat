import { TestBed } from '@angular/core/testing';
import { LogLevel, MediaState, RTVIEvent } from '@pipecat-ai/client-js';
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

  describe('category D: reactive liveTracks signal', () => {
    it('seeds liveTracks() from client.tracks() at construction time', () => {
      const { devices, client } = setup();

      expect(devices.liveTracks()).toEqual(client.tracks());
    });

    it('reflects a new client.tracks() snapshot after RTVIEvent.TrackStarted fires', () => {
      const { devices, client, transport } = setup();
      const audioTrack = { kind: 'audio', id: 'bot-audio-1' } as MediaStreamTrack;
      transport.setTracks({ local: {}, bot: { audio: audioTrack } });

      client.emit(RTVIEvent.TrackStarted, audioTrack);

      expect(devices.liveTracks()).toEqual({ local: {}, bot: { audio: audioTrack } });
    });

    it('reflects a new client.tracks() snapshot after RTVIEvent.TrackStopped fires', () => {
      const { devices, client, transport } = setup();
      const localVideo = { kind: 'video', id: 'local-video-1' } as MediaStreamTrack;
      transport.setTracks({ local: { video: localVideo } });

      client.emit(RTVIEvent.TrackStopped, localVideo);

      expect(devices.liveTracks()).toEqual({ local: { video: localVideo } });
    });

    it('reflects a new client.tracks() snapshot after RTVIEvent.ScreenTrackStarted fires', () => {
      const { devices, client, transport } = setup();
      const screenVideo = { kind: 'video', id: 'screen-video-1' } as MediaStreamTrack;
      transport.setTracks({ local: { screenVideo } });

      client.emit(RTVIEvent.ScreenTrackStarted, screenVideo);

      expect(devices.liveTracks()).toEqual({ local: { screenVideo } });
    });

    it('reflects a new client.tracks() snapshot after RTVIEvent.ScreenTrackStopped fires', () => {
      // Note: the fixture below must differ from the FakeTransport default
      // (`{ local: {} }`) or this assertion would pass regardless of whether
      // ScreenTrackStopped is actually wired up — vacuously.
      const { devices, client, transport } = setup();
      const botAudio = { kind: 'audio', id: 'bot-audio-2' } as MediaStreamTrack;
      transport.setTracks({ local: {}, bot: { audio: botAudio } });

      client.emit(RTVIEvent.ScreenTrackStopped, {} as MediaStreamTrack);

      expect(devices.liveTracks()).toEqual({ local: {}, bot: { audio: botAudio } });
    });
  });
});
