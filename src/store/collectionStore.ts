import { create } from 'zustand';
import { doc, setDoc, getDocs, deleteDoc, collection } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import pokemonCardData from '../data/pokemonNames.json';
import { parseCollectionText } from '../utils/collectionTextParser';
import { isPokillionaireFormat, parsePokillionaireExport } from '../utils/pokillionaireParser';
import { trackEvent } from '../utils/analytics';
import type {
  CardVariantKey,
  CardCondition,
  CollectionCardEntry,
  CollectionProfile,
  CollectionFilters,
} from '../types/collection';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface CollectionState {
  profiles: Record<string, CollectionProfile>;
  activeProfileId: string;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  /**
   * The uid whose binders have actually been read into this store.
   *
   * Writes are whole-document, so pushing before the read completes replaces
   * the user's binder with whatever the store happens to hold — which, during
   * the boot window, is the empty guest binder. Nothing writes to a user's
   * cloud binder until this matches the signed-in uid.
   */
  cloudLoadedUid: string | null;

  // Filter persistence
  filters: CollectionFilters;
  setFilters: (filters: Partial<CollectionFilters>) => void;
  resetFilters: () => void;

  // Profile management
  createProfile: (name: string, icon?: string) => string;
  switchProfile: (profileId: string) => void;
  renameProfile: (profileId: string, name: string) => void;
  deleteProfile: (profileId: string) => void;

  // Card collection actions (operates on activeProfile)
  setVariantCount: (cardId: string, variant: CardVariantKey, count: number) => void;
  incrementVariant: (cardId: string, variant: CardVariantKey) => void;
  decrementVariant: (cardId: string, variant: CardVariantKey) => void;
  toggleWishlist: (cardId: string) => void;
  setCardDetails: (
    cardId: string,
    details: { condition?: CardCondition; note?: string }
  ) => void;
  clearCard: (cardId: string) => void;

  // Cloud Sync & Auth Session Actions
  loadUserFromCloud: (uid: string) => Promise<boolean>;
  syncProfileToCloud: (profileId: string) => Promise<void>;
  uploadLocalProfilesToCloud: (uid: string) => Promise<void>;
  reconcileWithCloud: (uid: string) => Promise<boolean>;
  forceSyncCloud: (uid: string) => Promise<boolean>;
  resetToGuest: () => void;

  // Backup & Restore
  exportCollectionJSON: () => string;
  importCollectionJSON: (
    jsonString: string,
    options?: {
      mode?: 'merge' | 'replace' | 'new_profile';
      profileId?: string;
      profileName?: string;
    }
  ) => {
    success: boolean;
    message: string;
    format?: 'native' | 'pokillionaire';
    cardsImportedCount?: number;
    distinctCardsCount?: number;
  };
  importCollectionText: (
    text: string,
    options?: {
      mode?: 'merge' | 'replace';
      finish?: CardVariantKey;
      profileId?: string;
    }
  ) => {
    success: boolean;
    message: string;
    cardsImportedCount: number;
    distinctCardsCount: number;
    unmatchedLines: string[];
    setsFound: string[];
  };
  importCollectionParsedCards: (
    cardsList: { cardId: string; quantity: number; variant?: CardVariantKey }[],
    options?: {
      mode?: 'merge' | 'replace';
      defaultFinish?: CardVariantKey;
      profileId?: string;
    }
  ) => {
    success: boolean;
    message: string;
    cardsImportedCount: number;
    distinctCardsCount: number;
  };
}

const DEFAULT_PROFILE_ID = 'default-main-profile';
const GUEST_STORAGE_KEY = 'pokecount_guest_profiles_v2';
const USER_CACHE_KEY_PREFIX = 'pokecount_user_cache_';
const FILTERS_STORAGE_KEY = 'pokecount_collection_filters_v1';
export const DELETED_BINDERS_STORAGE_KEY_PREFIX = 'pokecount_deleted_binders_';

