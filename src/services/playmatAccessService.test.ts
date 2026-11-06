import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkHasPlaymatAccess,
  isUserAllowedForPlaymat,
  isLocalEnvironment,
  getLocalAllowedUsers,
  setLocalAllowedUsers,
  getLocalTesterKey,
  setLocalTesterKey,
  type PlaymatAllowedUser,
} from './playmatAccessService';

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

describe('playmatAccessService - Access Control', () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('allows system admin automatically via email', () => {
    const adminUser = { email: 'wingae911@gmail.com', uid: 'admin_123' };
    const allowed = checkHasPlaymatAccess(adminUser, []);
    expect(allowed).toBe(true);
  });

  it('blocks regular user when allowlist is empty and no tester key', () => {
    const regularUser = { email: 'stranger@example.com', uid: 'random_uid_999' };
    const allowed = checkHasPlaymatAccess(regularUser, []);
    expect(allowed).toBe(false);
  });

  it('allows user when their email matches an entry in allowlist (case-insensitive)', () => {
    const allowlist: PlaymatAllowedUser[] = [
      {
        id: 'u1',
        identifier: 'proplayer@gmail.com',
        note: 'Tournament Player',
        addedAt: Date.now(),
      },
    ];

    const matchingUser = { email: 'ProPlayer@GMAIL.com', uid: 'uid_123' };
    expect(checkHasPlaymatAccess(matchingUser, allowlist)).toBe(true);

    const nonMatching = { email: 'other@gmail.com', uid: 'uid_456' };
    expect(checkHasPlaymatAccess(nonMatching, allowlist)).toBe(false);
  });

  it('verifies granted access for mihitori@gmail.com with case insensitivity', () => {
    const allowlist: PlaymatAllowedUser[] = [
      {
        id: 'user_mihitori',
        identifier: 'mihitori@gmail.com',
        note: 'Beta Tester',
        addedAt: Date.now(),
      },
    ];

    expect(checkHasPlaymatAccess({ email: 'mihitori@gmail.com' }, allowlist)).toBe(true);
    expect(checkHasPlaymatAccess({ email: 'Mihitori@Gmail.com ' }, allowlist)).toBe(true);
    expect(checkHasPlaymatAccess({ email: 'unauthorized@gmail.com' }, allowlist)).toBe(false);
  });

  it('allows user when their Firebase UID matches an entry in allowlist', () => {
    const allowlist: PlaymatAllowedUser[] = [
      {
        id: 'u2',
        identifier: 'firebase_special_uid_888',
        note: 'Beta Tester',
        addedAt: Date.now(),
      },
    ];

    const matchingUser = { email: 'anon@guest.com', uid: 'firebase_special_uid_888' };
    expect(checkHasPlaymatAccess(matchingUser, allowlist)).toBe(true);
  });

  it('allows user who enters a valid tester key matching allowlist', () => {
    const allowlist: PlaymatAllowedUser[] = [
      {
        id: 'u3',
        identifier: 'beta-card-shop-2026',
        note: 'Card Shop Bangkok',
        addedAt: Date.now(),
      },
    ];

    const guestUser = null;
    expect(checkHasPlaymatAccess(guestUser, allowlist, 'beta-card-shop-2026')).toBe(true);
    expect(checkHasPlaymatAccess(guestUser, allowlist, 'wrong-key')).toBe(false);
  });

  it('persists and retrieves allowed users and tester keys in localStorage', () => {
    const users: PlaymatAllowedUser[] = [
      { id: '1', identifier: 'test@example.com', addedAt: 12345 },
    ];
    setLocalAllowedUsers(users);
    expect(getLocalAllowedUsers()).toEqual(users);

    setLocalTesterKey('my-code');
    expect(getLocalTesterKey()).toBe('my-code');

    setLocalTesterKey('');
    expect(getLocalTesterKey()).toBe('');
  });

  it('correctly identifies local/LAN hostnames and production hostnames', () => {
    expect(isLocalEnvironment('localhost')).toBe(true);
    expect(isLocalEnvironment('127.0.0.1')).toBe(true);
    expect(isLocalEnvironment('192.168.1.15')).toBe(true);
    expect(isLocalEnvironment('192.168.31.240')).toBe(true);
    expect(isLocalEnvironment('10.0.0.5')).toBe(true);
    expect(isLocalEnvironment('macbook.local')).toBe(true);

    expect(isLocalEnvironment('pokecount.app')).toBe(false);
    expect(isLocalEnvironment('pokecount.pages.dev')).toBe(false);
    expect(isLocalEnvironment('my-custom-domain.com')).toBe(false);
  });

  it('bypasses permission check when in local mode', () => {
    const unallowedUser = { email: 'stranger@example.com', uid: 'stranger_uid' };
    // With isLocal: true -> returns true regardless of empty allowlist
    expect(checkHasPlaymatAccess(unallowedUser, [], null, { isLocal: true })).toBe(true);

    // With isLocal: false -> enforces strict production allowlist
    expect(checkHasPlaymatAccess(unallowedUser, [], null, { isLocal: false })).toBe(false);
  });

  it('isUserAllowedForPlaymat strictly checks allowlist and admin email without local bypass', () => {
    const allowlist: PlaymatAllowedUser[] = [
      { id: '1', identifier: 'mihitori@gmail.com', addedAt: Date.now() },
    ];
    // Mihitori is in allowlist -> true
    expect(isUserAllowedForPlaymat({ email: 'mihitori@gmail.com' }, allowlist)).toBe(true);
    // Admin is admin -> true
    expect(isUserAllowedForPlaymat({ email: 'wingae911@gmail.com' }, allowlist)).toBe(true);
    // Stranger is not in allowlist -> false (even if environment might be local)
    expect(isUserAllowedForPlaymat({ email: 'udomsak.udsp@gmail.com' }, allowlist)).toBe(false);
    expect(isUserAllowedForPlaymat({ email: 'neokizunaslow@gmail.com' }, allowlist)).toBe(false);
  });

  it('supports dual-identifier matching when entry has both email and uid', () => {
    const allowlist: PlaymatAllowedUser[] = [
      {
        id: 'u_kizuna',
        identifier: 'neokizunaslow@gmail.com',
        email: 'neokizunaslow@gmail.com',
        uid: 'TPnGEcIQ8zVadUAabunPsp',
        addedAt: Date.now(),
      },
    ];

    // 1. Logged in with Google via email
    expect(checkHasPlaymatAccess({ email: 'neokizunaslow@gmail.com' }, allowlist)).toBe(true);

    // 2. Logged in with Google via UID
    expect(checkHasPlaymatAccess({ uid: 'TPnGEcIQ8zVadUAabunPsp' }, allowlist)).toBe(true);

    // 3. Guest enters email into tester key
    expect(checkHasPlaymatAccess(null, allowlist, 'neokizunaslow@gmail.com')).toBe(true);

    // 4. Guest enters UID into tester key
    expect(checkHasPlaymatAccess(null, allowlist, 'TPnGEcIQ8zVadUAabunPsp')).toBe(true);

    // 5. Unrelated tester key fails
    expect(checkHasPlaymatAccess(null, allowlist, 'random_uid')).toBe(false);
  });
});

