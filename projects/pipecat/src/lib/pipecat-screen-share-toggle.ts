import { Directive } from '@angular/core';
import { PipecatToggleBase } from './pipecat-toggle-base';

/**
 * Attribute directive that toggles screen sharing on click. Apply to any
 * element (typically a `<button>`); exposes the live enabled state via
 * `enabled`, accessible through the `gvoPipecatScreenShareToggle` template
 * reference.
 *
 * Usage: `<button gvoPipecatScreenShareToggle #t="gvoPipecatScreenShareToggle">{{ t.enabled() ? 'Stop sharing' : 'Share screen' }}</button>`
 */
@Directive({
  selector: '[gvoPipecatScreenShareToggle]',
  exportAs: 'gvoPipecatScreenShareToggle',
})
export class PipecatScreenShareToggle extends PipecatToggleBase {
  readonly enabled = this.devices.sharingScreen;

  protected toggle(): void {
    this.devices.enableScreenShare(!this.enabled());
  }
}
