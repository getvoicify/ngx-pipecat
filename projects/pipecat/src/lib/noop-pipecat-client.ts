import {
  A11ySnapshotStreamerOptions,
  APIRequest,
  BotReadyData,
  ConnectionEndpoint,
  DTMFButton,
  FunctionCallCallback,
  LLMContextMessage,
  LogLevel,
  MediaState,
  PipecatClient,
  RTVIEvents,
  SendTextOptions,
  Tracks,
  Transport,
  TransportConnectionParams,
  TransportState,
} from '@pipecat-ai/client-js';
import { NoopTransport } from './noop-transport';

/**
 * The public surface of `PipecatClient`, as a structural type.
 *
 * `keyof PipecatClient` covers public members only (the SDK's `protected`
 * fields are excluded), so implementing this mapped type gives us
 * compile-time completeness: if the vendor adds a public member in a future
 * release, this file stops compiling instead of silently shipping a stand-in
 * that is missing part of the surface.
 */
export type PipecatClientSurface = {
  [K in keyof PipecatClient]: PipecatClient[K];
};

/**
 * Full no-op implementation of the SDK's `PipecatClient` public surface.
 *
 * Used by `providePipecat()` to substitute a safe, inert client when running
 * under `@angular/ssr` on the server platform. Substituting only the transport
 * is not enough: `new PipecatClient(...)` itself reaches the SDK's
 * `learnAboutClient()` helper, which evaluates a bare `window?.navigator
 * ?.userAgent`. Optional chaining does NOT protect an *undeclared* identifier,
 * so under Node that expression throws `ReferenceError: window is not defined`
 * and every server-rendered route injecting the client hard-fails.
 * `NoopPipecatClient` never touches any browser global, so it is always safe to
 * construct, including in Node during SSR.
 *
 * The emitter methods are no-ops that return `this`. That is the correct
 * semantic rather than a lazy one: on the server nothing ever emits, so every
 * `fromClientEvent(...)` observable simply never fires and every signal stays
 * at its initial value — exactly the inert behaviour we want. Both the
 * node-style (`addListener` / `removeListener`) and the browser-style
 * (`on` / `off`) pairs are present because rxjs `fromEvent` sniffs for either
 * one and throws if it finds neither.
 *
 * This is internal plumbing, not a public API — consumers never construct it
 * directly, `providePipecat()` does so automatically on the server platform.
 */
export class NoopPipecatClient implements PipecatClientSurface {
  private readonly _noopTransport = new NoopTransport();

  // ------ Event emitter (inherited from RTVIEventEmitter / TypedEmitter)

  addListener<E extends keyof RTVIEvents>(_event: E, _listener: RTVIEvents[E]): PipecatClient {
    return asPipecatClient(this);
  }
  on<E extends keyof RTVIEvents>(_event: E, _listener: RTVIEvents[E]): PipecatClient {
    return asPipecatClient(this);
  }
  once<E extends keyof RTVIEvents>(_event: E, _listener: RTVIEvents[E]): PipecatClient {
    return asPipecatClient(this);
  }
  prependListener<E extends keyof RTVIEvents>(_event: E, _listener: RTVIEvents[E]): PipecatClient {
    return asPipecatClient(this);
  }
  prependOnceListener<E extends keyof RTVIEvents>(
    _event: E,
    _listener: RTVIEvents[E],
  ): PipecatClient {
    return asPipecatClient(this);
  }
  off<E extends keyof RTVIEvents>(_event: E, _listener: RTVIEvents[E]): PipecatClient {
    return asPipecatClient(this);
  }
  removeListener<E extends keyof RTVIEvents>(_event: E, _listener: RTVIEvents[E]): PipecatClient {
    return asPipecatClient(this);
  }
  removeAllListeners<E extends keyof RTVIEvents>(_event?: E): PipecatClient {
    return asPipecatClient(this);
  }
  emit<E extends keyof RTVIEvents>(
    _event: E,
    ..._args: Parameters<NonNullable<RTVIEvents[E]>>
  ): boolean {
    return false;
  }
  eventNames(): (keyof RTVIEvents | string | symbol)[] {
    return [];
  }
  rawListeners<E extends keyof RTVIEvents>(_event: E): RTVIEvents[E][] {
    return [];
  }
  listeners<E extends keyof RTVIEvents>(_event: E): RTVIEvents[E][] {
    return [];
  }
  listenerCount<E extends keyof RTVIEvents>(_event: E): number {
    return 0;
  }
  getMaxListeners(): number {
    return 0;
  }
  setMaxListeners(_maxListeners: number): PipecatClient {
    return asPipecatClient(this);
  }

