import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pipecat } from './pipecat';

describe('Pipecat', () => {
  let component: Pipecat;
  let fixture: ComponentFixture<Pipecat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pipecat],
    }).compileComponents();

    fixture = TestBed.createComponent(Pipecat);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
