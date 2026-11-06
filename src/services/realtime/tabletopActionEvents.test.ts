import { describe, it, expect, beforeEach } from 'vitest';
import {
  createActionEvent,
  ActionSequenceTracker,
  resetSequenceCounter,
} from './tabletopActionEvents';

describe('Realtime Action Events & Sequence Tracker', () => {
  beforeEach(() => {
    resetSequenceCounter(0);
  });

  it('creates action events with monotonic sequence numbers and unique ids', () => {
    const evt1 = createActionEvent('PK-1234', 'p1', { action: 'DRAW_CARD', role: 'p1', count: 1 });
    const evt2 = createActionEvent('PK-1234', 'p1', { action: 'PASS_TURN', role: 'p1' });

    expect(evt1.seq).toBe(1);
    expect(evt2.seq).toBe(2);
    expect(evt1.id).not.toBe(evt2.id);
    expect(evt1.roomCode).toBe('PK-1234');
    expect(evt1.payload.action).toBe('DRAW_CARD');
  });

  it('accepts new events and rejects duplicate events with identical id', () => {
    const tracker = new ActionSequenceTracker();
    const evt1 = createActionEvent('PK-1234', 'p1', { action: 'DRAW_CARD', role: 'p1' });

    expect(tracker.accept(evt1)).toBe(true);
    // Duplicate submission of same event
    expect(tracker.accept(evt1)).toBe(false);
  });

  it('handles events from both p1 and p2 independently', () => {
    const tracker = new ActionSequenceTracker();
    const p1Evt = createActionEvent('PK-1234', 'p1', { action: 'DRAW_CARD', role: 'p1' });
    const p2Evt = createActionEvent('PK-1234', 'p2', { action: 'DRAW_CARD', role: 'p2' });

    expect(tracker.accept(p1Evt)).toBe(true);
    expect(tracker.accept(p2Evt)).toBe(true);
  });

  it('clears state on reset', () => {
    const tracker = new ActionSequenceTracker();
    const evt = createActionEvent('PK-1234', 'p1', { action: 'DRAW_CARD', role: 'p1' });
    expect(tracker.accept(evt)).toBe(true);
    tracker.reset();
    // After reset, same event id is accepted again
    expect(tracker.accept(evt)).toBe(true);
  });
});
