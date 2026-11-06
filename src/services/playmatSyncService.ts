import type {
  PlaymatRoomState,
  PlaymatActionPayload,
  PlaymatPlayerBoardState,
  PlaymatCard,
  PlaymatHistoryEntry,
} from '../types/playmat';
import { db, ensurePlaymatAuth } from '../utils/firebase';
import {
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  getDocs,
} from 'firebase/firestore';

/**
 * Master kill-switch for Cloud Firestore Playmat sync to eliminate Cloud billing costs.
 * When false, all cloud writes, reads, and listeners to 'playmat_rooms' are disabled.
 */
let enableCloudFirestorePlaymat = false;

export function isPlaymatCloudSyncEnabled(): boolean {
  return enableCloudFirestorePlaymat;
}

export function setPlaymatCloudSyncEnabled(enabled: boolean): void {
  enableCloudFirestorePlaymat = enabled;
}

const INITIAL_PLAYER_BOARD: PlaymatPlayerBoardState = {
  playerName: '',
  joined: false,
  deckCount: 0,
  handCount: 0,
  prizeCount: 6,
  prizes: [],
  active: null,
  bench: [],
  supporter: null,
  discard: [],
  lostZone: [],
  mulliganCount: 0,
  energyAttachedThisTurn: false,
  supporterPlayedThisTurn: false,
};

export const createInitialRoomState = (
  roomCode: string,
  pin?: string | null,
  hostUid?: string | null
): PlaymatRoomState => ({
  roomCode,
  pin: pin || null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  hostUid: hostUid || null,
  participants: hostUid ? [hostUid] : [],
  matchId: 1,
  currentTurn: 'p1',
  turnNumber: 1,
  setupPhase: 'setup',
  firstPlayerChoice: null,
  revealedCardAnnouncement: null,
  revealedHandAnnouncement: null,
  isTerminated: false,
  history: [],
  p1: { ...INITIAL_PLAYER_BOARD, playerName: 'Player 1', prizesPlaced: false },
  p2: { ...INITIAL_PLAYER_BOARD, playerName: 'Player 2', prizesPlaced: false },
  stadium: null,
  recentActionText: 'สร้างห้องกระดาน Playmat เรียบร้อย',
  playedItemAnnouncement: null,
});

let lastMonotonicTimestamp = 0;
function nextMonotonicTimestamp(): number {
  const now = Date.now();
  lastMonotonicTimestamp = Math.max(now, lastMonotonicTimestamp + 1);
  return lastMonotonicTimestamp;
}

