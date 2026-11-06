import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TabletopSyncService, generateRoomCode, TABLETOP_ROOM_TIMEOUT_MS } from './tabletopSyncService';
import type { TabletopV3State } from './types';

vi.mock('../../utils/firebase', () => ({
  db: {},
  ensurePlaymatAuth: vi.fn().mockResolvedValue('test-uid'),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'mock-doc' })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
      tabletopV3: { roomCode: 'V3-9999', roomMode: 'online' },
    }),
  }),
  onSnapshot: vi.fn((_ref, cb) => {
    cb({
      exists: () => true,
      data: () => ({
        tabletopV3: { roomCode: 'V3-9999', roomMode: 'online', updatedAt: 2000 },
      }),
    });
    return vi.fn();
  }),
}));

describe('TabletopSyncService Realtime & WebRTC Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TabletopSyncService.setCloudSyncEnabled(true);
  });

  afterEach(() => {
    TabletopSyncService.setCloudSyncEnabled(false);
  });

  it('generates valid room codes with prefix V3-', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^V3-\d{4}$/);
  });

  it('fetches existing room state from getRoom', async () => {
    const room = await TabletopSyncService.getRoom('V3-9999');
    expect(room).toBeDefined();
    expect(room?.roomCode).toBe('V3-9999');
  });

  it('subscribes to room updates and cleans up listeners on unsubscribe', () => {
    const onUpdate = vi.fn();
    const unsub = TabletopSyncService.subscribeToRoom('V3-9999', onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      roomCode: 'V3-9999',
    }));

    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('tracks connection status changes', () => {
    const onStatus = vi.fn();
    const unsub = TabletopSyncService.onConnectionStatusChange('V3-9999', onStatus);

    expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({
      roomCode: 'V3-9999',
    }));

    unsub();
  });

  it('creates an online room with player1 and waiting player2', async () => {
    const mockState = {
      player1: { name: 'Trainer Red', deck: [{ id: 'c1' }] },
      player2: { name: 'P2', deck: [] },
    } as unknown as TabletopV3State;

    const code = await TabletopSyncService.createRoom(mockState, 'V3-1111');
    expect(code).toBe('V3-1111');
  });

  it('registers player 2 into room with joinRoom with full deck and role', async () => {
    const mockP2State = {
      id: 'player2',
      name: 'Trainer Blue',
      deckName: 'Charizard ex',
      deck: [{ id: 'c2' }],
      hand: [],
      bench: [null, null, null, null, null],
      benchLimit: 5,
      active: null,
      prizes: [],
      discard: [],
      lostZone: [],
    } as any;

    await expect(
      TabletopSyncService.joinRoom('V3-1111', mockP2State, { name: 'Trainer Blue', email: 'blue@test.com' })
    ).resolves.not.toThrow();
  });

  it('syncs state through broadcast and Firestore including opponentBoard damage', async () => {
    const mockState = {
      roomCode: 'V3-9999',
      roomMode: 'online',
      myRole: 'player1',
      player1: { name: 'P1', deck: [] },
      player2: {
        name: 'P2',
        deck: [],
        active: {
          card: { instanceId: 'opp-active-1', nameEn: 'Pikachu' },
          damage: 70,
          specialConditions: ['POISONED'],
        },
        bench: [
          {
            card: { instanceId: 'opp-bench-1', nameEn: 'Charmander' },
            damage: 30,
            specialConditions: [],
          },
          null,
          null,
          null,
          null,
        ],
      },
      turnDecision: {
        phase: 'DECIDED',
        coinResult: 'HEADS',
        winnerSide: 'player1',
        chosenOrder: 'FIRST',
        startingPlayer: 'player1',
        timestamp: 12345,
      },
    } as unknown as TabletopV3State;

    await expect(TabletopSyncService.syncState('V3-9999', mockState)).resolves.not.toThrow();
  });

  it('deletes an online room and its signals from Firestore', async () => {
    await expect(TabletopSyncService.deleteRoom('V3-9999')).resolves.not.toThrow();
  });

  it('exports TABLETOP_ROOM_TIMEOUT_MS as 30 minutes', () => {
    expect(TABLETOP_ROOM_TIMEOUT_MS).toBe(30 * 60 * 1000);
  });

  describe('reconcileBoardDamageByInstanceId damage isolation on switch', () => {
    it('isolates damage to card instanceId when active retreats to bench', async () => {
      const { reconcileBoardDamageByInstanceId } = await import('./tabletopSyncService');

      // Local player state: Active was Pikachu (70 dmg), Bench 0 was Charmander (0 dmg)
      // Now player switched: Active is Charmander, Bench 0 is Pikachu
      const targetPlayer: any = {
        active: {
          card: { instanceId: 'inst-charmander', nameEn: 'Charmander' },
          damage: 0,
          specialConditions: [],
        },
        bench: [
          {
            card: { instanceId: 'inst-pikachu', nameEn: 'Pikachu' },
            damage: 0,
            specialConditions: [],
          },
          null,
          null,
          null,
          null,
        ],
      };

      // Remote opponentBoard payload from before switch: Active had 70 dmg (Pikachu), Bench 0 had 0 dmg (Charmander)
      const opponentBoard: any = {
        active: {
          instanceId: 'inst-pikachu',
          damage: 70,
          specialConditions: ['BURN'],
        },
        bench: [
          {
            instanceId: 'inst-charmander',
            damage: 20,
            specialConditions: [],
          },
          null,
          null,
          null,
          null,
        ],
      };

      reconcileBoardDamageByInstanceId(targetPlayer, opponentBoard);

      // Active (Charmander) must receive Charmander's 20 damage, NEVER Pikachu's 70 damage!
      expect(targetPlayer.active.damage).toBe(20);
      expect(targetPlayer.active.specialConditions).toEqual([]);

      // Bench 0 (Pikachu) must receive Pikachu's 70 damage and BURN condition!
      expect(targetPlayer.bench[0].damage).toBe(70);
      expect(targetPlayer.bench[0].specialConditions).toEqual(['BURN']);
    });

    it('defaults incoming fresh card damage to 0 if not present in opponentBoard', async () => {
      const { reconcileBoardDamageByInstanceId } = await import('./tabletopSyncService');

      const targetPlayer: any = {
        active: {
          card: { instanceId: 'inst-fresh-mewtwo', nameEn: 'Mewtwo' },
          damage: 0,
          specialConditions: [],
        },
        bench: [null, null, null, null, null],
      };

      const opponentBoard: any = {
        active: {
          instanceId: 'inst-old-pidgeot',
          damage: 120,
          specialConditions: ['POISON'],
        },
        bench: [null, null, null, null, null],
      };

      reconcileBoardDamageByInstanceId(targetPlayer, opponentBoard);

      // Fresh Mewtwo must remain 0 damage, not inherit Pidgeot's 120 damage!
      expect(targetPlayer.active.damage).toBe(0);
      expect(targetPlayer.active.specialConditions).toEqual([]);
    });

    it('matches damage to evolved Pokemon through evolutionHistory when incoming update references pre-evolution instanceId', async () => {
      const { reconcileBoardDamageByInstanceId } = await import('./tabletopSyncService');

      // Local player has Charizard ex (evolved from Charmander)
      const targetPlayer: any = {
        active: {
          card: { instanceId: 'inst-charizard-ex', nameEn: 'Charizard ex' },
          evolutionHistory: [{ instanceId: 'inst-base-charmander', nameEn: 'Charmander' }],
          damage: 0,
          specialConditions: [],
        },
        bench: [null, null, null, null, null],
      };

      // Remote update arrived with pre-evolution instanceId and 50 damage
      const opponentBoard: any = {
        active: {
          instanceId: 'inst-base-charmander',
          damage: 50,
          specialConditions: [],
        },
        bench: [null, null, null, null, null],
      };

      reconcileBoardDamageByInstanceId(targetPlayer, opponentBoard);

      // Charizard ex must receive the 50 damage through its evolutionHistory!
      expect(targetPlayer.active.damage).toBe(50);
    });
  });

  describe('Realtime Cursor Synchronization', () => {
    it('registers onCursor callback and broadcasts cursor coordinates without error', () => {
      const cursorCb = vi.fn();
      const unsub = TabletopSyncService.onCursor('V3-TEST', cursorCb);
      expect(typeof unsub).toBe('function');

      expect(() => {
        TabletopSyncService.sendCursorPosition('V3-TEST', 'player1', 0.45, 0.75);
      }).not.toThrow();

      unsub();
    });
  });

  describe('Cloud Sync Disabled Mode (Zero Firestore Cost)', () => {
    it('bypasses Firestore calls when cloud sync is disabled', async () => {
      const { setDoc, onSnapshot } = await import('firebase/firestore');
      TabletopSyncService.setCloudSyncEnabled(false);

      const mockState = {
        player1: { name: 'Trainer Red', deck: [] },
        player2: { name: 'P2', deck: [] },
      } as unknown as TabletopV3State;

      const code = await TabletopSyncService.createRoom(mockState, 'V3-LOCAL');
      expect(code).toBe('V3-LOCAL');
      // setDoc should NOT be called on Firestore
      expect(setDoc).not.toHaveBeenCalled();

      const onUpdate = vi.fn();
      const unsub = TabletopSyncService.subscribeToRoom('V3-LOCAL', onUpdate);
      expect(typeof unsub).toBe('function');
      // onSnapshot should NOT be called on Firestore
      expect(onSnapshot).not.toHaveBeenCalled();
      unsub();
    });
  });
});

