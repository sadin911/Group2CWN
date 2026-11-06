import { db, ensurePlaymatAuth } from '../../utils/firebase';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  TabletopV3State,
  TabletopPlayerSideState,
  TabletopTurnDecision,
  TabletopWinnerState,
  TabletopVfxEvent,
  TabletopMulliganReveal,
  TabletopSpectatorInfo,
} from './types';
import {
  WebRtcDataChannelService,
  type WebRtcConnectionState,
} from '../../services/realtime/webRtcDataChannelService';
import type {
  RealtimeConnectionInfo,
  TransportMode,
} from '../../services/realtime/realtimeTransportManager';
import type { RealtimeWireMessage } from '../../services/realtime/tabletopActionEvents';

// Use production-approved collection with open read/write for real-time tabletop
export const ROOM_COLLECTION = 'v3_tabletop_rooms';

/**
 * Master kill-switch for Cloud Firestore online room sync to eliminate Cloud billing costs.
 * When false, all cloud writes, cloud reads, and cloud heartbeats to Firestore are disabled.
 * Local BroadcastChannel (for same-browser tabs) continues to work smoothly without any cloud costs.
 */
let enableCloudFirestore = false;

/**
 * Inactivity timeout for tabletop rooms: 30 minutes of no movement/sync
 */
export const TABLETOP_ROOM_TIMEOUT_MS = 30 * 60 * 1000;

export interface TabletopSlotDamageSync {
  instanceId?: string;
  damage: number;
  specialConditions?: any[];
}

export interface OpponentBoardSync {
  active?: TabletopSlotDamageSync | null;
  bench?: (TabletopSlotDamageSync | null)[];
}

/**
 * Reconciles incoming opponentBoard damage and status conditions strictly by card.instanceId.
 * Prevents damage bleed when a Pokemon retreats, switches, or is gusted (Boss's Orders).
 */
export function reconcileBoardDamageByInstanceId(
  targetPlayer: any,
  opponentBoard?: OpponentBoardSync | null
): { activeChanged: boolean; benchChanged: boolean } {
  if (!targetPlayer || !opponentBoard) return { activeChanged: false, benchChanged: false };

  const incomingUpdates = new Map<string, { damage: number; specialConditions?: any[] }>();

  if (opponentBoard.active && opponentBoard.active.instanceId) {
    incomingUpdates.set(opponentBoard.active.instanceId, {
      damage: opponentBoard.active.damage,
      specialConditions: opponentBoard.active.specialConditions,
    });
  }

  if (Array.isArray(opponentBoard.bench)) {
    opponentBoard.bench.forEach((b) => {
      if (b && b.instanceId) {
        incomingUpdates.set(b.instanceId, {
          damage: b.damage,
          specialConditions: b.specialConditions,
        });
      }
    });
  }

  let activeChanged = false;
  let benchChanged = false;

  // Helper to find update for a slot (by current card instanceId or any in evolution history)
  const getUpdateForSlot = (slot: any) => {
    if (!slot) return undefined;
    if (slot.card?.instanceId && incomingUpdates.has(slot.card.instanceId)) {
      return incomingUpdates.get(slot.card.instanceId);
    }
    if (Array.isArray(slot.evolutionHistory)) {
      for (const prev of slot.evolutionHistory) {
        if (prev?.instanceId && incomingUpdates.has(prev.instanceId)) {
          return incomingUpdates.get(prev.instanceId);
        }
      }
    }
    return undefined;
  };

  // Fallback ONLY for legacy packets where neither side has card instanceIds
  if (incomingUpdates.size === 0) {
    const hasTargetInstanceIds =
      Boolean(targetPlayer.active?.card?.instanceId) ||
      (Array.isArray(targetPlayer.bench) && targetPlayer.bench.some((b: any) => b?.card?.instanceId));

    if (!hasTargetInstanceIds) {
      if (opponentBoard.active && targetPlayer.active) {
        if (
          targetPlayer.active.damage !== opponentBoard.active.damage ||
          (opponentBoard.active.specialConditions &&
            JSON.stringify(targetPlayer.active.specialConditions) !==
              JSON.stringify(opponentBoard.active.specialConditions))
        ) {
          targetPlayer.active.damage = opponentBoard.active.damage;
          if (opponentBoard.active.specialConditions) {
            targetPlayer.active.specialConditions = opponentBoard.active.specialConditions;
          }
          activeChanged = true;
        }
      }
      if (opponentBoard.bench && Array.isArray(targetPlayer.bench)) {
        opponentBoard.bench.forEach((bSync, idx) => {
          const slot = targetPlayer.bench[idx];
          if (bSync && slot) {
            if (
              slot.damage !== bSync.damage ||
              (bSync.specialConditions &&
                JSON.stringify(slot.specialConditions) !== JSON.stringify(bSync.specialConditions))
            ) {
              slot.damage = bSync.damage;
              if (bSync.specialConditions) {
                slot.specialConditions = bSync.specialConditions;
              }
              benchChanged = true;
            }
          }
        });
      }
    }
    return { activeChanged, benchChanged };
  }

  // Strict Instance ID matching (including evolution history)
  if (targetPlayer.active && targetPlayer.active.card?.instanceId) {
    const update = getUpdateForSlot(targetPlayer.active);
    if (update) {
      if (
        targetPlayer.active.damage !== update.damage ||
        (update.specialConditions &&
          JSON.stringify(targetPlayer.active.specialConditions) !==
            JSON.stringify(update.specialConditions))
      ) {
        targetPlayer.active.damage = update.damage;
        if (update.specialConditions) {
          targetPlayer.active.specialConditions = update.specialConditions;
        }
        activeChanged = true;
      }
    }
  }

  if (Array.isArray(targetPlayer.bench)) {
    targetPlayer.bench.forEach((slot: any) => {
      if (slot && slot.card?.instanceId) {
        const update = getUpdateForSlot(slot);
        if (update) {
          if (
            slot.damage !== update.damage ||
            (update.specialConditions &&
              JSON.stringify(slot.specialConditions) !== JSON.stringify(update.specialConditions))
          ) {
            slot.damage = update.damage;
            if (update.specialConditions) {
              slot.specialConditions = update.specialConditions;
            }
            benchChanged = true;
          }
        }
      }
    });
  }

  return { activeChanged, benchChanged };
}

