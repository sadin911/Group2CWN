import { doc, getDocs, collection, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../utils/firebase';

export interface WebUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  lastLoginAt?: number;
  createdAt?: number;
}

const LOCAL_USERS_CACHE_KEY = 'pokecount_all_web_users_cache';

function hasLocalStorage(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.localStorage.getItem === 'function' &&
      typeof window.localStorage.setItem === 'function'
    );
  } catch {
    return false;
  }
}

let memoryUsersCache: WebUser[] = [];

/**
 * Get locally cached web users
 */
export function getLocalWebUsers(): WebUser[] {
  if (!hasLocalStorage()) return memoryUsersCache;
  try {
    const raw = localStorage.getItem(LOCAL_USERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to read local web users cache:', err);
  }
  return [];
}

/**
 * Save web users to local storage cache
 */
export function setLocalWebUsers(users: WebUser[]): void {
  if (hasLocalStorage()) {
    try {
      localStorage.setItem(LOCAL_USERS_CACHE_KEY, JSON.stringify(users));
      return;
    } catch (err) {
      console.warn('Failed to save local web users cache:', err);
    }
  }
  memoryUsersCache = users;
}

/**
 * Synchronize user profile into Firestore collection 'users'
 */
export async function syncUserProfile(user: User): Promise<void> {
  if (!user || !user.uid) return;

  const userObj: WebUser = {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    lastLoginAt: Date.now(),
  };

  // 1. Update local cache
  const localList = getLocalWebUsers();
  const existingIdx = localList.findIndex((u) => u.uid === user.uid);
  if (existingIdx >= 0) {
    localList[existingIdx] = { ...localList[existingIdx], ...userObj };
  } else {
    localList.unshift({ ...userObj, createdAt: Date.now() });
  }
  setLocalWebUsers(localList);

  // 2. Persist to Firestore
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        lastLoginAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore syncUserProfile skipped/failed, saved to local cache:', err);
  }
}

/**
 * Fetch all registered web users for Admin directory
 */
export async function fetchAllWebUsers(): Promise<WebUser[]> {
  const mergedMap = new Map<string, WebUser>();

  // Seed with local cache
  const localList = getLocalWebUsers();
  localList.forEach((u) => mergedMap.set(u.uid, u));

  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);

    snapshot.docs.forEach((d) => {
      const data = d.data();
      const uid = d.id;
      const lastLoginAt =
        data.lastLoginAt?.toMillis?.() ||
        (typeof data.lastLoginAt === 'number' ? data.lastLoginAt : undefined);
      const createdAt =
        data.createdAt?.toMillis?.() ||
        (typeof data.createdAt === 'number' ? data.createdAt : undefined);

      mergedMap.set(uid, {
        uid,
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        lastLoginAt: lastLoginAt || mergedMap.get(uid)?.lastLoginAt,
        createdAt: createdAt || mergedMap.get(uid)?.createdAt,
      });
    });

    const combined = Array.from(mergedMap.values());
    setLocalWebUsers(combined);
    return combined;
  } catch (err) {
    console.warn('Firestore fetchAllWebUsers skipped/failed, using local fallback:', err);
    return Array.from(mergedMap.values());
  }
}

/**
 * Permanently delete a user's cloud data from Firestore:
 * - binders subcollection
 * - decks subcollection
 * - deleted_binders subcollection
 * - root user document
 */
export async function deleteUserCloudData(uid: string): Promise<void> {
  if (!uid) return;
  try {
    // 1. Delete binders
    const bindersSnap = await getDocs(collection(db, 'users', uid, 'binders'));
    for (const docSnap of bindersSnap.docs) {
      await deleteDoc(docSnap.ref);
    }
    // 2. Delete decks
    const decksSnap = await getDocs(collection(db, 'users', uid, 'decks'));
    for (const docSnap of decksSnap.docs) {
      await deleteDoc(docSnap.ref);
    }
    // 3. Delete deleted_binders
    const delSnap = await getDocs(collection(db, 'users', uid, 'deleted_binders'));
    for (const docSnap of delSnap.docs) {
      await deleteDoc(docSnap.ref);
    }
    // 4. Delete root user doc
    await deleteDoc(doc(db, 'users', uid));

    // 5. Remove from local web users cache
    const current = getLocalWebUsers().filter((u) => u.uid !== uid);
    setLocalWebUsers(current);
  } catch (err) {
    console.error('Failed to delete user cloud data:', err);
    throw err;
  }
}