// Pure state reducer for applying actions (works locally & in tests)
export function applyPlaymatAction(
  state: PlaymatRoomState,
  payload: PlaymatActionPayload
): PlaymatRoomState {
  if (payload.action === 'UNDO') {
    if (state.history && state.history.length > 0) {
      const historyCopy = [...state.history];
      const lastEntry = historyCopy.pop()!;

      // Handle new PlaymatHistoryEntry format
      if ('prevRoleState' in lastEntry || 'payload' in lastEntry) {
        const entry = lastEntry as PlaymatHistoryEntry;
        const restored: PlaymatRoomState = {
          ...state,
          history: historyCopy,
          updatedAt: nextMonotonicTimestamp(),
          recentActionText: '↩️ เลิกทำ (Undo) ย้อนกลับ 1 ขั้นตอน',
        };
        if (entry.prevRoleState && entry.role) {
          restored[entry.role] = JSON.parse(JSON.stringify(entry.prevRoleState));
        }
        if (entry.prevOpponentState) {
          const opponentRole = entry.role === 'p1' ? 'p2' : 'p1';
          restored[opponentRole] = JSON.parse(JSON.stringify(entry.prevOpponentState));
        }
        if (entry.prevGlobalState) {
          if (entry.prevGlobalState.currentTurn !== undefined) restored.currentTurn = entry.prevGlobalState.currentTurn;
          if (entry.prevGlobalState.turnNumber !== undefined) restored.turnNumber = entry.prevGlobalState.turnNumber;
          if (entry.prevGlobalState.stadium !== undefined) restored.stadium = entry.prevGlobalState.stadium;
        }
        return restored;
      } else {
        // Fallback for legacy snapshots
        const previous = lastEntry as unknown as Omit<PlaymatRoomState, 'history'>;
        const restored: PlaymatRoomState = {
          ...previous,
          history: historyCopy,
          updatedAt: nextMonotonicTimestamp(),
          recentActionText: '↩️ เลิกทำ (Undo) ย้อนกลับ 1 ขั้นตอน',
        };
        return restored;
      }
    }
    return state;
  }

  const next: PlaymatRoomState = JSON.parse(JSON.stringify(state));
  next.updatedAt = nextMonotonicTimestamp();

  // Record action log entry with compact prevRoleState (A2-b: capped at 5 steps, payload ~63 KB)
  const historyStack: PlaymatHistoryEntry[] = Array.isArray(state.history) ? [...state.history] : [];
  if (historyStack.length >= 5) {
    historyStack.shift();
  }
  const affectedRole = payload.role;
  const affectsOpponent = payload.action === 'PASS_TURN' || payload.action === 'RESTART_ROOM';
  const historyEntry: PlaymatHistoryEntry = {
    action: payload.action,
    role: affectedRole,
    payload: JSON.parse(JSON.stringify(payload)),
    timestamp: nextMonotonicTimestamp(),
    prevRoleState: JSON.parse(JSON.stringify(state[affectedRole])),
    ...(affectsOpponent ? { prevOpponentState: JSON.parse(JSON.stringify(state[affectedRole === 'p1' ? 'p2' : 'p1'])) } : {}),
    prevGlobalState: {
      currentTurn: state.currentTurn,
      turnNumber: state.turnNumber,
      stadium: state.stadium,
      recentActionText: state.recentActionText,
    },
  };
  historyStack.push(historyEntry);
  next.history = historyStack;

  const targetRole = payload.role;
  const pState = targetRole === 'p1' ? next.p1 : next.p2;

  switch (payload.action) {
    case 'PASS_TURN': {
      const nextTurn = next.currentTurn === 'p1' ? 'p2' : 'p1';
      next.currentTurn = nextTurn;
      next.turnNumber = (next.turnNumber || 1) + 1;
      next.p1.energyAttachedThisTurn = false;
      next.p1.supporterPlayedThisTurn = false;
      next.p2.energyAttachedThisTurn = false;
      next.p2.supporterPlayedThisTurn = false;
      const targetName = nextTurn === 'p1' ? (next.p1.playerName || 'Player 1') : (next.p2.playerName || 'Player 2');
      next.recentActionText = `⏭️ ${pState.playerName} จบเทิร์น -> ส่งต่อให้ ${targetName} (เทิร์นที่ ${next.turnNumber})`;
      break;
    }

    case 'RESTART_ROOM': {
      const p1Name = next.p1.playerName || 'Player 1';
      const p2Name = next.p2.playerName || 'Player 2';
      const p1Joined = next.p1.joined;
      const p2Joined = next.p2.joined;

      next.p1 = {
        ...INITIAL_PLAYER_BOARD,
        playerName: p1Name,
        joined: p1Joined,
        prizesPlaced: false,
      };
      next.p2 = {
        ...INITIAL_PLAYER_BOARD,
        playerName: p2Name,
        joined: p2Joined,
        prizesPlaced: false,
      };
      next.currentTurn = 'p1';
      next.turnNumber = 1;
      next.setupPhase = 'setup';
      next.firstPlayerChoice = null;
      next.stadium = null;
      next.playedItemAnnouncement = null;
      next.revealedCardAnnouncement = null;
      next.revealedHandAnnouncement = null;
      next.isTerminated = false;
      next.matchId = (next.matchId || 1) + 1;
      next.recentActionText = `🔄 ${pState.playerName} เริ่มเกมใหม่ (Restart Match)`;
      break;
    }

    case 'TERMINATE_ROOM': {
      next.isTerminated = true;
      next.recentActionText = `🔴 ${pState.playerName} ปิดการใช้งานห้อง (Terminated)`;
      break;
    }

    case 'CHOOSE_FIRST_PLAYER': {
      const chosenFirst = payload.firstPlayer || 'p1';
      next.currentTurn = chosenFirst;
      next.firstPlayerChoice = {
        chosenBy: targetRole,
        firstPlayer: chosenFirst,
      };
      const firstPlayerName =
        chosenFirst === 'p1'
          ? next.p1.playerName || 'Player 1'
          : next.p2.playerName || 'Player 2';
      next.recentActionText = `🎲 ${pState.playerName} เลือกให้ [${firstPlayerName}] เริ่มเล่นเป็นคนแรก!`;
      break;
    }

    case 'PLACE_PRIZES': {
      pState.prizeCount = 6;
      pState.prizesPlaced = true;
      pState.prizes = Array.from({ length: 6 }, (_, i) => ({
        instanceId: `prize_${targetRole}_${i + 1}`,
        id: `prize_${i + 1}`,
        name: 'Prize Card',
        isFaceDown: true,
      }));
      next.recentActionText = `🎁 ${pState.playerName} จัดวางการ์ดรางวัล 6 ใบเรียบร้อยแล้ว`;
      break;
    }

    case 'FLIP_CARDS_FACE_UP': {
      if (pState.active) pState.active.isFaceDown = false;
      pState.bench.forEach((c) => (c.isFaceDown = false));
      next.setupPhase = 'playing';
      next.recentActionText = `✨ ${pState.playerName} เปิดหน้าการ์ด Active & Bench พร้อมเริ่มเกม!`;
      break;
    }

    case 'SHUFFLE_DECK': {
      if (typeof payload.deckCount === 'number') {
        pState.deckCount = payload.deckCount;
      }
      next.recentActionText = `🔀 ${pState.playerName} กำลังสับสำรับการ์ด (Shuffle Deck)`;
      break;
    }

    case 'REVEAL_HAND': {
      if (payload.cards) {
        next.revealedHandAnnouncement = {
          playerName: pState.playerName,
          role: targetRole,
          cards: payload.cards,
          timestamp: Date.now(),
        };
        next.recentActionText = `👁️ ${pState.playerName} เปิดการ์ดบนมือให้คู่แข่งดู (${payload.cards.length} ใบ)`;
      }
      break;
    }

    case 'DISMISS_HAND_REVEAL': {
      next.revealedHandAnnouncement = null;
      break;
    }

    case 'REVEAL_CARD': {
      if (payload.card) {
        next.revealedCardAnnouncement = {
          playerName: pState.playerName,
          role: payload.role,
          card: payload.card,
          timestamp: Date.now(),
        };
        next.recentActionText = `👁️ ${pState.playerName} เปิดเผยการ์ด [${payload.card.name}] ให้คู่แข่งดู`;
      }
      break;
    }

    case 'DISMISS_REVEAL': {
      next.revealedCardAnnouncement = null;
      next.playedItemAnnouncement = null;
      break;
    }

    case 'JOIN_ROOM': {
      pState.joined = true;
      if (payload.playerName) pState.playerName = payload.playerName;
      if (payload.participantUid) {
        const list = Array.isArray(next.participants) ? [...next.participants] : [];
        if (!list.includes(payload.participantUid)) {
          list.push(payload.participantUid);
        }
        next.participants = list;
      }
      next.recentActionText = `${pState.playerName} (${targetRole.toUpperCase()}) เข้าร่วมห้องแล้ว`;
      break;
    }

    case 'SETUP_DECK': {
      pState.deckCount = payload.deckCount ?? 60;
      pState.handCount = payload.handCount ?? 7;
      pState.prizeCount = payload.prizeCount ?? 6;
      pState.active = null;
      pState.bench = [];
      pState.discard = [];
      pState.lostZone = [];
      pState.prizes = Array.from({ length: pState.prizeCount }, (_, i) => ({
        instanceId: `prize_${targetRole}_${i + 1}`,
        id: `prize_${i + 1}`,
        name: 'Prize Card',
        isFaceDown: true,
      }));
      next.recentActionText = `${pState.playerName} สับสำรับและตั้ง Prize ${pState.prizeCount} ใบ`;
      break;
    }

    case 'DRAW_CARD': {
      const count = payload.count ?? 1;
      pState.deckCount = Math.max(0, pState.deckCount - count);
      pState.handCount += count;
      next.recentActionText = `${pState.playerName} จั่วการ์ด ${count} ใบ (มือ: ${pState.handCount})`;
      break;
    }

    case 'MULLIGAN': {
      pState.mulliganCount = (pState.mulliganCount ?? 0) + 1;
      if (typeof payload.deckCount === 'number') {
        pState.deckCount = payload.deckCount;
      }
      pState.handCount = payload.handCount ?? 7;
      next.recentActionText = `🔄 ${pState.playerName} ทำการ Mulligan ครั้งที่ ${pState.mulliganCount} (ไม่มีโปเกมอนพื้นฐาน / สับการ์ดใหม่ 7 ใบ)`;
      break;
    }

    case 'PLAY_ITEM': {
      if (payload.card) {
        pState.handCount = Math.max(0, pState.handCount - 1);
        pState.discard.push(payload.card);
        next.playedItemAnnouncement = {
          playerName: pState.playerName,
          role: payload.role,
          card: payload.card,
          timestamp: Date.now(),
        };
        next.recentActionText = `🎒 ${pState.playerName} ใช้การ์ดไอเทม [${payload.card.name}]`;
      }
      break;
    }

    case 'SHUFFLE_HAND_AND_DRAW': {
      const drawCount = payload.count ?? 1;
      if (typeof payload.deckCount === 'number') {
        pState.deckCount = payload.deckCount;
      } else {
        pState.deckCount = Math.max(0, pState.deckCount + pState.handCount - drawCount);
      }
      pState.handCount = drawCount;
      next.recentActionText = `🔀 ${pState.playerName} สับการ์ดบนมือกลับเข้าสำรับ แล้วจั่วใหม่ ${drawCount} ใบ`;
      break;
    }

    case 'DISCARD_FROM_HAND': {
      if (payload.card) {
        pState.handCount = Math.max(0, pState.handCount - 1);
        pState.discard.push(payload.card);
        next.recentActionText = `${pState.playerName} ทิ้ง [${payload.card.name}] จากมือลง Discard Pile`;
      }
      break;
    }

    case 'DISCARD_MULTIPLE': {
      if (payload.cards && payload.cards.length > 0) {
        const count = payload.cards.length;
        pState.handCount = Math.max(0, pState.handCount - count);
        pState.discard.push(...payload.cards);
        const names = payload.cards.map((c) => c.name).join(', ');
        next.recentActionText = `🗑️ ${pState.playerName} ทิ้งการ์ด ${count} ใบ [${names}] ลง Discard`;
      }
      break;
    }

    case 'DISCARD_HAND': {
      if (payload.cards && payload.cards.length > 0) {
        pState.discard.push(...payload.cards);
      }
      const discardedCount = payload.count ?? pState.handCount;
      pState.handCount = 0;
      next.recentActionText = `🗑️ ${pState.playerName} ทิ้งการ์ดทั้งมือ (${discardedCount} ใบ) ลง Discard`;
      break;
    }

    case 'KNOCK_OUT_CARD': {
      if (payload.targetInstanceId) {
        if (pState.active?.instanceId === payload.targetInstanceId) {
          const knocked = pState.active;
          pState.active = null;
          pState.discard.push(knocked);
          if (knocked.attachedCards?.length) {
            pState.discard.push(...knocked.attachedCards);
          }
          next.recentActionText = `💀 [${knocked.name}] ของ ${pState.playerName} สลบ (Knock Out) ลง Discard!`;
        } else {
          const bIdx = pState.bench.findIndex(
            (c) => c.instanceId === payload.targetInstanceId
          );
          if (bIdx !== -1) {
            const knocked = pState.bench.splice(bIdx, 1)[0];
            pState.discard.push(knocked);
            if (knocked.attachedCards?.length) {
              pState.discard.push(...knocked.attachedCards);
            }
            next.recentActionText = `💀 [${knocked.name}] ของ ${pState.playerName} บน Bench สลบ (Knock Out) ลง Discard!`;
          }
        }
      }
      break;
    }

    case 'PLAY_TO_ACTIVE': {
      if (payload.card) {
        const isSetup = next.setupPhase !== 'playing';
        const isFaceDown =
          typeof payload.isFaceDown === 'boolean'
            ? payload.isFaceDown
            : isSetup
            ? true
            : !!payload.card.isFaceDown;
        pState.active = {
          ...payload.card,
          isFaceDown,
        };
        pState.handCount = Math.max(0, pState.handCount - 1);
        const nameText = isFaceDown ? 'การ์ดคว่ำหน้า' : `[${payload.card.name}]`;
        next.recentActionText = `${pState.playerName} ส่ง ${nameText} ลงตำแหน่ง Active`;
      }
      break;
    }

    case 'PLAY_TO_BENCH': {
      if (payload.card && pState.bench.length < 5) {
        const isSetup = next.setupPhase !== 'playing';
        const isFaceDown =
          typeof payload.isFaceDown === 'boolean'
            ? payload.isFaceDown
            : isSetup
            ? true
            : !!payload.card.isFaceDown;
        const benchCard = {
          ...payload.card,
          isFaceDown,
        };
        const slot = payload.slot ?? pState.bench.length;
        if (slot >= pState.bench.length) {
          pState.bench.push(benchCard);
        } else {
          pState.bench[slot] = benchCard;
        }
        pState.handCount = Math.max(0, pState.handCount - 1);
        const nameText = isFaceDown ? 'การ์ดคว่ำหน้า' : `[${payload.card.name}]`;
        next.recentActionText = `${pState.playerName} วาง ${nameText} ลง Bench`;
      }
      break;
    }

    case 'EVOLVE_CARD': {
      if (payload.card && payload.targetInstanceId) {
        const evoCard = payload.card;
        if (pState.active?.instanceId === payload.targetInstanceId) {
          const old = pState.active;
          const under = old.underlyingCards || [];
          pState.active = {
            ...evoCard,
            instanceId: old.instanceId,
            damageCounters: old.damageCounters || 0,
            attachedCards: old.attachedCards || [],
            underlyingCards: [...under, { ...old, underlyingCards: undefined }],
            isFaceDown: false,
          };
          pState.handCount = Math.max(0, pState.handCount - 1);
          next.recentActionText = `⚡ ${pState.playerName} พัฒนาร่าง Active เป็น [${evoCard.name}]!`;
        } else {
          const bIdx = pState.bench.findIndex((c) => c.instanceId === payload.targetInstanceId);
          if (bIdx !== -1) {
            const old = pState.bench[bIdx];
            const under = old.underlyingCards || [];
            pState.bench[bIdx] = {
              ...evoCard,
              instanceId: old.instanceId,
              damageCounters: old.damageCounters || 0,
              attachedCards: old.attachedCards || [],
              underlyingCards: [...under, { ...old, underlyingCards: undefined }],
              isFaceDown: false,
            };
            pState.handCount = Math.max(0, pState.handCount - 1);
            next.recentActionText = `⚡ ${pState.playerName} พัฒนาร่างใน Bench เป็น [${evoCard.name}]!`;
          }
        }
      }
      break;
    }

    case 'ATTACH_TO_CARD': {
      if (payload.card && payload.targetInstanceId) {
        const attachTarget = findCardInBoard(pState, payload.targetInstanceId);
        if (attachTarget) {
          if (!attachTarget.attachedCards) attachTarget.attachedCards = [];
          attachTarget.attachedCards.push(payload.card);
          pState.handCount = Math.max(0, pState.handCount - 1);
          pState.energyAttachedThisTurn = true;
          next.recentActionText = `${pState.playerName} แปะ [${payload.card.name}] ให้กับ [${attachTarget.name}]`;
        }
      }
      break;
    }

    case 'UPDATE_DAMAGE': {
      if (payload.targetInstanceId && typeof payload.damage === 'number') {
        const target = findCardInBoard(pState, payload.targetInstanceId);
        if (target) {
          target.damageCounters = Math.max(0, payload.damage);
          next.recentActionText = `${pState.playerName} ปรับแดเมจ [${target.name}] เป็น ${target.damageCounters}`;
        }
      }
      break;
    }

    case 'SWITCH_ACTIVE': {
      if (payload.targetInstanceId) {
        const benchIndex = pState.bench.findIndex(
          (c) => c.instanceId === payload.targetInstanceId
        );
        if (benchIndex !== -1) {
          const oldActive = pState.active;
          pState.active = pState.bench[benchIndex];
          if (oldActive) {
            pState.bench[benchIndex] = oldActive;
          } else {
            pState.bench.splice(benchIndex, 1);
          }
          next.recentActionText = `${pState.playerName} สลับ [${pState.active.name}] ขึ้นเป็น Active`;
        }
      }
      break;
    }

    case 'TAKE_PRIZE': {
      if (pState.prizeCount > 0) {
        pState.prizeCount = Math.max(0, pState.prizeCount - 1);
        pState.handCount += 1;
        if (pState.prizes && pState.prizes.length > 0) {
          pState.prizes.pop();
        }
        next.recentActionText = `${pState.playerName} หยิบ Prize 1 ใบ! (เหลือ ${pState.prizeCount} ใบ)`;
      }
      break;
    }


    case 'DISCARD_FROM_BOARD': {
      if (payload.targetInstanceId) {
        if (pState.active?.instanceId === payload.targetInstanceId) {
          const discarded = pState.active;
          pState.active = null;
          pState.discard.push(discarded);
          if (discarded.attachedCards?.length) {
            pState.discard.push(...discarded.attachedCards);
          }
          next.recentActionText = `${pState.playerName} ทิ้ง [${discarded.name}] จากตำแหน่ง Active ลง Discard`;
        } else {
          const bIdx = pState.bench.findIndex(
            (c) => c.instanceId === payload.targetInstanceId
          );
          if (bIdx !== -1) {
            const discarded = pState.bench.splice(bIdx, 1)[0];
            pState.discard.push(discarded);
            if (discarded.attachedCards?.length) {
              pState.discard.push(...discarded.attachedCards);
            }
            next.recentActionText = `${pState.playerName} ทิ้ง [${discarded.name}] จาก Bench ลง Discard`;
          }
        }
      }
      break;
    }

    case 'PLAY_STADIUM': {
      if (payload.card) {
        next.stadium = payload.card;
        pState.handCount = Math.max(0, pState.handCount - 1);
        next.recentActionText = `${pState.playerName} เล่นการ์ดสเตเดียม [${payload.card.name}]`;
      }
      break;
    }

    case 'DISCARD_STADIUM': {
      if (next.stadium) {
        const st = next.stadium;
        next.stadium = null;
        pState.discard.push(st);
        next.recentActionText = `${pState.playerName} ทิ้งสเตเดียม [${st.name}]`;
      }
      break;
    }

    case 'PLAY_SUPPORTER': {
      if (payload.card) {
        pState.supporter = payload.card;
        pState.handCount = Math.max(0, pState.handCount - 1);
        pState.supporterPlayedThisTurn = true;
        next.recentActionText = `${pState.playerName} เล่น Support [${payload.card.name}]`;
      }
      break;
    }

    case 'DISCARD_SUPPORTER': {
      if (pState.supporter) {
        const sup = pState.supporter;
        pState.supporter = null;
        pState.discard.push(sup);
        next.recentActionText = `${pState.playerName} ทิ้งการ์ด Support [${sup.name}]`;
      }
      break;
    }

    case 'SEARCH_DECK': {
      if (payload.deckCount !== undefined) {
        pState.deckCount = payload.deckCount;
      }
      if (payload.handCount !== undefined) {
        pState.handCount = payload.handCount;
      }
      next.recentActionText = `${pState.playerName} ค้นหาการ์ดในสำรับ (เหลือ ${pState.deckCount} ใบ)`;
      break;
    }

    case 'RESET_BOARD': {
      pState.active = null;
      pState.bench = [];
      pState.supporter = null;
      pState.discard = [];
      pState.lostZone = [];
      pState.prizes = [];
      pState.handCount = 0;
      pState.deckCount = 60;
      pState.prizeCount = 6;
      next.recentActionText = `${pState.playerName} รีเซ็ตกระดานใหม่`;
      break;
    }

    default:
      break;
  }

  return next;
}

