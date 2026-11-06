import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLocalWebUsers,
  setLocalWebUsers,
  syncUserProfile,
  fetchAllWebUsers,
  deleteUserCloudData,
  type WebUser,
} from './userService';

vi.mock('firebase/firestore', () => ({
  doc: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  setDoc: vi.fn(async () => undefined),
  deleteDoc: vi.fn(async () => undefined),
  getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
  collection: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  serverTimestamp: vi.fn(() => 123456789),
}));

vi.mock('../utils/firebase', () => ({
  db: {},
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

describe('userService', () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
  });

  it('saves and reads local web users', () => {
    const mockUsers: WebUser[] = [
      {
        uid: 'user_123',
        email: 'user123@example.com',
        displayName: 'Ash Ketchum',
        lastLoginAt: 12345678,
      },
    ];

    setLocalWebUsers(mockUsers);
    const retrieved = getLocalWebUsers();
    expect(retrieved).toEqual(mockUsers);
  });

  it('syncs user profile into local cache', async () => {
    const mockAuthUser = {
      uid: 'user_abc',
      email: 'red@pallet.com',
      displayName: 'Red',
      photoURL: 'https://example.com/red.png',
    } as any;

    await syncUserProfile(mockAuthUser);
    const users = getLocalWebUsers();
    expect(users.length).toBe(1);
    expect(users[0].uid).toBe('user_abc');
    expect(users[0].email).toBe('red@pallet.com');
    expect(users[0].displayName).toBe('Red');
  });

  it('fetchAllWebUsers returns cached users when firestore fails or is empty', async () => {
    const initial: WebUser[] = [
      { uid: 'u_1', displayName: 'Brock', email: 'pewter@gym.com' },
    ];
    setLocalWebUsers(initial);

    const result = await fetchAllWebUsers();
    expect(result.some((u) => u.uid === 'u_1')).toBe(true);
  });

  it('deletes user cloud data and removes user from cache', async () => {
    const initial: WebUser[] = [
      { uid: 'u_del', displayName: 'Target', email: 'target@gym.com' },
      { uid: 'u_stay', displayName: 'Stay', email: 'stay@gym.com' },
    ];
    setLocalWebUsers(initial);

    await deleteUserCloudData('u_del');
    const remaining = getLocalWebUsers();
    expect(remaining.length).toBe(1);
    expect(remaining[0].uid).toBe('u_stay');
  });
});
