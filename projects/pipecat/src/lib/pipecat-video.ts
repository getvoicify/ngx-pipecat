import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { PipecatDevices } from './devices';

/**
 * Renders a participant's video track (if any) into a `<video autoplay>`
 * element via the `srcObject` property. `participantType` selects which
 * participant's video to show.
 */
@Component({
  selector: 'gvo-pipecat-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<video autoplay [srcObject]="stream()"></video>`,
})
export class PipecatVideo {
  private readonly devices = inject(PipecatDevices);

  readonly participantType = input.required<'local' | 'bot'>();

  readonly stream = computed(
    () => {
      const tracks = this.devices.liveTracks();
      const track = this.participantType() === 'local' ? tracks.local.video : tracks.bot?.video;
      return track ? new MediaStream([track]) : undefined;
    },
    {
      // liveTracks() re-emits on ANY track-lifecycle event (mic/cam/screen),
      // not just video-track ones. Without this custom equality, every one
      // of those unrelated events would rebuild the MediaStream and
      // reassign srcObject, which can cause playback hiccups in real
      // browsers.
      equal: (a, b) => a?.getVideoTracks()[0] === b?.getVideoTracks()[0],
    },
  );
}
