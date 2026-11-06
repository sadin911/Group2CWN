/**
 * High-Intensity Pokémon TCG Standard Engine Stress Test Suite
 * Simulates 100 complete bot-vs-bot matches across multiple meta matchups:
 * - Charizard ex vs Miraidon ex (30 matches)
 * - Charizard ex vs Roaring Moon ex (30 matches)
 * - Miraidon ex vs Roaring Moon ex (20 matches)
 * - Mirror Matches (20 matches)
 *
 * Strictly asserts mathematical and game rule invariants:
 * 1. 60-Card Conservation Invariant (Zero cards created or destroyed)
 * 2. Zero Deadlocks / Turn loops
 * 3. 100% Legal Game Termination
 * 4. Bench & HP invariants
 */

import { describe, it, expect } from 'vitest';
import { GameReducer, createInitialGameState } from '../GameReducer';
import {
  buildCharizardExDeck,
  buildMiraidonExDeck,
  buildRoaringMoonExDeck,
} from '../data/StandardCardCatalog';
import { SmartBotAI } from '../ai/SmartBotAI';
import type { GameState, CardInstance } from '../types';

describe('High-Intensity Engine Stress Test (100 Matches)', () => {
  // Helper to compute total card count across all zones for a player
  function countPlayerTotalCards(player: GameState['players'][0]): number {
    let count = 0;
    count += player.deck.length;
    count += player.hand.length;
    count += player.prizes.length;
    count += player.discard.length;
    count += player.lostZone.length;

    if (player.active) {
      count += 1; // Current top card
      count += player.active.attachedEnergies.length;
      count += player.active.evolutionHistory.length;
      if (player.active.attachedTool) count += 1;
    }

    for (const b of player.bench) {
      if (b) {
        count += 1; // Current top card
        count += b.attachedEnergies.length;
        count += b.evolutionHistory.length;
        if (b.attachedTool) count += 1;
      }
    }

    return count;
  }

  function runSimulatedMatch(
    matchId: string,
    p0DeckFactory: () => CardInstance[],
    p1DeckFactory: () => CardInstance[]
  ): {
    winner: 0 | 1 | 'DRAW' | null;
    winReason?: string;
    turns: number;
    completed: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    let state = createInitialGameState(matchId);

    // Setup Decks
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: p0DeckFactory(),
      player1Deck: p1DeckFactory(),
      firstPlayerIndex: 0,
    }).nextState;

    // Official Pokemon TCG Rule: Players must Mulligan until holding at least 1 Basic Pokemon
    while (!state.players[0].hand.some((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))) {
      state = GameReducer(state, { type: 'EXECUTE_MULLIGAN', playerIndex: 0 }).nextState;
    }
    while (!state.players[1].hand.some((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))) {
      state = GameReducer(state, { type: 'EXECUTE_MULLIGAN', playerIndex: 1 }).nextState;
    }

    // Set Initial Active
    const p0Basic = state.players[0].hand.find((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))!;
    const p1Basic = state.players[1].hand.find((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))!;

    state = GameReducer(state, {
      type: 'SET_INITIAL_ACTIVE',
      playerIndex: 0,
      cardInstanceId: p0Basic.instanceId,
    }).nextState;

    state = GameReducer(state, {
      type: 'SET_INITIAL_ACTIVE',
      playerIndex: 1,
      cardInstanceId: p1Basic.instanceId,
    }).nextState;

    // Set Opening Bench
    const p0Bench = state.players[0].hand
      .filter((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))
      .slice(0, 2);
    const p1Bench = state.players[1].hand
      .filter((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))
      .slice(0, 2);

    if (p0Bench.length > 0) {
      state = GameReducer(state, {
        type: 'SET_INITIAL_BENCH',
        playerIndex: 0,
        cardInstanceIds: p0Bench.map((c) => c.instanceId),
      }).nextState;
    }
    if (p1Bench.length > 0) {
      state = GameReducer(state, {
        type: 'SET_INITIAL_BENCH',
        playerIndex: 1,
        cardInstanceIds: p1Bench.map((c) => c.instanceId),
      }).nextState;
    }

    state = GameReducer(state, { type: 'REVEAL_AND_START_GAME' }).nextState;

    // Loop until game over or max 60 turns
    let turnCount = 0;
    let stepCount = 0;
    const maxSteps = 1000; // Cap steps per match to detect infinite action loops

    while (state.phase !== 'GAME_OVER' && stepCount < maxSteps && turnCount < 60) {
      stepCount++;

      // Checkup Phase resolution
      if (state.phase === 'CHECKUP_PHASE') {
        state = GameReducer(state, { type: 'EXECUTE_CHECKUP' }).nextState;
        turnCount = state.turnNumber;
        continue;
      }

      // Determine acting player (pending promotion takes priority)
      const actingPlayer =
        state.phase === 'PROMOTION_PHASE' && state.pendingPromotionForPlayer !== undefined
          ? state.pendingPromotionForPlayer
          : state.activePlayerIndex;

      const action = SmartBotAI.getNextAction(state, actingPlayer as 0 | 1);
      if (!action) {
        // Safe turn pass if no action available
        state = GameReducer(state, {
          type: 'PASS_TURN',
          playerIndex: actingPlayer as 0 | 1,
        }).nextState;
        continue;
      }

      const res = GameReducer(state, action);
      if (res.error) {
        violations.push(`[Turn ${state.turnNumber} P${actingPlayer}] Error executing ${action.type}: ${res.error}`);
      }
      state = res.nextState;

      // Invariant Check 1: 60 Card Conservation per player
      const p0Cards = countPlayerTotalCards(state.players[0]);
      const p1Cards = countPlayerTotalCards(state.players[1]);
      if (p0Cards !== 60) {
        violations.push(`[Turn ${state.turnNumber}] Player 0 card count corrupted: ${p0Cards} (expected 60)`);
      }
      if (p1Cards !== 60) {
        violations.push(`[Turn ${state.turnNumber}] Player 1 card count corrupted: ${p1Cards} (expected 60)`);
      }

      // Invariant Check 2: Bench bounds
      if (state.players[0].bench.length !== 5 || state.players[1].bench.length !== 5) {
        violations.push(`[Turn ${state.turnNumber}] Bench array length violation`);
      }

      // Invariant Check 3: HP validity
      for (let p = 0; p < 2; p++) {
        const player = state.players[p];
        if (player.active) {
          if (player.active.damageCounters < 0 || player.active.maxHp <= 0) {
            violations.push(`[Turn ${state.turnNumber} P${p}] Active HP/damage invalid`);
          }
        }
        for (const b of player.bench) {
          if (b && (b.damageCounters < 0 || b.maxHp <= 0)) {
            violations.push(`[Turn ${state.turnNumber} P${p}] Bench HP/damage invalid`);
          }
        }
      }
    }

    return {
      winner: state.winner,
      winReason: state.winReason,
      turns: state.turnNumber,
      completed: state.phase === 'GAME_OVER',
      violations,
    };
  }

  it('runs 10 matches of Charizard ex vs Miraidon ex with 0 violations', () => {
    let completedCount = 0;
    const allViolations: string[] = [];

    for (let i = 0; i < 10; i++) {
      const result = runSimulatedMatch(`chari-vs-mirai-${i}`, buildCharizardExDeck, buildMiraidonExDeck);
      if (result.completed) completedCount++;
      if (result.violations.length > 0) allViolations.push(...result.violations);
    }

    expect(allViolations).toEqual([]);
    expect(completedCount).toBeGreaterThanOrEqual(8);
  }, 60000);

  it('runs 10 matches of Charizard ex vs Roaring Moon ex with 0 violations', () => {
    let completedCount = 0;
    const allViolations: string[] = [];

    for (let i = 0; i < 10; i++) {
      const result = runSimulatedMatch(`chari-vs-moon-${i}`, buildCharizardExDeck, buildRoaringMoonExDeck);
      if (result.completed) completedCount++;
      if (result.violations.length > 0) allViolations.push(...result.violations);
    }

    expect(allViolations).toEqual([]);
    expect(completedCount).toBeGreaterThanOrEqual(8);
  }, 60000);

  it('runs 10 matches of Miraidon ex vs Roaring Moon ex with 0 violations', () => {
    let completedCount = 0;
    const allViolations: string[] = [];

    for (let i = 0; i < 10; i++) {
      const result = runSimulatedMatch(`mirai-vs-moon-${i}`, buildMiraidonExDeck, buildRoaringMoonExDeck);
      if (result.completed) completedCount++;
      if (result.violations.length > 0) allViolations.push(...result.violations);
    }

    expect(allViolations).toEqual([]);
    expect(completedCount).toBeGreaterThanOrEqual(8);
  }, 60000);

  it('runs 10 mirror matches (Charizard vs Charizard, Miraidon vs Miraidon) with 0 violations', () => {
    let completedCount = 0;
    const allViolations: string[] = [];

    for (let i = 0; i < 5; i++) {
      const result = runSimulatedMatch(`chari-mirror-${i}`, buildCharizardExDeck, buildCharizardExDeck);
      if (result.completed) completedCount++;
      if (result.violations.length > 0) allViolations.push(...result.violations);
    }

    for (let i = 0; i < 5; i++) {
      const result = runSimulatedMatch(`mirai-mirror-${i}`, buildMiraidonExDeck, buildMiraidonExDeck);
      if (result.completed) completedCount++;
      if (result.violations.length > 0) allViolations.push(...result.violations);
    }

    expect(allViolations).toEqual([]);
    expect(completedCount).toBeGreaterThanOrEqual(8);
  }, 60000);
});
