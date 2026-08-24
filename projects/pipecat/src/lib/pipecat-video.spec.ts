import { TestBed } from '@angular/core/testing';
import { RTVIEvent } from '@pipecat-ai/client-js';
import { PipecatVideo } from './pipecat-video';
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

describe('PipecatVideo', () => {
  let originalMediaStream: typeof MediaStream | undefined;

  beforeEach(() => {
    originalMediaStream = globalThis.MediaStream;
    globalThis.MediaStream = FakeMediaStream as unknown as typeof MediaStream;
  });

  afterEach(() => {
    globalThis.MediaStream = originalMediaStream as typeof MediaStream;
    TestBed.resetTestingModule();
  });

  function setup(
    participantType: 'local' | 'bot',
    transport: FakeTransport = new FakeTransport(),
  ) {
    TestBed.configureTestingModule({
      providers: [providePipecat(), { provide: PIPECAT_TRANSPORT, useValue: transport }],
    });
    const fixture = TestBed.createComponent(PipecatVideo);
    fixture.componentRef.setInput('participantType', participantType);
    fixture.detectChanges();
    return {
      fixture,
      component: fixture.componentInstance,
      client: TestBed.inject(PIPECAT_CLIENT),
      transport,
    };
  }

  it('has no stream when there is no matching video track', () => {
    const { component } = setup('bot');

    expect(component.stream()).toBeFalsy();
  });

  it('wraps the matching video track in a MediaStream when one is present', () => {
    const { component, client, transport, fixture } = setup('bot');
    const videoTrack = { kind: 'video', id: 'bot-video-1' } as MediaStreamTrack;
    transport.setTracks({ local: {}, bot: { video: videoTrack } });

    client.emit(RTVIEvent.TrackStarted, videoTrack);
    fixture.detectChanges();

    const stream = component.stream();
    expect(stream).toBeTruthy();
    expect((stream as unknown as FakeMediaStream).getVideoTracks()[0]).toBe(videoTrack);

    const videoEl: HTMLVideoElement = fixture.nativeElement.querySelector('video');
    expect(videoEl.srcObject).toBe(stream);
  });

  it('does not rebuild the stream when an unrelated track event fires and the matching video track is unchanged', () => {
    const { component, client, transport } = setup('bot');
    const videoTrack = { kind: 'video', id: 'bot-video-1' } as MediaStreamTrack;
    transport.setTracks({ local: {}, bot: { video: videoTrack } });
    client.emit(RTVIEvent.TrackStarted, videoTrack);
    const first = component.stream();

    // Unrelated event: a local audio track appears, bot video track is the
    // very same reference as before.
    const localAudio = { kind: 'audio', id: 'local-audio-1' } as MediaStreamTrack;
    transport.setTracks({ local: { audio: localAudio }, bot: { video: videoTrack } });
    client.emit(RTVIEvent.TrackStarted, localAudio);

    expect(component.stream()).toBe(first);
  });

  it('pulls from tracks().local.video for participantType "local"', () => {
    const localVideo = { kind: 'video', id: 'local-video-1' } as MediaStreamTrack;
    const botVideo = { kind: 'video', id: 'bot-video-1' } as MediaStreamTrack;
    const transport = new FakeTransport();
    transport.setTracks({ local: { video: localVideo }, bot: { video: botVideo } });

    const { component } = setup('local', transport);

    expect((component.stream() as unknown as FakeMediaStream).getVideoTracks()[0]).toBe(
      localVideo,
    );
  });

  it('pulls from tracks().bot?.video for participantType "bot"', () => {
    const localVideo = { kind: 'video', id: 'local-video-1' } as MediaStreamTrack;
    const botVideo = { kind: 'video', id: 'bot-video-1' } as MediaStreamTrack;
    const transport = new FakeTransport();
    transport.setTracks({ local: { video: localVideo }, bot: { video: botVideo } });

    const { component } = setup('bot', transport);

    expect((component.stream() as unknown as FakeMediaStream).getVideoTracks()[0]).toBe(botVideo);
  });
});
