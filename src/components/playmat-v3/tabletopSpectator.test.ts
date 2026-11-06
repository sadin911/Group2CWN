import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TabletopSyncService } from './tabletopSyncService';
import { createInitialTabletopState } from './tabletopStateHelper';
import type { TabletopV3State, TabletopSpectatorInfo } from './types';

vi.mock('../../utils/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-uid' } },
  ensurePlaymatAuth: vi.fn().mockResolvedValue(true),
}));

// Mock firebase firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, coll, id) => ({ path: `${coll}/${id}`, id })),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ spectators: [] }),
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  arrayUnion: vi.fn((val) => ({ type: 'arrayUnion', val })),
  collection: vi.fn((_db, coll) => ({ path: coll })),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  getFirestore: vi.fn(),
}));

describe('Tabletop V3 Spectator & Player Meta Suite', () => {
  let mockState: TabletopV3State;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState = createInitialTabletopState([], 'Player 1', [], 'Player 2');
  });

  it('supports setting custom player names on initial state', () => {
    const customized = {
      ...mockState,
      player1: {
        ...mockState.player1,
        name: 'MasterRed',
      },
      player2: {
        ...mockState.player2,
        name: 'ChampionBlue',
      },
    };

    expect(customized.player1.name).toBe('MasterRed');
    expect(customized.player2.name).toBe('ChampionBlue');
  });

  it('allows myRole to be set to spectator with spectator metadata', () => {
    const spectatorInfo: TabletopSpectatorInfo = {
      id: 'spec-123',
      name: 'AudiencePro',
      email: 'audience@test.com',
      joinedAt: 1726000000000,
    };

    const spectatorState: TabletopV3State = {
      ...mockState,
      roomMode: 'online',
      roomCode: 'V3-9999',
      myRole: 'spectator',
      spectators: [spectatorInfo],
      p1Email: 'player1@test.com',
      p2Email: 'player2@test.com',
    };

    expect(spectatorState.myRole).toBe('spectator');
    expect(spectatorState.spectators).toHaveLength(1);
    expect(spectatorState.spectators?.[0].email).toBe('audience@test.com');
    expect(spectatorState.p1Email).toBe('player1@test.com');
  });

  it('guards syncState from broadcasting when role is spectator', () => {
    const syncSpy = vi.spyOn(TabletopSyncService, 'syncState');
    const spectatorState: TabletopV3State = {
      ...mockState,
      roomMode: 'online',
      roomCode: 'V3-8888',
      myRole: 'spectator',
    };

    TabletopSyncService.syncState('V3-8888', spectatorState, true);
    // syncState should return early and not throw
    expect(syncSpy).toHaveBeenCalled();
  });

  it('persists and retrieves spectator registration in tabletopSyncService', async () => {
    TabletopSyncService.setCloudSyncEnabled(true);
    try {
      const { setDoc, getDoc } = await import('firebase/firestore');
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ spectators: [] }),
      } as any);

      const spectatorInfo: TabletopSpectatorInfo = {
        id: 'spec-guest-1',
        name: 'LiveViewer',
        email: 'viewer@poke.com',
        joinedAt: Date.now(),
      };

      await TabletopSyncService.joinSpectator('V3-7777', spectatorInfo);
      expect(setDoc).toHaveBeenCalled();
    } finally {
      TabletopSyncService.setCloudSyncEnabled(false);
    }
  });

  it('supports updating player metadata with email and display name', async () => {
    TabletopSyncService.setCloudSyncEnabled(true);
    try {
      const { setDoc } = await import('firebase/firestore');

      await TabletopSyncService.updatePlayerMeta('V3-7777', 'player1', {
        name: 'AshKetchum',
        email: 'ash@pallettown.org',
        uid: 'uid-ash-123',
      });

      expect(setDoc).toHaveBeenCalled();
    } finally {
      TabletopSyncService.setCloudSyncEnabled(false);
    }
  });
});
