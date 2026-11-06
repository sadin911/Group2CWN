import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression tests for the write path that destroyed a production binder.
 *
 * A signed-in session boots like this:
 *
 *   1. onAuthStateChanged fires with null, so resetToGuest() puts the guest
 *      profiles (usually empty) into the store.
 *   2. Firebase restores the session, so auth.currentUser becomes truthy.
 *   3. loadUserFromCloud() starts fetching the real binders over the network.
 *
 * Between 2 and 3 completing, the store holds an empty binder while the user
 * looks signed in. Any edit in that window used to schedule a whole-document
 * write, replacing the cloud binder with the empty one — 228 cards became 0.
 *
 * The rule these tests hold: nothing may be written to a user's cloud binder
 * until that user's binders have actually been read back.
 */

const setDocMock = vi.hoisted(() => vi.fn(async () => undefined));
const getDocsMock = vi.hoisted(() => vi.fn(async () => ({ empty: true, forEach: () => {} })));
const authMock = vi.hoisted(() => ({ currentUser: null as { uid: string } | null }));

vi.mock('firebase/firestore', () => ({
  doc: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  collection: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  setDoc: setDocMock,
  getDocs: getDocsMock,
  deleteDoc: vi.fn(async () => undefined),
}));

vi.mock('../utils/firebase', () => ({
  db: {},
  auth: authMock,
}));

/**
 * A minimal in-memory localStorage. The store reads and writes it on every save,
 * and stubbing it here keeps these tests independent of what the environment
 * happens to provide.
 */
function installMemoryStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  });
}

installMemoryStorage();

const { useCollectionStore } = await import('./collectionStore');

const UID = 'test-uid';

/** Puts the store in the state a freshly booted, signed-in session has. */
function bootAsSignedInWithEmptyStore() {
  authMock.currentUser = { uid: UID };
  useCollectionStore.getState().resetToGuest();
}

describe('cloud write guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setDocMock.mockClear();
    getDocsMock.mockClear();
    installMemoryStorage();
    authMock.currentUser = null;
  });

  it('does not push an empty binder to the cloud before the cloud has been read', async () => {
    bootAsSignedInWithEmptyStore();

    const activeId = useCollectionStore.getState().activeProfileId;
    expect(Object.keys(useCollectionStore.getState().profiles[activeId].cards)).toHaveLength(0);

    // The user taps a card while loadUserFromCloud is still in flight
    useCollectionStore.getState().incrementVariant('TH-8312', 'normal');
    await vi.advanceTimersByTimeAsync(2000);

    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('syncProfileToCloud is a no-op until the cloud load completes', async () => {
    bootAsSignedInWithEmptyStore();

    await useCollectionStore.getState().syncProfileToCloud(
      useCollectionStore.getState().activeProfileId
    );

    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('writes normally once the cloud load has completed', async () => {
    authMock.currentUser = { uid: UID };

    // Cloud has no binders yet: loadUserFromCloud seeds a default one and, from
    // that point on, the store is known to be in sync with the cloud.
    await useCollectionStore.getState().loadUserFromCloud(UID);
    setDocMock.mockClear();

    useCollectionStore.getState().incrementVariant('TH-8312', 'normal');
    await vi.advanceTimersByTimeAsync(2000);

    expect(setDocMock).toHaveBeenCalled();
    const lastCall = setDocMock.mock.calls.at(-1) as unknown as [unknown, { cards: Record<string, unknown> }];
    expect(Object.keys(lastCall[1].cards)).toContain('TH-8312');
  });

  it('signing out closes the gate again, so the next session cannot write early', async () => {
    authMock.currentUser = { uid: UID };
    await useCollectionStore.getState().loadUserFromCloud(UID);
    setDocMock.mockClear();

    // A sign-out, or a transient auth blip, resets the store to guest state
    useCollectionStore.getState().resetToGuest();
    authMock.currentUser = { uid: 'another-uid' };

    useCollectionStore.getState().incrementVariant('TH-8312', 'normal');
    await vi.advanceTimersByTimeAsync(2000);

    expect(setDocMock).not.toHaveBeenCalled();
  });
});