function findCardInBoard(
  pState: PlaymatPlayerBoardState,
  instanceId: string
): PlaymatCard | undefined {
  if (pState.active?.instanceId === instanceId) return pState.active;
  return pState.bench.find((c) => c.instanceId === instanceId);
}

// In-memory cache & BroadcastChannel registry
const broadcastChannels = new Map<string, BroadcastChannel>();
const memoryRooms = new Map<string, PlaymatRoomState>();
const localListeners = new Map<string, Set<(state: PlaymatRoomState) => void>>();

function getBroadcastChannel(roomCode: string): BroadcastChannel | null {
  if (typeof window === 'undefined' || !window.BroadcastChannel) return null;
  let ch = broadcastChannels.get(roomCode);
  if (!ch) {
    ch = new BroadcastChannel(`pokecount_playmat_${roomCode}`);
    broadcastChannels.set(roomCode, ch);
  }
  return ch;
}

/**
 * Generate a clean 6-digit/char room code e.g. "PK-8291"
 */
export function generatePlaymatRoomCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `PK-${digits}`;
}

/**
 * Recursively remove undefined values for Firestore serialization safety
 */
export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result;
}

/**
 * Get an existing room or initialize a new room on Firestore & local memory
 */
export async function getOrCreatePlaymatRoom(
  customCode?: string,
  pin?: string | null
): Promise<PlaymatRoomState> {
  const roomCode = (customCode || generatePlaymatRoomCode()).toUpperCase();

  // 1. Check local cache first
  const cached = memoryRooms.get(roomCode);
  if (cached) return cached;

  // 2. Check Firestore
  try {
    const roomRef = doc(db, 'playmat_rooms', roomCode);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const data = snap.data() as PlaymatRoomState;
      memoryRooms.set(roomCode, data);
      return data;
    }
  } catch (err) {
    console.warn('[PlaymatSync] Firestore getDoc failed, creating fallback:', err);
  }

  // 3. Not found, create initial
  return createPlaymatRoom(roomCode, pin);
}

