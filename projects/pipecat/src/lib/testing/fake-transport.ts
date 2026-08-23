import {
  PipecatClientOptions,
  RTVIMessage,
  Tracks,
  Transport,
  TransportConnectionParams,
  TransportState,
} from '@pipecat-ai/client-js';

/**
 * Full concrete no-op implementation of the SDK's abstract `Transport` class,
 * shared by `provider.spec.ts` and `pipecat.spec.ts`. Not exported from
 * `public-api.ts` — test-only, never ships in the published package.
 */
export class FakeTransport extends Transport {
  private _fakeState: TransportState = 'disconnected';

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
    return this._fakeState;
  }
  override set state(state: TransportState) {
    this._fakeState = state;
  }
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
  override get isMicEnabled(): boolean {
    return false;
  }
  override get isSharingScreen(): boolean {
    return false;
  }
  override sendMessage(_message: RTVIMessage): void {}
  override tracks(): Tracks {
    return { local: {} };
  }
}