export function getLocalDeletedBinderIds(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${DELETED_BINDERS_STORAGE_KEY_PREFIX}${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (e) {}
  return new Set<string>();
}

export function saveLocalDeletedBinderId(uid: string, binderId: string): void {
  try {
    const set = getLocalDeletedBinderIds(uid);
    set.add(binderId);
    localStorage.setItem(
      `${DELETED_BINDERS_STORAGE_KEY_PREFIX}${uid}`,
      JSON.stringify(Array.from(set))
    );
  } catch (e) {}
}

export function saveLocalDeletedBinderIds(uid: string, binderIds: Iterable<string>): void {
  try {
    const set = getLocalDeletedBinderIds(uid);
    for (const id of binderIds) {
      set.add(id);
    }
    localStorage.setItem(
      `${DELETED_BINDERS_STORAGE_KEY_PREFIX}${uid}`,
      JSON.stringify(Array.from(set))
    );
  } catch (e) {}
}

export function removeLocalDeletedBinderId(uid: string, binderId: string): void {
  try {
    const set = getLocalDeletedBinderIds(uid);
    if (set.delete(binderId)) {
      localStorage.setItem(
        `${DELETED_BINDERS_STORAGE_KEY_PREFIX}${uid}`,
        JSON.stringify(Array.from(set))
      );
    }
  } catch (e) {}
}


/**
 * Version 2 = binder documents are written whole rather than merged.
 *
 * Until v2, syncProfileToCloud used setDoc(..., { merge: true }). Because
 * `cards` is a map field, a merge only ever adds or updates keys — it never
 * removes the ones the client dropped. Clearing a card therefore updated the
 * UI and localStorage but left the entry in Firestore forever, and the next
 * loadUserFromCloud pulled it straight back onto the device.
 */
const BINDER_SCHEMA_VERSION = 2;

/** Total copies across every variant of one entry. */
function entryTotal(entry?: CollectionCardEntry): number {
  if (!entry?.variants) return 0;
  return Object.values(entry.variants).reduce<number>((a, b) => a + (Number(b) || 0), 0);
}

/** An entry carrying no information at all — safe to drop. */
function isEmptyEntry(entry?: CollectionCardEntry): boolean {
  if (!entry) return true;
  return entryTotal(entry) === 0 && !entry.isWishlist && !entry.note;
}

/**
 * Drop entries that say nothing. Pre-v2 documents accumulated these because
 * setCardDetails wrote a zeroed entry for any card that was given a note or
 * condition and then cleared.
 */
function pruneProfile(profile: CollectionProfile): { profile: CollectionProfile; removed: number } {
  const cards: Record<string, CollectionCardEntry> = {};
  let removed = 0;
  for (const [cardId, entry] of Object.entries(profile.cards || {})) {
    if (isEmptyEntry(entry)) removed++;
    else cards[cardId] = entry;
  }
  return { profile: { ...profile, cards }, removed };
}

export const SAFEGUARD_STORAGE_KEY = 'pokecount_safeguard_backup';

/**
 * Deep sanitization for Firestore payloads.
 * Strips all `undefined` values, non-serializable fields, and ensures
 * pure JSON compatibility so Firestore's setDoc never throws unsupported field errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (value === undefined) return undefined;
      return value;
    })
  );
}

/**
 * Two-way smart reconciliation between a local binder and a cloud binder.
 * Prevents cross-device data loss by:
 * 1. Preserving cards added on either device.
 * 2. Resolving conflicts per card via Math.max quantities so no copies are lost.
 * 3. Never setting `undefined` on optional attributes (isWishlist, note, condition).
 * 4. Pruning empty/cleared entries.
 */
export function reconcileProfiles(
  localProf: CollectionProfile,
  cloudProf: CollectionProfile
): { merged: CollectionProfile; hasChanges: boolean } {
  const mergedCards: Record<string, CollectionCardEntry> = {};
  const allCardIds = new Set([
    ...Object.keys(localProf.cards || {}),
    ...Object.keys(cloudProf.cards || {}),
  ]);

  let hasChanges = false;

  for (const cardId of allCardIds) {
    const localEntry = localProf.cards?.[cardId];
    const cloudEntry = cloudProf.cards?.[cardId];

    if (!cloudEntry && localEntry) {
      // Exists only locally (e.g. added offline or before sync on this device)
      if (!isEmptyEntry(localEntry)) {
        const cleanEntry: CollectionCardEntry = {
          cardId,
          variants: { ...emptyVariants(), ...localEntry.variants },
          updatedAt: localEntry.updatedAt || Date.now(),
        };
        if (localEntry.isWishlist) cleanEntry.isWishlist = true;
        if (localEntry.note && localEntry.note.trim()) cleanEntry.note = localEntry.note.trim();
        if (localEntry.condition) cleanEntry.condition = localEntry.condition;

        mergedCards[cardId] = cleanEntry;
        hasChanges = true;
      }
    } else if (cloudEntry && !localEntry) {
      // Exists only in cloud (e.g. imported from Chrome on another device)
      if (!isEmptyEntry(cloudEntry)) {
        const cleanEntry: CollectionCardEntry = {
          cardId,
          variants: { ...emptyVariants(), ...cloudEntry.variants },
          updatedAt: cloudEntry.updatedAt || Date.now(),
        };
        if (cloudEntry.isWishlist) cleanEntry.isWishlist = true;
        if (cloudEntry.note && cloudEntry.note.trim()) cleanEntry.note = cloudEntry.note.trim();
        if (cloudEntry.condition) cleanEntry.condition = cloudEntry.condition;

        mergedCards[cardId] = cleanEntry;
        hasChanges = true;
      }
    } else if (localEntry && cloudEntry) {
      // Exists in BOTH devices
      // Safely take maximum variant counts so no copies of any card are lost
      const mergedVariants = { ...emptyVariants() };
      let anyDiff = false;
      for (const key of ['normal', 'holo', 'reverse', 'promo'] as CardVariantKey[]) {
        const lQty = Number(localEntry.variants?.[key]) || 0;
        const cQty = Number(cloudEntry.variants?.[key]) || 0;
        const maxQty = Math.max(lQty, cQty);
        mergedVariants[key] = maxQty;
        if (lQty !== cQty) anyDiff = true;
      }

      const mergedEntry: CollectionCardEntry = {
        cardId,
        variants: mergedVariants,
        updatedAt: Math.max(localEntry.updatedAt || 0, cloudEntry.updatedAt || 0, Date.now()),
      };

      // Ensure NO undefined properties are ever produced
      if (localEntry.isWishlist || cloudEntry.isWishlist) {
        mergedEntry.isWishlist = true;
      }
      const note = (localEntry.note || cloudEntry.note || '').trim();
      if (note) {
        mergedEntry.note = note;
      }
      const condition = localEntry.condition || cloudEntry.condition;
      if (condition) {
        mergedEntry.condition = condition;
      }

      mergedCards[cardId] = mergedEntry;
      if (anyDiff) hasChanges = true;
    }
  }

  const { profile: pruned } = pruneProfile({
    ...cloudProf,
    ...localProf,
    cards: mergedCards,
    updatedAt: Math.max(localProf.updatedAt || 0, cloudProf.updatedAt || 0, Date.now()),
    schemaVersion: BINDER_SCHEMA_VERSION,
  });

  return { merged: pruned, hasChanges };
}

/**
 * Gathers all local profiles across in-memory state, user localStorage cache,
 * and guest localStorage to ensure NO cards imported offline or prior to auth are ever lost.
 */
export function harvestAllLocalProfiles(
  uid: string,
  currentProfiles: Record<string, CollectionProfile>
): Record<string, CollectionProfile> {
  const deletedIds = getLocalDeletedBinderIds(uid);
  const result: Record<string, CollectionProfile> = {};

  for (const [id, prof] of Object.entries(currentProfiles)) {
    if (!deletedIds.has(id)) {
      result[id] = prof;
    }
  }

  const mergeIn = (otherProfiles?: Record<string, CollectionProfile>) => {
    if (!otherProfiles) return;
    for (const [id, prof] of Object.entries(otherProfiles)) {
      if (deletedIds.has(id)) continue;
      if (!result[id]) {
        result[id] = prof;
      } else {
        const { merged } = reconcileProfiles(result[id], prof);
        result[id] = merged;
      }
    }
  };

  // 1. Check user cache in localStorage
  try {
    const userRaw = localStorage.getItem(`${USER_CACHE_KEY_PREFIX}${uid}`);
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      if (parsed?.profiles && typeof parsed.profiles === 'object') {
        mergeIn(parsed.profiles);
      } else if (parsed && typeof parsed === 'object') {
        mergeIn(parsed);
      }
    }
  } catch (e) {}

  // 2. Check guest cache in localStorage
  try {
    const guestRaw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (guestRaw) {
      const parsed = JSON.parse(guestRaw);
      if (parsed?.profiles && typeof parsed.profiles === 'object') {
        mergeIn(parsed.profiles);
      } else if (parsed && typeof parsed === 'object') {
        mergeIn(parsed);
      }
    }
  } catch (e) {}

  // 3. Create durable local safeguard snapshot before any sync touches the device
  try {
    localStorage.setItem(
      SAFEGUARD_STORAGE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        uid,
        profiles: result,
      })
    );
  } catch (e) {}

  return result;
}

