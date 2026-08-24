import { TestBed } from '@angular/core/testing';
import { RTVIEvent } from '@pipecat-ai/client-js';
import type { TranscriptData, BotOutputData } from '@pipecat-ai/client-js';
import { PipecatConversation } from './conversation';
import { providePipecat } from './provider';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { FakeTransport } from './testing/fake-transport';

describe('PipecatConversation', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function setup(transport: FakeTransport = new FakeTransport()) {
    TestBed.configureTestingModule({
      providers: [providePipecat(), { provide: PIPECAT_TRANSPORT, useValue: transport }],
    });
    return {
      conversation: TestBed.inject(PipecatConversation),
      client: TestBed.inject(PIPECAT_CLIENT),
      transport,
    };
  }

  function transcript(overrides: Partial<TranscriptData> = {}): TranscriptData {
    return {
      text: 'hello',
      final: false,
      timestamp: '2026-08-22T10:00:00.000Z',
      user_id: 'user-1',
      ...overrides,
    };
  }

  function botOutput(overrides: Partial<BotOutputData> = {}): BotOutputData {
    return {
      text: 'hi',
      ...overrides,
    };
  }

  it('a non-final userTranscript event sets currentUserPartial and does not add anything to turns', () => {
    const { conversation, client } = setup();

    client.emit(RTVIEvent.UserTranscript, transcript({ text: 'hel', final: false }));

    expect(conversation.currentUserPartial()).toBe('hel');
    expect(conversation.turns()).toEqual([]);
  });

  it('a subsequent non-final userTranscript event replaces currentUserPartial rather than appending', () => {
    const { conversation, client } = setup();

    client.emit(RTVIEvent.UserTranscript, transcript({ text: 'hel', final: false }));
    client.emit(RTVIEvent.UserTranscript, transcript({ text: 'hello', final: false }));

    expect(conversation.currentUserPartial()).toBe('hello');
  });

  it('a final userTranscript event commits a user turn and clears currentUserPartial', () => {
    const { conversation, client } = setup();
    client.emit(RTVIEvent.UserTranscript, transcript({ text: 'hel', final: false }));

    client.emit(
      RTVIEvent.UserTranscript,
      transcript({ text: 'hello there', final: true, timestamp: '2026-08-22T10:00:01.000Z' }),
    );

    expect(conversation.turns()).toEqual([
      { role: 'user', text: 'hello there', timestamp: Date.parse('2026-08-22T10:00:01.000Z') },
    ]);
    expect(conversation.currentUserPartial()).toBeNull();
  });

  it('multiple botOutput events accumulate by appending, in arrival order, without adding turns yet', () => {
    const { conversation, client } = setup();

    client.emit(RTVIEvent.BotOutput, botOutput({ text: 'Hello' }));
    client.emit(RTVIEvent.BotOutput, botOutput({ text: ' there' }));
    client.emit(RTVIEvent.BotOutput, botOutput({ text: '!' }));

    expect(conversation.currentBotPartial()).toBe('Hello there!');
    expect(conversation.turns()).toEqual([]);
  });

  it('botLlmStopped after botOutput events commits a bot turn with the full accumulated text and clears currentBotPartial', () => {
    const { conversation, client } = setup();
    client.emit(RTVIEvent.BotOutput, botOutput({ text: 'Hello' }));
    client.emit(RTVIEvent.BotOutput, botOutput({ text: ' there' }));

    client.emit(RTVIEvent.BotLlmStopped);

    expect(conversation.turns()).toEqual([
      { role: 'bot', text: 'Hello there', timestamp: expect.any(Number) },
    ]);
    expect(conversation.currentBotPartial()).toBeNull();
  });

  it('botLlmStopped with no prior botOutput events does not add a phantom empty turn', () => {
    const { conversation, client } = setup();

    client.emit(RTVIEvent.BotLlmStopped);

    expect(conversation.turns()).toEqual([]);
    expect(conversation.currentBotPartial()).toBeNull();
  });

  it('accumulates multiple full turns, alternating user/bot, in the correct order', () => {
    const { conversation, client } = setup();

    client.emit(
      RTVIEvent.UserTranscript,
      transcript({ text: 'question one', final: true, timestamp: '2026-08-22T10:00:00.000Z' }),
    );
    client.emit(RTVIEvent.BotOutput, botOutput({ text: 'answer one' }));
    client.emit(RTVIEvent.BotLlmStopped);
    client.emit(
      RTVIEvent.UserTranscript,
      transcript({ text: 'question two', final: true, timestamp: '2026-08-22T10:00:02.000Z' }),
    );
    client.emit(RTVIEvent.BotOutput, botOutput({ text: 'answer two' }));
    client.emit(RTVIEvent.BotLlmStopped);

    expect(conversation.turns().map((turn) => ({ role: turn.role, text: turn.text }))).toEqual([
      { role: 'user', text: 'question one' },
      { role: 'bot', text: 'answer one' },
      { role: 'user', text: 'question two' },
      { role: 'bot', text: 'answer two' },
    ]);
  });

  it('clear() resets turns to [] and both partial signals to null, even mid-partial', () => {
    const { conversation, client } = setup();
    client.emit(
      RTVIEvent.UserTranscript,
      transcript({ text: 'committed', final: true, timestamp: '2026-08-22T10:00:00.000Z' }),
    );
    client.emit(RTVIEvent.UserTranscript, transcript({ text: 'in progress', final: false }));
    client.emit(RTVIEvent.BotOutput, botOutput({ text: 'partial bot text' }));

    conversation.clear();

    expect(conversation.turns()).toEqual([]);
    expect(conversation.currentUserPartial()).toBeNull();
    expect(conversation.currentBotPartial()).toBeNull();
  });
});