export type TabletopRemoteUpdate =
  | {
      type: 'PARTITION';
      senderRole: 'player1' | 'player2';
      sideState: any;
      opponentBoard?: OpponentBoardSync | null;
      shared?: {
        stadium: any;
        stadiumOwnerSide?: any;
        activeSpotlight: any;
        currentTurn: 'player1' | 'player2';
        turnCount: number;
        combatState?: any;
        lastCombatResult?: any;
        actionToast?: any;
        isGameStarted?: boolean;
        pendingConsent?: any;
        lastConsentResult?: any;
        turnDecision?: TabletopTurnDecision | null;
        winner?: TabletopWinnerState | null;
        activeCoinFlip?: any;
        vfxEvent?: TabletopVfxEvent | null;
        mulliganReveal?: TabletopMulliganReveal | null;
      };
      timestamp: number;
    }
  | {
      type: 'FULL';
      state: TabletopV3State;
      timestamp: number;
    };

/**
 * Deep sanitization to ensure Firestore compatibility (no undefined values)
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

/**
 * Generate a clean 6-character room code (e.g. V3-7821)
 */
export function generateRoomCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `V3-${num}`;
}

// Active connection registries
const activeWebRtcPeers = new Map<string, WebRtcDataChannelService>();
const activeBroadcastChannels = new Map<string, BroadcastChannel>();
const activeStatusHandlers = new Map<string, Set<(info: RealtimeConnectionInfo) => void>>();
const activeConnectionInfo = new Map<string, RealtimeConnectionInfo>();
const activeLatestStates = new Map<string, TabletopV3State>();
const pendingSyncTimeouts = new Map<string, any>();
const roomLatestTimestamps = new Map<string, number>();
const activeCursorCallbacks = new Map<string, (cursor: { senderRole: 'player1' | 'player2'; x: number; y: number; targetZoneId?: string }) => void>();
const activeHeartbeatTimers = new Map<string, any>();

function getOrCreateBroadcastChannel(roomCode: string): BroadcastChannel | null {
  if (typeof window === 'undefined' || !window.BroadcastChannel) return null;
  const upper = roomCode.toUpperCase().trim();
  let ch = activeBroadcastChannels.get(upper);
  if (!ch) {
    ch = new BroadcastChannel(`pokecount_tabletop_${upper}`);
    activeBroadcastChannels.set(upper, ch);
  }
  return ch;
}

function notifyStatus(roomCode: string): void {
  const upper = roomCode.toUpperCase().trim();
  const info = activeConnectionInfo.get(upper);
  if (!info) return;
  activeStatusHandlers.get(upper)?.forEach((cb) => cb(info));
}