export const DEFAULT_COLLECTION_FILTERS: CollectionFilters = {
  selectedSet: 'ALL',
  selectedRegulation: 'ALL',
  statusFilter: 'all',
  search: '',
  selectedType: 'ALL',
  selectedCategory: 'ALL',
  selectedStage: 'ALL',
  selectedRarity: 'ALL',
  sortBy: 'number',
  sortOrder: 'asc',
  showFullColor: true,
};

function loadInitialFilters(): CollectionFilters {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_COLLECTION_FILTERS, ...parsed };
    }
  } catch (e) {}
  return DEFAULT_COLLECTION_FILTERS;
}

function createDefaultProfile(): CollectionProfile {
  return {
    id: DEFAULT_PROFILE_ID,
    name: 'My Main Collection',
    icon: '🎴',
    cards: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function emptyVariants() {
  return { normal: 0, holo: 0, reverse: 0, promo: 0 };
}

// Load initial state for Guest
function loadInitialGuestData(): { profiles: Record<string, CollectionProfile>; activeProfileId: string } {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.profiles && Object.keys(parsed.profiles).length > 0) {
        return {
          profiles: parsed.profiles,
          activeProfileId: parsed.activeProfileId || Object.keys(parsed.profiles)[0],
        };
      }
    }
  } catch (e) {}

  return {
    profiles: { [DEFAULT_PROFILE_ID]: createDefaultProfile() },
    activeProfileId: DEFAULT_PROFILE_ID,
  };
}

// Debounce timer for saving to Firestore
let saveTimeout: any = null;

function triggerSave(get: () => CollectionState, profileId: string) {
  const user = auth.currentUser;
  const state = get();

  if (user) {
    // Save to user local cache
    try {
      localStorage.setItem(
        `${USER_CACHE_KEY_PREFIX}${user.uid}`,
        JSON.stringify({ profiles: state.profiles, activeProfileId: state.activeProfileId })
      );
    } catch (e) {}

    // Debounce save to Firestore
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      state.syncProfileToCloud(profileId);
    }, 600);
  } else {
    // Save to Guest local storage
    try {
      localStorage.setItem(
        GUEST_STORAGE_KEY,
        JSON.stringify({ profiles: state.profiles, activeProfileId: state.activeProfileId })
      );
    } catch (e) {}
  }
}

const initialGuest = loadInitialGuestData();

