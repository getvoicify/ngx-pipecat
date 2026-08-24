import { Directive } from '@angular/core';
import { PipecatToggleBase } from './pipecat-toggle-base';

/**
 * Attribute directive that toggles the camera on click. Apply to any
 * element (typically a `<button>`); exposes the live enabled state via
 * `enabled`, accessible through the `gvoPipecatCamToggle` template
 * reference.
 *
 * Usage: `<button gvoPipecatCamToggle #t="gvoPipecatCamToggle">{{ t.enabled() ? 'Stop video' : 'Start video' }}</button>`
 */
@Directive({
  selector: '[gvoPipecatCamToggle]',
  exportAs: 'gvoPipecatCamToggle',
})
export class PipecatCamToggle extends PipecatToggleBase {
  readonly enabled = this.devices.camEnabled;

  protected toggle(): void {
    this.devices.enableCam(!this.enabled());
  }
}
