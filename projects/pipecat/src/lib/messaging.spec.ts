import { TestBed } from '@angular/core/testing';
import { PipecatMessaging } from './messaging';
import { providePipecat } from './provider';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { FakeTransport } from './testing/fake-transport';

describe('PipecatMessaging', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function setup(transport: FakeTransport = new FakeTransport()) {
    TestBed.configureTestingModule({
      providers: [providePipecat(), { provide: PIPECAT_TRANSPORT, useValue: transport }],
    });
    return {
      messaging: TestBed.inject(PipecatMessaging),
      client: TestBed.inject(PIPECAT_CLIENT),
      transport,
    };
  }

  describe('void delegation', () => {
    it('sendClientMessage() delegates to client.sendClientMessage() with the same args', () => {
      const { messaging, client } = setup();
      const spy = vi.spyOn(client, 'sendClientMessage').mockReturnValue(undefined);

      messaging.sendClientMessage('my-type', { foo: 'bar' });

      expect(spy).toHaveBeenCalledWith('my-type', { foo: 'bar' });
    });

    it('sendUIEvent() delegates to client.sendUIEvent() with the same args', () => {
      const { messaging, client } = setup();
      const spy = vi.spyOn(client, 'sendUIEvent').mockReturnValue(undefined);

      messaging.sendUIEvent('my-event', { baz: 'qux' });

      expect(spy).toHaveBeenCalledWith('my-event', { baz: 'qux' });
    });

    it('sendDTMF() delegates to client.sendDTMF() with the same arg', () => {
      const { messaging, client } = setup();
      const spy = vi.spyOn(client, 'sendDTMF').mockReturnValue(undefined);

      messaging.sendDTMF('1');

      expect(spy).toHaveBeenCalledWith('1');
    });
  });

  describe('async passthrough, no swallowing', () => {
    it('sendClientRequest() returns the same resolved value client.sendClientRequest() resolves with', async () => {
      const { messaging, client } = setup();
      const sentinel = { answer: 42 };
      const spy = vi.spyOn(client, 'sendClientRequest').mockResolvedValue(sentinel);

      const result = await messaging.sendClientRequest('req-type', { q: 1 }, 5000);

      expect(spy).toHaveBeenCalledWith('req-type', { q: 1 }, 5000);
      expect(result).toBe(sentinel);
    });

    it('sendClientRequest() propagates a client.sendClientRequest() rejection', async () => {
      const { messaging, client } = setup();
      vi.spyOn(client, 'sendClientRequest').mockRejectedValue(new Error('request failed'));

      await expect(messaging.sendClientRequest('req-type', { q: 1 })).rejects.toThrow(
        'request failed',
      );
    });

    it('appendToContext() returns the same resolved value client.appendToContext() resolves with', async () => {
      const { messaging, client } = setup();
      const spy = vi.spyOn(client, 'appendToContext').mockResolvedValue(true);

      const result = await messaging.appendToContext({
        role: 'user',
        content: 'hello',
      });

      expect(spy).toHaveBeenCalledWith({ role: 'user', content: 'hello' });
      expect(result).toBe(true);
    });

    it('sendText() delegates to client.sendText() with the same args and resolves without throwing', async () => {
      const { messaging, client } = setup();
      const spy = vi.spyOn(client, 'sendText').mockResolvedValue(undefined);

      await expect(
        messaging.sendText('hi there', { run_immediately: true }),
      ).resolves.toBeUndefined();

      expect(spy).toHaveBeenCalledWith('hi there', { run_immediately: true });
    });
  });
});
