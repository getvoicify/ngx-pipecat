import { Directive } from '@angular/core';
import { PipecatToggleBase } from './pipecat-toggle-base';

/**
 * Attribute directive that toggles the mic on click. Apply to any element
 * (typically a `<button>`); exposes the live enabled state via `enabled`,
 * accessible through the `gvoPipecatMicToggle` template reference.
 *
 * Usage: `<button gvoPipecatMicToggle #t="gvoPipecatMicToggle">{{ t.enabled() ? 'Mute' : 'Unmute' }}</button>`
 */
@Directive({
  selector: '[gvoPipecatMicToggle]',
  exportAs: 'gvoPipecatMicToggle',
})
export class PipecatMicToggle extends PipecatToggleBase {
  readonly enabled = this.devices.micEnabled;

  protected toggle(): void {
    this.devices.enableMic(!this.enabled());
  }
}
