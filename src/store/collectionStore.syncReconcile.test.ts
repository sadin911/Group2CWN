import { describe, it, expect, vi, beforeEach } from 'vitest';

const setDocMock = vi.hoisted(() => vi.fn(async (..._args: any[]) => undefined));
const deleteDocMock = vi.hoisted(() => vi.fn(async (..._args: any[]) => undefined));
const getDocsMock = vi.hoisted(() =>
  vi.fn(async (colRef?: any) => {
    if (colRef?.path?.includes('deleted_binders')) {
      return {
        empty: true,
        forEach: (_cb: any) => {},
      };
    }
    return {
      empty: false,
      forEach: (cb: (doc: any) => void) => {
        cb({
          data: () => ({
            id: 'default-profile',
            name: 'My Main Collection',
            cards: {
              'TH-25': {
                cardId: 'TH-25',
                variants: { normal: 2, holo: 0, reverse: 0, promo: 0 },
                updatedAt: 2000,
              },
            },
            createdAt: 1000,
            updatedAt: 2000,
            schemaVersion: 2,
          }),
        });
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

import {
  reconcileProfiles,
  sanitizeForFirestore,
  harvestAllLocalProfiles,
  SAFEGUARD_STORAGE_KEY,
  DELETED_BINDERS_STORAGE_KEY_PREFIX,
  getLocalDeletedBinderIds,
  useCollectionStore,
} from './collectionStore';
import type { CollectionProfile, CollectionCardEntry } from '../types/collection';

function makeProfile(
  id: string,
  cards: Record<string, CollectionCardEntry> = {},
  updatedAt: number = Date.now()
): CollectionProfile {
  return {
    id,
    name: 'Test Binder',
    icon: '🎴',
    cards,
    createdAt: 1000,
    updatedAt,
    schemaVersion: 2,
  };
}

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

describe('reconcileProfiles (Smart Card-Level Reconciliation)', () => {
  it('preserves cards that only exist in Cloud (e.g. imported from Chrome desktop)', () => {
    const localProf = makeProfile('binder-1', {}, 1000);
    const cloudProf = makeProfile(
      'binder-1',
      {
        'TH-25': {
          cardId: 'TH-25',
          variants: { normal: 2, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 2000,
        },
      },
      2000
    );

    const { merged, hasChanges } = reconcileProfiles(localProf, cloudProf);
    expect(merged.cards['TH-25']).toBeDefined();
    expect(merged.cards['TH-25'].variants.normal).toBe(2);
    expect(hasChanges).toBe(true);
  });

  it('preserves cards that only exist in Local (e.g. added on PWA before sync)', () => {
    const localProf = makeProfile(
      'binder-1',
      {
        'TH-6': {
          cardId: 'TH-6',
          variants: { normal: 0, holo: 1, reverse: 0, promo: 0 },
          updatedAt: 2000,
        },
      },
      2000
    );
    const cloudProf = makeProfile('binder-1', {}, 1000);

    const { merged, hasChanges } = reconcileProfiles(localProf, cloudProf);
    expect(merged.cards['TH-6']).toBeDefined();
    expect(merged.cards['TH-6'].variants.holo).toBe(1);
    expect(hasChanges).toBe(true);
  });

  it('resolves conflicting card edits by taking the newer updatedAt timestamp while preserving highest variant counts via Math.max', () => {
    const localProf = makeProfile(
      'binder-1',
      {
        'TH-25': {
          cardId: 'TH-25',
          variants: { normal: 1, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 3000, // Newer local edit
        },
      },
      3000
    );
    const cloudProf = makeProfile(
      'binder-1',
      {
        'TH-25': {
          cardId: 'TH-25',
          variants: { normal: 5, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 2000, // Older cloud edit
        },
      },
      2000
    );

    const { merged } = reconcileProfiles(localProf, cloudProf);
    // Math.max guarantees highest variant count is preserved (5) rather than wiping copies
    expect(merged.cards['TH-25'].variants.normal).toBe(5);
    expect(merged.cards['TH-25'].updatedAt).toBeGreaterThanOrEqual(3000);
  });

  it('safely merges non-conflicting simultaneous edits across different cards', () => {
    const localProf = makeProfile(
      'binder-1',
      {
        'TH-1': {
          cardId: 'TH-1',
          variants: { normal: 1, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 2000,
        },
      },
      2000
    );
    const cloudProf = makeProfile(
      'binder-1',
      {
        'TH-2': {
          cardId: 'TH-2',
          variants: { normal: 3, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 2100,
        },
      },
      2100
    );

    const { merged } = reconcileProfiles(localProf, cloudProf);
    expect(merged.cards['TH-1']).toBeDefined();
    expect(merged.cards['TH-1'].variants.normal).toBe(1);
    expect(merged.cards['TH-2']).toBeDefined();
    expect(merged.cards['TH-2'].variants.normal).toBe(3);
  });

  it('guarantees NO undefined fields in merged card entries (avoids Firestore invalid data crash)', () => {
    const localProf = makeProfile('binder-1', {
      'TH-1': {
        cardId: 'TH-1',
        variants: { normal: 1, holo: 0, reverse: 0, promo: 0 },
        updatedAt: 1000,
        // isWishlist and note are omitted / undefined
      },
    });
    const cloudProf = makeProfile('binder-1', {
      'TH-2': {
        cardId: 'TH-2',
        variants: { normal: 2, holo: 0, reverse: 0, promo: 0 },
        updatedAt: 2000,
        // isWishlist and note are omitted / undefined
      },
    });

    const { merged } = reconcileProfiles(localProf, cloudProf);
    for (const card of Object.values(merged.cards)) {
      expect(Object.prototype.hasOwnProperty.call(card, 'isWishlist')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(card, 'note')).toBe(false);
      expect(card.isWishlist).toBeUndefined(); // Accessing returns undefined, but the key does not exist!
      expect(JSON.stringify(card)).not.toContain('"isWishlist":');
      expect(JSON.stringify(card)).not.toContain('"note":');
    }
  });

  it('merges variant quantities using Math.max across local and cloud', () => {
    const localProf = makeProfile('binder-1', {
      'TH-1': {
        cardId: 'TH-1',
        variants: { normal: 3, holo: 0, reverse: 2, promo: 0 },
        updatedAt: 1000,
      },
    });
    const cloudProf = makeProfile('binder-1', {
      'TH-1': {
        cardId: 'TH-1',
        variants: { normal: 1, holo: 4, reverse: 1, promo: 1 },
        updatedAt: 1000,
      },
    });

    const { merged } = reconcileProfiles(localProf, cloudProf);
    expect(merged.cards['TH-1'].variants.normal).toBe(3); // max(3, 1)
    expect(merged.cards['TH-1'].variants.holo).toBe(4); // max(0, 4)
    expect(merged.cards['TH-1'].variants.reverse).toBe(2); // max(2, 1)
    expect(merged.cards['TH-1'].variants.promo).toBe(1); // max(0, 1)
  });
});

describe('sanitizeForFirestore', () => {
  it('recursively strips undefined values so Firestore never rejects the document', () => {
    const dirty = {
      id: 'test',
      name: 'Binder',
      cards: {
        'TH-1': {
          cardId: 'TH-1',
          variants: { normal: 1, holo: 0, reverse: 0, promo: 0 },
          isWishlist: undefined,
          note: undefined,
          condition: undefined,
        },
      },
      extra: undefined,
    };

    const cleaned = sanitizeForFirestore(dirty);
    expect(cleaned).toEqual({
      id: 'test',
      name: 'Binder',
      cards: {
        'TH-1': {
          cardId: 'TH-1',
          variants: { normal: 1, holo: 0, reverse: 0, promo: 0 },
        },
      },
    });
    expect(Object.prototype.hasOwnProperty.call(cleaned, 'extra')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(cleaned.cards['TH-1'], 'isWishlist')).toBe(false);
  });
});

describe('harvestAllLocalProfiles & Safeguard Backup', () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
  });

  it('harvests profiles from user cache and guest profiles into memory and writes a durable safeguard', () => {
    const inMemProfiles = {
      'binder-inmem': makeProfile('binder-inmem', {
        'TH-1': {
          cardId: 'TH-1',
          variants: { normal: 1, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 100,
        },
      }),
    };

    const cachedUserProfiles = {
      'binder-cached': makeProfile('binder-cached', {
        'TH-2': {
          cardId: 'TH-2',
          variants: { normal: 2, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 200,
        },
      }),
    };

    const guestProfiles = {
      'binder-guest': makeProfile('binder-guest', {
        'TH-3': {
          cardId: 'TH-3',
          variants: { normal: 3, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 300,
        },
      }),
    };

    localStorage.setItem('pokecount_user_cache_test-user-123', JSON.stringify(cachedUserProfiles));
    localStorage.setItem('pokecount_guest_profiles_v2', JSON.stringify(guestProfiles));

    const harvested = harvestAllLocalProfiles('test-user-123', inMemProfiles);

    expect(harvested['binder-inmem']).toBeDefined();
    expect(harvested['binder-cached']).toBeDefined();
    expect(harvested['binder-guest']).toBeDefined();

    // Check safeguard backup in localStorage
    const safeguardRaw = localStorage.getItem(SAFEGUARD_STORAGE_KEY);
    expect(safeguardRaw).not.toBeNull();
    const safeguard = JSON.parse(safeguardRaw!);
    expect(safeguard.profiles['binder-inmem']).toBeDefined();
    expect(safeguard.profiles['binder-cached']).toBeDefined();
    expect(safeguard.profiles['binder-guest']).toBeDefined();
  });
});

describe('useCollectionStore.reconcileWithCloud & loadUserFromCloud', () => {
  beforeEach(() => {
    installMemoryStorage();
    setDocMock.mockClear();
    getDocsMock.mockClear();
    localStorage.clear();

    useCollectionStore.setState({
      profiles: {
        'default-profile': makeProfile('default-profile', {
          'TH-10': {
            cardId: 'TH-10',
            variants: { normal: 1, holo: 0, reverse: 0, promo: 0 },
            updatedAt: 1500,
          },
        }),
      },
      activeProfileId: 'default-profile',
      cloudLoadedUid: 'test-user-123',
    });
  });

  it('forceSyncCloud delegates to reconcileWithCloud, merges cards and succeeds', async () => {
    const res = await useCollectionStore.getState().forceSyncCloud('test-user-123');
    expect(res).toBe(true);
    expect(useCollectionStore.getState().syncStatus).toBe('synced');

    const state = useCollectionStore.getState();
    const activeCards = state.profiles['default-profile'].cards;
    // Both TH-10 (from local) and TH-25 (from cloud) should be present in the merged profile!
    expect(activeCards['TH-10']).toBeDefined();
    expect(activeCards['TH-25']).toBeDefined();
    expect(setDocMock).toHaveBeenCalled();
  });

  it('loadUserFromCloud runs two-way reconciliation and does NOT wipe local cards', async () => {
    await useCollectionStore.getState().loadUserFromCloud('test-user-123');

    const state = useCollectionStore.getState();
    const activeCards = state.profiles['default-profile'].cards;
    // Local cards on iPhone (TH-10) MUST remain intact after loadUserFromCloud!
    expect(activeCards['TH-10']).toBeDefined();
    expect(activeCards['TH-25']).toBeDefined();
  });

  it('deleteProfile records tombstone locally and in Firestore deleted_binders subcollection', () => {
    deleteDocMock.mockClear();
    setDocMock.mockClear();

    useCollectionStore.setState({
      profiles: {
        'binder-1': makeProfile('binder-1'),
        'binder-2': makeProfile('binder-2'),
      },
      activeProfileId: 'binder-2',
      cloudLoadedUid: 'test-user-123',
    });

    useCollectionStore.getState().deleteProfile('binder-2');

    expect(useCollectionStore.getState().profiles['binder-2']).toBeUndefined();
    expect(useCollectionStore.getState().activeProfileId).toBe('binder-1');

    // Check tombstone saved in localStorage
    const localDeleted = getLocalDeletedBinderIds('test-user-123');
    expect(localDeleted.has('binder-2')).toBe(true);

    // Check deleteDoc called for binders/binder-2
    expect(deleteDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/test-user-123/binders/binder-2' })
    );

    // Check setDoc called for deleted_binders/binder-2
    expect(setDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/test-user-123/deleted_binders/binder-2' }),
      expect.objectContaining({ id: 'binder-2' })
    );
  });

  it('harvestAllLocalProfiles filters out deleted binders', () => {
    localStorage.setItem(
      `${DELETED_BINDERS_STORAGE_KEY_PREFIX}test-user-123`,
      JSON.stringify(['binder-deleted'])
    );

    const inMemProfiles = {
      'binder-active': makeProfile('binder-active'),
      'binder-deleted': makeProfile('binder-deleted'),
    };

    const harvested = harvestAllLocalProfiles('test-user-123', inMemProfiles);
    expect(harvested['binder-active']).toBeDefined();
    expect(harvested['binder-deleted']).toBeUndefined();
  });

  it('reconcileWithCloud on Device B purges tombstoned binder and never resurrects it', async () => {
    // Simulate Device B having 'binder-to-delete' in its local user cache and memory
    const deviceBProfiles = {
      'default-profile': makeProfile('default-profile', {
        'TH-10': {
          cardId: 'TH-10',
          variants: { normal: 1, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 100,
        },
      }),
      'binder-to-delete': makeProfile('binder-to-delete', {
        'TH-99': {
          cardId: 'TH-99',
          variants: { normal: 4, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 100,
        },
      }),
    };

    localStorage.setItem(
      'pokecount_user_cache_test-user-123',
      JSON.stringify({ profiles: deviceBProfiles, activeProfileId: 'binder-to-delete' })
    );

    useCollectionStore.setState({
      profiles: deviceBProfiles,
      activeProfileId: 'binder-to-delete',
      cloudLoadedUid: 'test-user-123',
    });

    // Cloud has 'default-profile' in binders, and 'binder-to-delete' in deleted_binders
    getDocsMock.mockImplementation(async (colRef?: any) => {
      if (colRef?.path?.includes('deleted_binders')) {
        return {
          empty: false,
          forEach: (cb: any) => {
            cb({
              id: 'binder-to-delete',
              data: () => ({ id: 'binder-to-delete', deletedAt: 500 }),
            });
          },
        };
      }
      return {
        empty: false,
        forEach: (cb: any) => {
          cb({
            data: () => ({
              id: 'default-profile',
              name: 'Default Profile',
              cards: {},
              createdAt: 100,
              updatedAt: 100,
              schemaVersion: 2,
            }),
          });
        },
      };
    });

    setDocMock.mockClear();

    const success = await useCollectionStore.getState().reconcileWithCloud('test-user-123');
    expect(success).toBe(true);

    const state = useCollectionStore.getState();
    // 'binder-to-delete' MUST NOT be resurrected!
    expect(state.profiles['binder-to-delete']).toBeUndefined();
    expect(state.profiles['default-profile']).toBeDefined();
    expect(state.activeProfileId).toBe('default-profile');

    // Local storage on Device B must be clean as well
    const updatedCacheRaw = localStorage.getItem('pokecount_user_cache_test-user-123');
    const updatedCache = JSON.parse(updatedCacheRaw!);
    expect(updatedCache.profiles['binder-to-delete']).toBeUndefined();

    // setDoc should NEVER have been called for 'binder-to-delete'
    const binderUploadCalls = setDocMock.mock.calls.filter((call) =>
      call[0]?.path?.includes('binders/binder-to-delete')
    );
    expect(binderUploadCalls.length).toBe(0);
  });
});