/**
 * Initialize a new room on Firestore & local memory
 */
export async function createPlaymatRoom(
  customCode?: string,
  pin?: string | null
): Promise<PlaymatRoomState> {
  const roomCode = (customCode || generatePlaymatRoomCode()).toUpperCase();
  const hostUid = await ensurePlaymatAuth();
  const initial = createInitialRoomState(roomCode, pin, hostUid);

  memoryRooms.set(roomCode, initial);

  const ch = getBroadcastChannel(roomCode);
  ch?.postMessage({ type: 'STATE_UPDATE', state: initial });
  localListeners.get(roomCode)?.forEach((cb) => cb(initial));

  if (enableCloudFirestorePlaymat) {
    try {
      const roomRef = doc(db, 'playmat_rooms', roomCode);
      const syncPromise = setDoc(roomRef, sanitizeForFirestore({
        ...initial,
        serverUpdatedAt: serverTimestamp(),
      }), { merge: true });

      await Promise.race([
        syncPromise,
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch (err) {
      console.warn('[PlaymatSync] Firestore setDoc fallback to local BroadcastChannel:', err);
    }
  }

  return initial;
}

/**
 * Terminate a room: notifies connected clients, deletes from Firestore, and clears memory
 */
export async function terminatePlaymatRoom(roomCode: string): Promise<void> {
  const upperCode = roomCode.toUpperCase();
  // 1. Broadcast termination state
  await dispatchPlaymatAction(upperCode, {
    action: 'TERMINATE_ROOM',
    role: 'p1',
  });

  // 2. Delete from Firestore to prevent ghost/stale rooms
  if (enableCloudFirestorePlaymat) {
    try {
      const roomRef = doc(db, 'playmat_rooms', upperCode);
      await deleteDoc(roomRef);
    } catch (err) {
      console.warn('[PlaymatSync] Firestore deleteDoc failed:', err);
    }
  }

  // 3. Clear memory
  memoryRooms.delete(upperCode);
}

/**
 * Check if a room is stale (terminated or inactive for > 24 hours)
 */
export function isPlaymatRoomStale(state: PlaymatRoomState): boolean {
  if (state.isTerminated) return true;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const lastTime = state.updatedAt || state.createdAt || 0;
  return Date.now() - lastTime > ONE_DAY_MS;
}

/**
 * Subscribe to real-time room updates via both BroadcastChannel and Firestore
 */
export function subscribePlaymatRoom(
  roomCode: string,
  onUpdate: (state: PlaymatRoomState) => void
): () => void {
  const upperCode = roomCode.toUpperCase();

  // Register in local listeners
  if (!localListeners.has(upperCode)) {
    localListeners.set(upperCode, new Set());
  }
  localListeners.get(upperCode)!.add(onUpdate);

  // 1. Emit current local memory if available
  const cached = memoryRooms.get(upperCode);
  if (cached) {
    onUpdate(cached);
  }

  // 2. BroadcastChannel subscription (instant 0ms local sync for E2E / multi-tab)
  const ch = getBroadcastChannel(upperCode);
  const handleBroadcastMessage = (event: MessageEvent) => {
    if (event.data?.type === 'STATE_UPDATE' && event.data.state) {
      const currentLocal = memoryRooms.get(upperCode);
      const incoming = event.data.state as PlaymatRoomState;
      const sourceRole = event.data.sourceRole as 'p1' | 'p2' | undefined;
      const action = event.data.action as string | undefined;

      if (!currentLocal) {
        memoryRooms.set(upperCode, incoming);
        onUpdate(incoming);
        return;
      }

      const isCompleteReset =
        action === 'RESTART_ROOM' ||
        action === 'RESET_BOARD' ||
        action === 'TERMINATE_ROOM' ||
        Boolean(incoming.matchId && currentLocal.matchId && incoming.matchId > currentLocal.matchId);

      if (isCompleteReset || !sourceRole) {
        memoryRooms.set(upperCode, incoming);
        onUpdate(incoming);
      } else if (sourceRole === 'p1') {
        // P1 took an action: update all incoming global & p1 state, but preserve local P2 board
        const merged: PlaymatRoomState = {
          ...incoming,
          p2: currentLocal.p2,
        };
        memoryRooms.set(upperCode, merged);
        onUpdate(merged);
      } else if (sourceRole === 'p2') {
        // P2 took an action: update all incoming global & p2 state, but preserve local P1 board
        const merged: PlaymatRoomState = {
          ...incoming,
          p1: currentLocal.p1,
        };
        memoryRooms.set(upperCode, merged);
        onUpdate(merged);
      }
    }
  };
  ch?.addEventListener('message', handleBroadcastMessage);

  // 3. Firestore onSnapshot subscription (cross-device sync - disabled when enableCloudFirestorePlaymat is false)
  let unsubscribeFirestore = () => {};
  if (enableCloudFirestorePlaymat) {
    try {
      const roomRef = doc(db, 'playmat_rooms', upperCode);
      unsubscribeFirestore = onSnapshot(
        roomRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const remoteState = snapshot.data() as PlaymatRoomState;
            const currentLocal = memoryRooms.get(upperCode);
            if (!currentLocal) {
              memoryRooms.set(upperCode, remoteState);
              onUpdate(remoteState);
              return;
            }

            // If match was restarted, accept full remote state
            if (remoteState.matchId && currentLocal.matchId && remoteState.matchId > currentLocal.matchId) {
              memoryRooms.set(upperCode, remoteState);
              onUpdate(remoteState);
              return;
            }

            // Merge: protect locally active boards from being overwritten by stale/empty remote copies
            const p1HasLocalCards = Boolean(currentLocal.p1?.active || (currentLocal.p1?.bench?.length ?? 0) > 0);
            const p1HasRemoteCards = Boolean(remoteState.p1?.active || (remoteState.p1?.bench?.length ?? 0) > 0);
            const p1ToUse = p1HasLocalCards && !p1HasRemoteCards ? currentLocal.p1 : (remoteState.p1 || currentLocal.p1);

            const p2HasLocalCards = Boolean(currentLocal.p2?.active || (currentLocal.p2?.bench?.length ?? 0) > 0);
            const p2HasRemoteCards = Boolean(remoteState.p2?.active || (remoteState.p2?.bench?.length ?? 0) > 0);
            const p2ToUse = p2HasLocalCards && !p2HasRemoteCards ? currentLocal.p2 : (remoteState.p2 || currentLocal.p2);

            const merged: PlaymatRoomState = {
              ...remoteState,
              p1: p1ToUse,
              p2: p2ToUse,
            };
            memoryRooms.set(upperCode, merged);
            onUpdate(merged);
          } else {
            // Document does not exist in Firestore yet: initialize it so listeners don't stall
            const initial = memoryRooms.get(upperCode) || createInitialRoomState(upperCode);
            memoryRooms.set(upperCode, initial);
            onUpdate(initial);
            setDoc(roomRef, sanitizeForFirestore({
              ...initial,
              serverUpdatedAt: serverTimestamp(),
            }), { merge: true }).catch((e) => {
              console.warn('[PlaymatSync] Auto-init setDoc failed:', e);
            });
          }
        },
        (err) => {
          console.warn('[PlaymatSync] Firestore listener warning:', err);
        }
      );
    } catch (err) {
      console.warn('[PlaymatSync] Error creating Firestore listener:', err);
    }
  }

  return () => {
    localListeners.get(upperCode)?.delete(onUpdate);
    ch?.removeEventListener('message', handleBroadcastMessage);
    unsubscribeFirestore();
  };
}

/**
 * Dispatch an action to the room: updates memory, broadcasts to local tabs, and updates Firestore
 */
export async function dispatchPlaymatAction(
  roomCode: string,
  payload: PlaymatActionPayload
): Promise<PlaymatRoomState> {
  const upperCode = roomCode.toUpperCase();
  let current = memoryRooms.get(upperCode);

  if (!current && enableCloudFirestorePlaymat) {
    try {
      const snap = await getDoc(doc(db, 'playmat_rooms', upperCode));
      if (snap.exists()) {
        current = snap.data() as PlaymatRoomState;
      }
    } catch {
      // fallback
    }
  }

  if (!current) {
    current = createInitialRoomState(upperCode);
  }

  // Ensure deterministic action: generate random values before reducer
  if (payload.action === 'CHOOSE_FIRST_PLAYER' && !payload.firstPlayer) {
    payload.firstPlayer = Math.random() < 0.5 ? 'p1' : 'p2';
  }

  const nextState = applyPlaymatAction(current, payload);
  memoryRooms.set(upperCode, nextState);

  // Notify local in-process listeners immediately
  localListeners.get(upperCode)?.forEach((cb) => cb(nextState));

  // Sync to Firestore using partitioned update (A3: Halves network payload size by only updating affected role)
  const affectsBoth = [
    'PASS_TURN',
    'RESTART_ROOM',
    'RESET_BOARD',
    'TERMINATE_ROOM',
    'UNDO',
    'JOIN_ROOM',
    'DISMISS_REVEAL',
    'DISMISS_HAND_REVEAL',
    'REVEAL_CARD',
    'REVEAL_HAND',
    'PLAY_ITEM',
    'FLIP_CARDS_FACE_UP',
    'CHOOSE_FIRST_PLAYER',
    'PLAY_STADIUM',
    'DISCARD_STADIUM',
  ].includes(payload.action);

  const globalChanged =
    nextState.setupPhase !== current.setupPhase ||
    nextState.currentTurn !== current.currentTurn ||
    nextState.turnNumber !== current.turnNumber ||
    nextState.isTerminated !== current.isTerminated ||
    (nextState.participants?.length ?? 0) !== (current.participants?.length ?? 0) ||
    (nextState.stadium?.instanceId ?? null) !== (current.stadium?.instanceId ?? null) ||
    (nextState.playedItemAnnouncement?.timestamp ?? 0) !== (current.playedItemAnnouncement?.timestamp ?? 0) ||
    (nextState.revealedCardAnnouncement?.timestamp ?? 0) !== (current.revealedCardAnnouncement?.timestamp ?? 0) ||
    (nextState.revealedHandAnnouncement?.timestamp ?? 0) !== (current.revealedHandAnnouncement?.timestamp ?? 0) ||
    (nextState.firstPlayerChoice?.firstPlayer ?? null) !== (current.firstPlayerChoice?.firstPlayer ?? null);

  const shouldSendFull = affectsBoth || globalChanged;

  // Broadcast locally to other tabs with role partition metadata
  const ch = getBroadcastChannel(upperCode);
  ch?.postMessage({
    type: 'STATE_UPDATE',
    state: nextState,
    sourceRole: payload.role,
    action: payload.action,
    isFull: shouldSendFull,
  });

  if (enableCloudFirestorePlaymat) {
    try {
      const roomRef = doc(db, 'playmat_rooms', upperCode);
      const firestoreUpdatePayload: Record<string, any> = shouldSendFull
        ? {
            ...nextState,
            serverUpdatedAt: serverTimestamp(),
          }
        : {
            [payload.role]: nextState[payload.role],
            updatedAt: nextState.updatedAt,
            serverUpdatedAt: serverTimestamp(),
            recentActionText: nextState.recentActionText,
            history: nextState.history,
          };

      await setDoc(
        roomRef,
        sanitizeForFirestore(firestoreUpdatePayload),
        { merge: true }
      );
    } catch (err) {
      console.warn('[PlaymatSync] Firestore setDoc failed, running in local-only mode:', err);
    }
  }

  return nextState;
}

export interface PlaymatRoomSummary {
  roomCode: string;
  mode?: 'duel' | 'host';
  createdAt: number;
  updatedAt?: number;
  isTerminated: boolean;
  p1Name?: string;
  p2Name?: string;
  p1Ready?: boolean;
  p2Ready?: boolean;
  turnNumber?: number;
  hostUid?: string;
  version?: 'v3' | 'v2';
  p1Email?: string;
  p2Email?: string;
  p1Uid?: string;
  p2Uid?: string;
  spectatorsCount?: number;
  spectators?: Array<{ name: string; email?: string; joinedAt?: number }>;
}

/**
 * Fetch all playmat rooms from Firestore for Admin management (both V3 Tabletop & V2 Playmat)
 */
export async function fetchAllPlaymatRooms(): Promise<PlaymatRoomSummary[]> {
  if (!enableCloudFirestorePlaymat) {
    return [];
  }
  try {
    const rooms: PlaymatRoomSummary[] = [];
    const now = Date.now();
    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity cutoff

    const [v3Snap, v2Snap] = await Promise.all([
      getDocs(collection(db, 'v3_tabletop_rooms')).catch((e) => {
        console.warn('[PlaymatSync] fetch v3_tabletop_rooms failed:', e);
        return null;
      }),
      getDocs(collection(db, 'playmat_rooms')).catch((e) => {
        console.warn('[PlaymatSync] fetch playmat_rooms failed:', e);
        return null;
      }),
    ]);

    // 1. Process V3 Tabletop Rooms
    if (v3Snap) {
      v3Snap.forEach((docSnap) => {
        const d = docSnap.data();
        const code = docSnap.id || d.roomCode;
        const createdAt = Number(d.createdAt) || 0;
        const updatedAt = Number(d.updatedAt) || createdAt || 0;
        const isInactive = updatedAt > 0 && now - updatedAt > TIMEOUT_MS;
        const isTerminated = Boolean(d.isTerminated) || Boolean(d.isClosed) || isInactive;
        const p1 = d.player1 || d.tabletopV3?.player1;
        const p2 = d.player2 || d.tabletopV3?.player2;
        const p1Ready = Boolean(p1 && p1.deck && p1.deck.length > 0);
        const p2Ready = Boolean(p2 && p2.deck && p2.deck.length > 0);
        const spectatorsList: Array<{ name: string; email?: string; joinedAt?: number }> =
          d.spectators || d.tabletopV3?.spectators || [];
        const p1Email = d.p1Email || d.tabletopV3?.p1Email || undefined;
        const p2Email = d.p2Email || d.tabletopV3?.p2Email || undefined;
        const p1Uid = d.p1Uid || d.tabletopV3?.p1Uid || undefined;
        const p2Uid = d.p2Uid || d.tabletopV3?.p2Uid || undefined;

        rooms.push({
          roomCode: code,
          mode: 'duel',
          version: 'v3',
          createdAt,
          updatedAt,
          isTerminated,
          p1Name: p1?.name || 'Player 1',
          p2Name: p2?.name || (p2Ready ? 'Player 2' : undefined),
          p1Ready,
          p2Ready,
          turnNumber: d.turnCount || d.turnNumber || 1,
          hostUid: d.hostUid || d.lastSenderRole,
          p1Email,
          p2Email,
          p1Uid,
          p2Uid,
          spectatorsCount: spectatorsList.length,
          spectators: spectatorsList,
        });
      });
    }

    // 2. Process legacy V2 Playmat Rooms
    if (v2Snap) {
      v2Snap.forEach((docSnap) => {
        const d = docSnap.data();
        const code = docSnap.id;
        if (rooms.some((r) => r.roomCode === code)) return;

        const createdAt = Number(d.createdAt) || 0;
        const updatedAt = Number(d.updatedAt) || createdAt || 0;
        const isInactive = updatedAt > 0 && now - updatedAt > TIMEOUT_MS;

        rooms.push({
          roomCode: code,
          mode: d.mode,
          version: 'v2',
          createdAt,
          updatedAt,
          isTerminated: Boolean(d.isTerminated) || isInactive,
          p1Name: d.p1?.playerName || d.p1?.name,
          p2Name: d.p2?.playerName || d.p2?.name,
          p1Ready: Boolean(d.p1?.isReady),
          p2Ready: Boolean(d.p2?.isReady),
          turnNumber: d.turnNumber,
          hostUid: d.hostUid,
        });
      });
    }

    // Sort descending (newest activity first)
    rooms.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    return rooms;
  } catch (err) {
    console.warn('[PlaymatSync] fetchAllPlaymatRooms failed:', err);
    throw err;
  }
}

/**
 * Delete a single playmat room from Firestore across both V3 and V2 collections
 */
export async function deletePlaymatRoom(roomCode: string): Promise<void> {
  const upperCode = roomCode.toUpperCase().trim();
  if (enableCloudFirestorePlaymat) {
    await Promise.allSettled([
      deleteDoc(doc(db, 'v3_tabletop_rooms', upperCode)),
      deleteDoc(doc(db, 'playmat_rooms', upperCode)),
      deleteDoc(doc(db, 'playmat_signals', upperCode)),
    ]);
  }
  memoryRooms.delete(upperCode);
}

/**
 * Bulk delete playmat rooms from Firestore
 */
export async function deletePlaymatRooms(
  roomCodes: string[]
): Promise<{ deleted: string[]; errors: string[] }> {
  const deleted: string[] = [];
  const errors: string[] = [];

  await Promise.all(
    roomCodes.map(async (code) => {
      try {
        await deletePlaymatRoom(code);
        deleted.push(code);
      } catch (err: any) {
        errors.push(`${code}: ${err?.message || 'Delete failed'}`);
      }
    })
  );

  return { deleted, errors };
}

