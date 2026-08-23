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

    it('startUISnapshotStream() delegates to client.startUISnapshotStream() with the same options', () => {
      const { messaging, client } = setup();
      const spy = vi.spyOn(client, 'startUISnapshotStream').mockReturnValue(undefined);

      messaging.startUISnapshotStream({ debounceMs: 500 });

      expect(spy).toHaveBeenCalledWith({ debounceMs: 500 });
    });

    it('startUISnapshotStream() delegates to client.startUISnapshotStream() with no options', () => {
      const { messaging, client } = setup();
      const spy = vi.spyOn(client, 'startUISnapshotStream').mockReturnValue(undefined);

      messaging.startUISnapshotStream();

      expect(spy).toHaveBeenCalledWith(undefined);
    });

    it('stopUISnapshotStream() delegates to client.stopUISnapshotStream()', () => {
      const { messaging, client } = setup();
      const spy = vi.spyOn(client, 'stopUISnapshotStream').mockReturnValue(undefined);

      messaging.stopUISnapshotStream();

      expect(spy).toHaveBeenCalled();
    });

    it('cancelUIJobGroup() delegates to client.cancelUIJobGroup() with the same jobId and reason', () => {
      const { messaging, client } = setup();
      const spy = vi.spyOn(client, 'cancelUIJobGroup').mockReturnValue(undefined);

      messaging.cancelUIJobGroup('job-1', 'user cancelled');

      expect(spy).toHaveBeenCalledWith('job-1', 'user cancelled');
    });

    it('cancelUIJobGroup() delegates to client.cancelUIJobGroup() with no reason', () => {
      const { messaging, client } = setup();
      const spy = vi.spyOn(client, 'cancelUIJobGroup').mockReturnValue(undefined);

      messaging.cancelUIJobGroup('job-1');

      expect(spy).toHaveBeenCalledWith('job-1', undefined);
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
