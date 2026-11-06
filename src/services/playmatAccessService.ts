import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { isAdminEmail } from '../utils/adminAuth';

export interface PlaymatAllowedUser {
  id: string; // UUID or sanitized identifier
  identifier: string; // Email (lowercase), Firebase UID, or tester code
  email?: string; // Explicit email if known (lowercase)
  uid?: string; // Explicit Firebase UID if known
  note?: string; // Optional description/note (e.g. "Pro Player #1", "Card Shop Bangkok")
  addedAt: number; // Timestamp
  addedBy?: string; // Admin email or identifier
}

const STORAGE_KEY = 'pokecount_playmat_allowed_users';
const TESTER_KEY_STORAGE = 'pokecount_playmat_tester_key';
const DOC_PATH = ['system_config', 'playmat_access'] as const;

/**
 * Read cached allowed users from LocalStorage
 */
export function getLocalAllowedUsers(): PlaymatAllowedUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save allowed users to LocalStorage
 */
export function setLocalAllowedUsers(users: PlaymatAllowedUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('Failed to save playmat allowed users to localStorage:', err);
  }
}

/**
 * Get active local tester key (entered in Access Gate)
 */
export function getLocalTesterKey(): string {
  try {
    return localStorage.getItem(TESTER_KEY_STORAGE)?.trim() || '';
  } catch {
    return '';
  }
}

/**
 * Save local tester key
 */
export function setLocalTesterKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(TESTER_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(TESTER_KEY_STORAGE);
    }
  } catch (err) {
    console.warn('Failed to save tester key to localStorage:', err);
  }
}

/**
 * Fetch allowed users list from Firestore with fallback to LocalStorage.
 * Remote Firestore data is authoritative.
 */
export async function fetchPlaymatAllowedUsers(): Promise<PlaymatAllowedUser[]> {
  try {
    const docRef = doc(db, DOC_PATH[0], DOC_PATH[1]);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const remoteUsers: PlaymatAllowedUser[] = Array.isArray(data?.users) ? data.users : [];
      const localUsers = getLocalAllowedUsers();
      const mergedMap = new Map<string, PlaymatAllowedUser>();
      remoteUsers.forEach((u) => mergedMap.set(u.identifier.toLowerCase(), u));
      localUsers.forEach((u) => {
        const key = u.identifier.toLowerCase();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, u);
        }
      });
      const combined = Array.from(mergedMap.values());
      setLocalAllowedUsers(combined);
      return combined;
    }
  } catch (err) {
    console.warn('Firestore fetchPlaymatAllowedUsers skipped/failed, using local fallback:', err);
  }
  return getLocalAllowedUsers();
}

/**
 * Save updated allowed users list to Firestore and LocalStorage
 */
export async function savePlaymatAllowedUsers(users: PlaymatAllowedUser[]): Promise<void> {
  setLocalAllowedUsers(users);
  try {
    const docRef = doc(db, DOC_PATH[0], DOC_PATH[1]);
    await setDoc(docRef, {
      users,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore savePlaymatAllowedUsers skipped/failed:', err);
  }
}

/**
 * Detects if the app is currently running in a local / LAN development environment.
 * - Localhost, 127.0.0.1, [::1]
 * - LAN / Wi-Fi IP ranges: 192.168.*, 10.*, 172.16.*-172.31.*
 * - .local mDNS hostnames
 */
export function isLocalEnvironment(hostname?: string): boolean {
  const isTestEnv =
    (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') ||
    (typeof globalThis !== 'undefined' && (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === 'test');
  if (isTestEnv && !hostname) {
    return false;
  }
  const h = hostname ?? (typeof window !== 'undefined' ? window.location?.hostname : '');
  if (!h) return false;
  const host = h.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    host.endsWith('.local')
  );
}

/**
 * Core Permission Check:
 * Determines if a given user/session is authorized to access Playmat.
 * - In local / LAN environment, always returns true (bypass permissions).
 * - Admins ALWAYS have access.
 * - Allowed if user email or UID matches any allowed user entry.
 * - Allowed if local tester key matches any allowed user entry.
 */
export function checkHasPlaymatAccess(
  user: { email?: string | null; uid?: string; displayName?: string | null } | null | undefined,
  allowedUsers: PlaymatAllowedUser[],
  localTesterKey?: string | null,
  options?: { isLocal?: boolean }
): boolean {
  // 0. Local environment bypass: automatically granted on localhost & local LAN
  const isLocal = options?.isLocal ?? isLocalEnvironment();
  if (isLocal) {
    return true;
  }

  // 1. Admin bypass: Admins always have access
  if (user?.email && isAdminEmail(user.email)) {
    return true;
  }

  const userEmail = user?.email?.trim().toLowerCase();
  const userUid = user?.uid?.trim().toLowerCase();
  const testerKey = localTesterKey?.trim().toLowerCase();

  return allowedUsers.some((entry) => {
    const target = entry.identifier.trim().toLowerCase();
    const entryEmail = entry.email?.trim().toLowerCase();
    const entryUid = entry.uid?.trim().toLowerCase();

    // 1. Check against active user session (Email or UID)
    if (userEmail && (target === userEmail || entryEmail === userEmail)) return true;
    if (userUid && (target === userUid || entryUid === userUid)) return true;

    // 2. Check against entered testerKey (can be Email, UID, or custom tester code)
    if (testerKey) {
      if (target === testerKey) return true;
      if (entryEmail && entryEmail === testerKey) return true;
      if (entryUid && entryUid === testerKey) return true;
    }

    return false;
  });
}

/**
 * Check if a specific WebUser or user object is in the allowed list
 * NOTE: For admin management and directory views, this MUST NOT bypass based on
 * the viewer's local/LAN environment. It strictly verifies against allowedUsers and admin email.
 */
export function isUserAllowedForPlaymat(
  user: { email?: string | null; uid?: string; displayName?: string | null } | null | undefined,
  allowedUsers: PlaymatAllowedUser[]
): boolean {
  return checkHasPlaymatAccess(user, allowedUsers, null, { isLocal: false });
}

