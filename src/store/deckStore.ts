import { create } from 'zustand';
import { doc, setDoc, getDocs, deleteDoc, collection } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import type { Deck } from '../types/deck';
import { trackEvent } from '../utils/analytics';

export type DeckSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface DeckState {
  decks: Record<string, Deck>;
  activeDeckId: string | null;
  syncStatus: DeckSyncStatus;
  lastSyncedAt: number | null;

  // Deck Management
  createDeck: (name?: string, description?: string) => string;
  selectDeck: (deckId: string | null) => void;
  renameDeck: (deckId: string, name: string, description?: string) => void;
  deleteDeck: (deckId: string) => void;
  duplicateDeck: (deckId: string) => string;
  setDeckCover: (deckId: string, cardId: string, imageUrl: string) => void;

  // Card Management
  addCardToDeck: (deckId: string, cardId: string, count?: number) => void;
  removeCardFromDeck: (deckId: string, cardId: string) => void;
  setCardCountInDeck: (deckId: string, cardId: string, count: number) => void;
  swapCardInDeck: (deckId: string, oldCardId: string, newCardId: string, newCoverImageUrl?: string) => void;
  clearDeckCards: (deckId: string) => void;

  // Cloud Sync
  loadUserDecksFromCloud: (uid: string) => Promise<boolean>;
  syncDeckToCloud: (deckId: string) => Promise<void>;
  uploadLocalDecksToCloud: (uid: string) => Promise<void>;
  resetToGuestDecks: () => void;

  // Export / Import
  exportDeckJSON: (deckId: string) => string;
  importDeckJSON: (jsonString: string) => { success: boolean; message: string; deckId?: string };
  importParsedDeck: (data: {
    name: string;
    description?: string;
    cards: Record<string, { cardId: string; count: number }>;
    coverCardId?: string;
    coverImageUrl?: string;
  }) => string;
}

const GUEST_DECKS_STORAGE_KEY = 'pokecount_guest_decks_v1';
const USER_DECKS_CACHE_PREFIX = 'pokecount_user_decks_cache_';
export const DELETED_DECKS_STORAGE_KEY_PREFIX = 'pokecount_deleted_decks_';

/**
 * Strips all `undefined` values and non-serializable fields so
 * Firestore's setDoc never throws unsupported field errors.
 */
export function sanitizeDeckForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (value === undefined) return undefined;
      return value;
    })
  );
}

export function getLocalDeletedDeckIds(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${DELETED_DECKS_STORAGE_KEY_PREFIX}${uid}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set();
}

export function markDeckAsDeletedLocally(uid: string, deckId: string) {
  try {
    const set = getLocalDeletedDeckIds(uid);
    set.add(deckId);
    localStorage.setItem(
      `${DELETED_DECKS_STORAGE_KEY_PREFIX}${uid}`,
      JSON.stringify(Array.from(set))
    );
  } catch (e) {}
}

