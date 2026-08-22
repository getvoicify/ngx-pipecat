import { TestBed } from '@angular/core/testing';
import { RTVIEvent, RTVIMessage } from '@pipecat-ai/client-js';
import { Pipecat } from './pipecat';
import { providePipecat } from './provider';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { FakeTransport } from './testing/fake-transport';

describe('Pipecat', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function setup(transport: FakeTransport = new FakeTransport()) {
    TestBed.configureTestingModule({
      providers: [providePipecat(), { provide: PIPECAT_TRANSPORT, useValue: transport }],
    });
    return {
      pipecat: TestBed.inject(Pipecat),
      client: TestBed.inject(PIPECAT_CLIENT),
      transport,
    };
  }

  it('reflects the client transportStateChanged events in state()', () => {
    const { pipecat, client } = setup();

    client.emit(RTVIEvent.TransportStateChanged, 'connected');

    expect(pipecat.state()).toBe('connected');
  });

  it('seeds state() from the client state at construction time, before any event fires', () => {
    const transport = new FakeTransport();
    transport.state = 'connecting';
    const { pipecat, client } = setup(transport);

    expect(client.state).toBe('connecting');
    expect(pipecat.state()).toBe('connecting');
  });

  it('reflects RTVIEvent.Error events in error()', () => {
    const { pipecat, client } = setup();
    const message = RTVIMessage.error('boom');

    client.emit(RTVIEvent.Error, message);

    expect(pipecat.error()).toBe(message);
  });

  it('clears error() on a subsequent non-error state transition', () => {
    const { pipecat, client } = setup();
    client.emit(RTVIEvent.Error, RTVIMessage.error('boom'));
    expect(pipecat.error()).not.toBeNull();

    client.emit(RTVIEvent.TransportStateChanged, 'connected');

    expect(pipecat.error()).toBeNull();
    expect(pipecat.state()).toBe('connected');
  });

  it('connect() delegates to client.connect() with the same params', () => {
    const { pipecat, client } = setup();
    const connectSpy = vi.spyOn(client, 'connect').mockResolvedValue({} as never);
    const params = { endpoint: 'https://example.com/connect' };

    pipecat.connect(params);

    expect(connectSpy).toHaveBeenCalledWith(params);
  });

  it('surfaces a connect() promise rejection via error()', async () => {
    const { pipecat, client } = setup();
    vi.spyOn(client, 'connect').mockRejectedValue(new Error('connect failed'));

    pipecat.connect();
    await Promise.resolve();
    await Promise.resolve();

    const error = pipecat.error();
    expect(error).not.toBeNull();
    expect(error).toBeInstanceOf(RTVIMessage);
  });

  it('removes its event listeners when the providing injector is destroyed', () => {
    const { client } = setup();
    const before = client.listenerCount(RTVIEvent.TransportStateChanged);
    expect(before).toBeGreaterThan(0);

    TestBed.resetTestingModule();

    expect(client.listenerCount(RTVIEvent.TransportStateChanged)).toBe(0);
  });
});
