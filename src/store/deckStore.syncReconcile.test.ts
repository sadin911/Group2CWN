import { describe, it, expect, vi, beforeEach } from 'vitest';

const setDocMock = vi.hoisted(() => vi.fn(async (..._args: any[]) => undefined));
const deleteDocMock = vi.hoisted(() => vi.fn(async (..._args: any[]) => undefined));
let mockCloudDocs: any[] = [];

const getDocsMock = vi.hoisted(() =>
  vi.fn(async () => {
    return {
      empty: mockCloudDocs.length === 0,
      forEach: (cb: (doc: any) => void) => {
        mockCloudDocs.forEach((d) => cb({ data: () => d }));
      },
    };
  })
);

vi.mock('firebase/firestore', () => ({
  doc: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  collection: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  setDoc: setDocMock,
  getDocs: getDocsMock,
  deleteDoc: deleteDocMock,
}));

vi.mock('../utils/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-123' } },
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

import { useDeckStore, sanitizeDeckForFirestore } from './deckStore';
import type { Deck } from '../types/deck';

describe('deckStore - Cloud Sync & Reconciliation', () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
    vi.clearAllMocks();
    mockCloudDocs = [];
    useDeckStore.setState({
      decks: {},
      activeDeckId: null,
      syncStatus: 'idle',
      lastSyncedAt: null,
    });
  });

  describe('sanitizeDeckForFirestore', () => {
    it('strips undefined fields so Firestore never rejects payloads', () => {
      const deckWithUndefined: Deck = {
        id: 'deck-1',
        name: 'Test Deck',
        description: undefined,
        coverCardId: undefined,
        coverImageUrl: undefined,
        cards: {
          'card-1': { cardId: 'card-1', count: 2 },
        },
        createdAt: 1000,
        updatedAt: 2000,
      };

      const sanitized = sanitizeDeckForFirestore(deckWithUndefined);
      expect(sanitized).toBeDefined();
      expect(sanitized.id).toBe('deck-1');
      expect(Object.prototype.hasOwnProperty.call(sanitized, 'coverCardId')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(sanitized, 'coverImageUrl')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(sanitized, 'description')).toBe(false);
      expect(sanitized.cards['card-1'].count).toBe(2);
    });
  });

  describe('syncDeckToCloud', () => {
    it('writes the whole document without { merge: true } to ensure removed cards are purged', async () => {
      const deck: Deck = {
        id: 'deck-123',
        name: 'Charizard Deck',
        cards: {
          'card-charizard': { cardId: 'card-charizard', count: 2 },
        },
        createdAt: 1000,
        updatedAt: 2000,
      };

      useDeckStore.setState({
        decks: { 'deck-123': deck },
        activeDeckId: 'deck-123',
      });

      await useDeckStore.getState().syncDeckToCloud('deck-123');

      expect(setDocMock).toHaveBeenCalledTimes(1);
      const [calledRef, calledData, calledOptions] = setDocMock.mock.calls[0];

      expect(calledRef.path).toBe('users/test-user-123/decks/deck-123');
      expect(calledData.cards['card-charizard'].count).toBe(2);
      // CRITICAL: Must not contain { merge: true }
      expect(calledOptions).toBeUndefined();
    });

    it('sanitizes deck payload before writing to Firestore', async () => {
      const deckWithUndefined: Deck = {
        id: 'deck-import',
        name: 'Imported Deck',
        coverCardId: undefined,
        coverImageUrl: undefined,
        cards: {},
        createdAt: 1000,
        updatedAt: 2000,
      };

      useDeckStore.setState({
        decks: { 'deck-import': deckWithUndefined },
        activeDeckId: 'deck-import',
      });

      await useDeckStore.getState().syncDeckToCloud('deck-import');

      expect(setDocMock).toHaveBeenCalledTimes(1);
      const [, calledData] = setDocMock.mock.calls[0];
      expect(Object.prototype.hasOwnProperty.call(calledData, 'coverCardId')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(calledData, 'coverImageUrl')).toBe(false);
    });
  });

  describe('loadUserDecksFromCloud reconciliation', () => {
    it('does NOT overwrite newer local deck edits with older cloud deck', async () => {
      // Local deck has card removed and updatedAt = 5000
      const localDeck: Deck = {
        id: 'deck-1',
        name: 'Local Deck',
        cards: {
          'card-keep': { cardId: 'card-keep', count: 2 },
        },
        createdAt: 1000,
        updatedAt: 5000,
      };

      useDeckStore.setState({
        decks: { 'deck-1': localDeck },
        activeDeckId: 'deck-1',
      });

      // Cloud has older version with stale card and updatedAt = 2000
      mockCloudDocs = [
        {
          id: 'deck-1',
          name: 'Old Cloud Deck',
          cards: {
            'card-keep': { cardId: 'card-keep', count: 2 },
            'card-removed': { cardId: 'card-removed', count: 4 },
          },
          createdAt: 1000,
          updatedAt: 2000,
        },
      ];

      await useDeckStore.getState().loadUserDecksFromCloud('test-user-123');

      const decksAfter = useDeckStore.getState().decks;
      // Local changes must be preserved!
      expect(decksAfter['deck-1'].cards['card-removed']).toBeUndefined();
      expect(decksAfter['deck-1'].updatedAt).toBe(5000);
    });

    it('accepts newer cloud deck when cloud updatedAt is newer than local', async () => {
      // Local deck has updatedAt = 2000
      const localDeck: Deck = {
        id: 'deck-1',
        name: 'Old Local',
        cards: {
          'card-old': { cardId: 'card-old', count: 1 },
        },
        createdAt: 1000,
        updatedAt: 2000,
      };

      useDeckStore.setState({
        decks: { 'deck-1': localDeck },
        activeDeckId: 'deck-1',
      });

      // Cloud deck was updated on another device with updatedAt = 8000
      mockCloudDocs = [
        {
          id: 'deck-1',
          name: 'New Cloud Deck',
          cards: {
            'card-new': { cardId: 'card-new', count: 3 },
          },
          createdAt: 1000,
          updatedAt: 8000,
        },
      ];

      await useDeckStore.getState().loadUserDecksFromCloud('test-user-123');

      const decksAfter = useDeckStore.getState().decks;
      expect(decksAfter['deck-1'].name).toBe('New Cloud Deck');
      expect(decksAfter['deck-1'].cards['card-new'].count).toBe(3);
      expect(decksAfter['deck-1'].cards['card-old']).toBeUndefined();
    });

    it('preserves current activeDeckId if it still exists after sync', async () => {
      useDeckStore.setState({
        decks: {
          'deck-1': { id: 'deck-1', name: 'Deck 1', cards: {}, createdAt: 100, updatedAt: 100 },
          'deck-2': { id: 'deck-2', name: 'Deck 2', cards: {}, createdAt: 100, updatedAt: 100 },
        },
        activeDeckId: 'deck-2',
      });

      mockCloudDocs = [
        { id: 'deck-1', name: 'Deck 1', cards: {}, createdAt: 100, updatedAt: 100 },
        { id: 'deck-2', name: 'Deck 2', cards: {}, createdAt: 100, updatedAt: 100 },
      ];

      await useDeckStore.getState().loadUserDecksFromCloud('test-user-123');

      expect(useDeckStore.getState().activeDeckId).toBe('deck-2');
    });
  });
});