  // ------ Lifecycle

  setLogLevel(_level: LogLevel): void {}
  initDevices(): Promise<void> {
    return Promise.resolve();
  }
  startBot(_startBotParams: APIRequest): Promise<unknown> {
    return Promise.resolve(undefined);
  }
  connect(_connectParams?: TransportConnectionParams | ConnectionEndpoint): Promise<BotReadyData> {
    return Promise.resolve({ version: '' });
  }
  startBotAndConnect(_startBotParams: APIRequest): Promise<BotReadyData> {
    return Promise.resolve({ version: '' });
  }
  disconnect(): Promise<void> {
    return Promise.resolve();
  }
  disconnectBot(): void {}

  // ------ State

  get connected(): boolean {
    return false;
  }
  get transport(): Transport {
    return this._noopTransport;
  }
  get state(): TransportState {
    return 'disconnected';
  }
  get mediaState(): MediaState {
    return { mic: { state: 'uninitialized' }, cam: { state: 'uninitialized' } };
  }
  needsInit(): boolean {
    return true;
  }
  get version(): string {
    return '';
  }

  // ------ Devices

  getAllMics(): Promise<MediaDeviceInfo[]> {
    return Promise.resolve([]);
  }
  getAllCams(): Promise<MediaDeviceInfo[]> {
    return Promise.resolve([]);
  }
  getAllSpeakers(): Promise<MediaDeviceInfo[]> {
    return Promise.resolve([]);
  }
  get selectedMic(): MediaDeviceInfo | Record<string, never> {
    return {};
  }
  get selectedCam(): MediaDeviceInfo | Record<string, never> {
    return {};
  }
  get selectedSpeaker(): MediaDeviceInfo | Record<string, never> {
    return {};
  }
  updateMic(_micId: string): void {}
  updateCam(_camId: string): void {}
  updateSpeaker(_speakerId: string): void {}
  enableMic(_enable: boolean): void {}
  get isMicEnabled(): boolean {
    return false;
  }
  enableCam(_enable: boolean): void {}
  get isCamEnabled(): boolean {
    return false;
  }
  enableScreenShare(_enable: boolean): void {}
  get isSharingScreen(): boolean {
    return false;
  }
  tracks(): Tracks {
    return { local: {} };
  }

  // ------ Messaging

  sendClientMessage(_msgType: string, _data?: unknown): void {}
  sendUIEvent(_event: string, _payload?: unknown): void {}
  sendDTMF(_dtmf: DTMFButton | string): void {}
  startUISnapshotStream(_options?: A11ySnapshotStreamerOptions): void {}
  stopUISnapshotStream(): void {}
  cancelUIJobGroup(_jobId: string, _reason?: string): void {}
  sendClientRequest(_msgType: string, _data: unknown, _timeout?: number): Promise<unknown> {
    return Promise.resolve(undefined);
  }
  appendToContext(_context: LLMContextMessage): Promise<boolean> {
    return Promise.resolve(false);
  }
  sendText(_content: string, _options?: SendTextOptions): Promise<void> {
    return Promise.resolve();
  }

  // ------ Function calls

  registerFunctionCallHandler(_functionName: string, _callback: FunctionCallCallback): void {}
  unregisterFunctionCallHandler(_functionName: string): void {}
  unregisterAllFunctionCallHandlers(): void {}
}

/**
 * Bridge a `NoopPipecatClient` to the `PipecatClient` type.
 *
 * `PipecatClient` declares `protected` members, so TypeScript treats it
 * nominally: no structural stand-in — however complete — is ever assignable to
 * it, and the emitter methods it inherits are declared as returning `this`.
 * This is the single cast in the library that bridges that gap. It is safe
 * precisely because `NoopPipecatClient implements PipecatClientSurface` is what
 * actually guarantees the stand-in covers the whole public surface: if the
 * vendor adds a public member, that clause fails to compile rather than this
 * cast papering over a hole.
 */
export function asPipecatClient(client: NoopPipecatClient): PipecatClient {
  return client as unknown as PipecatClient;
}
