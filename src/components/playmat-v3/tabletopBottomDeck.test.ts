import { describe, it, expect } from 'vitest';
import { createInitialTabletopState, TabletopActions } from './tabletopStateHelper';
import type { CardInstance } from '../../engine/types';

function makeMockCard(id: string, name: string): CardInstance {
  return {
    instanceId: id,
    cardCode: id,
    nameTh: name,
    nameEn: name,
    supertype: 'Pokemon',
    subtypes: ['Basic'],
  };
}

describe('putInspectedCardsToBottom', () => {
  it('correctly moves inspected cards to the bottom of the deck', () => {
    const card1 = makeMockCard('c1', 'Card 1');
    const card2 = makeMockCard('c2', 'Card 2');
    const card3 = makeMockCard('c3', 'Card 3');
    const card4 = makeMockCard('c4', 'Card 4');
    const card5 = makeMockCard('c5', 'Card 5');

    const state = createInitialTabletopState([card1, card2, card3, card4, card5]);
    state.player1.deck = [card1, card2, card3, card4, card5]; // Preserved order: c1 is top, c5 is bottom

    // Inspect top 2 cards (c1 and c2) and put them to bottom
    const nextState = TabletopActions.putInspectedCardsToBottom(state, 'player1', ['c1', 'c2']);

    // The remaining deck should have c3 at top, then c4, c5, and c1, c2 at bottom!
    expect(nextState.player1.deck.map((c) => c.instanceId)).toEqual(['c3', 'c4', 'c5', 'c1', 'c2']);
    expect(nextState.player1.deck[0].instanceId).toBe('c3');
    expect(nextState.player1.deck[nextState.player1.deck.length - 1].instanceId).toBe('c2');
  });
});
