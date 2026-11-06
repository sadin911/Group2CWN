import { create } from 'zustand';
import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../utils/firebase';

export interface CustomCardMapping {
  enName: string;
  cardId: string;
  cardNameTh: string;
  cardImage?: string;
  setCode?: string;
  updatedAt: number;
}

interface CustomMappingState {
  mappings: Record<string, CustomCardMapping>;
  setMapping: (
    enName: string,
    card: { id: string; name: string; imageUrl?: string; officialImageUrl?: string; set?: { id?: string } },
    uid?: string | null
  ) => Promise<void>;
  removeMapping: (enName: string, uid?: string | null) => Promise<void>;
  importMappings: (newMappings: Record<string, CustomCardMapping>, uid?: string | null) => Promise<number>;
  clearAllMappings: (uid?: string | null) => Promise<void>;
  getMappingDictionary: () => Record<string, string>;
  loadUserMappingsFromCloud: (uid: string) => Promise<void>;
  fetchCommunitySuggestions: () => Promise<CustomCardMapping[]>;
}

const LOCAL_STORAGE_KEY = 'pokecount_user_card_mappings_v1';

function normalizeKey(str: string): string {
  return str.trim().toLowerCase();
}

function loadInitialMappings(): Record<string, CustomCardMapping> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage.getItem) {
    return {};
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load custom mappings from localStorage:', e);
  }
  return {};
}

function saveMappingsToLocalStorage(mappings: Record<string, CustomCardMapping>) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage.setItem) {
    return;
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mappings));
  } catch (e) {
    console.warn('Failed to save custom mappings to localStorage:', e);
  }
}

export const useCustomMappingStore = create<CustomMappingState>((set, get) => ({
  mappings: loadInitialMappings(),

  setMapping: async (enName, card, uid) => {
    const key = normalizeKey(enName);
    if (!key || !card.id) return;

    const entry: CustomCardMapping = {
      enName: enName.trim(),
      cardId: card.id,
      cardNameTh: card.name,
      cardImage: card.imageUrl || card.officialImageUrl,
      setCode: card.set?.id,
      updatedAt: Date.now(),
    };

    const nextMappings = {
      ...get().mappings,
      [key]: entry,
    };

    saveMappingsToLocalStorage(nextMappings);
    set({ mappings: nextMappings });

    // Sync to user's personal cloud profile if signed in
    if (uid) {
      try {
        const safeDocId = encodeURIComponent(key).replace(/%/g, '_');
        const userDocRef = doc(db, 'users', uid, 'customMappings', safeDocId);
        await setDoc(userDocRef, entry, { merge: true });
      } catch (err) {
        console.warn('Could not sync custom mapping to user cloud profile:', err);
      }
    }

    // Submit to community card suggestion pool for crowdsourced dictionary improvement
    try {
      const safeDocId = encodeURIComponent(key).replace(/%/g, '_');
      const suggestionDocRef = doc(db, 'community_card_suggestions', safeDocId);
      await setDoc(
        suggestionDocRef,
        {
          enName: entry.enName,
          cardId: entry.cardId,
          cardNameTh: entry.cardNameTh,
          setCode: entry.setCode || null,
          suggestedAt: Date.now(),
          suggestedByUid: uid || 'anonymous',
        },
        { merge: true }
      );
    } catch {
      // Gracefully ignore if Firestore rules block unauthenticated suggestion writes
    }
  },

  removeMapping: async (enName, uid) => {
    const key = normalizeKey(enName);
    const current = { ...get().mappings };
    if (!current[key]) return;

    delete current[key];
    saveMappingsToLocalStorage(current);
    set({ mappings: current });

    if (uid) {
      try {
        const safeDocId = encodeURIComponent(key).replace(/%/g, '_');
        await deleteDoc(doc(db, 'users', uid, 'customMappings', safeDocId));
      } catch (err) {
        console.warn('Could not delete custom mapping from user cloud profile:', err);
      }
    }
  },

  importMappings: async (imported, uid) => {
    let count = 0;
    const merged = { ...get().mappings };

    for (const [rawKey, item] of Object.entries(imported)) {
      if (!item || !item.enName || !item.cardId) continue;
      const key = normalizeKey(rawKey || item.enName);
      if (!key) continue;

      merged[key] = {
        enName: item.enName.trim(),
        cardId: item.cardId,
        cardNameTh: item.cardNameTh,
        cardImage: item.cardImage,
        setCode: item.setCode,
        updatedAt: item.updatedAt || Date.now(),
      };
      count++;
    }

    saveMappingsToLocalStorage(merged);
    set({ mappings: merged });

    if (uid && count > 0) {
      try {
        for (const item of Object.values(merged)) {
          const key = normalizeKey(item.enName);
          const safeDocId = encodeURIComponent(key).replace(/%/g, '_');
          await setDoc(doc(db, 'users', uid, 'customMappings', safeDocId), item, { merge: true });
        }
      } catch (err) {
        console.warn('Could not batch sync imported mappings to cloud:', err);
      }
    }

    return count;
  },

  clearAllMappings: async (uid) => {
    const oldMappings = get().mappings;
    saveMappingsToLocalStorage({});
    set({ mappings: {} });

    if (uid) {
      try {
        for (const key of Object.keys(oldMappings)) {
          const safeDocId = encodeURIComponent(key).replace(/%/g, '_');
          await deleteDoc(doc(db, 'users', uid, 'customMappings', safeDocId));
        }
      } catch (err) {
        console.warn('Could not clear cloud mappings:', err);
      }
    }
  },

  getMappingDictionary: () => {
    const dict: Record<string, string> = {};
    const { mappings } = get();
    for (const [k, v] of Object.entries(mappings)) {
      dict[k] = v.cardId;
    }
    return dict;
  },

  loadUserMappingsFromCloud: async (uid: string) => {
    if (!uid) return;
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'customMappings'));
      if (!snap.empty) {
        const cloudMappings: Record<string, CustomCardMapping> = {};
        snap.forEach((d) => {
          const data = d.data() as CustomCardMapping;
          if (data && data.enName && data.cardId) {
            cloudMappings[normalizeKey(data.enName)] = data;
          }
        });

        const merged = {
          ...get().mappings,
          ...cloudMappings,
        };
        saveMappingsToLocalStorage(merged);
        set({ mappings: merged });
      }
    } catch (err) {
      console.warn('Could not load custom mappings from cloud:', err);
    }
  },

  fetchCommunitySuggestions: async () => {
    try {
      const snap = await getDocs(collection(db, 'community_card_suggestions'));
      if (snap.empty) return [];
      const list: CustomCardMapping[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        if (data && data.enName && data.cardId) {
          list.push({
            enName: data.enName,
            cardId: data.cardId,
            cardNameTh: data.cardNameTh || data.cardId,
            setCode: data.setCode || undefined,
            updatedAt: data.suggestedAt || Date.now(),
          });
        }
      });
      return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (err) {
      console.warn('Could not fetch community suggestions:', err);
      return [];
    }
  },
}));
