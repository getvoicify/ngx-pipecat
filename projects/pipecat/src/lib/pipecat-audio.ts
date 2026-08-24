import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PipecatDevices } from './devices';

/**
 * Renders the bot's audio track (if any) into an `<audio autoplay>` element
 * via the `srcObject` property.
 */
@Component({
  selector: 'gvo-pipecat-audio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<audio autoplay [srcObject]="stream()"></audio>`,
})
export class PipecatAudio {
  private readonly devices = inject(PipecatDevices);

  readonly stream = computed(
    () => {
      const track = this.devices.liveTracks().bot?.audio;
      return track ? new MediaStream([track]) : undefined;
    },
    {
      // liveTracks() re-emits on ANY track-lifecycle event (mic/cam/screen),
      // not just bot-audio ones. Without this custom equality, every one of
      // those unrelated events would rebuild the MediaStream and reassign
      // srcObject, which can cause audible playback hiccups in real browsers.
      equal: (a, b) => a?.getAudioTracks()[0] === b?.getAudioTracks()[0],
    },
  );
}
