import {
  PipecatClientOptions,
  RTVIMessage,
  Tracks,
  Transport,
  TransportConnectionParams,
  TransportState,
} from '@pipecat-ai/client-js';

/**
 * Full concrete no-op implementation of the SDK's abstract `Transport` class.
 *
 * Used by `providePipecat()` to substitute a safe, inert transport when running
 * under `@angular/ssr` on the server platform. Constructing a real, concrete
 * `Transport` implementation (Daily, WebSocket, etc.) very likely touches
 * browser-only globals (WebRTC APIs, `navigator.mediaDevices`) just by being
 * instantiated — which is outside our control since we don't own third-party
 * transport implementations. `NoopTransport` never touches any browser global,
 * so it is always safe to construct, including in Node during SSR.
 *
 * This is internal plumbing, not a public API — consumers never construct it
 * directly, `providePipecat()` does so automatically on the server platform.
 */
export class NoopTransport extends Transport {
  override initialize(
    _options: PipecatClientOptions,
    _messageHandler: (ev: RTVIMessage) => void,
  ): void {}
  override initDevices(): Promise<void> {
    return Promise.resolve();
  }
  override _validateConnectionParams(_connectParams?: unknown): unknown {
    return undefined;
  }
  override _connect(_connectParams?: TransportConnectionParams): Promise<void> {
    return Promise.resolve();
  }
  override _disconnect(): Promise<void> {
    return Promise.resolve();
  }
  override sendReadyMessage(): void {}
  override get state(): TransportState {
    return 'disconnected';
  }
  override set state(_state: TransportState) {}
  override getAllMics(): Promise<MediaDeviceInfo[]> {
    return Promise.resolve([]);
  }
  override getAllCams(): Promise<MediaDeviceInfo[]> {
    return Promise.resolve([]);
  }
  override getAllSpeakers(): Promise<MediaDeviceInfo[]> {
    return Promise.resolve([]);
  }
  override updateMic(_micId: string): void {}
  override updateCam(_camId: string): void {}
  override updateSpeaker(_speakerId: string): void {}
  override get selectedMic(): MediaDeviceInfo | Record<string, never> {
    return {};
  }
  override get selectedCam(): MediaDeviceInfo | Record<string, never> {
    return {};
  }
  override get selectedSpeaker(): MediaDeviceInfo | Record<string, never> {
    return {};
  }
  override enableMic(_enable: boolean): void {}
  override enableCam(_enable: boolean): void {}
  override enableScreenShare(_enable: boolean): void {}
  override get isCamEnabled(): boolean {
    return false;
  }
  override set isCamEnabled(_enabled: boolean) {}
  override get isMicEnabled(): boolean {
    return false;
  }
  override set isMicEnabled(_enabled: boolean) {}
  override get isSharingScreen(): boolean {
    return false;
  }
  override set isSharingScreen(_enabled: boolean) {}
  override sendMessage(_message: RTVIMessage): void {}
  override tracks(): Tracks {
    return { local: {} };
  }
}