export const TabletopSyncService = {
  /**
   * Check if Cloud Firestore sync is enabled
   */
  isCloudSyncEnabled(): boolean {
    return enableCloudFirestore;
  },

  /**
   * Toggle Cloud Firestore sync (used in testing or if re-enabled)
   */
  setCloudSyncEnabled(enabled: boolean): void {
    enableCloudFirestore = enabled;
  },

  /**
   * Create or overwrite an online room in Firestore
   */
  async createRoom(
    initialState: TabletopV3State,
    customCode?: string,
    userMeta?: { uid?: string; email?: string; displayName?: string }
  ): Promise<string> {
    const code = customCode ? customCode.toUpperCase().trim() : generateRoomCode();
    const now = Date.now();
    const p1Name = initialState.player1.name || userMeta?.displayName || 'Player 1';
    const p1Email = userMeta?.email || initialState.p1Email || null;
    const p1Uid = userMeta?.uid || initialState.p1Uid || null;
    const spectators: TabletopSpectatorInfo[] = initialState.spectators || [];

    const stateToStore: TabletopV3State = {
      ...initialState,
      player1: {
        ...initialState.player1,
        name: p1Name,
      },
      p1Email: p1Email || undefined,
      p1Uid: p1Uid || undefined,
      spectators,
      roomMode: 'online',
      roomCode: code,
      updatedAt: now,
    };

    activeLatestStates.set(code, stateToStore);

    const payload = sanitizeForFirestore({
      roomCode: code,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + TABLETOP_ROOM_TIMEOUT_MS, // 30 minutes Cloud TTL auto-cleanup
      isV3: true,
      lastSenderRole: 'player1',
      p1Name,
      p1Email,
      p1Uid,
      p2Name: initialState.player2?.name || null,
      p2Email: initialState.p2Email || null,
      p2Uid: initialState.p2Uid || null,
      spectators,
      player1: stateToStore.player1,
      player2: {
        name: 'Player 2 (รอคู่ต่อสู้...)',
        deckName: 'รอเลือกเด็ค',
        deck: [],
        hand: [],
        bench: [null, null, null, null, null],
        benchLimit: 5,
        active: null,
        prizes: [],
        discard: [],
        lostZone: [],
      },
      stadium: initialState.stadium || null,
      stadiumOwnerSide: initialState.stadiumOwnerSide || null,
      activeSpotlight: initialState.activeSpotlight || null,
      currentTurn: initialState.currentTurn || 'player1',
      turnCount: initialState.turnCount || 1,
      combatState: initialState.combatState || null,
      actionToast: initialState.actionToast || null,
      pendingConsent: null,
      turnDecision: initialState.turnDecision || null,
      winner: initialState.winner || null,
      activeCoinFlip: initialState.activeCoinFlip || null,
      isGameStarted: false,
      tabletopV3: stateToStore,
    });

    try {
      localStorage.setItem(
        `pokecount_room_${code}`,
        JSON.stringify({
          payload,
          tabletopV3: stateToStore,
          _cachedAt: now,
        })
      );
    } catch {}

    if (enableCloudFirestore) {
      try {
        await ensurePlaymatAuth();
        deleteDoc(doc(db, 'playmat_signals', code)).catch(() => {});
        const docRef = doc(db, ROOM_COLLECTION, code);
        await Promise.race([
          setDoc(docRef, payload),
          new Promise<void>((resolve) => setTimeout(resolve, 4000)),
        ]);
      } catch (err) {
        console.warn('[TabletopSync] Firestore createRoom skipped or failed:', err);
      }
    }
    return code;
  },

  /**
   * Delete room and cleanup all signals and peers from Firestore (Garbage Collection)
   */
  async deleteRoom(roomCode: string): Promise<void> {
    try {
      const code = roomCode.toUpperCase().trim();
      try {
        localStorage.removeItem(`pokecount_room_${code}`);
        localStorage.removeItem(`pokecount_room_p2_${code}`);
      } catch {}
      const rtc = activeWebRtcPeers.get(code);
      if (rtc) {
        rtc.disconnect(true);
        activeWebRtcPeers.delete(code);
      }
      activeLatestStates.delete(code);
      if (enableCloudFirestore) {
        await deleteDoc(doc(db, ROOM_COLLECTION, code)).catch(() => {});
        await deleteDoc(doc(db, 'playmat_signals', code)).catch(() => {});
      }
    } catch (err) {
      console.warn('Failed to delete tabletop room:', err);
    }
  },

  /**
   * Check if a room exists and fetch its initial state
   */
  async getRoom(roomCode: string, maxRetries = 2): Promise<TabletopV3State | null> {
    const code = roomCode.toUpperCase().trim();

    // Helper to read local cache fallback
    const readLocalFallback = (): TabletopV3State | null => {
      try {
        const cachedRaw = localStorage.getItem(`pokecount_room_${code}`);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached?._cachedAt && Date.now() - cached._cachedAt < TABLETOP_ROOM_TIMEOUT_MS) {
            if (cached.tabletopV3) {
              return cached.tabletopV3 as TabletopV3State;
            }
          }
        }
      } catch {}
      return activeLatestStates.get(code) || null;
    };

    // If cloud sync is disabled or device is explicitly offline, immediately use local fallback
    if (!enableCloudFirestore || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return readLocalFallback();
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await ensurePlaymatAuth();
        const docRef = doc(db, ROOM_COLLECTION, code);
        const snapshot = await Promise.race([
          getDoc(docRef),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (snapshot && snapshot.exists()) {
          const data = snapshot.data();
          const updatedAt = Number(data.updatedAt) || Number(data.createdAt) || 0;
          const isExpired = updatedAt > 0 && Date.now() - updatedAt > TABLETOP_ROOM_TIMEOUT_MS;
          const isTerminated = Boolean(data.isTerminated) || Boolean(data.isClosed);

          if (isExpired || isTerminated) {
            deleteDoc(docRef).catch(() => {});
            deleteDoc(doc(db, 'playmat_signals', code)).catch(() => {});
            return null;
          }

          let resolvedState: TabletopV3State | null = null;
          if (data.tabletopV3) {
            const v3 = data.tabletopV3 as TabletopV3State;
            resolvedState = {
              ...v3,
              p1Email: data.p1Email || v3.p1Email,
              p2Email: data.p2Email || v3.p2Email,
              p1Uid: data.p1Uid || v3.p1Uid,
              p2Uid: data.p2Uid || v3.p2Uid,
              spectators: data.spectators || v3.spectators || [],
            };
          } else if (data.player1 && data.player2) {
            resolvedState = {
              roomCode: code,
              roomMode: 'online',
              myRole: 'player2',
              perspective: 'player2',
              player1: data.player1,
              player2: data.player2,
              stadium: data.stadium || null,
              stadiumOwnerSide: data.stadiumOwnerSide || null,
              activeSpotlight: data.activeSpotlight || null,
              currentTurn: data.currentTurn || 'player1',
              turnCount: data.turnCount || 1,
              combatState: data.combatState,
              actionToast: data.actionToast,
              turnDecision: data.turnDecision || null,
              winner: data.winner || null,
              activeCoinFlip: data.activeCoinFlip || null,
              isGameStarted: data.isGameStarted ?? false,
              soloRevealAllHands: false,
              historyLog: data.historyLog || [],
              p1Email: data.p1Email,
              p2Email: data.p2Email,
              p1Uid: data.p1Uid,
              p2Uid: data.p2Uid,
              spectators: data.spectators || [],
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            } as TabletopV3State;
          } else {
            resolvedState = data as unknown as TabletopV3State;
          }

          if (resolvedState) {
            // Update local caches with authoritative remote room state
            try {
              localStorage.setItem(
                `pokecount_room_${code}`,
                JSON.stringify({
                  _cachedAt: Date.now(),
                  tabletopV3: resolvedState,
                })
              );
            } catch {}
            activeLatestStates.set(code, resolvedState);
            return resolvedState;
          }
        }
      } catch (err) {
        console.warn(`[TabletopSync] getRoom attempt ${attempt} failed:`, err);
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    // Network / Firestore failed or timed out: fall back to latest local storage
    return readLocalFallback();
  },

  /**
   * Fetch active rooms updated within the last 30 minutes
   */
  async getActiveRooms(): Promise<
    Array<{
      roomCode: string;
      p1Name: string;
      p1Deck: string;
      p2Name?: string;
      p2Deck?: string;
      isP2Ready: boolean;
      isGameStarted: boolean;
      updatedAt: number;
      p1Email?: string;
      p2Email?: string;
      spectatorsCount?: number;
      spectators?: TabletopSpectatorInfo[];
    }>
  > {
    if (!enableCloudFirestore) {
      const rooms: any[] = [];
      activeLatestStates.forEach((state, roomCode) => {
        const p1 = state.player1;
        const p2 = state.player2;
        rooms.push({
          roomCode,
          p1Name: p1?.name || 'Player 1',
          p1Deck: p1?.deckName || 'Deck',
          p2Name: p2?.name,
          p2Deck: p2?.deckName,
          isP2Ready: Boolean(p2 && p2.deck && p2.deck.length > 0),
          isGameStarted: Boolean(state.isGameStarted),
          updatedAt: state.updatedAt || Date.now(),
          p1Email: state.p1Email,
          p2Email: state.p2Email,
          spectatorsCount: (state.spectators || []).length,
          spectators: state.spectators || [],
        });
      });
      return rooms;
    }

    try {
      await ensurePlaymatAuth();
      const now = Date.now();
      const cutoff = now - TABLETOP_ROOM_TIMEOUT_MS;
      const snap = await getDocs(collection(db, ROOM_COLLECTION));
      const rooms: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const updatedAt = Number(data.updatedAt) || Number(data.createdAt) || 0;
        const isExpired = updatedAt < cutoff;
        const isTerminated = Boolean(data.isTerminated) || Boolean(data.isClosed);

        if (isExpired || isTerminated) {
          // Asynchronously purge stale or terminated room from Firestore
          deleteDoc(doc(db, ROOM_COLLECTION, d.id)).catch(() => {});
          deleteDoc(doc(db, 'playmat_signals', d.id)).catch(() => {});
          return;
        }

        if (data.roomCode) {
          const p1 = data.player1 || data.tabletopV3?.player1;
          const p2 = data.player2 || data.tabletopV3?.player2;
          const isP2Ready = Boolean(p2 && p2.deck && p2.deck.length > 0);
          const spectatorsList: TabletopSpectatorInfo[] = data.spectators || data.tabletopV3?.spectators || [];
          rooms.push({
            roomCode: data.roomCode,
            p1Name: data.p1Name || p1?.name || 'Player 1',
            p1Deck: p1?.deckName || 'Deck',
            p2Name: data.p2Name || p2?.name,
            p2Deck: p2?.deckName,
            isP2Ready,
            isGameStarted: Boolean(data.isGameStarted),
            updatedAt,
            p1Email: data.p1Email || data.tabletopV3?.p1Email,
            p2Email: data.p2Email || data.tabletopV3?.p2Email,
            spectatorsCount: spectatorsList.length,
            spectators: spectatorsList,
          });
        }
      });
      return rooms.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (err) {
      console.warn('Failed to fetch active tabletop rooms:', err);
      return [];
    }
  },

  /**
   * Register a spectator in Firestore room
   */
  async joinSpectator(roomCode: string, spectator: TabletopSpectatorInfo): Promise<void> {
    const code = roomCode.toUpperCase().trim();
    const existingState = activeLatestStates.get(code);
    if (existingState) {
      const existing: TabletopSpectatorInfo[] = existingState.spectators || [];
      const filtered = existing.filter((s) => s.id !== spectator.id);
      filtered.push(spectator);
      existingState.spectators = filtered;
    }
    if (!enableCloudFirestore) return;

    try {
      await ensurePlaymatAuth();
      const docRef = doc(db, ROOM_COLLECTION, code);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const existing: TabletopSpectatorInfo[] = data.spectators || data.tabletopV3?.spectators || [];
        const filtered = existing.filter((s) => s.id !== spectator.id);
        filtered.push(spectator);
        await setDoc(
          docRef,
          sanitizeForFirestore({
            spectators: filtered,
            'tabletopV3.spectators': filtered,
            updatedAt: Date.now(),
          }),
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('Failed to join spectator:', err);
    }
  },

  /**
   * Unregister a spectator from Firestore room
   */
  async leaveSpectator(roomCode: string, spectatorId: string): Promise<void> {
    const code = roomCode.toUpperCase().trim();
    const existingState = activeLatestStates.get(code);
    if (existingState) {
      const existing: TabletopSpectatorInfo[] = existingState.spectators || [];
      existingState.spectators = existing.filter((s) => s.id !== spectatorId);
    }
    if (!enableCloudFirestore) return;

    try {
      await ensurePlaymatAuth();
      const docRef = doc(db, ROOM_COLLECTION, code);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const existing: TabletopSpectatorInfo[] = data.spectators || data.tabletopV3?.spectators || [];
        const filtered = existing.filter((s) => s.id !== spectatorId);
        await setDoc(
          docRef,
          sanitizeForFirestore({
            spectators: filtered,
            'tabletopV3.spectators': filtered,
            updatedAt: Date.now(),
          }),
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('Failed to leave spectator:', err);
    }
  },

  /**
   * Register player2 as guest into the online room with complete deck and state atomically
   */
  async joinRoom(
    roomCode: string,
    player2State: TabletopPlayerSideState,
    meta?: { name?: string; email?: string; uid?: string }
  ): Promise<void> {
    try {
      const code = roomCode.toUpperCase().trim();
      const now = Date.now();
      const p2Name = meta?.name || player2State.name || 'Player 2';
      const p2Email = meta?.email || null;
      const p2Uid = meta?.uid || null;

      const fullPlayer2: TabletopPlayerSideState = {
        ...player2State,
        name: p2Name,
      };

      // Update local cache immediately
      const existing = activeLatestStates.get(code);
      if (existing) {
        existing.player2 = fullPlayer2;
        existing.p2Email = p2Email || undefined;
        existing.p2Uid = p2Uid || undefined;
        activeLatestStates.set(code, existing);
      }

      const payload = sanitizeForFirestore({
        lastSenderRole: 'player2',
        activeSideUpdate: 'player2',
        p2Name,
        p2Deck: player2State.deckName || 'Deck',
        p2Email,
        p2Uid,
        player2: fullPlayer2,
        'tabletopV3.player2': fullPlayer2,
        'tabletopV3.p2Name': p2Name,
        'tabletopV3.p2Deck': player2State.deckName || 'Deck',
        'tabletopV3.p2Email': p2Email,
        'tabletopV3.p2Uid': p2Uid,
        isP2Ready: true,
        updatedAt: now,
        lastActionTimestamp: now,
      });

      if (enableCloudFirestore) {
        await ensurePlaymatAuth();
        const docRef = doc(db, ROOM_COLLECTION, code);
        await Promise.race([
          setDoc(docRef, payload, { merge: true }),
          new Promise<void>((resolve) => setTimeout(resolve, 4000)),
        ]);
      }

      // 1. Send via local BroadcastChannel
      const ch = getOrCreateBroadcastChannel(code);
      ch?.postMessage({
        type: 'TABLETOP_PARTITIONED_STATE',
        senderRole: 'player2',
        sideState: fullPlayer2,
        timestamp: now,
      });

      // 2. Send via WebRTC DataChannel if P2P is connected
      const rtc = activeWebRtcPeers.get(code);
      if (rtc && rtc.getState() === 'connected') {
        rtc.sendMessage({
          type: 'PARTITIONED_STATE',
          senderRole: 'player2',
          sideState: fullPlayer2,
          timestamp: now,
        });
      }
    } catch (err) {
      console.warn('Failed to join room as Player 2:', err);
    }
  },

  /**
   * Update player profile metadata (name, email, uid) in Firestore
   */
  async updatePlayerMeta(
    roomCode: string,
    role: 'player1' | 'player2',
    meta: { name?: string; email?: string; uid?: string }
  ): Promise<void> {
    try {
      const code = roomCode.toUpperCase().trim();
      const updateData: any = {
        lastSenderRole: role,
        updatedAt: Date.now(),
      };
      if (role === 'player1') {
        if (meta.name) {
          updateData.p1Name = meta.name;
          updateData['player1.name'] = meta.name;
          updateData['tabletopV3.player1.name'] = meta.name;
        }
        if (meta.email) {
          updateData.p1Email = meta.email;
          updateData['tabletopV3.p1Email'] = meta.email;
        }
        if (meta.uid) {
          updateData.p1Uid = meta.uid;
          updateData['tabletopV3.p1Uid'] = meta.uid;
        }
      } else {
        if (meta.name) {
          updateData.p2Name = meta.name;
          updateData['player2.name'] = meta.name;
          updateData['tabletopV3.player2.name'] = meta.name;
        }
        if (meta.email) {
          updateData.p2Email = meta.email;
          updateData['tabletopV3.p2Email'] = meta.email;
        }
        if (meta.uid) {
          updateData.p2Uid = meta.uid;
          updateData['tabletopV3.p2Uid'] = meta.uid;
        }
      }

      if (enableCloudFirestore) {
        await ensurePlaymatAuth();
        const docRef = doc(db, ROOM_COLLECTION, code);
        await Promise.race([
          setDoc(docRef, sanitizeForFirestore(updateData), { merge: true }),
          new Promise<void>((resolve) => setTimeout(resolve, 5000)),
        ]);
      }
    } catch (err) {
      console.warn('Failed to update player meta in room:', err);
    }
  },

  /**
   * Initialize WebRTC P2P connection for an active online room
   */
  initWebRtc(
    roomCode: string,
    myRole: 'player1' | 'player2',
    onRemoteUpdate: (update: TabletopRemoteUpdate | TabletopV3State) => void
  ): void {
    const code = roomCode.toUpperCase().trim();
    const rtcRole: 'p1' | 'p2' = myRole === 'player1' ? 'p1' : 'p2';

    // Cleanup previous peer if any
    const existing = activeWebRtcPeers.get(code);
    if (existing) {
      existing.disconnect();
      activeWebRtcPeers.delete(code);
    }

    if (!enableCloudFirestore) {
      activeConnectionInfo.set(code, {
        mode: 'broadcast',
        latencyMs: 0,
        peerRole: rtcRole === 'p1' ? 'p2' : 'p1',
        roomCode: code,
        isP2pAvailable: false,
      });
      notifyStatus(code);
      return;
    }

    const defaultInfo: RealtimeConnectionInfo = {
      mode: 'connecting',
      latencyMs: 0,
      peerRole: rtcRole === 'p1' ? 'p2' : 'p1',
      roomCode: code,
      isP2pAvailable: false,
    };
    activeConnectionInfo.set(code, defaultInfo);
    notifyStatus(code);

    const rtcService = new WebRtcDataChannelService({
      roomCode: code,
      myRole: rtcRole,
      onMessage: (msg: RealtimeWireMessage) => {
        const stamp = (msg as any).timestamp || 0;
        const lastRecorded = roomLatestTimestamps.get(code) || 0;
        if (stamp > 0 && stamp < lastRecorded) {
          return;
        }
        if (stamp > 0) {
          roomLatestTimestamps.set(code, Math.max(lastRecorded, stamp));
        }

        if ((msg as any).type === 'CURSOR_MOVE') {
          const cursorMsg = msg as any;
          if (cursorMsg.senderRole === myRole) return;
          const cursorCb = activeCursorCallbacks.get(code);
          cursorCb?.({
            senderRole: cursorMsg.senderRole,
            x: cursorMsg.x,
            y: cursorMsg.y,
            targetZoneId: cursorMsg.targetZoneId,
          });
          return;
        }

        if (msg.type === 'PARTITIONED_STATE') {
          const latest = activeLatestStates.get(code);
          if (latest) {
            (latest as any)[msg.senderRole] = msg.sideState;
            if (msg.opponentBoard) {
              const targetSide = msg.senderRole === 'player1' ? 'player2' : 'player1';
              const targetPlayer = (latest as any)[targetSide];
              if (targetPlayer) {
                reconcileBoardDamageByInstanceId(targetPlayer, msg.opponentBoard);
              }
            }
            if (msg.shared?.stadium !== undefined) latest.stadium = msg.shared.stadium;
            if (msg.shared?.stadiumOwnerSide !== undefined) latest.stadiumOwnerSide = msg.shared.stadiumOwnerSide;
            if (msg.shared?.currentTurn !== undefined) latest.currentTurn = msg.shared.currentTurn;
            if (msg.shared?.turnCount !== undefined) latest.turnCount = msg.shared.turnCount;
            if (msg.shared?.combatState !== undefined) latest.combatState = msg.shared.combatState;
            if (msg.shared?.lastCombatResult !== undefined) latest.lastCombatResult = msg.shared.lastCombatResult;
            if (msg.shared?.activeSpotlight !== undefined) latest.activeSpotlight = msg.shared.activeSpotlight;
            if (msg.shared?.actionToast !== undefined) latest.actionToast = msg.shared.actionToast;
            if (msg.shared?.isGameStarted !== undefined) latest.isGameStarted = msg.shared.isGameStarted;
            if (msg.shared?.pendingConsent !== undefined) latest.pendingConsent = msg.shared.pendingConsent;
            if (latest.isGameStarted && latest.pendingConsent?.actionType === 'START_GAME') {
              latest.pendingConsent = null;
            }
            if (msg.shared?.lastConsentResult !== undefined) latest.lastConsentResult = msg.shared.lastConsentResult;
            if (msg.shared?.turnDecision !== undefined) latest.turnDecision = msg.shared.turnDecision;
            if (msg.shared?.winner !== undefined) latest.winner = msg.shared.winner;
            if (msg.shared?.activeCoinFlip !== undefined) latest.activeCoinFlip = msg.shared.activeCoinFlip;
            if (msg.shared?.vfxEvent !== undefined) latest.vfxEvent = msg.shared.vfxEvent;
            if (msg.shared?.mulliganReveal !== undefined) latest.mulliganReveal = msg.shared.mulliganReveal;
          }
          onRemoteUpdate({
            type: 'PARTITION',
            senderRole: msg.senderRole,
            sideState: msg.sideState,
            opponentBoard: msg.opponentBoard,
            shared: msg.shared,
            timestamp: msg.timestamp,
          });
        } else if (msg.type === 'STATE' && msg.state) {
          onRemoteUpdate({
            type: 'FULL',
            state: msg.state,
            timestamp: msg.timestamp,
          });
        } else if (msg.type === 'REQUEST_FULL_STATE') {
          const latest = activeLatestStates.get(code);
          if (latest) {
            if (rtcRole === 'p1') {
              rtcService.sendMessage({
                type: 'STATE',
                state: latest,
                senderRole: 'player1',
                timestamp: Date.now(),
              });
            } else if (rtcRole === 'p2' && latest.player2) {
              rtcService.sendMessage({
                type: 'PARTITIONED_STATE',
                senderRole: 'player2',
                sideState: latest.player2,
                timestamp: Date.now(),
              });
            }
          }
        }
      },
      onStateChange: (state: WebRtcConnectionState, latencyMs?: number) => {
        let mode: TransportMode = 'cloud';
        let isP2p = false;

        if (state === 'connected') {
          mode = 'p2p';
          isP2p = true;
          // When P2P connects, synchronize both roles immediately
          const latest = activeLatestStates.get(code);
          if (rtcRole === 'p1') {
            if (latest) {
              rtcService.sendMessage({
                type: 'STATE',
                state: latest,
                senderRole: 'player1',
                timestamp: Date.now(),
              });
            }
          } else if (rtcRole === 'p2') {
            if (latest && latest.player2) {
              rtcService.sendMessage({
                type: 'PARTITIONED_STATE',
                senderRole: 'player2',
                sideState: latest.player2,
                timestamp: Date.now(),
              });
            }
          }
        } else if (state === 'signaling' || state === 'connecting') {
          mode = 'connecting';
        } else {
          mode = 'cloud';
        }

        activeConnectionInfo.set(code, {
          mode,
          latencyMs: latencyMs ?? (isP2p ? 20 : 180),
          peerRole: rtcRole === 'p1' ? 'p2' : 'p1',
          roomCode: code,
          isP2pAvailable: isP2p,
        });
        notifyStatus(code);
      },
    });

    activeWebRtcPeers.set(code, rtcService);
    rtcService.connect().catch((err) => {
      console.warn('[TabletopSync] WebRTC connection error, using cloud fallback:', err);
    });
  },

  /**
   * Subscribe to real-time updates for an online room (BroadcastChannel + WebRTC + Firestore)
   */
  subscribeToRoom(
    roomCode: string,
    onUpdate: (update: TabletopRemoteUpdate | TabletopV3State) => void,
    onError?: (error: Error) => void,
    myRole?: 'player1' | 'player2' | 'both' | 'spectator',
    onCursor?: (cursor: { senderRole: 'player1' | 'player2'; x: number; y: number; targetZoneId?: string }) => void
  ): Unsubscribe {
    const code = roomCode.toUpperCase().trim();
    let lastProcessedTimestamp = 0;

    if (onCursor) {
      activeCursorCallbacks.set(code, onCursor);
    }

    // 1. BroadcastChannel (0ms local multi-tab / E2E sync)
    const ch = getOrCreateBroadcastChannel(code);
    const bcHandler = (ev: MessageEvent) => {
      if (ev.data?.type === 'PARTITIONED_STATE' || ev.data?.type === 'TABLETOP_PARTITIONED_STATE') {
        const msg = ev.data;
        if (msg.senderRole === myRole) return;
        const stamp = msg.timestamp || 0;
        if (stamp > 0 && stamp < lastProcessedTimestamp) return;
        if (stamp > 0) lastProcessedTimestamp = stamp;
        onUpdate({
          type: 'PARTITION',
          senderRole: msg.senderRole,
          sideState: msg.sideState,
          opponentBoard: msg.opponentBoard,
          shared: msg.shared,
          timestamp: stamp,
        });
      } else if (ev.data?.type === 'TABLETOP_CURSOR') {
        const msg = ev.data;
        if (msg.senderRole === myRole) return;
        onCursor?.({
          senderRole: msg.senderRole,
          x: msg.x,
          y: msg.y,
          targetZoneId: msg.targetZoneId,
        });
      }
    };
    ch?.addEventListener('message', bcHandler);

    // 2. WebRTC DataChannel (P2P zero cloud cost)
    // Setup message listener already handled in initP2pConnection

    // 3. Firestore Subscription (Cloud fallback - disabled when enableCloudFirestore is false)
    const firestoreUnsub = enableCloudFirestore
      ? onSnapshot(
          doc(db, ROOM_COLLECTION, code),
          (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data();
            const stamp = data.lastActionTimestamp || data.updatedAt?.toMillis?.() || data.updatedAt || 0;

            if (stamp > 0 && stamp <= lastProcessedTimestamp) return;
            if (stamp > 0) lastProcessedTimestamp = stamp;

            const sender = (data.lastSenderRole || data.activeSideUpdate) as 'player1' | 'player2';

            // Ignore echo of own write to prevent full-state overwrite loop & hitching
            if (sender && sender === myRole) return;

            if (sender && sender !== myRole && data[sender]) {
              const cached = activeLatestStates.get(code);
              if (cached) {
                (cached as any)[sender] = data[sender];
              }
              onUpdate({
                type: 'PARTITION',
                senderRole: sender,
                sideState: data[sender],
                opponentBoard: data.opponentBoard || null,
                shared: {
                  stadium: data.stadium || null,
                  stadiumOwnerSide: data.stadiumOwnerSide || null,
                  activeSpotlight: data.activeSpotlight || null,
                  currentTurn: data.currentTurn || 'player1',
                  turnCount: data.turnCount || 1,
                  combatState: data.combatState || null,
                  lastCombatResult: data.lastCombatResult || null,
                  actionToast: data.actionToast,
                  isGameStarted: data.isGameStarted,
                  pendingConsent: (data.isGameStarted && data.pendingConsent?.actionType === 'START_GAME') ? null : (data.pendingConsent || null),
                  lastConsentResult: data.lastConsentResult || null,
                  turnDecision: data.turnDecision || null,
                  winner: data.winner || null,
                  activeCoinFlip: data.activeCoinFlip || null,
                  vfxEvent: data.vfxEvent || null,
                  mulliganReveal: data.mulliganReveal || null,
                },
                timestamp: stamp,
              });
            } else if (data.tabletopV3) {
              onUpdate(data.tabletopV3 as TabletopV3State);
            } else if (data.player1 && data.player2) {
              onUpdate(data as unknown as TabletopV3State);
            }
          },
          (err) => {
            onError?.(err);
          }
        )
      : () => {};

    // 4. Background Heartbeat Pulse (keeps room and connection alive when thinking for extended periods)
    if (activeHeartbeatTimers.has(code)) {
      clearInterval(activeHeartbeatTimers.get(code));
    }
    let heartbeatTick = 0;
    const hbTimer = setInterval(() => {
      heartbeatTick += 1;
      const peer = activeWebRtcPeers.get(code);
      if (!peer || !peer.isConnected()) {
        const info = activeConnectionInfo.get(code);
        if (info && info.mode === 'p2p') {
          info.mode = 'broadcast';
          notifyStatus(code);
        }
      }
      // Every 30s (every 2 ticks of 15s), touch Firestore to refresh TTL and lastHeartbeat if cloud sync is enabled
      if (enableCloudFirestore && heartbeatTick % 2 === 0) {
        const docRef = doc(db, ROOM_COLLECTION, code);
        const now = Date.now();
        setDoc(
          docRef,
          {
            lastHeartbeat: now,
            updatedAt: now,
            expiresAt: now + TABLETOP_ROOM_TIMEOUT_MS,
          },
          { merge: true }
        ).catch(() => {});
      }
    }, 15000);
    activeHeartbeatTimers.set(code, hbTimer);

    return () => {
      ch?.removeEventListener('message', bcHandler);
      firestoreUnsub();
      activeCursorCallbacks.delete(code);
      const hb = activeHeartbeatTimers.get(code);
      if (hb) {
        clearInterval(hb);
        activeHeartbeatTimers.delete(code);
      }
    };
  },

  /**
   * Broadcast real-time cursor position to peers (0ms BroadcastChannel + WebRTC DataChannel)
   */
  sendCursorPosition(
    roomCode: string,
    senderRole: 'player1' | 'player2',
    x: number,
    y: number,
    targetZoneId?: string
  ): void {
    const code = roomCode.toUpperCase().trim();
    // 1. Send via local BroadcastChannel (0ms local tabs / multi-window)
    const ch = getOrCreateBroadcastChannel(code);
    ch?.postMessage({
      type: 'TABLETOP_CURSOR',
      senderRole,
      x,
      y,
      targetZoneId,
      timestamp: Date.now(),
    });

    // 2. Send via WebRTC DataChannel (P2P zero cloud cost)
    const peer = activeWebRtcPeers.get(code);
    if (peer && peer.isConnected()) {
      peer.sendMessage({
        type: 'CURSOR_MOVE',
        senderRole,
        x,
        y,
        targetZoneId,
        timestamp: Date.now(),
      } as any);
    }
  },

  /**
   * Subscribe to real-time cursor updates
   */
  onCursor(
    roomCode: string,
    callback: (cursor: { senderRole: 'player1' | 'player2'; x: number; y: number; targetZoneId?: string }) => void
  ): Unsubscribe {
    const code = roomCode.toUpperCase().trim();
    activeCursorCallbacks.set(code, callback);
    const ch = getOrCreateBroadcastChannel(code);
    const handler = (ev: MessageEvent) => {
      if (ev.data?.type === 'TABLETOP_CURSOR') {
        callback({
          senderRole: ev.data.senderRole,
          x: ev.data.x,
          y: ev.data.y,
          targetZoneId: ev.data.targetZoneId,
        });
      }
    };
    ch?.addEventListener('message', handler);
    return () => {
      activeCursorCallbacks.delete(code);
      ch?.removeEventListener('message', handler);
    };
  },

  /**
   * Sync the new tabletop state through Role-Partitioned Side Sync:
   * 1. BroadcastChannel (0ms local tabs, partitioned only)
   * 2. WebRTC DataChannel (10-30ms P2P ~3KB partitioned payload, zero cloud overhead)
   * 3. Firestore (cloud fallback / periodic checkpoint on major milestones)
   */
  async syncState(roomCode: string, state: TabletopV3State, isCheckpoint = false): Promise<void> {
    if (state.myRole === 'spectator') {
      return;
    }
    const code = roomCode.toUpperCase().trim();
    const now = Date.now();
    roomLatestTimestamps.set(code, Math.max(roomLatestTimestamps.get(code) || 0, now));
    activeLatestStates.set(code, state);

    const senderRole: 'player1' | 'player2' = state.myRole === 'player2' ? 'player2' : 'player1';
    const sideState = state[senderRole];
    const opponentRole: 'player1' | 'player2' = senderRole === 'player1' ? 'player2' : 'player1';
    const oppSide = state[opponentRole];
    const opponentBoard: OpponentBoardSync | null = oppSide
      ? {
          active: oppSide.active
            ? {
                instanceId: oppSide.active.card.instanceId,
                damage: oppSide.active.damage,
                specialConditions: oppSide.active.specialConditions || [],
              }
            : null,
          bench: (oppSide.bench || []).map((b) =>
            b
              ? {
                  instanceId: b.card.instanceId,
                  damage: b.damage,
                  specialConditions: b.specialConditions || [],
                }
              : null
          ),
        }
      : null;

    const shared = {
      stadium: state.stadium || null,
      stadiumOwnerSide: state.stadiumOwnerSide || null,
      activeSpotlight: state.activeSpotlight || null,
      currentTurn: state.currentTurn || 'player1',
      turnCount: state.turnCount || 1,
      combatState: state.combatState || null,
      lastCombatResult: state.lastCombatResult || null,
      actionToast: state.actionToast || null,
      isGameStarted: state.isGameStarted ?? false,
      pendingConsent: state.pendingConsent || null,
      lastConsentResult: state.lastConsentResult || null,
      turnDecision: state.turnDecision || null,
      winner: state.winner || null,
      activeCoinFlip: state.activeCoinFlip || null,
      vfxEvent: state.vfxEvent || null,
      mulliganReveal: state.mulliganReveal || null,
    };

    // 1. Send via local BroadcastChannel (Partitioned only to avoid duplicate state re-renders)
    const ch = getOrCreateBroadcastChannel(code);
    if (ch) {
      try {
        ch.postMessage({
          type: 'TABLETOP_PARTITIONED_STATE',
          senderRole,
          sideState,
          opponentBoard,
          shared,
          timestamp: now,
        });
      } catch {}
    }

    // 2. Send via WebRTC DataChannel if P2P is connected (~3KB partitioned packet)
    const rtc = activeWebRtcPeers.get(code);
    let sentOverP2p = false;
    if (rtc && rtc.getState() === 'connected') {
      sentOverP2p = rtc.sendMessage({
        type: 'PARTITIONED_STATE',
        senderRole,
        sideState,
        opponentBoard,
        shared,
        timestamp: now,
      });
    }

    // Always keep local storage updated with the latest full board state so reconnecting is instantaneous and complete
    try {
      localStorage.setItem(
        `pokecount_room_${code}`,
        JSON.stringify({
          payload: {
            roomCode: code,
            tabletopV3: state,
          },
          tabletopV3: state,
          _cachedAt: now,
        })
      );
    } catch {}

    // 3. Sync to Firestore (Debounced to avoid locking UI main thread on rapid actions)
    // When streaming over P2P, debounce by 1200ms so the UI stays 100% smooth and 0-stutter,
    // while guaranteeing Cloud Firestore always has the complete latest state for reconnecting/refreshing players.
    const delay = isCheckpoint ? 300 : sentOverP2p ? 1200 : 800;
    if (pendingSyncTimeouts.has(code)) {
      clearTimeout(pendingSyncTimeouts.get(code));
    }

    const performFirestoreSync = async () => {
      if (!enableCloudFirestore) {
        pendingSyncTimeouts.delete(code);
        return;
      }
      try {
        await ensurePlaymatAuth();
        const docRef = doc(db, ROOM_COLLECTION, code);
        const payload = sanitizeForFirestore({
          roomCode: code,
          createdAt: state.createdAt || now,
          updatedAt: now,
          lastHeartbeat: now,
          expiresAt: now + TABLETOP_ROOM_TIMEOUT_MS, // 30 minutes Cloud TTL auto-cleanup
          isV3: true,
          lastSenderRole: senderRole,
          activeSideUpdate: senderRole,
          player1: state.player1,
          player2: state.player2,
          opponentBoard,
          ...shared,
          tabletopV3: state,
        });
        await setDoc(docRef, payload, { merge: true });
      } catch (err) {
        console.warn('Failed to sync Tabletop V3 state to Firestore:', err);
      } finally {
        pendingSyncTimeouts.delete(code);
      }
    };

    const timer = setTimeout(performFirestoreSync, delay);
    pendingSyncTimeouts.set(code, timer);
  },

  /**
   * Subscribe to connection status changes (P2P latency, cloud, connecting)
   */
  onConnectionStatusChange(
    roomCode: string,
    callback: (info: RealtimeConnectionInfo) => void
  ): () => void {
    const code = roomCode.toUpperCase().trim();
    if (!activeStatusHandlers.has(code)) {
      activeStatusHandlers.set(code, new Set());
    }
    activeStatusHandlers.get(code)!.add(callback);

    const current = activeConnectionInfo.get(code) || {
      mode: 'cloud',
      latencyMs: 180,
      peerRole: 'p2',
      roomCode: code,
      isP2pAvailable: false,
    };
    callback(current);

    return () => {
      activeStatusHandlers.get(code)?.delete(callback);
    };
  },
};

