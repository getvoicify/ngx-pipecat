import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RTVIEvent } from '@pipecat-ai/client-js';
import { Pipecat } from './pipecat';

/**
 * Resolves a themeable color for the visualizer.
 *
 * Priority order:
 *  1. `inputValue`, if provided (an explicit JS-level override).
 *  2. The CSS custom property named `cssVarName`, read off `styles`, if set
 *     to a non-empty value (the primary, token-respecting mechanism).
 *  3. `fallback`, supplied by the caller (e.g. `currentColor` for bar color,
 *     `'transparent'` for background color).
 *
 * Pure and DOM-framework-agnostic: `styles` only needs `getPropertyValue`,
 * so callers can pass a real `getComputedStyle(...)` result or a plain mock.
 */
export function resolveColor(
  styles: Pick<CSSStyleDeclaration, 'getPropertyValue'>,
  inputValue: string | undefined,
  cssVarName: string,
  fallback: string,
): string {
  if (inputValue) {
    return inputValue;
  }
  const cssVarValue = styles.getPropertyValue(cssVarName).trim();
  if (cssVarValue) {
    return cssVarValue;
  }
  return fallback;
}

/**
 * Golden-ratio conjugate: an irrational fraction that, when multiplied by
 * successive integers and taken mod 1, spreads values evenly across
 * [0, 1) with no short repeating cycle. Used only to give each bar a fixed,
 * deterministic amount of jitter — not a source of real randomness.
 */
const JITTER_CONSTANT = 0.61803398875;

/**
 * Computes a per-bar height array from a single scalar audio level.
 *
 * The underlying `RTVIEvent.LocalAudioLevel` / `RemoteAudioLevel` events
 * carry one scalar volume level, not per-frequency-bin data, so all bars
 * are driven by the same `level`. Each bar gets a fixed, deterministic
 * per-index multiplier (derived from `JITTER_CONSTANT`, not `Math.random()`)
 * so bars don't all render at an identical height, while still all scaling
 * with the same underlying level.
 */
export function computeBarHeights(level: number, barCount: number, maxHeight: number): number[] {
  const clampedLevel = Math.min(1, Math.max(0, level));
  return Array.from({ length: barCount }, (_, index) => {
    const multiplier = 0.6 + 0.4 * ((index * JITTER_CONSTANT) % 1);
    return clampedLevel * maxHeight * multiplier;
  });
}

/**
 * Renders a bar-style visualization of a participant's audio level onto a
 * `<canvas>` element. `participantType` selects whether the local
 * participant's or the bot's audio level drives the visualization.
 *
 * Colors are resolved via `resolveColor` (see above) rather than hardcoded,
 * so the visualizer can be themed purely through CSS custom properties
 * (`--gvo-pipecat-visualizer-bar-color` / `--gvo-pipecat-visualizer-background-color`)
 * with `barColor` / `backgroundColor` inputs available as a JS-level escape
 * hatch.
 */
@Component({
  selector: 'gvo-pipecat-voice-visualizer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas></canvas>`,
})
export class PipecatVoiceVisualizer {
  private readonly pipecat = inject(Pipecat);
  private readonly hostElement = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  readonly participantType = input.required<'local' | 'bot'>();
  readonly barCount = input(5);
  readonly barGap = input(12);
  readonly barWidth = input(30);
  readonly barMaxHeight = input(120);
  readonly barLineCap = input<'round' | 'square'>('round');
  readonly barOrigin = input<'bottom' | 'center' | 'top'>('center');
  readonly barColor = input<string | undefined>(undefined);
  readonly backgroundColor = input<string | undefined>(undefined);

  private readonly localLevel = toSignal(this.pipecat.on(RTVIEvent.LocalAudioLevel), {
    initialValue: 0,
  });
  private readonly remoteLevel = toSignal(this.pipecat.on(RTVIEvent.RemoteAudioLevel), {
    initialValue: 0,
  });

  readonly level = computed(() =>
    this.participantType() === 'local' ? this.localLevel() : this.remoteLevel(),
  );

  private animationFrameId: number | undefined;

  constructor() {
    afterNextRender(() => {
      const loop = (): void => {
        this.drawFrame();
        this.animationFrameId = requestAnimationFrame(loop);
      };
      this.animationFrameId = requestAnimationFrame(loop);
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.animationFrameId !== undefined) {
        cancelAnimationFrame(this.animationFrameId);
      }
    });
  }

  /**
   * Thin drawing call site: gets the 2d context, resolves colors and bar
   * heights via the pure helpers above, and issues the actual canvas calls.
   * This is the one part jsdom cannot verify pixel-for-pixel — it is only
   * smoke-tested (see the spec file).
   */
  private drawFrame(): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const barCount = this.barCount();
    const barWidth = this.barWidth();
    const barGap = this.barGap();
    const maxHeight = this.barMaxHeight();
    const barOrigin = this.barOrigin();

    const width = barCount * barWidth + (barCount - 1) * barGap;
    const height = maxHeight;
    canvas.width = width;
    canvas.height = height;

    const hostStyles = getComputedStyle(this.hostElement);
    const barColor = resolveColor(
      hostStyles,
      this.barColor(),
      '--gvo-pipecat-visualizer-bar-color',
      hostStyles.color,
    );
    const backgroundColor = resolveColor(
      hostStyles,
      this.backgroundColor(),
      '--gvo-pipecat-visualizer-background-color',
      'transparent',
    );

    ctx.clearRect(0, 0, width, height);
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    const heights = computeBarHeights(this.level(), barCount, maxHeight);
    ctx.fillStyle = barColor;
    ctx.lineCap = this.barLineCap();

    for (let i = 0; i < heights.length; i++) {
      const barHeight = heights[i];
      const x = i * (barWidth + barGap);
      let y: number;
      if (barOrigin === 'top') {
        y = 0;
      } else if (barOrigin === 'bottom') {
        y = height - barHeight;
      } else {
        y = (height - barHeight) / 2;
      }
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }
}
