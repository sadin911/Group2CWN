import type { PlaymatActionPayload } from '../../types/playmat';

export interface RealtimeActionEvent {
  id: string;
  roomCode: string;
  seq: number;
  timestamp: number;
  sourceRole: 'p1' | 'p2';
  payload: PlaymatActionPayload;
}

export interface RealtimePingMessage {
  type: 'PING';
  sendTime: number;
  seq: number;
}

export interface RealtimePongMessage {
  type: 'PONG';
  sendTime: number;
  receiveTime: number;
  seq: number;
}

export interface TabletopPartitionedStateMessage {
  type: 'PARTITIONED_STATE';
  senderRole: 'player1' | 'player2';
  sideState: any;
  opponentBoard?: any;
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
    turnDecision?: any;
    winner?: any;
    activeCoinFlip?: any;
    vfxEvent?: any;
    mulliganReveal?: any;
  };
  timestamp: number;
}

export interface RealtimeCursorMessage {
  type: 'CURSOR_MOVE';
  senderRole: 'player1' | 'player2';
  x: number;
  y: number;
  timestamp: number;
}

export type RealtimeWireMessage =
  | { type: 'ACTION'; event: RealtimeActionEvent }
  | { type: 'STATE'; state: any; senderRole: string; timestamp: number }
  | { type: 'REQUEST_FULL_STATE'; senderRole: string }
  | TabletopPartitionedStateMessage
  | RealtimePingMessage
  | RealtimePongMessage
  | RealtimeCursorMessage;

let localSeqCounter = 0;

/**
 * Generate a unique event id
 */
export function generateEventId(role: 'p1' | 'p2'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `evt_${role}_${Date.now()}_${rand}`;
}

/**
 * Wrap a PlaymatActionPayload into a lightweight RealtimeActionEvent
 */
export function createActionEvent(
  roomCode: string,
  sourceRole: 'p1' | 'p2',
  payload: PlaymatActionPayload
): RealtimeActionEvent {
  localSeqCounter += 1;
  return {
    id: generateEventId(sourceRole),
    roomCode: roomCode.toUpperCase(),
    seq: localSeqCounter,
    timestamp: Date.now(),
    sourceRole,
    payload,
  };
}

/**
 * Reset local sequence counter (e.g. on new room / restart)
 */
export function resetSequenceCounter(initial = 0): void {
  localSeqCounter = initial;
}

/**
 * Sequence and Deduplication Tracker
 * Ensures actions from a peer are processed in order and duplicate events are ignored
 */
export class ActionSequenceTracker {
  private highestSeenSeq = new Map<'p1' | 'p2', number>();
  private processedEventIds = new Set<string>();
  private maxRetainedIds = 500;

  /**
   * Check if the event should be processed.
   * Returns true if the event is new, false if duplicate or stale.
   */
  public accept(event: RealtimeActionEvent): boolean {
    if (this.processedEventIds.has(event.id)) {
      return false;
    }

    // Retain processed id
    this.processedEventIds.add(event.id);
    if (this.processedEventIds.size > this.maxRetainedIds) {
      // Evict oldest elements
      const toDelete = Array.from(this.processedEventIds).slice(0, 100);
      toDelete.forEach((id) => this.processedEventIds.delete(id));
    }

    const currentHighest = this.highestSeenSeq.get(event.sourceRole) ?? 0;
    if (event.seq > currentHighest) {
      this.highestSeenSeq.set(event.sourceRole, event.seq);
    }

    return true;
  }

  public reset(): void {
    this.highestSeenSeq.clear();
    this.processedEventIds.clear();
  }
}
