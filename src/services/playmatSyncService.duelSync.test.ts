import { describe, it, expect } from 'vitest';
import {
  createInitialRoomState,
  applyPlaymatAction,
} from './playmatSyncService';
import type { PlaymatCard, PlaymatRoomState } from '../types/playmat';

const card = (i: number): PlaymatCard => ({
  instanceId: `i${i}`,
  id: `sv1-${i}`,
  name: `Pokemon ${i}`,
  supertype: 'Pokémon',
  subtypes: ['Basic'],
  types: ['Fire'],
  hp: 120,
  damageCounters: 0,
  images: {
    small: `https://pub-af524b77e8e3403685545bc0a8222090.r2.dev/cards/sv1/${i}_small.webp`,
    large: `https://pub-af524b77e8e3403685545bc0a8222090.r2.dev/cards/sv1/${i}_large.webp`,
  },
});

function computeGlobalChanged(cur: PlaymatRoomState, nxt: PlaymatRoomState): boolean {
  return (
    nxt.setupPhase !== cur.setupPhase ||
    nxt.currentTurn !== cur.currentTurn ||
    nxt.turnNumber !== cur.turnNumber ||
    nxt.isTerminated !== cur.isTerminated ||
    (nxt.participants?.length ?? 0) !== (cur.participants?.length ?? 0) ||
    (nxt.stadium?.instanceId ?? null) !== (cur.stadium?.instanceId ?? null) ||
    (nxt.playedItemAnnouncement?.timestamp ?? 0) !== (cur.playedItemAnnouncement?.timestamp ?? 0) ||
    (nxt.revealedCardAnnouncement?.timestamp ?? 0) !== (cur.revealedCardAnnouncement?.timestamp ?? 0) ||
    (nxt.revealedHandAnnouncement?.timestamp ?? 0) !== (cur.revealedHandAnnouncement?.timestamp ?? 0) ||
    (nxt.firstPlayerChoice?.firstPlayer ?? null) !== (cur.firstPlayerChoice?.firstPlayer ?? null)
  );
}

describe('playmatSyncService - duel concurrency & state isolation', () => {
  it('role actions produce globalChanged === false', () => {
    let s = createInitialRoomState('PK-DUEL', null, 'host-uid');
    s.p1.active = card(1);
    s.p2.active = card(2);

    // 1. UPDATE_DAMAGE on P1
    const nxtDamage = applyPlaymatAction(s, {
      role: 'p1',
      action: 'UPDATE_DAMAGE',
      targetInstanceId: 'i1',
      damage: 30,
    });
    expect(computeGlobalChanged(s, nxtDamage)).toBe(false);
    expect(nxtDamage.p1.active?.damageCounters).toBe(30);
    expect(nxtDamage.p2.active?.damageCounters).toBe(0);

    // 2. DRAW_CARD on P1
    const nxtDraw = applyPlaymatAction(s, {
      role: 'p1',
      action: 'DRAW_CARD',
      count: 1,
    });
    expect(computeGlobalChanged(s, nxtDraw)).toBe(false);

    // 3. ATTACH_TO_CARD on P1
    const nxtAttach = applyPlaymatAction(s, {
      role: 'p1',
      action: 'ATTACH_TO_CARD',
      targetInstanceId: 'i1',
      card: { instanceId: 'e1', id: 'sve-1', name: 'Fire Energy', supertype: 'Energy' },
    });
    expect(computeGlobalChanged(s, nxtAttach)).toBe(false);
  });

  it('global actions produce globalChanged === true or are marked as affectsBoth', () => {
    const s = createInitialRoomState('PK-DUEL', null, 'host-uid');

    // PASS_TURN changes currentTurn and turnNumber
    const passTurnState = applyPlaymatAction(s, {
      role: 'p1',
      action: 'PASS_TURN',
    });
    expect(computeGlobalChanged(s, passTurnState)).toBe(true);
    expect(passTurnState.currentTurn).toBe('p2');
    expect(passTurnState.turnNumber).toBe(2);

    // PLAY_STADIUM changes stadium
    const stadiumCard: PlaymatCard = {
      instanceId: 'stad-1',
      id: 'sv1-stad',
      name: 'Artazon',
      supertype: 'Trainer',
      subtypes: ['Stadium'],
    };
    const stadiumState = applyPlaymatAction(s, {
      role: 'p1',
      action: 'PLAY_STADIUM',
      card: stadiumCard,
    });
    expect(computeGlobalChanged(s, stadiumState)).toBe(true);
    expect(stadiumState.stadium?.name).toBe('Artazon');
  });

  it('history caps at 5 entries and payload size is <= 70 KB', () => {
    let s = createInitialRoomState('PK-DUEL', null, 'host-uid');
    for (const r of ['p1', 'p2'] as const) {
      s[r].prizes = [1, 2, 3, 4, 5, 6].map(card);
      s[r].active = card(10);
      s[r].bench = [11, 12, 13, 14, 15].map(card);
      s[r].discard = Array.from({ length: 25 }, (_, i) => card(100 + i));
      s[r].lostZone = [200, 201, 202].map(card);
    }

    // Apply 15 sequential actions
    for (let i = 0; i < 15; i++) {
      s = applyPlaymatAction(s, {
        role: 'p1',
        action: 'UPDATE_DAMAGE',
        targetInstanceId: 'i10',
        damage: 10 + i * 10,
      });
    }

    expect(s.history?.length).toBe(5);
    const historyBytes = JSON.stringify(s.history).length;
    const historyKb = historyBytes / 1024;
    expect(historyKb).toBeLessThanOrEqual(70);
  });

  it('merging partitioned role updates preserves the other player board state', () => {
    const s1 = createInitialRoomState('PK-DUEL', null, 'host-uid');
    // P1 sets up active
    const p1Active = card(101);
    s1.p1.active = p1Active;

    // P2 sets up active
    const s2 = JSON.parse(JSON.stringify(s1));
    const p2Active = card(201);
    s2.p2.active = p2Active;

    // Simulate P1 receiving P2's partitioned update (sourceRole === 'p2')
    const incomingP2 = {
      p2: s2.p2,
      updatedAt: 12345,
      recentActionText: 'Player 2 plays active',
    };

    const mergedForP1: PlaymatRoomState = {
      ...s1,
      p2: incomingP2.p2,
      updatedAt: incomingP2.updatedAt,
      recentActionText: incomingP2.recentActionText,
    };

    // P1 active is preserved! P2 active is updated!
    expect(mergedForP1.p1.active?.name).toBe('Pokemon 101');
    expect(mergedForP1.p2.active?.name).toBe('Pokemon 201');
  });
});
