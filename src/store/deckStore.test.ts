import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDeckStore } from './deckStore';

vi.mock('firebase/firestore', () => ({
  doc: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  collection: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  setDoc: vi.fn(async () => undefined),
  getDocs: vi.fn(async () => ({ empty: true, forEach: () => {} })),
  deleteDoc: vi.fn(async () => undefined),
}));

vi.mock('../utils/firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

function installMemoryStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, String(value));
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
    get length() {
      return data.size;
    },
    key: (index: number) => Array.from(data.keys())[index] ?? null,
  });
}

describe('deckStore - swapCardInDeck', () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
    useDeckStore.setState({
      decks: {},
      activeDeckId: null,
      syncStatus: 'idle',
      lastSyncedAt: null,
    });
  });

  it('swaps an existing card with a new card and preserves the count', () => {
    const deckId = useDeckStore.getState().createDeck('Test Deck');
    useDeckStore.getState().addCardToDeck(deckId, 'card-old', 4);

    expect(useDeckStore.getState().decks[deckId].cards['card-old'].count).toBe(4);
    expect(useDeckStore.getState().decks[deckId].cards['card-new']).toBeUndefined();

    useDeckStore.getState().swapCardInDeck(deckId, 'card-old', 'card-new');

    const updated = useDeckStore.getState().decks[deckId];
    expect(updated.cards['card-old']).toBeUndefined();
    expect(updated.cards['card-new']).toBeDefined();
    expect(updated.cards['card-new'].count).toBe(4);
  });

  it('combines counts when new card already exists in the deck', () => {
    const deckId = useDeckStore.getState().createDeck('Test Deck');
    useDeckStore.getState().addCardToDeck(deckId, 'card-old', 2);
    useDeckStore.getState().addCardToDeck(deckId, 'card-existing', 1);

    useDeckStore.getState().swapCardInDeck(deckId, 'card-old', 'card-existing');

    const updated = useDeckStore.getState().decks[deckId];
    expect(updated.cards['card-old']).toBeUndefined();
    expect(updated.cards['card-existing'].count).toBe(3);
  });

  it('updates coverCardId and coverImageUrl if the swapped card was the cover card', () => {
    const deckId = useDeckStore.getState().createDeck('Test Deck');
    useDeckStore.getState().addCardToDeck(deckId, 'card-old', 4);
    useDeckStore.getState().setDeckCover(deckId, 'card-old', 'https://example.com/old.png');

    expect(useDeckStore.getState().decks[deckId].coverCardId).toBe('card-old');
    expect(useDeckStore.getState().decks[deckId].coverImageUrl).toBe('https://example.com/old.png');

    useDeckStore.getState().swapCardInDeck(deckId, 'card-old', 'card-new', 'https://example.com/new.png');

    const updated = useDeckStore.getState().decks[deckId];
    expect(updated.coverCardId).toBe('card-new');
    expect(updated.coverImageUrl).toBe('https://example.com/new.png');
  });

  it('does nothing if oldCardId === newCardId', () => {
    const deckId = useDeckStore.getState().createDeck('Test Deck');
    useDeckStore.getState().addCardToDeck(deckId, 'card-same', 3);

    useDeckStore.getState().swapCardInDeck(deckId, 'card-same', 'card-same');

    const updated = useDeckStore.getState().decks[deckId];
    expect(updated.cards['card-same'].count).toBe(3);
  });
});
