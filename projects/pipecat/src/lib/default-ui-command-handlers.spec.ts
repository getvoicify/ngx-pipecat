import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { RTVIEvent, findElementByRef, findRefForElement, snapshotDocument } from '@pipecat-ai/client-js';
import { PipecatUICommands } from './ui-commands';
import { registerDefaultUICommandHandlers } from './default-ui-command-handlers';
import { providePipecat } from './provider';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { FakeTransport } from './testing/fake-transport';

describe('registerDefaultUICommandHandlers', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.innerHTML = '';
    window.getSelection()?.removeAllRanges();
  });

  function setup(platform: 'browser' | 'server' = 'browser', transport: FakeTransport = new FakeTransport()) {
    TestBed.configureTestingModule({
      providers: [
        providePipecat(),
        { provide: PIPECAT_TRANSPORT, useValue: transport },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    const uiCommands = TestBed.inject(PipecatUICommands);
    TestBed.runInInjectionContext(() => registerDefaultUICommandHandlers(uiCommands));
    return {
      uiCommands,
      client: TestBed.inject(PIPECAT_CLIENT),
    };
  }

  describe('click', () => {
    it('clicks the element resolved via target_id', () => {
      const { client } = setup();
      const button = document.createElement('button');
      button.id = 'my-button';
      document.body.appendChild(button);
      const clickListener = vi.fn();
      button.addEventListener('click', clickListener);

      client.emit(RTVIEvent.UICommand, { command: 'click', payload: { target_id: 'my-button' } });

      expect(clickListener).toHaveBeenCalledTimes(1);
    });

    it('does not throw when the target cannot be resolved', () => {
      const { client } = setup();

      expect(() => {
        client.emit(RTVIEvent.UICommand, { command: 'click', payload: { target_id: 'missing' } });
      }).not.toThrow();
    });

    it('clicks the element resolved via ref', () => {
      const { client } = setup();
      const container = document.createElement('div');
      const button = document.createElement('button');
      container.appendChild(button);
      document.body.appendChild(container);

      snapshotDocument(container);
      const ref = findRefForElement(button);
      expect(ref).toBeTruthy();
      expect(findElementByRef(ref as string)).toBe(button);

      const clickListener = vi.fn();
      button.addEventListener('click', clickListener);

      client.emit(RTVIEvent.UICommand, { command: 'click', payload: { ref } });

      expect(clickListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('set_input_value', () => {
    it('replaces the value by default and dispatches an input event', () => {
      const { client } = setup();
      const input = document.createElement('input');
      input.id = 'my-input';
      input.value = 'old';
      document.body.appendChild(input);
      const inputListener = vi.fn();
      input.addEventListener('input', inputListener);

      client.emit(RTVIEvent.UICommand, {
        command: 'set_input_value',
        payload: { target_id: 'my-input', value: 'new' },
      });

      expect(input.value).toBe('new');
      expect(inputListener).toHaveBeenCalledTimes(1);
    });

    it('appends instead of replacing when replace is false', () => {
      const { client } = setup();
      const input = document.createElement('input');
      input.id = 'my-input';
      input.value = 'old';
      document.body.appendChild(input);

      client.emit(RTVIEvent.UICommand, {
        command: 'set_input_value',
        payload: { target_id: 'my-input', value: 'new', replace: false },
      });

      expect(input.value).toBe('oldnew');
    });

    it('refuses to act on a disabled input', () => {
      const { client } = setup();
      const input = document.createElement('input');
      input.id = 'my-input';
      input.value = 'old';
      input.disabled = true;
      document.body.appendChild(input);

      client.emit(RTVIEvent.UICommand, {
        command: 'set_input_value',
        payload: { target_id: 'my-input', value: 'new' },
      });

      expect(input.value).toBe('old');
    });

    it('refuses to act on a readonly input', () => {
      const { client } = setup();
      const input = document.createElement('input');
      input.id = 'my-input';
      input.value = 'old';
      input.readOnly = true;
      document.body.appendChild(input);

      client.emit(RTVIEvent.UICommand, {
        command: 'set_input_value',
        payload: { target_id: 'my-input', value: 'new' },
      });

      expect(input.value).toBe('old');
    });

    it('refuses to act on an input type="hidden"', () => {
      const { client } = setup();
      const input = document.createElement('input');
      input.id = 'my-input';
      input.type = 'hidden';
      input.value = 'old';
      document.body.appendChild(input);

      client.emit(RTVIEvent.UICommand, {
        command: 'set_input_value',
        payload: { target_id: 'my-input', value: 'new' },
      });

      expect(input.value).toBe('old');
    });

    it("sets a select's value directly", () => {
      const { client } = setup();
      const select = document.createElement('select');
      select.id = 'my-select';
      const optionA = document.createElement('option');
      optionA.value = 'a';
      const optionB = document.createElement('option');
      optionB.value = 'b';
      select.append(optionA, optionB);
      document.body.appendChild(select);

      client.emit(RTVIEvent.UICommand, {
        command: 'set_input_value',
        payload: { target_id: 'my-select', value: 'b' },
      });

      expect(select.value).toBe('b');
    });
  });

  describe('select_text', () => {
    it('sets selectionStart/selectionEnd on an input when both offsets are given', () => {
      const { client } = setup();
      const input = document.createElement('input');
      input.id = 'my-input';
      input.value = 'hello world';
      document.body.appendChild(input);

      client.emit(RTVIEvent.UICommand, {
        command: 'select_text',
        payload: { target_id: 'my-input', start_offset: 1, end_offset: 4 },
      });

      expect(input.selectionStart).toBe(1);
      expect(input.selectionEnd).toBe(4);
    });

    it('selects the full value on an input when offsets are omitted', () => {
      const { client } = setup();
      const input = document.createElement('input');
      input.id = 'my-input';
      input.value = 'hello world';
      document.body.appendChild(input);

      client.emit(RTVIEvent.UICommand, {
        command: 'select_text',
        payload: { target_id: 'my-input' },
      });

      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(input.value.length);
    });

    it('selects a general element full text content when offsets are omitted', () => {
      const { client } = setup();
      const paragraph = document.createElement('p');
      paragraph.id = 'my-paragraph';
      paragraph.textContent = 'hello world';
      document.body.appendChild(paragraph);

      client.emit(RTVIEvent.UICommand, {
        command: 'select_text',
        payload: { target_id: 'my-paragraph' },
      });

      expect(window.getSelection()?.toString()).toBe('hello world');
    });

    it('does not throw when the target cannot be resolved', () => {
      const { client } = setup();

      expect(() => {
        client.emit(RTVIEvent.UICommand, { command: 'select_text', payload: { target_id: 'missing' } });
      }).not.toThrow();
    });
  });

  describe('SSR safety', () => {
    it('does not throw and does not touch the DOM when handlers fire while the platform is server', () => {
      const { client } = setup('server');
      const button = document.createElement('button');
      button.id = 'my-button';
      document.body.appendChild(button);
      const clickListener = vi.fn();
      button.addEventListener('click', clickListener);

      expect(() => {
        client.emit(RTVIEvent.UICommand, { command: 'click', payload: { target_id: 'my-button' } });
        client.emit(RTVIEvent.UICommand, {
          command: 'set_input_value',
          payload: { target_id: 'my-button', value: 'x' },
        });
        client.emit(RTVIEvent.UICommand, { command: 'select_text', payload: { target_id: 'my-button' } });
      }).not.toThrow();

      expect(clickListener).not.toHaveBeenCalled();
    });
  });
});
