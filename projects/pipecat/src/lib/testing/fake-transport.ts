import { TransportState } from '@pipecat-ai/client-js';
import { NoopTransport } from '../noop-transport';

/**
 * Settable test double built on top of `NoopTransport`'s inert defaults,
 * shared by `provider.spec.ts` and `pipecat.spec.ts`. Not exported from
 * `public-api.ts` — test-only, never ships in the published package.
 */
export class FakeTransport extends NoopTransport {
  private _fakeState: TransportState = 'disconnected';
  private _fakeIsCamEnabled = false;
  private _fakeIsMicEnabled = false;
  private _fakeIsSharingScreen = false;

  override get state(): TransportState {
    return this._fakeState;
  }
  override set state(state: TransportState) {
    this._fakeState = state;
  }
  override get isCamEnabled(): boolean {
    return this._fakeIsCamEnabled;
  }
  override set isCamEnabled(enabled: boolean) {
    this._fakeIsCamEnabled = enabled;
  }
  override get isMicEnabled(): boolean {
    return this._fakeIsMicEnabled;
  }
  override set isMicEnabled(enabled: boolean) {
    this._fakeIsMicEnabled = enabled;
  }
  override get isSharingScreen(): boolean {
    return this._fakeIsSharingScreen;
  }
  override set isSharingScreen(enabled: boolean) {
    this._fakeIsSharingScreen = enabled;
  }
}
