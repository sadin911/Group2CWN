import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import type { MetaDeck } from '../types/metaDeck';
import metaDecksData from '../data/metaDecks.json';

const STORAGE_KEY = 'pokecount_meta_decks_overrides';
const DOC_PATH = ['system_config', 'meta_decks'] as const;

export interface MetaDeckWithMeta extends MetaDeck {
  isOverridden?: boolean;
}

/**
 * Read cached meta deck overrides from LocalStorage
 */
export function getLocalMetaDeckOverrides(): Record<string, MetaDeck> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Save meta deck overrides to LocalStorage
 */
export function setLocalMetaDeckOverrides(overrides: Record<string, MetaDeck>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (err) {
    console.warn('Failed to save meta deck overrides to localStorage:', err);
  }
}

/**
 * Merge base metaDecks.json with local/cloud overrides synchronously
 */
export function getMergedMetaDecks(
  baseDecks: MetaDeck[] = metaDecksData as unknown as MetaDeck[],
  overrides: Record<string, MetaDeck> = getLocalMetaDeckOverrides()
): MetaDeckWithMeta[] {
  return baseDecks.map((deck) => {
    const override = overrides[deck.id];
    if (override) {
      return {
        ...deck,
        ...override,
        isOverridden: true,
      };
    }
    return {
      ...deck,
      isOverridden: false,
    };
  });
}

/**
 * Fetch meta deck overrides from Firestore with fallback to LocalStorage
 */
export async function fetchMetaDecksWithOverrides(
  baseDecks: MetaDeck[] = metaDecksData as unknown as MetaDeck[]
): Promise<{ decks: MetaDeckWithMeta[]; overrides: Record<string, MetaDeck> }> {
  try {
    const docRef = doc(db, DOC_PATH[0], DOC_PATH[1]);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const remoteOverrides: Record<string, MetaDeck> =
        data?.overrides && typeof data.overrides === 'object' ? data.overrides : {};

      const localOverrides = getLocalMetaDeckOverrides();
      const mergedOverrides = { ...localOverrides, ...remoteOverrides };
      setLocalMetaDeckOverrides(mergedOverrides);

      const decks = getMergedMetaDecks(baseDecks, mergedOverrides);
      return { decks, overrides: mergedOverrides };
    }
  } catch (err) {
    console.warn('Firestore fetchMetaDecksWithOverrides failed, using local cache:', err);
  }

  const localOverrides = getLocalMetaDeckOverrides();
  const decks = getMergedMetaDecks(baseDecks, localOverrides);
  return { decks, overrides: localOverrides };
}

/**
 * Save an updated/remapped meta deck override to Firestore and LocalStorage
 */
export async function saveMetaDeckOverride(
  deck: MetaDeck,
  adminEmail?: string
): Promise<void> {
  const currentOverrides = getLocalMetaDeckOverrides();
  const updatedOverrides = {
    ...currentOverrides,
    [deck.id]: {
      ...deck,
      updatedAt: Date.now(),
    },
  };

  setLocalMetaDeckOverrides(updatedOverrides);

  try {
    const docRef = doc(db, DOC_PATH[0], DOC_PATH[1]);
    await setDoc(
      docRef,
      {
        overrides: updatedOverrides,
        updatedAt: Date.now(),
        updatedBy: adminEmail || 'admin',
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore saveMetaDeckOverride failed, saved locally only:', err);
  }
}

/**
 * Reset a meta deck back to default (remove override)
 */
export async function resetMetaDeckOverride(
  deckId: string,
  adminEmail?: string
): Promise<void> {
  const currentOverrides = getLocalMetaDeckOverrides();
  if (!currentOverrides[deckId]) return;

  const updatedOverrides = { ...currentOverrides };
  delete updatedOverrides[deckId];

  setLocalMetaDeckOverrides(updatedOverrides);

  try {
    const docRef = doc(db, DOC_PATH[0], DOC_PATH[1]);
    await setDoc(
      docRef,
      {
        overrides: updatedOverrides,
        updatedAt: Date.now(),
        updatedBy: adminEmail || 'admin',
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore resetMetaDeckOverride failed:', err);
  }
}

/**
 * Export all meta decks as a formatted JSON string (ready to save to metaDecks.json)
 */
export function exportMetaDecksJson(
  baseDecks: MetaDeck[] = metaDecksData as unknown as MetaDeck[],
  overrides: Record<string, MetaDeck> = getLocalMetaDeckOverrides()
): string {
  const merged = getMergedMetaDecks(baseDecks, overrides).map((d) => {
    const copy = { ...d };
    delete copy.isOverridden;
    return copy;
  });
  return JSON.stringify(merged, null, 2);
}
