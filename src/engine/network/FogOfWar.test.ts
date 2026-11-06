import { describe, it, expect } from 'vitest';
import { FogOfWar } from './FogOfWar';
import { GameReducer, createInitialGameState } from '../GameReducer';
import { buildCharizardExDeck, buildMiraidonExDeck } from '../data/StandardCardCatalog';

describe('Fog-of-War Network Masking', () => {
  it('masks opponent hand cards, prize cards, and deck contents completely', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state = GameReducer(state, { type: 'REVEAL_AND_START_GAME' }).nextState;

    // Mask for Player 0 (Bottom player)
    const maskedP0 = FogOfWar.maskState(state, 0);

    // 1. Player 0 should see their own hand completely
    expect(maskedP0.players[0].hand.length).toBeGreaterThan(0);
    expect(maskedP0.players[0].hand[0].cardCode).not.toBe('MASKED');
    expect(maskedP0.players[0].hand[0].nameEn).not.toBe('Face-down Card');

    // 2. Player 0 MUST NOT see Player 1's hand contents
    expect(maskedP0.players[1].hand.length).toBe(state.players[1].hand.length);
    for (const oppCard of maskedP0.players[1].hand) {
      expect(oppCard.cardCode).toBe('MASKED');
      expect(oppCard.nameEn).toBe('Face-down Card');
      expect(oppCard.isFacedown).toBe(true);
      expect(oppCard.attacks).toBeUndefined();
    }

    // 3. Face-down prizes for both players must have secret identities masked
    for (const prize of maskedP0.players[0].prizes) {
      expect(prize.cardCode).toBe('MASKED');
      expect(prize.isFacedown).toBe(true);
    }
    for (const prize of maskedP0.players[1].prizes) {
      expect(prize.cardCode).toBe('MASKED');
      expect(prize.isFacedown).toBe(true);
    }

    // 4. Decks must be masked
    for (const card of maskedP0.players[0].deck) {
      expect(card.cardCode).toBe('MASKED');
    }
    for (const card of maskedP0.players[1].deck) {
      expect(card.cardCode).toBe('MASKED');
    }
  });

  it('preserves public board state (active and bench)', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    // Official Pokemon TCG Rule: Players must Mulligan until holding at least 1 Basic Pokemon
    while (!state.players[0].hand.some((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))) {
      state = GameReducer(state, { type: 'EXECUTE_MULLIGAN', playerIndex: 0 }).nextState;
    }
    while (!state.players[1].hand.some((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))) {
      state = GameReducer(state, { type: 'EXECUTE_MULLIGAN', playerIndex: 1 }).nextState;
    }

    const p0Basic = state.players[0].hand.find((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))!;
    const p1Basic = state.players[1].hand.find((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))!;

    state = GameReducer(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 0, cardInstanceId: p0Basic.instanceId }).nextState;
    state = GameReducer(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 1, cardInstanceId: p1Basic.instanceId }).nextState;
    state = GameReducer(state, { type: 'REVEAL_AND_START_GAME' }).nextState;

    const masked = FogOfWar.maskState(state, 0);

    // Active Pokémon are public knowledge and must be preserved
    expect(masked.players[0].active?.card.nameEn).toBe(p0Basic.nameEn);
    expect(masked.players[1].active?.card.nameEn).toBe(p1Basic.nameEn);
  });
});