function createDefaultDeck(): Deck {
  const id = `deck-${Date.now()}`;
  return {
    id,
    name: 'My Standard Deck',
    description: 'เด็คมาตรฐาน 60 ใบ',
    cards: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function loadInitialGuestDecks(): { decks: Record<string, Deck>; activeDeckId: string | null } {
  try {
    const raw = localStorage.getItem(GUEST_DECKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.decks && Object.keys(parsed.decks).length > 0) {
        return {
          decks: parsed.decks,
          activeDeckId: parsed.activeDeckId || Object.keys(parsed.decks)[0],
        };
      }
    }
  } catch (e) {}

  const defaultDeck = createDefaultDeck();
  return {
    decks: { [defaultDeck.id]: defaultDeck },
    activeDeckId: defaultDeck.id,
  };
}

let deckSaveTimeout: any = null;

function triggerDeckSave(get: () => DeckState, deckId: string) {
  const user = auth.currentUser;
  const state = get();

  if (user) {
    try {
      localStorage.setItem(
        `${USER_DECKS_CACHE_PREFIX}${user.uid}`,
        JSON.stringify({ decks: state.decks, activeDeckId: state.activeDeckId })
      );
    } catch (e) {}

    if (deckSaveTimeout) clearTimeout(deckSaveTimeout);
    deckSaveTimeout = setTimeout(() => {
      state.syncDeckToCloud(deckId);
    }, 600);
  } else {
    try {
      localStorage.setItem(
        GUEST_DECKS_STORAGE_KEY,
        JSON.stringify({ decks: state.decks, activeDeckId: state.activeDeckId })
      );
    } catch (e) {}
  }
}

const initial = loadInitialGuestDecks();

export const useDeckStore = create<DeckState>((set, get) => ({
  decks: initial.decks,
  activeDeckId: initial.activeDeckId,
  syncStatus: 'idle',
  lastSyncedAt: null,

  createDeck: (name = 'New Deck', description = '') => {
    const id = `deck-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newDeck: Deck = {
      id,
      name: name.trim() || 'New Deck',
      description,
      cards: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((state) => ({
      decks: {
        ...state.decks,
        [id]: newDeck,
      },
      activeDeckId: id,
    }));

    triggerDeckSave(get, id);
    trackEvent('deck', 'create', newDeck.name);
    return id;
  },

  selectDeck: (deckId: string | null) => {
    set({ activeDeckId: deckId });
    const user = auth.currentUser;
    const key = user ? `${USER_DECKS_CACHE_PREFIX}${user.uid}` : GUEST_DECKS_STORAGE_KEY;
    try {
      localStorage.setItem(key, JSON.stringify({ decks: get().decks, activeDeckId: deckId }));
    } catch (e) {}
  },

  renameDeck: (deckId: string, name: string, description?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    set((state) => {
      const deck = state.decks[deckId];
      if (!deck) return state;

      return {
        decks: {
          ...state.decks,
          [deckId]: {
            ...deck,
            name: trimmed,
            description: description !== undefined ? description : deck.description,
            updatedAt: Date.now(),
          },
        },
      };
    });

    triggerDeckSave(get, deckId);
  },

  deleteDeck: (deckId: string) => {
    const user = auth.currentUser;
    if (user) {
      markDeckAsDeletedLocally(user.uid, deckId);
      deleteDoc(doc(db, 'users', user.uid, 'decks', deckId)).catch(console.error);
    }

    set((state) => {
      const newDecks = { ...state.decks };
      delete newDecks[deckId];

      let newActive = state.activeDeckId;
      if (state.activeDeckId === deckId) {
        newActive = Object.keys(newDecks).length > 0 ? Object.keys(newDecks)[0] : null;
      }

      const nextState = {
        decks: newDecks,
        activeDeckId: newActive,
      };

      const key = user ? `${USER_DECKS_CACHE_PREFIX}${user.uid}` : GUEST_DECKS_STORAGE_KEY;
      try {
        localStorage.setItem(key, JSON.stringify(nextState));
      } catch (e) {}

      return nextState;
    });
  },

  duplicateDeck: (deckId: string) => {
    const source = get().decks[deckId];
    if (!source) return '';

    const newId = `deck-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const clonedDeck: Deck = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      cards: JSON.parse(JSON.stringify(source.cards)),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((state) => ({
      decks: {
        ...state.decks,
        [newId]: clonedDeck,
      },
      activeDeckId: newId,
    }));

    triggerDeckSave(get, newId);
    return newId;
  },

  setDeckCover: (deckId: string, cardId: string, imageUrl: string) => {
    set((state) => {
      const deck = state.decks[deckId];
      if (!deck) return state;

      return {
        decks: {
          ...state.decks,
          [deckId]: {
            ...deck,
            coverCardId: cardId,
            coverImageUrl: imageUrl,
            updatedAt: Date.now(),
          },
        },
      };
    });

    triggerDeckSave(get, deckId);
  },

  addCardToDeck: (deckId: string, cardId: string, count = 1) => {
    trackEvent('deck', 'add_card', cardId, { count });
    set((state) => {
      const deck = state.decks[deckId];
      if (!deck) return state;

      const currentCount = deck.cards[cardId]?.count || 0;
      const newCount = Math.min(60, currentCount + count);

      const newCards = {
        ...deck.cards,
        [cardId]: {
          cardId,
          count: newCount,
        },
      };

      // Set as cover if no cover yet
      const coverCardId = deck.coverCardId || cardId;

      return {
        decks: {
          ...state.decks,
          [deckId]: {
            ...deck,
            coverCardId,
            cards: newCards,
            updatedAt: Date.now(),
          },
        },
      };
    });

    triggerDeckSave(get, deckId);
  },

  removeCardFromDeck: (deckId: string, cardId: string) => {
    set((state) => {
      const deck = state.decks[deckId];
      if (!deck || !deck.cards[cardId]) return state;

      const currentCount = deck.cards[cardId].count;
      const newCards = { ...deck.cards };

      if (currentCount <= 1) {
        delete newCards[cardId];
      } else {
        newCards[cardId] = {
          cardId,
          count: currentCount - 1,
        };
      }

      return {
        decks: {
          ...state.decks,
          [deckId]: {
            ...deck,
            cards: newCards,
            updatedAt: Date.now(),
          },
        },
      };
    });

    triggerDeckSave(get, deckId);
  },

  setCardCountInDeck: (deckId: string, cardId: string, count: number) => {
    set((state) => {
      const deck = state.decks[deckId];
      if (!deck) return state;

      const validCount = Math.max(0, Math.min(60, Math.floor(count)));
      const newCards = { ...deck.cards };

      if (validCount === 0) {
        delete newCards[cardId];
      } else {
        newCards[cardId] = {
          cardId,
          count: validCount,
        };
      }

      return {
        decks: {
          ...state.decks,
          [deckId]: {
            ...deck,
            cards: newCards,
            updatedAt: Date.now(),
          },
        },
      };
    });

    triggerDeckSave(get, deckId);
  },

  swapCardInDeck: (deckId: string, oldCardId: string, newCardId: string, newCoverImageUrl?: string) => {
    set((state) => {
      const deck = state.decks[deckId];
      if (!deck || !deck.cards[oldCardId] || oldCardId === newCardId) return state;

      const oldCount = deck.cards[oldCardId].count;
      const targetExistingCount = deck.cards[newCardId]?.count || 0;
      const combinedCount = Math.min(60, targetExistingCount + oldCount);

      const newCards = { ...deck.cards };
      delete newCards[oldCardId];
      newCards[newCardId] = {
        cardId: newCardId,
        count: combinedCount,
      };

      let coverCardId = deck.coverCardId;
      let coverImageUrl = deck.coverImageUrl;

      if (deck.coverCardId === oldCardId) {
        coverCardId = newCardId;
        if (newCoverImageUrl) {
          coverImageUrl = newCoverImageUrl;
        }
      }

      return {
        decks: {
          ...state.decks,
          [deckId]: {
            ...deck,
            coverCardId,
            coverImageUrl,
            cards: newCards,
            updatedAt: Date.now(),
          },
        },
      };
    });

    triggerDeckSave(get, deckId);
  },

  clearDeckCards: (deckId: string) => {
    set((state) => {
      const deck = state.decks[deckId];
      if (!deck) return state;

      return {
        decks: {
          ...state.decks,
          [deckId]: {
            ...deck,
            cards: {},
            updatedAt: Date.now(),
          },
        },
      };
    });

    triggerDeckSave(get, deckId);
  },

  // Cloud Sync
  syncDeckToCloud: async (deckId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    const deck = get().decks[deckId];
    if (!deck) return;

    set({ syncStatus: 'syncing' });
    try {
      const docRef = doc(db, 'users', user.uid, 'decks', deckId);
      // Write whole document without { merge: true } so removed/swapped cards are purged
      await setDoc(docRef, sanitizeDeckForFirestore(deck));
      set({ syncStatus: 'synced', lastSyncedAt: Date.now() });
    } catch (err) {
      console.error('Failed to sync deck to Firestore:', err);
      set({ syncStatus: 'error' });
    }
  },

  loadUserDecksFromCloud: async (uid: string) => {
    set({ syncStatus: 'syncing' });
    try {
      const deletedDeckIds = getLocalDeletedDeckIds(uid);

      // 1. Cached
      const cached = localStorage.getItem(`${USER_DECKS_CACHE_PREFIX}${uid}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.decks && Object.keys(parsed.decks).length > 0) {
            const filteredDecks: Record<string, Deck> = {};
            for (const [id, d] of Object.entries(parsed.decks as Record<string, Deck>)) {
              if (!deletedDeckIds.has(id)) {
                filteredDecks[id] = d;
              }
            }
            if (Object.keys(filteredDecks).length > 0) {
              set((state) => ({
                decks: filteredDecks,
                activeDeckId:
                  state.activeDeckId && filteredDecks[state.activeDeckId]
                    ? state.activeDeckId
                    : (parsed.activeDeckId && filteredDecks[parsed.activeDeckId]) || Object.keys(filteredDecks)[0],
              }));
            }
          }
        } catch (e) {}
      }

      // 2. Firestore fetch
      const decksCol = collection(db, 'users', uid, 'decks');
      const snap = await getDocs(decksCol);

      if (!snap.empty) {
        const cloudDecks: Record<string, Deck> = {};
        snap.forEach((d) => {
          const data = d.data() as Deck;
          if (data && data.id && !deletedDeckIds.has(data.id)) {
            cloudDecks[data.id] = data;
          }
        });

        if (Object.keys(cloudDecks).length > 0) {
          const currentLocalDecks = get().decks;
          const mergedDecks: Record<string, Deck> = {};
          const allDeckIds = new Set([
            ...Object.keys(currentLocalDecks || {}),
            ...Object.keys(cloudDecks),
          ]);

          let hasLocalAhead = false;

          for (const id of allDeckIds) {
            if (deletedDeckIds.has(id)) continue;

            const localDeck = currentLocalDecks[id];
            const cloudDeck = cloudDecks[id];

            if (localDeck && cloudDeck) {
              const localTime = localDeck.updatedAt || 0;
              const cloudTime = cloudDeck.updatedAt || 0;

              if (localTime > cloudTime) {
                // Local is newer than cloud (e.g. recent edits or offline changes)
                mergedDecks[id] = localDeck;
                hasLocalAhead = true;
              } else {
                mergedDecks[id] = cloudDeck;
              }
            } else if (localDeck && !cloudDeck) {
              mergedDecks[id] = localDeck;
              hasLocalAhead = true;
            } else if (!localDeck && cloudDeck) {
              mergedDecks[id] = cloudDeck;
            }
          }

          const currentActive = get().activeDeckId;
          const resolvedActiveId =
            currentActive && mergedDecks[currentActive]
              ? currentActive
              : Object.keys(mergedDecks)[0] || null;

          set({
            decks: mergedDecks,
            activeDeckId: resolvedActiveId,
            syncStatus: 'synced',
            lastSyncedAt: Date.now(),
          });

          localStorage.setItem(
            `${USER_DECKS_CACHE_PREFIX}${uid}`,
            JSON.stringify({ decks: mergedDecks, activeDeckId: resolvedActiveId })
          );

          if (hasLocalAhead) {
            for (const id of allDeckIds) {
              const localDeck = currentLocalDecks[id];
              const cloudDeck = cloudDecks[id];
              if (localDeck && (!cloudDeck || (localDeck.updatedAt || 0) > (cloudDeck.updatedAt || 0))) {
                void get().syncDeckToCloud(id);
              }
            }
          }

          return true;
        }
      }

      // If cloud has no decks yet, upload local
      const current = get().decks;
      if (Object.keys(current).length > 0) {
        await get().uploadLocalDecksToCloud(uid);
      } else {
        const defaultDeck = createDefaultDeck();
        const docRef = doc(db, 'users', uid, 'decks', defaultDeck.id);
        await setDoc(docRef, sanitizeDeckForFirestore(defaultDeck));
        set({
          decks: { [defaultDeck.id]: defaultDeck },
          activeDeckId: defaultDeck.id,
          syncStatus: 'synced',
          lastSyncedAt: Date.now(),
        });
      }

      return true;
    } catch (err) {
      console.error('Failed to load user decks from cloud:', err);
      set({ syncStatus: 'error' });
      return false;
    }
  },

  uploadLocalDecksToCloud: async (uid: string) => {
    set({ syncStatus: 'syncing' });
    try {
      const { decks } = get();
      for (const [id, d] of Object.entries(decks)) {
        const docRef = doc(db, 'users', uid, 'decks', id);
        await setDoc(docRef, sanitizeDeckForFirestore(d));
      }
      set({ syncStatus: 'synced', lastSyncedAt: Date.now() });

      localStorage.setItem(
        `${USER_DECKS_CACHE_PREFIX}${uid}`,
        JSON.stringify({ decks, activeDeckId: get().activeDeckId })
      );
    } catch (err) {
      console.error('Failed to upload local decks to cloud:', err);
      set({ syncStatus: 'error' });
    }
  },

  resetToGuestDecks: () => {
    const guest = loadInitialGuestDecks();
    set({
      decks: guest.decks,
      activeDeckId: guest.activeDeckId,
      syncStatus: 'idle',
      lastSyncedAt: null,
    });
  },

  exportDeckJSON: (deckId: string) => {
    const deck = get().decks[deckId];
    if (!deck) return '{}';
    trackEvent('deck', 'export', deck.name);
    return JSON.stringify(deck, null, 2);
  },

  importDeckJSON: (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.name || typeof parsed.cards !== 'object') {
        return { success: false, message: 'รูปแบบ JSON ของเด็คไม่ถูกต้อง' };
      }

      const id = `deck-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newDeck: Deck = {
        id,
        name: parsed.name,
        description: parsed.description || '',
        coverCardId: parsed.coverCardId,
        coverImageUrl: parsed.coverImageUrl,
        cards: parsed.cards || {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      set((state) => ({
        decks: {
          ...state.decks,
          [id]: newDeck,
        },
        activeDeckId: id,
      }));

      triggerDeckSave(get, id);
      trackEvent('deck', 'import', newDeck.name);
      return { success: true, message: `นำเข้าเด็ค "${newDeck.name}" สำเร็จ!`, deckId: id };
    } catch (e: any) {
      return { success: false, message: `เกิดข้อผิดพลาดในการนำเข้า: ${e.message}` };
    }
  },

  importParsedDeck: (data) => {
    const id = `deck-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newDeck: Deck = {
      id,
      name: data.name.trim() || 'Imported Deck',
      description: data.description || 'นำเข้าจาก Text Decklist',
      coverCardId: data.coverCardId,
      coverImageUrl: data.coverImageUrl,
      cards: data.cards || {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((state) => ({
      decks: {
        ...state.decks,
        [id]: newDeck,
      },
      activeDeckId: id,
    }));

    triggerDeckSave(get, id);
    trackEvent('deck', 'import', newDeck.name);
    return id;
  },
}));
