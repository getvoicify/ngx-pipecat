import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { providePipecat } from './provider';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { FakeTransport } from './testing/fake-transport';
import { NoopPipecatClient } from './noop-pipecat-client';

describe('providePipecat', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('injects a client whose transport is the one provided via PIPECAT_TRANSPORT', () => {
    const fakeTransport = new FakeTransport();
    const tracksSpy = vi.spyOn(fakeTransport, 'tracks');
    TestBed.configureTestingModule({
      providers: [
        providePipecat(),
        { provide: PIPECAT_TRANSPORT, useValue: fakeTransport },
      ],
    });

    const client = TestBed.inject(PIPECAT_CLIENT);
    // `PipecatClient.transport` returns a Proxy wrapping the injected transport (via
    // the SDK's internal TransportWrapper), so it never has referential identity with
    // the transport instance itself. Assert delegation instead: invoking a method on the
    // client's transport must forward to our injected fake, proving PIPECAT_TRANSPORT
    // (and not some client-internal default) is what backs the client.
    client.transport.tracks();

    expect(tracksSpy).toHaveBeenCalledTimes(1);
  });

  it('disconnects the client on destroy by default (persistOnRoute omitted)', () => {
    const fakeTransport = new FakeTransport();
    TestBed.configureTestingModule({
      providers: [
        providePipecat(),
        { provide: PIPECAT_TRANSPORT, useValue: fakeTransport },
      ],
    });
    const client = TestBed.inject(PIPECAT_CLIENT);
    const disconnectSpy = vi.spyOn(client, 'disconnect');

    TestBed.resetTestingModule();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it('does not disconnect the client on destroy when persistOnRoute is true', () => {
    const fakeTransport = new FakeTransport();
    TestBed.configureTestingModule({
      providers: [
        providePipecat({ persistOnRoute: true }),
        { provide: PIPECAT_TRANSPORT, useValue: fakeTransport },
      ],
    });
    const client = TestBed.inject(PIPECAT_CLIENT);
    const disconnectSpy = vi.spyOn(client, 'disconnect');

    TestBed.resetTestingModule();

    expect(disconnectSpy).not.toHaveBeenCalled();
  });

  it('attaches a .catch to the disconnect() promise so a rejection is handled on destroy', () => {
    const fakeTransport = new FakeTransport();
    TestBed.configureTestingModule({
      providers: [
        providePipecat(),
        { provide: PIPECAT_TRANSPORT, useValue: fakeTransport },
      ],
    });
    const client = TestBed.inject(PIPECAT_CLIENT);

    // A hand-rolled thenable (not a real rejected Promise) so this test can observe
    // whether provider.ts calls `.catch` on the value `disconnect()` returns, without
    // ever creating an actual unhandled-rejection event that vitest may or may not
    // surface reliably within a single test's timing window.
    let catchHandler: ((reason: unknown) => void) | undefined;
    const disconnectResult = {
      catch: (onRejected: (reason: unknown) => void) => {
        catchHandler = onRejected;
        return disconnectResult;
      },
    } as unknown as Promise<void>;
    vi.spyOn(client, 'disconnect').mockReturnValue(disconnectResult);

    TestBed.resetTestingModule();

    expect(catchHandler).toBeDefined();
  });

  it('never constructs the real transport when running on the server platform', () => {
    const transportFactory = vi.fn(() => new FakeTransport());
    TestBed.configureTestingModule({
      providers: [
        providePipecat(),
        { provide: PIPECAT_TRANSPORT, useFactory: transportFactory },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    TestBed.inject(PIPECAT_CLIENT);

    expect(transportFactory).not.toHaveBeenCalled();
  });

  it('still resolves a usable PIPECAT_CLIENT on the server platform', () => {
    const transportFactory = vi.fn(() => new FakeTransport());
    TestBed.configureTestingModule({
      providers: [
        providePipecat(),
        { provide: PIPECAT_TRANSPORT, useFactory: transportFactory },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    const client = TestBed.inject(PIPECAT_CLIENT);

    expect(client).toBeTruthy();
    expect(() => client.transport.state).not.toThrow();
    expect(client.transport.state).toBe('disconnected');
  });

  it('resolves PIPECAT_CLIENT on the server platform even when `window` is absent', () => {
    const transportFactory = vi.fn(() => new FakeTransport());
    TestBed.configureTestingModule({
      providers: [
        providePipecat(),
        { provide: PIPECAT_TRANSPORT, useFactory: transportFactory },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    // Every other server-platform test in this file runs under vitest's jsdom
    // environment, where `window` exists — so a real PipecatClient constructs fine
    // and those tests prove nothing about SSR. Under `node dist/server/server.mjs`
    // there is no `window` binding at all, and the SDK's `learnAboutClient()` helper
    // evaluates a bare `window?.navigator?.userAgent`. Optional chaining does NOT
    // protect an *undeclared* identifier, so that expression throws
    // `ReferenceError: window is not defined`. Remove the global for the duration of
    // the injection to reproduce the real Node condition, and restore it in `finally`
    // so a failure here cannot poison sibling tests.
    const saved = Object.getOwnPropertyDescriptor(globalThis, 'window');
    expect(saved?.configurable).toBe(true);
    delete (globalThis as { window?: unknown }).window;
    try {
      expect(() => TestBed.inject(PIPECAT_CLIENT)).not.toThrow();
    } finally {
      if (saved) {
        Object.defineProperty(globalThis, 'window', saved);
      }
    }
  });

  it('resolves an inert NoopPipecatClient on the server platform', () => {
    TestBed.configureTestingModule({
      providers: [
        providePipecat(),
        { provide: PIPECAT_TRANSPORT, useFactory: () => new FakeTransport() },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    expect(TestBed.inject(PIPECAT_CLIENT)).toBeInstanceOf(NoopPipecatClient);
  });

  it('resolves a real PipecatClient (not the noop stand-in) on the browser platform', () => {
    TestBed.configureTestingModule({
      providers: [
        providePipecat(),
        { provide: PIPECAT_TRANSPORT, useValue: new FakeTransport() },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    expect(TestBed.inject(PIPECAT_CLIENT)).not.toBeInstanceOf(NoopPipecatClient);
  });

  it('still uses the real provided transport on the browser platform', () => {
    const fakeTransport = new FakeTransport();
    const tracksSpy = vi.spyOn(fakeTransport, 'tracks');
    TestBed.configureTestingModule({
      providers: [
        providePipecat(),
        { provide: PIPECAT_TRANSPORT, useValue: fakeTransport },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    const client = TestBed.inject(PIPECAT_CLIENT);
    client.transport.tracks();

    expect(tracksSpy).toHaveBeenCalledTimes(1);
  });
});
