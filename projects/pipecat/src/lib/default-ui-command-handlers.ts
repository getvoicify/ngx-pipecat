import { isPlatformServer } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { findElementByRef } from '@pipecat-ai/client-js';
import { PipecatUICommands } from './ui-commands';

/**
 * Payload for the built-in `click` command.
 * Mirrors `ClickPayload` from `@pipecat-ai/client-js`.
 */
interface ClickPayload {
  ref?: string | null;
  target_id?: string | null;
}

/**
 * Payload for the built-in `set_input_value` command.
 * Mirrors `SetInputValuePayload` from `@pipecat-ai/client-js`.
 */
interface SetInputValuePayload {
  ref?: string | null;
  target_id?: string | null;
  value: string;
  replace?: boolean | null;
}

/**
 * Payload for the built-in `select_text` command.
 * Mirrors `SelectTextPayload` from `@pipecat-ai/client-js`.
 */
interface SelectTextPayload {
  ref?: string | null;
  target_id?: string | null;
  start_offset?: number | null;
  end_offset?: number | null;
}

/**
 * Resolves a command's target element following the same `ref`-then-`target_id`
 * precedence documented on the SDK's built-in payload types (e.g.
 * `ScrollToPayload`): `ref` is tried first when present, and `target_id` is
 * used both when `ref` is absent and as a fallback when `ref` no longer
 * resolves to a live element.
 */
function resolveTarget(ref: string | null | undefined, targetId: string | null | undefined): Element | null {
  if (ref) {
    const element = findElementByRef(ref);
    if (element) {
      return element;
    }
  }
  if (targetId) {
    return document.getElementById(targetId);
  }
  return null;
}

function handleClick(payload: unknown): void {
  const { ref, target_id } = (payload ?? {}) as ClickPayload;
  const element = resolveTarget(ref, target_id);
  if (element instanceof HTMLElement) {
    element.click();
  }
}

function isTextEntryElement(element: Element): element is HTMLInputElement | HTMLTextAreaElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}

function handleSetInputValue(payload: unknown): void {
  const { ref, target_id, value, replace } = (payload ?? {}) as SetInputValuePayload;
  const element = resolveTarget(ref, target_id);
  if (!element) {
    return;
  }

  if (element instanceof HTMLSelectElement) {
    if (element.disabled) {
      return;
    }
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  if (!isTextEntryElement(element)) {
    return;
  }

  if (element.disabled || element.readOnly) {
    return;
  }
  if (element instanceof HTMLInputElement && element.type === 'hidden') {
    return;
  }

  element.value = replace !== false ? value : element.value + value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Converts a character offset (counted across an element's concatenated
 * descendant text-node content) into the `(textNode, offsetInNode)` pair
 * that `Range#setStart`/`Range#setEnd` require.
 */
function resolveTextOffset(element: Element, offset: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      return { node, offset: remaining };
    }
    remaining -= length;
    node = walker.nextNode() as Text | null;
  }
  return null;
}

function handleSelectText(payload: unknown): void {
  const { ref, target_id, start_offset, end_offset } = (payload ?? {}) as SelectTextPayload;
  const element = resolveTarget(ref, target_id);
  if (!element) {
    return;
  }

  const hasOffsets = start_offset != null && end_offset != null;

  if (isTextEntryElement(element)) {
    if (hasOffsets) {
      element.setSelectionRange(start_offset as number, end_offset as number);
    } else {
      element.select();
    }
    return;
  }

  const range = document.createRange();
  if (!hasOffsets) {
    range.selectNodeContents(element);
  } else {
    const start = resolveTextOffset(element, start_offset as number);
    const end = resolveTextOffset(element, end_offset as number);
    if (!start || !end) {
      return;
    }
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
  }

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/**
 * Registers the three built-in UI command handlers (`click`,
 * `set_input_value`, `select_text`) documented on `@pipecat-ai/client-js`'s
 * `ClickPayload`/`SetInputValuePayload`/`SelectTextPayload` types.
 *
 * This is explicit opt-in: nothing in the library calls this automatically.
 * Apps that want the standard command vocabulary call it themselves, e.g.
 * once at startup: `registerDefaultUICommandHandlers(inject(PipecatUICommands))`.
 *
 * Safe to call during SSR — the handlers themselves no-op without touching
 * the DOM when the platform is the server, following the same
 * `isPlatformServer(inject(PLATFORM_ID))` guard used in `providePipecat`.
 */
export function registerDefaultUICommandHandlers(uiCommands: PipecatUICommands): void {
  const isServer = isPlatformServer(inject(PLATFORM_ID));

  uiCommands.registerCommandHandler('click', (payload) => {
    if (isServer) {
      return;
    }
    handleClick(payload);
  });

  uiCommands.registerCommandHandler('set_input_value', (payload) => {
    if (isServer) {
      return;
    }
    handleSetInputValue(payload);
  });

  uiCommands.registerCommandHandler('select_text', (payload) => {
    if (isServer) {
      return;
    }
    handleSelectText(payload);
  });
}
