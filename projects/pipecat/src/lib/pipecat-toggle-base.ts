import { Directive, inject, Signal } from '@angular/core';
import { PipecatDevices } from './devices';

/**
 * Shared click-toggle behavior for the mic/cam/screen-share toggle
 * directives. Not exported from `public-api.ts` — it's an internal
 * implementation detail, not something a consumer needs to reference
 * directly (they interact with the concrete directives via `exportAs`).
 *
 * The host click binding lives here rather than being repeated on each
 * subclass: empirically verified (see pipecat-mic-toggle.spec.ts) that
 * Angular fires a `host: {}` click binding declared only on this abstract
 * base `@Directive()` when a concrete subclass extends it without
 * redeclaring its own `host` object.
 */
@Directive({
  host: {
    '(click)': 'toggle()',
  },
})
export abstract class PipecatToggleBase {
  protected readonly devices = inject(PipecatDevices);

  abstract readonly enabled: Signal<boolean>;

  protected abstract toggle(): void;
}
