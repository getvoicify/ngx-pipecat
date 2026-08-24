import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PipecatCamToggle } from './pipecat-cam-toggle';
import { providePipecat } from './provider';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { FakeTransport } from './testing/fake-transport';

@Component({
  imports: [PipecatCamToggle],
  template: `<button gvoPipecatCamToggle #t="gvoPipecatCamToggle">{{ t.enabled() }}</button>`,
})
class CamToggleTestHost {}

describe('PipecatCamToggle', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function setup(transport: FakeTransport = new FakeTransport()) {
    TestBed.configureTestingModule({
      providers: [providePipecat(), { provide: PIPECAT_TRANSPORT, useValue: transport }],
    });
    const fixture = TestBed.createComponent(CamToggleTestHost);
    fixture.detectChanges();
    const buttonEl: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    return {
      fixture,
      buttonEl,
      client: TestBed.inject(PIPECAT_CLIENT),
      transport,
    };
  }

  it('reflects the current enabled state via the exported enabled signal', () => {
    const transport = new FakeTransport();
    transport.isCamEnabled = true;

    const { buttonEl } = setup(transport);

    expect(buttonEl.textContent?.trim()).toBe('true');
  });

  it('toggles enabled state on click', () => {
    const { fixture, buttonEl, client } = setup();
    const spy = vi.spyOn(client, 'enableCam').mockReturnValue(undefined);

    buttonEl.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(true);
    expect(buttonEl.textContent?.trim()).toBe('true');
  });
});
