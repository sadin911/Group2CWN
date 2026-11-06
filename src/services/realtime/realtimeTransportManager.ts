import type { PlaymatActionPayload, PlaymatRoomState } from '../../types/playmat';
import {
  createActionEvent,
  ActionSequenceTracker,
  type RealtimeActionEvent,
  type RealtimeWireMessage,
} from './tabletopActionEvents';
import {
  WebRtcDataChannelService,
  type WebRtcConnectionState,
} from './webRtcDataChannelService';
import {
  dispatchPlaymatAction,
  subscribePlaymatRoom,
} from '../playmatSyncService';

export type TransportMode = 'p2p' | 'broadcast' | 'cloud' | 'connecting';

export interface RealtimeConnectionInfo {
  mode: TransportMode;
  latencyMs: number;
  peerRole: 'p1' | 'p2';
  roomCode: string;
  isP2pAvailable: boolean;
}

export type ActionHandler = (action: PlaymatActionPayload, event: RealtimeActionEvent) => void;
export type StateUpdateHandler = (state: PlaymatRoomState) => void;
export type StatusChangeHandler = (status: RealtimeConnectionInfo) => void;

export class RealtimeTransportManager {
  private roomCode: string;
  private myRole: 'p1' | 'p2';
  private sequenceTracker = new ActionSequenceTracker();
  private rtcService: WebRtcDataChannelService | null = null;
  private actionHandlers = new Set<ActionHandler>();
  private statusHandlers = new Set<StatusChangeHandler>();
  private unsubscribeFirestore: (() => void) | null = null;
  private currentMode: TransportMode = 'cloud';
  private currentLatencyMs = 0;
  private broadcastChannel: BroadcastChannel | null = null;
  private isDestroyed = false;

  constructor(roomCode: string, myRole: 'p1' | 'p2') {
    this.roomCode = roomCode.toUpperCase();
    this.myRole = myRole;

    this.initBroadcastChannel();
    this.initWebRtc();
    this.initFirestoreFallback();
  }

  private initBroadcastChannel(): void {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      this.broadcastChannel = new BroadcastChannel(`pokecount_action_bus_${this.roomCode}`);
      this.broadcastChannel.onmessage = (ev) => {
        if (ev.data?.type === 'ACTION' && ev.data.event) {
          this.handleIncomingEvent(ev.data.event, 'broadcast', 0);
        }
      };
    }
  }

  private initWebRtc(): void {
    this.currentMode = 'connecting';
    this.rtcService = new WebRtcDataChannelService({
      roomCode: this.roomCode,
      myRole: this.myRole,
      onMessage: (wireMsg: RealtimeWireMessage) => {
        if (wireMsg.type === 'ACTION' && wireMsg.event) {
          this.handleIncomingEvent(wireMsg.event, 'p2p', this.rtcService?.getLatency() ?? 20);
        }
      },
      onStateChange: (state: WebRtcConnectionState, latencyMs?: number) => {
        if (state === 'connected') {
          this.currentMode = 'p2p';
          this.currentLatencyMs = latencyMs ?? 20;
        } else if (state === 'failed' || state === 'disconnected') {
          this.currentMode = 'cloud';
          this.currentLatencyMs = 180;
        } else if (state === 'signaling' || state === 'connecting') {
          this.currentMode = 'connecting';
        }
        this.notifyStatusChange();
      },
    });

    // Start WebRTC connection negotiation in background
    this.rtcService.connect().catch((err) => {
      console.warn('[RealtimeTransport] WebRTC connection error, falling back to cloud:', err);
      this.currentMode = 'cloud';
      this.notifyStatusChange();
    });
  }

  private initFirestoreFallback(): void {
    // Keep baseline room subscription for full state reconcile
    this.unsubscribeFirestore = subscribePlaymatRoom(this.roomCode, () => {
      if (this.currentMode === 'cloud') {
        this.currentLatencyMs = 180;
        this.notifyStatusChange();
      }
    });
  }

  private handleIncomingEvent(
    event: RealtimeActionEvent,
    source: TransportMode,
    latencyMs: number
  ): void {
    if (event.sourceRole === this.myRole) {
      // Ignore own echoed action
      return;
    }

    if (!this.sequenceTracker.accept(event)) {
      // Duplicate or stale
      return;
    }

    if (source === 'p2p') {
      this.currentMode = 'p2p';
      this.currentLatencyMs = latencyMs;
      this.notifyStatusChange();
    }

    this.actionHandlers.forEach((handler) => handler(event.payload, event));
  }

  /**
   * Dispatch an action through the best available transport:
   * 1. BroadcastChannel (0ms local)
   * 2. WebRTC DataChannel (10-30ms P2P)
   * 3. Firestore (Cloud fallback)
   */
  public async sendAction(payload: PlaymatActionPayload): Promise<void> {
    const event = createActionEvent(this.roomCode, this.myRole, payload);

    // 1. Broadcast to other local tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'ACTION', event });
      } catch {}
    }

    // 2. Send via WebRTC DataChannel if connected
    if (this.rtcService && this.rtcService.getState() === 'connected') {
      this.rtcService.sendMessage({ type: 'ACTION', event });
    }

    // 3. Always back up to Firestore state reducer so spectators & room recovery work
    // (If p2p was used, dispatchPlaymatAction still ensures cloud state consistency asynchronously)
    try {
      await dispatchPlaymatAction(this.roomCode, payload);
    } catch (err) {
      console.warn('[RealtimeTransport] Cloud sync warning:', err);
    }
  }

  public onAction(handler: ActionHandler): () => void {
    this.actionHandlers.add(handler);
    return () => {
      this.actionHandlers.delete(handler);
    };
  }

  public onStatusChange(handler: StatusChangeHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.getStatus());
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  public getStatus(): RealtimeConnectionInfo {
    return {
      mode: this.currentMode,
      latencyMs: this.currentLatencyMs,
      peerRole: this.myRole === 'p1' ? 'p2' : 'p1',
      roomCode: this.roomCode,
      isP2pAvailable: this.rtcService?.getState() === 'connected',
    };
  }

  private notifyStatusChange(): void {
    if (this.isDestroyed) return;
    const status = this.getStatus();
    this.statusHandlers.forEach((handler) => handler(status));
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.actionHandlers.clear();
    this.statusHandlers.clear();

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.rtcService) {
      this.rtcService.disconnect();
      this.rtcService = null;
    }

    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }
  }
}
