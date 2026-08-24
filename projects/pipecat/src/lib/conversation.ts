import { computed, inject, Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { merge, Observable, Subject } from 'rxjs';
import { map, scan } from 'rxjs/operators';
import { BotOutputData, RTVIEvent, TranscriptData } from '@pipecat-ai/client-js';
import { fromClientEvent } from './events';
import { PIPECAT_CLIENT } from './tokens';

export type ConversationRole = 'user' | 'bot';

export interface ConversationTurn {
  role: ConversationRole;
  text: string;
  timestamp: number;
}

export interface ConversationState {
  turns: ConversationTurn[];
  currentUserPartial: string | null;
  currentBotPartial: string | null;
}

type UserTranscriptAction = { type: 'userTranscript'; data: TranscriptData };
type BotOutputAction = { type: 'botOutput'; data: BotOutputData };
type BotLlmStoppedAction = { type: 'botLlmStopped' };
type ClearAction = { type: 'clear' };
type ConversationAction =
  | UserTranscriptAction
  | BotOutputAction
  | BotLlmStoppedAction
  | ClearAction;

const initialState: ConversationState = {
  turns: [],
  currentUserPartial: null,
  currentBotPartial: null,
};

function reduce(acc: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case 'userTranscript': {
      if (!action.data.final) {
        return { ...acc, currentUserPartial: action.data.text };
      }
      const turn: ConversationTurn = {
        role: 'user',
        text: action.data.text,
        timestamp: Date.parse(action.data.timestamp),
      };
      return { ...acc, turns: [...acc.turns, turn], currentUserPartial: null };
    }
    case 'botOutput': {
      const currentBotPartial = (acc.currentBotPartial ?? '') + action.data.text;
      return { ...acc, currentBotPartial };
    }
    case 'botLlmStopped': {
      if (!acc.currentBotPartial) {
        return { ...acc, currentBotPartial: null };
      }
      const turn: ConversationTurn = {
        role: 'bot',
        text: acc.currentBotPartial,
        timestamp: Date.now(),
      };
      return { ...acc, turns: [...acc.turns, turn], currentBotPartial: null };
    }
    case 'clear':
      return initialState;
  }
}

/**
 * Reduces the `userTranscript`/`botOutput`/`botLlmStopped` client event
 * stream into a text transcript, following the same `fromClientEvent` +
 * `merge` + `scan` + `toSignal` idiom as `PipecatUIJobGroups`.
 *
 * Scoped purely to building the transcript — it does not track speaking
 * activity (no `userStartedSpeaking`/`botStartedSpeaking`/etc. handling).
 */
@Injectable({
  providedIn: 'root',
})
export class PipecatConversation {
  private readonly client = inject(PIPECAT_CLIENT);
  private readonly clear$ = new Subject<ClearAction>();

  private readonly state$: Observable<ConversationState> = merge(
    fromClientEvent(this.client, RTVIEvent.UserTranscript).pipe(
      map((data): ConversationAction => ({ type: 'userTranscript', data })),
    ),
    fromClientEvent(this.client, RTVIEvent.BotOutput).pipe(
      map((data): ConversationAction => ({ type: 'botOutput', data })),
    ),
    fromClientEvent(this.client, RTVIEvent.BotLlmStopped).pipe(
      map((): ConversationAction => ({ type: 'botLlmStopped' })),
    ),
    this.clear$,
  ).pipe(scan(reduce, initialState));

  private readonly state = toSignal(this.state$, { initialValue: initialState });

  readonly turns: Signal<ConversationTurn[]> = computed(() => this.state().turns);
  readonly currentUserPartial: Signal<string | null> = computed(
    () => this.state().currentUserPartial,
  );
  readonly currentBotPartial: Signal<string | null> = computed(
    () => this.state().currentBotPartial,
  );

  clear(): void {
    this.clear$.next({ type: 'clear' });
  }
}
