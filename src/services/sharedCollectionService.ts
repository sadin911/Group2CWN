import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../utils/firebase';
import type { CollectionProfile } from '../types/collection';
import type { SharedCollectionSnapshot, ShareSettings, SharedCardEntry } from '../types/share';
import { usePricingStore } from '../store/pricingStore';
import { sanitizeForFirestore } from '../store/collectionStore';

const SHARES_LOCAL_KEY = 'pokecount_my_shares';

export interface MyShareRecord {
  shareId: string;
  profileId: string;
  binderName: string;
  publishedAt: string;
  settings: ShareSettings;
}

export function getMyShareRecords(): MyShareRecord[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage || typeof window.localStorage.getItem !== 'function') {
      return [];
    }
    const raw = window.localStorage.getItem(SHARES_LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMyShareRecord(record: MyShareRecord) {
  try {
    if (typeof window === 'undefined' || !window.localStorage || typeof window.localStorage.setItem !== 'function') {
      return;
    }
    const records = getMyShareRecords().filter((r) => r.shareId !== record.shareId && r.profileId !== record.profileId);
    records.unshift(record);
    window.localStorage.setItem(SHARES_LOCAL_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save share record to localStorage:', e);
  }
}

export function removeMyShareRecord(shareId: string) {
  try {
    if (typeof window === 'undefined' || !window.localStorage || typeof window.localStorage.setItem !== 'function') {
      return;
    }
    const records = getMyShareRecords().filter((r) => r.shareId !== shareId);
    window.localStorage.setItem(SHARES_LOCAL_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to remove share record from localStorage:', e);
  }
}

export function generateShareId(): string {
  const randA = Math.random().toString(36).substring(2, 6);
  const randB = Math.random().toString(36).substring(2, 6);
  return `pk_${randA}${randB}`;
}

/**
 * Encodes a lightweight snapshot for URL-fallback when offline or no cloud DB
 */
export function encodeSnapshotToUrl(snapshot: SharedCollectionSnapshot): string {
  try {
    const jsonStr = JSON.stringify(snapshot);
    if (typeof window !== 'undefined' && typeof btoa === 'function') {
      const utf8Bytes = new TextEncoder().encode(jsonStr);
      let binary = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      return encodeURIComponent(btoa(binary));
    }
  } catch (e) {
    console.warn('Failed to encode snapshot to URL:', e);
  }
  return '';
}

/**
 * Decodes URL-encoded snapshot data safely with UTF-8 support
 */
export function decodeSnapshotFromUrl(encoded: string): SharedCollectionSnapshot | null {
  try {
    const rawB64 = decodeURIComponent(encoded);
    if (typeof atob === 'function') {
      const binary = atob(rawB64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const jsonStr = new TextDecoder().decode(bytes);
      return JSON.parse(jsonStr);
    }
  } catch (e) {
    // Fallback if older encode method was used
    try {
      const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
      return JSON.parse(jsonStr);
    } catch {
      console.warn('Failed to decode snapshot from URL:', e);
    }
  }
  return null;
}

export interface PublishOptions {
  profile: CollectionProfile;
  settings: ShareSettings;
  ownerName?: string;
  ownerUid?: string;
  ownerAvatar?: string;
  existingShareId?: string;
}

/**
 * Publishes or updates a collection snapshot to Cloud Firestore (with URL fallback)
 */
export async function publishSharedCollection({
  profile,
  settings,
  ownerName = 'PokéCollector',
  ownerUid,
  ownerAvatar,
  existingShareId,
}: PublishOptions): Promise<{ snapshot: SharedCollectionSnapshot; shareUrl: string }> {
  const shareId = existingShareId || generateShareId();
  const pricingStore = usePricingStore.getState();

  // Filter and build card entries
  const cards: Record<string, SharedCardEntry> = {};
  let totalCards = 0;
  let uniqueCards = 0;
  let estimatedUSD = 0;

  for (const [cardId, entry] of Object.entries(profile.cards || {})) {
    const variants = entry.variants || { normal: 0, holo: 0, reverse: 0, promo: 0 };
    const count = variants.normal + variants.holo + variants.reverse + variants.promo;
    const isWishlist = !!entry.isWishlist;

    // Skip wishlist-only cards if not included
    if (count === 0 && (!isWishlist || !settings.showWishlist)) {
      continue;
    }

    if (count > 0) {
      uniqueCards += 1;
      totalCards += count;

      if (settings.showPrices) {
        const market = pricingStore.getCardMarketPrice(cardId);
        const user = pricingStore.getCardUserPrice(cardId);
        const cardVal = user?.sellPrice ?? (market?.regular ?? market?.foil ?? 0);
        estimatedUSD += cardVal * count;
      }
    }

    cards[cardId] = {
      variants,
      condition: entry.condition,
      isWishlist: settings.showWishlist ? entry.isWishlist : undefined,
      note: settings.showNotes ? entry.note : undefined,
    };
  }

  const rate = pricingStore.exchangeRates?.THB || 35.5;
  const estimatedTHB = Math.round(estimatedUSD * rate);

  const now = new Date().toISOString();
  const snapshot: SharedCollectionSnapshot = {
    shareId,
    ownerUid,
    ownerName: ownerName.trim() || 'PokéCollector',
    ownerAvatar,
    binderName: profile.name || 'My Pokémon Binder',
    description: profile.description,
    cards,
    stats: {
      totalCards,
      uniqueCards,
      estimatedValueTHB: estimatedTHB,
      estimatedValueUSD: Math.round(estimatedUSD * 100) / 100,
    },
    settings,
    createdAt: now,
    updatedAt: now,
    viewCount: 0,
  };

  // Try writing to Firestore
  try {
    const docRef = doc(db, 'shared_collections', shareId);
    await setDoc(docRef, sanitizeForFirestore(snapshot));
  } catch (err) {
    console.warn('Firestore publishSharedCollection skipped or failed, using local/URL fallback:', err);
  }

  // Save record to local user storage
  saveMyShareRecord({
    shareId,
    profileId: profile.id,
    binderName: profile.name,
    publishedAt: now,
    settings,
  });

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`pokecount_shared_snap_${shareId}`, JSON.stringify(snapshot));
    }
  } catch {
    // Ignore quota error
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://poke.tcgcount.com';
  const shareUrl = `${baseUrl}/share/${shareId}`;

  return { snapshot, shareUrl };
}

/**
 * Fetches a shared collection by shareId (from Firestore or URL fallback)
 */
export async function getSharedCollection(shareId: string): Promise<SharedCollectionSnapshot | null> {
  // Check local cache first (instant load if created locally)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = window.localStorage.getItem(`pokecount_shared_snap_${shareId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // ignore
    }

    // Check if shareId matches any published record of the user
    try {
      const myShares = getMyShareRecords();
      const match = myShares.find((r) => r.shareId === shareId);
      if (match) {
        const { useCollectionStore } = await import('../store/collectionStore');
        const profiles = useCollectionStore.getState().profiles;
        const profile = profiles[match.profileId];
        if (profile) {
          const res = await publishSharedCollection({
            profile,
            settings: match.settings,
            ownerName: 'PokéCollector',
            existingShareId: shareId,
          });
          return res.snapshot;
        }
      }
    } catch {
      // ignore
    }
  }

  // Check if there is URL query param ?d= containing base64 data
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const rawDataParam = params.get('d') || params.get('data');
    if (rawDataParam) {
      const decoded = decodeSnapshotFromUrl(rawDataParam);
      if (decoded) return decoded;
    }
  }

  // If shareId contains encoded raw data
  if (shareId.startsWith('data:') || shareId.startsWith('raw_')) {
    const raw = shareId.replace(/^(data:|raw_)/, '');
    return decodeSnapshotFromUrl(raw);
  }

  try {
    const docRef = doc(db, 'shared_collections', shareId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      // Increment view count quietly in background
      try {
        void updateDoc(docRef, { viewCount: increment(1) });
      } catch {
        // ignore background view count error
      }
      return snap.data() as SharedCollectionSnapshot;
    }
  } catch (err) {
    console.warn(`Failed to fetch shared collection ${shareId} from Firestore:`, err);
  }

  return null;
}

/**
 * Deletes a shared collection from Firestore
 */
export async function deleteSharedCollection(shareId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'shared_collections', shareId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`Failed to delete shared collection ${shareId}:`, err);
  }

  removeMyShareRecord(shareId);
  return true;
}
