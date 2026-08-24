import { TestBed } from '@angular/core/testing';
import { RTVIEvent } from '@pipecat-ai/client-js';
import type { Participant } from '@pipecat-ai/client-js';
import {
  PipecatVoiceVisualizer,
  resolveColor,
  computeBarHeights,
} from './pipecat-voice-visualizer';
import { providePipecat } from './provider';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { FakeTransport } from './testing/fake-transport';

/**
 * jsdom's `HTMLCanvasElement.prototype.getContext('2d')` returns `null` (no
 * canvas backend is installed in this project), so actual pixel-level canvas
 * drawing can never be genuinely verified in tests here — not even with a
 * polyfill, unlike the `MediaStream`/`srcObject` gap that `pipecat-audio.spec.ts`
 * / `pipecat-video.spec.ts` work around with `FakeMediaStream`. There is no
 * equivalent workaround for canvas pixel output.
 *
 * So this spec splits coverage in two:
 *  - `resolveColor` and `computeBarHeights` are plain pure functions with no
 *    canvas/DOM-drawing dependency, so they get real, thorough TDD assertions.
 *  - The canvas draw loop itself gets a single smoke test: `getContext`'s
 *    result is mocked so the code path can run without throwing, and we
 *    assert only that a 2d context was requested and a drawing method was
 *    invoked — not exact call counts/args, since the mock has no real
 *    rendering behavior behind it to assert against.
 */

describe('resolveColor', () => {
  it('uses the explicit input value when provided, even if a CSS var is also set', () => {
    const styles = { getPropertyValue: () => '  rgb(1, 2, 3)  ' } as unknown as CSSStyleDeclaration;

    expect(resolveColor(styles, 'red', '--gvo-pipecat-visualizer-bar-color', 'blue')).toBe('red');
  });

  it('uses the CSS custom property when no explicit input is provided', () => {
    const el = document.createElement('div');
    el.style.setProperty('--gvo-pipecat-visualizer-bar-color', 'rgb(9, 8, 7)');
    document.body.appendChild(el);

    const styles = getComputedStyle(el);
    expect(
      resolveColor(styles, undefined, '--gvo-pipecat-visualizer-bar-color', 'fallback-color'),
    ).toBe('rgb(9, 8, 7)');

    document.body.removeChild(el);
  });

  it('falls back to the provided fallback when neither input nor CSS var is set', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const styles = getComputedStyle(el);
    expect(
      resolveColor(styles, undefined, '--gvo-pipecat-visualizer-bar-color', 'fallback-color'),
    ).toBe('fallback-color');

    document.body.removeChild(el);
  });
});

describe('computeBarHeights', () => {
  it('returns an array with length equal to barCount', () => {
    expect(computeBarHeights(0.5, 5, 120)).toHaveLength(5);
    expect(computeBarHeights(0.5, 3, 120)).toHaveLength(3);
  });

  it('scales heights with level: zero level yields all-zero heights, higher level yields proportionally higher heights', () => {
    const zero = computeBarHeights(0, 5, 120);
    expect(zero.every((h) => h === 0)).toBe(true);

    const low = computeBarHeights(0.2, 5, 120);
    const high = computeBarHeights(0.8, 5, 120);
    for (let i = 0; i < 5; i++) {
      expect(high[i]).toBeGreaterThan(low[i]);
    }
  });

  it('does not produce identical heights across bars for a nonzero level (jitter is applied)', () => {
    const heights = computeBarHeights(0.7, 5, 120);
    const allIdentical = heights.every((h) => h === heights[0]);
    expect(allIdentical).toBe(false);
  });
});

describe('PipecatVoiceVisualizer', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function setup(participantType: 'local' | 'bot', transport: FakeTransport = new FakeTransport()) {
    TestBed.configureTestingModule({
      providers: [providePipecat(), { provide: PIPECAT_TRANSPORT, useValue: transport }],
    });
    const fixture = TestBed.createComponent(PipecatVoiceVisualizer);
    fixture.componentRef.setInput('participantType', participantType);
    fixture.detectChanges();
    return {
      fixture,
      component: fixture.componentInstance,
      client: TestBed.inject(PIPECAT_CLIENT),
      transport,
    };
  }

  it('requests a 2d canvas context and draws when there is a nonzero audio level', async () => {
    const drawingContext = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      fillRect: vi.fn(),
      roundRect: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
    };
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(drawingContext as unknown as CanvasRenderingContext2D);
    // Run every rAF-scheduled callback synchronously instead of waiting on
    // real frame scheduling — both Angular's own internal render-tick
    // scheduling (which is what actually fires `afterNextRender`) and the
    // component's own draw loop go through `requestAnimationFrame`. Each
    // distinct callback REFERENCE only fires once: the component's loop
    // reschedules itself via a nested `requestAnimationFrame(loop)` call
    // using the very same `loop` function reference each time, so invoking
    // that one synchronously on every call would recurse forever. Other
    // (distinct) callbacks, like Angular's own scheduler tick, still get
    // their one synchronous invocation.
    const invokedCallbacks = new WeakSet<FrameRequestCallback>();
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        if (!invokedCallbacks.has(cb)) {
          invokedCallbacks.add(cb);
          cb(0);
        }
        return 0;
      });

    const { component, client, fixture } = setup('local');
    client.emit(RTVIEvent.LocalAudioLevel, 0.8);
    // `afterNextRender`'s own callback is scheduled via Angular's internal
    // render-hook mechanism, not directly observable/synchronous from the
    // test. `whenStable()` deterministically waits for Angular's actual
    // internal completion signal (not a guessed duration/tick count), so
    // this has no wall-clock timing assumption baked in.
    await fixture.whenStable();

    expect(getContextSpy).toHaveBeenCalledWith('2d');
    const anyDrawCallMade =
      drawingContext.fillRect.mock.calls.length > 0 ||
      drawingContext.roundRect.mock.calls.length > 0 ||
      drawingContext.fill.mock.calls.length > 0 ||
      drawingContext.stroke.mock.calls.length > 0;
    expect(anyDrawCallMade).toBe(true);

    getContextSpy.mockRestore();
    rafSpy.mockRestore();
    void component;
  });

  it('selects LocalAudioLevel vs RemoteAudioLevel based on participantType', () => {
    const { component: localComponent, client: localClient } = setup('local');
    localClient.emit(RTVIEvent.LocalAudioLevel, 0.7);
    expect(localComponent.level()).toBe(0.7);
    localClient.emit(RTVIEvent.RemoteAudioLevel, 0.3, {} as Participant);
    expect(localComponent.level()).toBe(0.7);

    TestBed.resetTestingModule();

    const { component: botComponent, client: botClient } = setup('bot');
    botClient.emit(RTVIEvent.RemoteAudioLevel, 0.5, {} as Participant);
    expect(botComponent.level()).toBe(0.5);
    botClient.emit(RTVIEvent.LocalAudioLevel, 0.9);
    expect(botComponent.level()).toBe(0.5);
  });
});
