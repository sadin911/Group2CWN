import { db } from '../../utils/firebase';
import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import type { RealtimeWireMessage } from './tabletopActionEvents';
import { isPlaymatCloudSyncEnabled } from '../playmatSyncService';

export type WebRtcConnectionState =
  | 'idle'
  | 'signaling'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export interface WebRtcPeerConfig {
  roomCode: string;
  myRole: 'p1' | 'p2';
  onMessage: (message: RealtimeWireMessage) => void;
  onStateChange: (state: WebRtcConnectionState, latencyMs?: number) => void;
  iceServers?: RTCIceServer[];
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export class WebRtcDataChannelService {
  private config: WebRtcPeerConfig;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private unsubscribeSignaling: (() => void) | null = null;
  private connectionState: WebRtcConnectionState = 'idle';
  private pingIntervalTimer: any = null;
  private connectionTimeoutTimer: any = null;
  private currentLatencyMs = 0;
  private isDestroyed = false;

  constructor(config: WebRtcPeerConfig) {
    this.config = config;
  }

  public getState(): WebRtcConnectionState {
    return this.connectionState;
  }

  public isConnected(): boolean {
    return this.connectionState === 'connected' && this.dataChannel?.readyState === 'open';
  }

  public getLatency(): number {
    return this.currentLatencyMs;
  }

  /**
   * Start peer connection and signaling process
   */
  public async connect(): Promise<void> {
    if (typeof window === 'undefined' || !window.RTCPeerConnection) {
      this.updateState('failed');
      return;
    }

    this.isDestroyed = false;
    this.updateState('signaling');

    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
    }
    // 8-second fallback timeout for Brave Shields / corporate firewalls blocking WebRTC STUN
    this.connectionTimeoutTimer = setTimeout(() => {
      if (this.connectionState === 'signaling' || this.connectionState === 'connecting') {
        console.info('[WebRTC] Connection timed out after 8s (Brave Shields / Firewall restriction) - falling back to Cloud transport');
        this.updateState('failed');
      }
    }, 8000);

    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.config.iceServers || DEFAULT_ICE_SERVERS,
      });

      this.setupPeerConnectionEvents();

      if (this.config.myRole === 'p1') {
        // P1 acts as the Host/Offerer: creates data channel
        this.setupDataChannel(
          this.peerConnection.createDataChannel('pokecount_actions', {
            ordered: true,
          })
        );
        await this.startHostSignaling();
      } else {
        // P2 acts as Guest/Answerer: waits for data channel from host
        this.peerConnection.ondatachannel = (event) => {
          this.setupDataChannel(event.channel);
        };
        await this.startGuestSignaling();
      }
    } catch (err) {
      console.warn('[WebRTC] Connection initialization failed:', err);
      this.updateState('failed');
    }
  }

  private setupPeerConnectionEvents(): void {
    if (!this.peerConnection) return;

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        if (this.dataChannel?.readyState === 'open') {
          this.updateState('connected', this.currentLatencyMs);
        }
      } else if (state === 'disconnected') {
        this.updateState('disconnected');
      } else if (state === 'failed') {
        this.updateState('failed');
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state === 'connected') {
        if (this.dataChannel?.readyState === 'open') {
          this.updateState('connected', this.currentLatencyMs);
        }
      } else if (state === 'failed') {
        this.updateState('failed');
      }
    };
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;

    this.dataChannel.onopen = () => {
      if (this.connectionTimeoutTimer) {
        clearTimeout(this.connectionTimeoutTimer);
        this.connectionTimeoutTimer = null;
      }
      this.updateState('connected', this.currentLatencyMs);
      this.startPingHeartbeat();

      if (this.config.myRole !== 'p1') {
        // Guest requests latest full state from Host upon connecting/reconnecting
        this.sendMessage({ type: 'REQUEST_FULL_STATE', senderRole: 'player2' });
      }
    };

    this.dataChannel.onclose = () => {
      this.stopPingHeartbeat();
      if (!this.isDestroyed) {
        this.updateState('disconnected');
      }
    };

    this.dataChannel.onerror = (err) => {
      console.warn('[WebRTC] DataChannel error:', err);
      this.updateState('failed');
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const wireMsg = JSON.parse(event.data) as RealtimeWireMessage;
        if (wireMsg.type === 'PING') {
          // Respond immediately with PONG
          this.sendPong(wireMsg.sendTime, wireMsg.seq);
        } else if (wireMsg.type === 'PONG') {
          // Calculate round-trip latency
          const now = Date.now();
          const rtt = Math.max(1, now - wireMsg.sendTime);
          this.currentLatencyMs = Math.round(rtt / 2);
          this.config.onStateChange(this.connectionState, this.currentLatencyMs);
        } else {
          this.config.onMessage(wireMsg);
        }
      } catch (err) {
        console.warn('[WebRTC] Failed to parse message:', err);
      }
    };
  }

  private startPingHeartbeat(): void {
    this.stopPingHeartbeat();
    let pingSeq = 0;
    this.pingIntervalTimer = setInterval(() => {
      if (this.dataChannel?.readyState === 'open') {
        pingSeq += 1;
        const ping: RealtimeWireMessage = {
          type: 'PING',
          sendTime: Date.now(),
          seq: pingSeq,
        };
        this.sendMessage(ping);
      }
    }, 3000);
  }

  private stopPingHeartbeat(): void {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
  }

  private sendPong(sendTime: number, seq: number): void {
    const pong: RealtimeWireMessage = {
      type: 'PONG',
      sendTime,
      receiveTime: Date.now(),
      seq,
    };
    this.sendMessage(pong);
  }

  /**
   * Send wire message directly over P2P DataChannel
   */
  public sendMessage(msg: RealtimeWireMessage): boolean {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(msg));
        return true;
      } catch (err) {
        console.warn('[WebRTC] Send failed:', err);
        return false;
      }
    }
    return false;
  }

  // --- Host (P1) Signaling Flow ---
  private async startHostSignaling(): Promise<void> {
    if (!this.peerConnection || !isPlaymatCloudSyncEnabled()) return;

    const signalDocRef = doc(db, 'playmat_signals', this.config.roomCode.toUpperCase());

    const pendingCandidates: any[] = [];
    let flushTimer: any = null;

    const flushCandidates = async () => {
      if (pendingCandidates.length === 0 || this.isDestroyed) return;
      const batch = pendingCandidates.splice(0, pendingCandidates.length);
      await setDoc(
        signalDocRef,
        {
          p1Candidates: arrayUnion(...batch),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {});
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        pendingCandidates.push(event.candidate.toJSON());
        if (!flushTimer) {
          flushTimer = setTimeout(() => {
            flushTimer = null;
            flushCandidates();
          }, 80);
        }
      } else {
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        flushCandidates();
      }
    };

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    await setDoc(
      signalDocRef,
      {
        roomCode: this.config.roomCode.toUpperCase(),
        offer: { type: offer.type, sdp: offer.sdp },
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    const processedCandidates = new Set<string>();

    // Listen for Guest's answer and candidates
    this.unsubscribeSignaling = onSnapshot(signalDocRef, async (snap) => {
      if (!snap.exists() || this.isDestroyed || !this.peerConnection) return;
      const data = snap.data();

      // Remote Answer
      if (data.answer && this.peerConnection.signalingState === 'have-local-offer') {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }

      // Guest ICE Candidates
      if (data.p2Candidates && Array.isArray(data.p2Candidates)) {
        for (const cand of data.p2Candidates) {
          const key = JSON.stringify(cand);
          if (processedCandidates.has(key)) continue;
          processedCandidates.add(key);
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
          } catch {
            // ignore duplicate or late candidates
          }
        }
      }
    });
  }

  // --- Guest (P2) Signaling Flow ---
  private async startGuestSignaling(): Promise<void> {
    if (!this.peerConnection || !isPlaymatCloudSyncEnabled()) return;

    const signalDocRef = doc(db, 'playmat_signals', this.config.roomCode.toUpperCase());

    const pendingCandidates: any[] = [];
    let flushTimer: any = null;

    const flushCandidates = async () => {
      if (pendingCandidates.length === 0 || this.isDestroyed) return;
      const batch = pendingCandidates.splice(0, pendingCandidates.length);
      await setDoc(
        signalDocRef,
        {
          p2Candidates: arrayUnion(...batch),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {});
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        pendingCandidates.push(event.candidate.toJSON());
        if (!flushTimer) {
          flushTimer = setTimeout(() => {
            flushTimer = null;
            flushCandidates();
          }, 80);
        }
      } else {
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        flushCandidates();
      }
    };

    const processedCandidates = new Set<string>();

    // Listen for Host's offer
    this.unsubscribeSignaling = onSnapshot(signalDocRef, async (snap) => {
      if (!snap.exists() || this.isDestroyed || !this.peerConnection) return;
      const data = snap.data();

      // Receive Offer and generate Answer
      if (data.offer && this.peerConnection.signalingState === 'stable') {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        await setDoc(
          signalDocRef,
          {
            answer: { type: answer.type, sdp: answer.sdp },
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      // Host ICE Candidates
      if (data.p1Candidates && Array.isArray(data.p1Candidates)) {
        for (const cand of data.p1Candidates) {
          const key = JSON.stringify(cand);
          if (processedCandidates.has(key)) continue;
          processedCandidates.add(key);
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
          } catch {
            // ignore duplicate or late candidates
          }
        }
      }
    });
  }

  private updateState(newState: WebRtcConnectionState, latencyMs?: number): void {
    this.connectionState = newState;
    this.config.onStateChange(newState, latencyMs ?? this.currentLatencyMs);
  }

  /**
   * Disconnect and clean up resources
   */
  public disconnect(cleanSignaling = true): void {
    this.isDestroyed = true;
    this.stopPingHeartbeat();
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }

    if (this.unsubscribeSignaling) {
      this.unsubscribeSignaling();
      this.unsubscribeSignaling = null;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (cleanSignaling && this.config.myRole === 'p1' && isPlaymatCloudSyncEnabled()) {
      try {
        const signalDocRef = doc(db, 'playmat_signals', this.config.roomCode.toUpperCase());
        deleteDoc(signalDocRef).catch(() => {});
      } catch {}
    }

    this.updateState('idle', 0);
  }
}