export const useCollectionStore = create<CollectionState>((set, get) => ({
  profiles: initialGuest.profiles,
  activeProfileId: initialGuest.activeProfileId,
  syncStatus: 'idle',
  lastSyncedAt: null,
  cloudLoadedUid: null,
  filters: loadInitialFilters(),

  setFilters: (newFilters: Partial<CollectionFilters>) => {
    set((state) => {
      const updated = { ...state.filters, ...newFilters };
      try {
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return { filters: updated };
    });
  },

  resetFilters: () => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(DEFAULT_COLLECTION_FILTERS));
    } catch (e) {}
    set({ filters: DEFAULT_COLLECTION_FILTERS });
  },

  createProfile: (name: string, icon = '📁') => {
    const id = `profile-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const trimmedName = name.trim() || 'New Binder';
    const newProfile: CollectionProfile = {
      id,
      name: trimmedName,
      icon,
      cards: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const user = auth.currentUser;
    if (user) {
      removeLocalDeletedBinderId(user.uid, id);
    }

    set((state) => ({
      profiles: {
        ...state.profiles,
        [id]: newProfile,
      },
      activeProfileId: id,
    }));

    triggerSave(get, id);
    return id;
  },

  switchProfile: (profileId: string) => {
    if (get().profiles[profileId]) {
      set({ activeProfileId: profileId });
      const user = auth.currentUser;
      const key = user ? `${USER_CACHE_KEY_PREFIX}${user.uid}` : GUEST_STORAGE_KEY;
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ profiles: get().profiles, activeProfileId: profileId })
        );
      } catch (e) {}
    }
  },

  renameProfile: (profileId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => {
      const profile = state.profiles[profileId];
      if (!profile) return state;
      return {
        profiles: {
          ...state.profiles,
          [profileId]: {
            ...profile,
            name: trimmed,
            updatedAt: Date.now(),
          },
        },
      };
    });
    triggerSave(get, profileId);
  },

  deleteProfile: (profileId: string) => {
    const user = auth.currentUser;
    const state = get();

    // Check the guard BEFORE touching Firestore. Deleting the remote document
    // first and only then refusing wiped your last binder from the cloud while
    // leaving it on the device — it then vanished for good the next time the
    // local cache was cleared.
    if (Object.keys(state.profiles).length <= 1 || !state.profiles[profileId]) return;

    const newProfiles = { ...state.profiles };
    delete newProfiles[profileId];
    const newActive =
      state.activeProfileId === profileId ? Object.keys(newProfiles)[0] : state.activeProfileId;

    set({ profiles: newProfiles, activeProfileId: newActive });

    // Writing localStorage inside the set() updater made it a side effect in a
    // reducer, which fires twice under StrictMode.
    const key = user ? `${USER_CACHE_KEY_PREFIX}${user.uid}` : GUEST_STORAGE_KEY;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ profiles: newProfiles, activeProfileId: newActive })
      );
    } catch (e) {}

    if (user) {
      saveLocalDeletedBinderId(user.uid, profileId);
      deleteDoc(doc(db, 'users', user.uid, 'binders', profileId)).catch(console.error);
      setDoc(doc(db, 'users', user.uid, 'deleted_binders', profileId), {
        id: profileId,
        deletedAt: Date.now(),
      }).catch(console.error);
    }
  },

  setVariantCount: (cardId: string, variant: CardVariantKey, count: number) => {
    const validCount = Math.max(0, Math.floor(count));
    const activeId = get().activeProfileId;
    const currentCount = get().profiles[activeId]?.cards[cardId]?.variants[variant] || 0;

    if (validCount > currentCount) {
      trackEvent('card', 'add', cardId, { variant, count: validCount - currentCount });
    } else if (validCount < currentCount) {
      trackEvent('card', 'remove', cardId, { variant, count: currentCount - validCount });
    }

    set((state) => {
      const profile = state.profiles[state.activeProfileId];
      if (!profile) return state;

      const existingEntry: CollectionCardEntry = profile.cards[cardId] || {
        cardId,
        variants: emptyVariants(),
        updatedAt: Date.now(),
      };

      const newVariants = {
        ...existingEntry.variants,
        [variant]: validCount,
      };

      const total = Object.values(newVariants).reduce((a, b) => a + b, 0);

      const newCards = { ...profile.cards };
      if (total === 0 && !existingEntry.isWishlist && !existingEntry.note) {
        delete newCards[cardId];
      } else {
        newCards[cardId] = {
          ...existingEntry,
          variants: newVariants,
          updatedAt: Date.now(),
        };
      }

      return {
        profiles: {
          ...state.profiles,
          [state.activeProfileId]: {
            ...profile,
            cards: newCards,
            updatedAt: Date.now(),
          },
        },
      };
    });

    triggerSave(get, activeId);
  },

  incrementVariant: (cardId: string, variant: CardVariantKey) => {
    const { profiles, activeProfileId, setVariantCount } = get();
    const profile = profiles[activeProfileId];
    const currentCount = profile?.cards[cardId]?.variants[variant] || 0;
    setVariantCount(cardId, variant, currentCount + 1);
  },

  decrementVariant: (cardId: string, variant: CardVariantKey) => {
    const { profiles, activeProfileId, setVariantCount } = get();
    const profile = profiles[activeProfileId];
    const currentCount = profile?.cards[cardId]?.variants[variant] || 0;
    setVariantCount(cardId, variant, Math.max(0, currentCount - 1));
  },

  toggleWishlist: (cardId: string) => {
    const activeId = get().activeProfileId;
    const isNowWishlist = !get().profiles[activeId]?.cards[cardId]?.isWishlist;
    trackEvent('card', 'wishlist', cardId, { isWishlist: isNowWishlist });

    set((state) => {
      const profile = state.profiles[state.activeProfileId];
      if (!profile) return state;

      const existingEntry: CollectionCardEntry = profile.cards[cardId] || {
        cardId,
        variants: emptyVariants(),
        updatedAt: Date.now(),
      };

      const nextWishlist = !existingEntry.isWishlist;
      const total = Object.values(existingEntry.variants).reduce((a, b) => a + b, 0);

      const newCards = { ...profile.cards };
      if (!nextWishlist && total === 0 && !existingEntry.note) {
        delete newCards[cardId];
      } else {
        newCards[cardId] = {
          ...existingEntry,
          isWishlist: nextWishlist,
          updatedAt: Date.now(),
        };
      }

      return {
        profiles: {
          ...state.profiles,
          [state.activeProfileId]: {
            ...profile,
            cards: newCards,
            updatedAt: Date.now(),
          },
        },
      };
    });

    triggerSave(get, activeId);
  },

  setCardDetails: (cardId: string, details: { condition?: CardCondition; note?: string }) => {
    const activeId = get().activeProfileId;

    set((state) => {
      const profile = state.profiles[state.activeProfileId];
      if (!profile) return state;

      const existingEntry: CollectionCardEntry = profile.cards[cardId] || {
        cardId,
        variants: emptyVariants(),
        updatedAt: Date.now(),
      };

      const updatedEntry: CollectionCardEntry = {
        ...existingEntry,
        condition: details.condition ?? existingEntry.condition,
        note: details.note !== undefined ? details.note : existingEntry.note,
        updatedAt: Date.now(),
      };

      const newCards = { ...profile.cards };
      // Prune like the other mutators do. Without this, giving an unowned card
      // a note and then clearing it left a zeroed entry in the binder forever.
      if (isEmptyEntry(updatedEntry)) delete newCards[cardId];
      else newCards[cardId] = updatedEntry;

      return {
        profiles: {
          ...state.profiles,
          [state.activeProfileId]: {
            ...profile,
            cards: newCards,
            updatedAt: Date.now(),
          },
        },
      };
    });

    triggerSave(get, activeId);
  },

  clearCard: (cardId: string) => {
    const activeId = get().activeProfileId;
    trackEvent('card', 'remove', cardId);

    set((state) => {
      const profile = state.profiles[state.activeProfileId];
      if (!profile || !profile.cards[cardId]) return state;

      const newCards = { ...profile.cards };
      delete newCards[cardId];

      return {
        profiles: {
          ...state.profiles,
          [state.activeProfileId]: {
            ...profile,
            cards: newCards,
            updatedAt: Date.now(),
          },
        },
      };
    });

    triggerSave(get, activeId);
  },

  // Cloud Sync Implementation
  // Cloud Sync Implementation
  syncProfileToCloud: async (profileId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    // The gate. Between Firebase restoring the session and loadUserFromCloud
    // returning, the user looks signed in while the store still holds the empty
    // guest binder. A write here would replace their real binder with it.
    if (get().cloudLoadedUid !== user.uid) {
      console.warn(
        '[collection] skipped a cloud write: binders for this account have not been loaded yet'
      );
      return;
    }

    const profile = get().profiles[profileId];
    if (!profile) return;

    set({ syncStatus: 'syncing' });
    try {
      const docRef = doc(db, 'users', user.uid, 'binders', profileId);
      await setDoc(
        docRef,
        sanitizeForFirestore({ ...profile, schemaVersion: BINDER_SCHEMA_VERSION })
      );
      set({ syncStatus: 'synced', lastSyncedAt: Date.now() });
    } catch (err) {
      console.error('Failed to sync binder to Firestore:', err);
      set({ syncStatus: 'error' });
    }
  },

  loadUserFromCloud: async (uid: string) => {
    // 1. Instantly display user local cache if present, eliminating UI blanking
    const cached = localStorage.getItem(`${USER_CACHE_KEY_PREFIX}${uid}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.profiles && Object.keys(parsed.profiles).length > 0) {
          const deletedIds = getLocalDeletedBinderIds(uid);
          const filteredProfiles: Record<string, CollectionProfile> = {};
          for (const [id, prof] of Object.entries(
            parsed.profiles as Record<string, CollectionProfile>
          )) {
            if (!deletedIds.has(id)) {
              filteredProfiles[id] = prof;
            }
          }
          if (Object.keys(filteredProfiles).length > 0) {
            const activeId = filteredProfiles[parsed.activeProfileId]
              ? parsed.activeProfileId
              : Object.keys(filteredProfiles)[0];
            set({
              profiles: filteredProfiles,
              activeProfileId: activeId,
            });
          }
        }
      } catch (e) {}
    }

    // 2. Perform two-way reconciliation with Cloud ground truth
    // This pulls down any updates from other devices while guaranteeing
    // that cards newly imported on this device are merged and preserved!
    return await get().reconcileWithCloud(uid);
  },

  uploadLocalProfilesToCloud: async (uid: string) => {
    set({ syncStatus: 'syncing' });
    try {
      const { profiles } = get();
      for (const [id, p] of Object.entries(profiles)) {
        const docRef = doc(db, 'users', uid, 'binders', id);
        await setDoc(
          docRef,
          sanitizeForFirestore({ ...p, schemaVersion: BINDER_SCHEMA_VERSION })
        );
      }
      set({ syncStatus: 'synced', lastSyncedAt: Date.now(), cloudLoadedUid: uid });

      localStorage.setItem(
        `${USER_CACHE_KEY_PREFIX}${uid}`,
        JSON.stringify({ profiles, activeProfileId: get().activeProfileId })
      );
    } catch (err) {
      console.error('Failed to upload local binders to cloud:', err);
      set({ syncStatus: 'error' });
    }
  },

  reconcileWithCloud: async (uid: string) => {
    if (!uid) return false;
    set({ syncStatus: 'syncing' });

    try {
      // 1. Gather all local profiles across in-memory state, user cache, and guest cache
      const localProfiles = harvestAllLocalProfiles(uid, get().profiles);

      // 2. Fetch ground truth from Firestore
      const bindersCol = collection(db, 'users', uid, 'binders');
      const snap = await getDocs(bindersCol);

      // 2b. Fetch tombstones (deleted binders) from Firestore to prevent resurrection across devices
      const deletedBindersCol = collection(db, 'users', uid, 'deleted_binders');
      let deletedSnap;
      try {
        deletedSnap = await getDocs(deletedBindersCol);
      } catch (e) {
        console.warn('[collection] could not fetch deleted_binders subcollection:', e);
      }

      const localDeleted = getLocalDeletedBinderIds(uid);
      const allDeletedBinderIds = new Set(localDeleted);
      const remoteDeletedIds = new Set<string>();

      if (deletedSnap && !deletedSnap.empty) {
        deletedSnap.forEach((d) => {
          allDeletedBinderIds.add(d.id);
          remoteDeletedIds.add(d.id);
        });
      }

      // Persist combined tombstones locally
      saveLocalDeletedBinderIds(uid, allDeletedBinderIds);

      // Propagate any local deletions to cloud if remote does not have them yet
      for (const delId of localDeleted) {
        if (!remoteDeletedIds.has(delId)) {
          setDoc(doc(db, 'users', uid, 'deleted_binders', delId), {
            id: delId,
            deletedAt: Date.now(),
          }).catch(console.error);
          deleteDoc(doc(db, 'users', uid, 'binders', delId)).catch(console.error);
        }
      }

      // Ensure all deleted binders are purged from local profiles
      for (const delId of allDeletedBinderIds) {
        delete localProfiles[delId];
      }

      const cloudProfiles: Record<string, CollectionProfile> = {};
      if (!snap.empty) {
        snap.forEach((d) => {
          const data = d.data() as CollectionProfile;
          if (data && data.id) {
            if (allDeletedBinderIds.has(data.id)) {
              // Remote binder document exists but was marked deleted via tombstone
              deleteDoc(doc(db, 'users', uid, 'binders', data.id)).catch(console.error);
            } else {
              cloudProfiles[data.id] = data;
            }
          }
        });
      }

      // If cloud is completely empty, check if we have local cards to seed cloud
      if (Object.keys(cloudProfiles).length === 0) {
        const hasCards = Object.values(localProfiles).some(
          (p) => Object.keys(p.cards || {}).length > 0
        );
        if (hasCards) {
          set({ cloudLoadedUid: uid, profiles: localProfiles });
          await get().uploadLocalProfilesToCloud(uid);
        } else {
          const defaultProf = createDefaultProfile();
          const docRef = doc(db, 'users', uid, 'binders', defaultProf.id);
          await setDoc(docRef, sanitizeForFirestore(defaultProf));
          set({
            profiles: { [defaultProf.id]: defaultProf },
            activeProfileId: defaultProf.id,
            syncStatus: 'synced',
            lastSyncedAt: Date.now(),
            cloudLoadedUid: uid,
          });
        }
        return true;
      }

      const mergedProfiles: Record<string, CollectionProfile> = {};
      const bindersToUpload: CollectionProfile[] = [];

      // 3. Reconcile all binders in cloud with local counterparts
      for (const [id, cloudProf] of Object.entries(cloudProfiles)) {
        if (allDeletedBinderIds.has(id)) continue;
        const localProf = localProfiles[id];
        if (localProf) {
          // Reconcile cards between local and cloud (additive merge)
          const { merged, hasChanges } = reconcileProfiles(localProf, cloudProf);
          mergedProfiles[id] = merged;
          if (hasChanges) {
            bindersToUpload.push(merged);
          }
        } else {
          // Cloud binder only
          const { profile: pruned } = pruneProfile({
            ...cloudProf,
            schemaVersion: BINDER_SCHEMA_VERSION,
          });
          mergedProfiles[id] = pruned;
        }
      }

      // 4. Any local binders that do not exist on cloud yet
      for (const [id, localProf] of Object.entries(localProfiles)) {
        if (allDeletedBinderIds.has(id)) continue;
        if (!cloudProfiles[id]) {
          const { profile: pruned } = pruneProfile({
            ...localProf,
            schemaVersion: BINDER_SCHEMA_VERSION,
          });
          mergedProfiles[id] = pruned;
          bindersToUpload.push(pruned);
        }
      }

      // Keep active binder
      const currentActive = get().activeProfileId;
      const activeId = mergedProfiles[currentActive]
        ? currentActive
        : Object.keys(mergedProfiles)[0] || DEFAULT_PROFILE_ID;

      set({
        profiles: mergedProfiles,
        activeProfileId: activeId,
        syncStatus: 'synced',
        lastSyncedAt: Date.now(),
        cloudLoadedUid: uid,
      });

      try {
        localStorage.setItem(
          `${USER_CACHE_KEY_PREFIX}${uid}`,
          JSON.stringify({ profiles: mergedProfiles, activeProfileId: activeId })
        );
      } catch (e) {}

      // 5. Upload any binders that need syncing to Cloud with deep sanitization
      if (bindersToUpload.length > 0) {
        await Promise.all(
          bindersToUpload.map((p) =>
            setDoc(
              doc(db, 'users', uid, 'binders', p.id),
              sanitizeForFirestore({
                ...p,
                schemaVersion: BINDER_SCHEMA_VERSION,
              })
            )
          )
        );
      }

      return true;
    } catch (err) {
      console.error('[collection] reconcileWithCloud failed:', err);
      set({ syncStatus: 'error' });
      return false;
    }
  },

  forceSyncCloud: async (uid: string) => {
    return await get().reconcileWithCloud(uid);
  },

  // Reset back to Guest Mode state on Logout
  resetToGuest: () => {
    const guestData = loadInitialGuestData();
    set({
      profiles: guestData.profiles,
      activeProfileId: guestData.activeProfileId,
      syncStatus: 'idle',
      lastSyncedAt: null,
      // Closing the gate matters as much as opening it: this also runs on a
      // transient auth blip, and the next session must re-read before writing.
      cloudLoadedUid: null,
    });
  },

  exportCollectionJSON: () => {
    const state = get();
    const exportPayload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      activeProfileId: state.activeProfileId,
      profiles: state.profiles,
    };
    return JSON.stringify(exportPayload, null, 2);
  },

  importCollectionJSON: (jsonString: string, options) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'รูปแบบ JSON ไม่ถูกต้อง' };
      }

      // 1. Check if the JSON is Pokillionaire export format
      if (isPokillionaireFormat(data)) {
        const parseResult = parsePokillionaireExport(data, pokemonCardData as any[]);
        if (!parseResult.success || parseResult.cards.length === 0) {
          return {
            success: false,
            message: 'ไม่พบรายการการ์ดที่ตรงกับฐานข้อมูลในไฟล์ Pokillionaire',
            format: 'pokillionaire',
          };
        }

        const mode = options?.mode ?? 'merge';
        const state = get();

        if (mode === 'new_profile') {
          const newId = `pokillionaire-${Date.now()}`;
          const profileName =
            options?.profileName?.trim() ||
            `Pokillionaire (${parseResult.distinctCardsCount} แบบ)`;

          const newCards: Record<string, CollectionCardEntry> = {};
          for (const item of parseResult.cards) {
            const cardId = item.card.id;
            if (!newCards[cardId]) {
              newCards[cardId] = {
                cardId,
                variants: { normal: item.quantity, holo: 0, reverse: 0, promo: 0 },
                updatedAt: Date.now(),
              };
            } else {
              newCards[cardId].variants.normal += item.quantity;
            }
          }

          const newProfile: CollectionProfile = {
            id: newId,
            name: profileName,
            icon: '📦',
            description: `นำเข้าจาก Pokillionaire เมื่อ ${new Date().toLocaleDateString('th-TH')}`,
            cards: newCards,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            schemaVersion: BINDER_SCHEMA_VERSION,
          };

          set((s) => ({
            profiles: {
              ...s.profiles,
              [newId]: newProfile,
            },
            activeProfileId: newId,
          }));

          triggerSave(get, newId);
          const user = auth.currentUser;
          if (user && get().cloudLoadedUid === user.uid) {
            void get().syncProfileToCloud(newId);
          }

          return {
            success: true,
            message: `สร้างสมุดสะสมใหม่ "${profileName}" และนำเข้าการ์ดสำเร็จ ${parseResult.totalQuantityCount} ใบ (${parseResult.distinctCardsCount} แบบ)!`,
            format: 'pokillionaire',
            cardsImportedCount: parseResult.totalQuantityCount,
            distinctCardsCount: parseResult.distinctCardsCount,
          };
        }

        // Mode is 'merge' or 'replace'
        const targetProfileId = options?.profileId ?? state.activeProfileId;
        const targetProfile = state.profiles[targetProfileId] || Object.values(state.profiles)[0];

        if (!targetProfile) {
          return {
            success: false,
            message: 'ไม่พบสมุดสะสมที่ต้องการนำเข้าข้อมูล',
            format: 'pokillionaire',
          };
        }

        const updatedCards: Record<string, CollectionCardEntry> =
          mode === 'replace' ? {} : { ...(targetProfile.cards || {}) };

        for (const item of parseResult.cards) {
          const cardId = item.card.id;
          const existing = updatedCards[cardId];
          if (existing) {
            updatedCards[cardId] = {
              ...existing,
              variants: {
                ...existing.variants,
                normal: (mode === 'replace' ? 0 : (existing.variants?.normal || 0)) + item.quantity,
              },
              updatedAt: Date.now(),
            };
          } else {
            updatedCards[cardId] = {
              cardId,
              variants: { normal: item.quantity, holo: 0, reverse: 0, promo: 0 },
              updatedAt: Date.now(),
            };
          }
        }

        const nextProfile: CollectionProfile = {
          ...targetProfile,
          cards: updatedCards,
          updatedAt: Date.now(),
          schemaVersion: BINDER_SCHEMA_VERSION,
        };

        set((s) => ({
          profiles: {
            ...s.profiles,
            [targetProfile.id]: nextProfile,
          },
          activeProfileId: targetProfile.id,
        }));

        triggerSave(get, targetProfile.id);
        const user = auth.currentUser;
        if (user && get().cloudLoadedUid === user.uid) {
          void get().syncProfileToCloud(targetProfile.id);
        }

        const actionText = mode === 'replace' ? 'แทนที่' : 'รวมเข้า';
        return {
          success: true,
          message: `นำเข้าจาก Pokillionaire สำเร็จ ${parseResult.totalQuantityCount} ใบ (${parseResult.distinctCardsCount} แบบ) ${actionText}สมุด "${targetProfile.name}"!`,
          format: 'pokillionaire',
          cardsImportedCount: parseResult.totalQuantityCount,
          distinctCardsCount: parseResult.distinctCardsCount,
        };
      }

      // 2. PokéCountTracker Native Backup Format
      if (!data.profiles) {
        return {
          success: false,
          message:
            'รูปแบบไฟล์ JSON ไม่ถูกต้อง (ไม่พบข้อมูล profiles หรือ collections ของ Pokillionaire)',
        };
      }

      const importedProfiles: Record<string, CollectionProfile> = {};
      for (const [id, p] of Object.entries(data.profiles)) {
        const profile = p as any;
        if (profile && typeof profile === 'object' && profile.name) {
          importedProfiles[id] = {
            id,
            name: String(profile.name),
            icon: profile.icon || '🎴',
            description: profile.description || '',
            cards: profile.cards || {},
            createdAt: profile.createdAt || Date.now(),
            updatedAt: profile.updatedAt || Date.now(),
            schemaVersion: BINDER_SCHEMA_VERSION,
          };
        }
      }

      if (Object.keys(importedProfiles).length === 0) {
        return { success: false, message: 'No valid profiles found in import data.' };
      }

      const newActive = data.activeProfileId && importedProfiles[data.activeProfileId]
        ? data.activeProfileId
        : Object.keys(importedProfiles)[0];

      set({
        profiles: importedProfiles,
        activeProfileId: newActive,
      });

      // Trigger save for current context (User Cloud or Guest)
      triggerSave(get, newActive);
      const user = auth.currentUser;
      if (user && get().cloudLoadedUid === user.uid) {
        void get().syncProfileToCloud(newActive);
      }

      return {
        success: true,
        message: `Successfully imported ${Object.keys(importedProfiles).length} profile(s)!`,
        format: 'native',
      };
    } catch (err: any) {
      return { success: false, message: `Error parsing file: ${err?.message || 'Invalid JSON'}` };
    }
  },

  importCollectionText: (text: string, options) => {
    const mode = options?.mode ?? 'merge';
    const finish = options?.finish ?? 'normal';
    const profileId = options?.profileId ?? get().activeProfileId;
    const profile = get().profiles[profileId];

    if (!profile) {
      return {
        success: false,
        message: 'ไม่พบสมุดสะสมที่เลือก (Active binder not found)',
        cardsImportedCount: 0,
        distinctCardsCount: 0,
        unmatchedLines: [],
        setsFound: [],
      };
    }

    const parseResult = parseCollectionText(text, pokemonCardData as any[]);
    if (parseResult.cards.length === 0) {
      return {
        success: false,
        message:
          parseResult.unmatchedLines.length > 0
            ? 'ไม่พบการ์ดที่ตรงกับข้อมูลในระบบจากข้อความที่ระบุ'
            : 'กรุณาระบุรายการการ์ดใต้รหัสชุด (เช่น Set SC1a\n1,3\n20,5\n21)',
        cardsImportedCount: 0,
        distinctCardsCount: 0,
        unmatchedLines: parseResult.unmatchedLines,
        setsFound: parseResult.setsFound,
      };
    }

    const cards = { ...profile.cards };
    for (const item of parseResult.cards) {
      const existingEntry: CollectionCardEntry = cards[item.cardId] || {
        cardId: item.cardId,
        variants: emptyVariants(),
        updatedAt: Date.now(),
      };

      const currentQty = existingEntry.variants[finish] ?? 0;
      const nextQty = mode === 'replace' ? item.quantity : currentQty + item.quantity;
      const newVariants = {
        ...existingEntry.variants,
        [finish]: Math.max(0, nextQty),
      };

      const total = Object.values(newVariants).reduce((a, b) => a + b, 0);
      if (total === 0 && !existingEntry.isWishlist && !existingEntry.note) {
        delete cards[item.cardId];
      } else {
        cards[item.cardId] = {
          ...existingEntry,
          variants: newVariants,
          updatedAt: Date.now(),
        };
      }
    }

    const nextProfile: CollectionProfile = {
      ...profile,
      cards,
      updatedAt: Date.now(),
    };

    set((state) => ({
      profiles: {
        ...state.profiles,
        [profileId]: nextProfile,
      },
    }));

    triggerSave(get, profileId);
    const user = auth.currentUser;
    if (user && get().cloudLoadedUid === user.uid) {
      void get().syncProfileToCloud(profileId);
    }

    const finishLabels: Record<CardVariantKey, string> = {
      normal: 'Normal (ธรรมดา)',
      holo: 'Holo (โฮโล)',
      reverse: 'Reverse Holo (เรเวิร์ส)',
      promo: 'Promo (โปรโม)',
    };
    const finishLabel = finishLabels[finish] || finish;
    const modeLabel = mode === 'replace' ? 'แทนที่' : 'เพิ่ม';

    return {
      success: true,
      message: `นำเข้าสำเร็จ! ${modeLabel}จำนวนการ์ด ${parseResult.totalQuantity} ใบ (${parseResult.distinctCardsCount} แบบ) ชนิด ${finishLabel} ในชุด: ${parseResult.setsFound.join(', ')}`,
      cardsImportedCount: parseResult.totalQuantity,
      distinctCardsCount: parseResult.distinctCardsCount,
      unmatchedLines: parseResult.unmatchedLines,
      setsFound: parseResult.setsFound,
    };
  },

  importCollectionParsedCards: (cardsList, options) => {
    const mode = options?.mode ?? 'merge';
    const defaultFinish = options?.defaultFinish ?? 'normal';
    const profileId = options?.profileId ?? get().activeProfileId;
    const profile = get().profiles[profileId];

    if (!profile) {
      return {
        success: false,
        message: 'ไม่พบสมุดสะสมที่เลือก (Active binder not found)',
        cardsImportedCount: 0,
        distinctCardsCount: 0,
      };
    }

    if (!cardsList || cardsList.length === 0) {
      return {
        success: false,
        message: 'ไม่มีรายการการ์ดที่จะนำเข้า',
        cardsImportedCount: 0,
        distinctCardsCount: 0,
      };
    }

    const cards = { ...profile.cards };
    let importedTotal = 0;

    for (const item of cardsList) {
      const finish = item.variant || defaultFinish;
      const existingEntry: CollectionCardEntry = cards[item.cardId] || {
        cardId: item.cardId,
        variants: emptyVariants(),
        updatedAt: Date.now(),
      };

      const currentQty = existingEntry.variants[finish] ?? 0;
      const nextQty = mode === 'replace' ? item.quantity : currentQty + item.quantity;
      const newVariants = {
        ...existingEntry.variants,
        [finish]: Math.max(0, nextQty),
      };

      const total = Object.values(newVariants).reduce((a, b) => a + b, 0);
      if (total === 0 && !existingEntry.isWishlist && !existingEntry.note) {
        delete cards[item.cardId];
      } else {
        cards[item.cardId] = {
          ...existingEntry,
          variants: newVariants,
          updatedAt: Date.now(),
        };
      }
      importedTotal += item.quantity;
    }

    const nextProfile: CollectionProfile = {
      ...profile,
      cards,
      updatedAt: Date.now(),
    };

    set((state) => ({
      profiles: {
        ...state.profiles,
        [profileId]: nextProfile,
      },
    }));

    triggerSave(get, profileId);
    const user = auth.currentUser;
    if (user && get().cloudLoadedUid === user.uid) {
      void get().syncProfileToCloud(profileId);
    }

    const modeLabel = mode === 'replace' ? 'แทนที่' : 'เพิ่ม';

    return {
      success: true,
      message: `นำเข้าสำเร็จ! ${modeLabel}จำนวนการ์ด ${importedTotal} ใบ (${cardsList.length} รายการ)`,
      cardsImportedCount: importedTotal,
      distinctCardsCount: cardsList.length,
    };
  },
}));
