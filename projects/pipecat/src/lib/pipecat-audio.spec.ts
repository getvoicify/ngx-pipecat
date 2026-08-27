import { TestBed } from '@angular/core/testing';
import { RTVIEvent } from '@pipecat-ai/client-js';
import { PipecatAudio } from './pipecat-audio';
import { providePipecat } from './provider';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { FakeTransport } from './testing/fake-transport';

/**
 * jsdom (this project's test DOM) implements neither `MediaStream` nor
 * `HTMLMediaElement.prototype.srcObject` at all, so `new MediaStream([...])`
 * throws and there is nothing to genuinely assert on `.srcObject` reads
 * without this. Installed/torn down per-test rather than in shared test
 * config since only these two component specs need it.
 */
class FakeMediaStream {
  constructor(private readonly _tracks: MediaStreamTrack[] = []) {}
  getTracks(): MediaStreamTrack[] {
    return this._tracks;
  }
  getAudioTracks(): MediaStreamTrack[] {
    return this._tracks.filter((t) => t.kind === 'audio');
  }
  getVideoTracks(): MediaStreamTrack[] {
    return this._tracks.filter((t) => t.kind === 'video');
  }
}

describe('PipecatAudio', () => {
  let originalMediaStream: typeof MediaStream | undefined;

  beforeEach(() => {
    originalMediaStream = globalThis.MediaStream;
    globalThis.MediaStream = FakeMediaStream as unknown as typeof MediaStream;
  });

  afterEach(() => {
    globalThis.MediaStream = originalMediaStream as typeof MediaStream;
    TestBed.resetTestingModule();
  });

  function setup(transport: FakeTransport = new FakeTransport()) {
    TestBed.configureTestingModule({
      providers: [providePipecat(), { provide: PIPECAT_TRANSPORT, useValue: transport }],
    });
    const fixture = TestBed.createComponent(PipecatAudio);
    fixture.detectChanges();
    return {
      fixture,
      component: fixture.componentInstance,
      client: TestBed.inject(PIPECAT_CLIENT),
      transport,
    };
  }

  it('has no stream when there is no bot audio track', () => {
    const { component } = setup();

    expect(component.stream()).toBeFalsy();
  });

  it('wraps the bot audio track in a MediaStream when one is present', () => {
    const { component, client, transport, fixture } = setup();
    const audioTrack = { kind: 'audio', id: 'bot-audio-1' } as MediaStreamTrack;
    transport.setTracks({ local: {}, bot: { audio: audioTrack } });

    client.emit(RTVIEvent.TrackStarted, audioTrack);
    fixture.detectChanges();

    const stream = component.stream();
    expect(stream).toBeTruthy();
    expect((stream as unknown as FakeMediaStream).getAudioTracks()[0]).toBe(audioTrack);

    const audioEl: HTMLAudioElement = fixture.nativeElement.querySelector('audio');
    expect(audioEl.srcObject).toBe(stream);
  });

  it('does not rebuild the stream when an unrelated track event fires and the bot audio track is unchanged', () => {
    const { component, client, transport } = setup();
    const audioTrack = { kind: 'audio', id: 'bot-audio-1' } as MediaStreamTrack;
    transport.setTracks({ local: {}, bot: { audio: audioTrack } });
    client.emit(RTVIEvent.TrackStarted, audioTrack);
    const first = component.stream();

    // Unrelated event: a local video track appears, bot audio track is the
    // very same reference as before.
    const localVideo = { kind: 'video', id: 'local-video-1' } as MediaStreamTrack;
    transport.setTracks({ local: { video: localVideo }, bot: { audio: audioTrack } });
    client.emit(RTVIEvent.TrackStarted, localVideo);

    expect(component.stream()).toBe(first);
  });

  /**
   * The shape a transport that does not report remote tracks through
   * `tracks()` actually presents, reproduced from
   * `@pipecat-ai/small-webrtc-transport@1.10.6`:
   *
   *   - `SmallWebRTCTransport.tracks()` returns `this.mediaManager.tracks()`,
   *     and `DailyMediaManager.tracks()` builds `{ local: { ... } }` with no
   *     `bot` key at all — remote tracks live in the transport's private
   *     `_incomingTracks` map and never reach that snapshot;
   *   - the bot's audio track is announced exactly once, by the peer
   *     connection's `track` handler calling
   *     `this._callbacks.onTrackStarted?.(evt.track)` on the track's `unmute`
   *     event — with NO participant argument.
   *
   * So `participant === undefined` is what a remote track looks like here,
   * while a local one always arrives with `local: true` (`DailyMediaManager`
   * returns early unless `event.participant?.local`, and `WavMediaManager`
   * passes a hard-coded local participant). `Boolean(participant?.local)` is
   * therefore the discriminator, which is the same one the vendor's own
   * `usePipecatClientMediaTrack` in `@pipecat-ai/client-react` uses.
   *
   * Deriving the bot audio track from `tracks().bot` alone left this element
   * with no `srcObject` for the entire call while inbound RTP flowed — the
   * candidate could be heard and could hear nothing back.
   */
  it('renders a bot audio track announced only by TrackStarted, with no participant and no bot entry in tracks()', () => {
    const { component, client, transport, fixture } = setup();
    const audioTrack = { kind: 'audio', id: 'bot-audio-smallwebrtc' } as MediaStreamTrack;
    // Exactly what SmallWebRTC's tracks() reports while the bot is speaking.
    transport.setTracks({ local: {} });

    client.emit(RTVIEvent.TrackStarted, audioTrack);
    fixture.detectChanges();

    const stream = component.stream();
    expect(stream).toBeTruthy();
    expect((stream as unknown as FakeMediaStream).getAudioTracks()[0]).toBe(audioTrack);

    const audioEl: HTMLAudioElement = fixture.nativeElement.querySelector('audio');
    expect(audioEl.srcObject).toBe(stream);
  });

  /**
   * The other half of that discriminator, and the one that makes it worth
   * having: a LOCAL microphone track goes through the very same event. Route
   * it to `bot` and the candidate hears their own voice played back at
   * themselves — a worse failure than silence, and one the assertion above
   * cannot catch on its own.
   */
  it('does not treat a local track announced by TrackStarted as the bot audio track', () => {
    const { component, client, transport, fixture } = setup();
    const localAudio = { kind: 'audio', id: 'local-audio-1' } as MediaStreamTrack;
    transport.setTracks({ local: {} });

    client.emit(RTVIEvent.TrackStarted, localAudio, { id: 'local', name: '', local: true });
    fixture.detectChanges();

    expect(component.stream()).toBeFalsy();
  });
});
