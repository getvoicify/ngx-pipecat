import { TestBed } from '@angular/core/testing';
import { RTVIEvent } from '@pipecat-ai/client-js';
import { PipecatUICommands } from './ui-commands';
import { providePipecat } from './provider';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { FakeTransport } from './testing/fake-transport';

describe('PipecatUICommands', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function setup(transport: FakeTransport = new FakeTransport()) {
    TestBed.configureTestingModule({
      providers: [providePipecat(), { provide: PIPECAT_TRANSPORT, useValue: transport }],
    });
    return {
      uiCommands: TestBed.inject(PipecatUICommands),
      client: TestBed.inject(PIPECAT_CLIENT),
      transport,
    };
  }

  it('invokes a registered handler with the payload when a matching UICommand event is emitted', () => {
    const { uiCommands, client } = setup();
    const handler = vi.fn();

    uiCommands.registerCommandHandler('highlight', handler);
    client.emit(RTVIEvent.UICommand, { command: 'highlight', payload: { id: 42 } });

    expect(handler).toHaveBeenCalledWith({ id: 42 });
  });

  it('warns and does not throw when a UICommand event has no registered handler', () => {
    const { client } = setup();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => {
      client.emit(RTVIEvent.UICommand, { command: 'unmatched', payload: undefined });
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unmatched'));
  });

  it('no longer dispatches to a handler after it has been unregistered, and warns as unmatched', () => {
    const { uiCommands, client } = setup();
    const handler = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    uiCommands.registerCommandHandler('highlight', handler);
    uiCommands.unregisterCommandHandler('highlight');
    client.emit(RTVIEvent.UICommand, { command: 'highlight', payload: { id: 1 } });

    expect(handler).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('highlight'));
  });

  it('unregistering a command with no registered handler is a no-op', () => {
    const { uiCommands } = setup();

    expect(() => uiCommands.unregisterCommandHandler('never-registered')).not.toThrow();
  });

  it('does not let a throwing handler prevent dispatch to a different command afterward', () => {
    const { uiCommands, client } = setup();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const throwingHandler = vi.fn(() => {
      throw new Error('boom');
    });
    const otherHandler = vi.fn();

    uiCommands.registerCommandHandler('broken', throwingHandler);
    uiCommands.registerCommandHandler('fine', otherHandler);

    expect(() => {
      client.emit(RTVIEvent.UICommand, { command: 'broken', payload: undefined });
    }).not.toThrow();
    client.emit(RTVIEvent.UICommand, { command: 'fine', payload: { ok: true } });

    expect(throwingHandler).toHaveBeenCalled();
    expect(otherHandler).toHaveBeenCalledWith({ ok: true });
    expect(errorSpy).toHaveBeenCalledWith('broken', expect.any(Error));
  });

  it('registering a second handler for the same command name replaces the first', () => {
    const { uiCommands, client } = setup();
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();

    uiCommands.registerCommandHandler('highlight', firstHandler);
    uiCommands.registerCommandHandler('highlight', secondHandler);
    client.emit(RTVIEvent.UICommand, { command: 'highlight', payload: { id: 7 } });

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledWith({ id: 7 });
  });

  it('stops dispatching UICommand events once the owning injector is destroyed', () => {
    const { uiCommands, client } = setup();
    const handler = vi.fn();
    uiCommands.registerCommandHandler('highlight', handler);

    TestBed.resetTestingModule();

    client.emit(RTVIEvent.UICommand, { command: 'highlight', payload: { id: 1 } });

    expect(handler).not.toHaveBeenCalled();
  });
});
