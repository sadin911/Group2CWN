/**
 * PlaymatV3Canvas — Pure Tabletop Sandbox Mode (โต๊ะจริง 2 ผู้เล่น พร้อมกระดานกลาง)
 * Features:
 * 1. Two-Player Dual Board (Player 1 Bottom, Player 2 Top) with shared center
 * 2. Center Board Zone: Shared Stadium slot, Turn indicator, Hand privacy toggle, Perspective flip
 * 3. Center Spotlight Announcement: Trainer/Supporter/Item showcase + Card Reveal to opponent
 * 4. Limitless Meta Deck (24 tournament archetypes) + Custom deck selector for both P1 and P2
 * 5. Local Table Mode (Opponent hand facedown 🎴 + Solo Study Mode 👁️)
 * 6. Online Room Mode (2 Devices real-time sync with 6-digit room code)
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { CardInstance } from '../../engine/types';
import type { TabletopV3State } from './types';
import {
  createInitialTabletopState,
  TabletopActions,
  checkSetupReadiness,
} from './tabletopStateHelper';
import {
  buildCharizardExDeck,
} from '../../engine/data/StandardCardCatalog';
import {
  LIMITLESS_META_DECKS,
  buildMetaDeck,
  buildUserCustomDeck,
} from '../../engine/data/LimitlessDeckLoader';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { Sound } from '../../engine/pixi/SoundEffects';
import { useGameStore } from '../../store/gameStore';
import { useDeckStore } from '../../store/deckStore';
import { useAuthStore } from '../../store/authStore';
import { auth } from '../../utils/firebase';
import { getCardDisplayName } from '../../utils/pokemonThaiTranslator';

// Tabletop V3 Subcomponents & Modals
import { TabletopPokemonCard } from './TabletopPokemonCard';
import { PokemonActionModal } from './PokemonActionModal';
import { HandCardMenuModal } from './HandCardMenuModal';
import { CenterBoardZone } from './CenterBoardZone';
import { TabletopV3Dock } from './TabletopV3Dock';
import { PlaymatMobileArena } from './PlaymatMobileArena';
import { TabletopDeckSelectorModal } from './TabletopDeckSelectorModal';
import { OnlineRoomModal } from './OnlineRoomModal';
import { TabletopSyncService, reconcileBoardDamageByInstanceId, type TabletopRemoteUpdate, type OpponentBoardSync } from './tabletopSyncService';
import { TabletopConsentModal } from './TabletopConsentModal';
import { TabletopActionToast } from './TabletopActionToast';
import { TabletopCombatBanner } from './TabletopCombatBanner';
import { MulliganCheckModal } from './MulliganCheckModal';
import { TabletopVfxOverlay } from './TabletopVfxOverlay';
import { HandToDeckModal } from './HandToDeckModal';
import { HandToDiscardModal } from './HandToDiscardModal';
import { RealtimeConnectionBadge } from './RealtimeConnectionBadge';
import type { RealtimeConnectionInfo } from '../../services/realtime/realtimeTransportManager';

// Playmat Inspection Modals
import { DeckSearchModal } from './modals/DeckSearchModal';
import { TopCardsViewerModal } from './modals/TopCardsViewerModal';
import { DiscardAndLostZoneModal } from './modals/DiscardAndLostZoneModal';
import { RandomizerModal } from './modals/RandomizerModal';
import { TurnDecisionModal } from './modals/TurnDecisionModal';
import { TabletopVictoryModal } from './modals/TabletopVictoryModal';
import { TabletopCoinFlipOverlay } from './modals/TabletopCoinFlipOverlay';
import { CardImagePreviewModal } from '../pokemon/CardImagePreviewModal';
import { PixiTabletopVfxLayer } from '../playmat-pixi/engine/PixiTabletopVfxLayer';
import type { TabletopActiveCoinFlip } from './types';
import { BalatroFloaterOverlay, useBalatroBadgeQueue } from './BalatroCardFloater';
import { useBalatroCardTilt } from './hooks/useBalatroCardTilt';
import { EmptySlotPickerModal } from './modals/EmptySlotPickerModal';
import { CardFlightLayer, useCardFlightManager, PokemonCardBack } from './CardFlightLayer';
import { DeckShuffleOverlay } from './DeckShuffleOverlay';

interface PlaymatHandCardItemProps {
  card: CardInstance;
  hIdx: number;
  totalCards: number;
  isBeingDragged: boolean;
  isSelected?: boolean;
  isNewlyDrawn?: boolean;
  drawDelayMs?: number;
  isNeighborHovered: boolean;
  neighborDirection: 'left' | 'right' | null;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: () => void;
  onClick: () => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onZoom: () => void;
  onHoverChange: (hovered: boolean) => void;
}

const PlaymatHandCardItem: React.FC<PlaymatHandCardItemProps> = React.memo(({
  card,
  hIdx,
  totalCards,
  isBeingDragged,
  isSelected = false,
  isNewlyDrawn = false,
  drawDelayMs = 0,
  isNeighborHovered,
  neighborDirection,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onClick,
  onDoubleClick,
  onContextMenu,
  onZoom,
  onHoverChange,
}) => {
  const imageUrl = resolveCardImageUrl(card);
  const cardName = getCardDisplayName(card);

  const balatroTilt = useBalatroCardTilt({ maxTilt: 16, scale: 1.15, elevation: 22 });

  const mid = (totalCards - 1) / 2;
  const fanRotation = totalCards > 1 ? Math.max(-10, Math.min(10, (hIdx - mid) * 2.2)) : 0;
  const fanTranslateY = totalCards > 1 ? Math.abs(hIdx - mid) * 1.5 : 0;
  const magneticOffsetX = isNeighborHovered ? (neighborDirection === 'left' ? -12 : 12) : 0;

  const isHoloOrEx = useMemo(() => {
    const r = ((card as any).rarity || '').toLowerCase();
    const n = (card.nameEn || card.nameTh || '').toLowerCase();
    const hasSpecialSubtype = card.subtypes?.some((s) => {
      const sub = s.toLowerCase();
      return (
        sub.includes('ex') ||
        sub.includes('vmax') ||
        sub.includes('vstar') ||
        sub.includes('radiant') ||
        sub.includes('ace spec') ||
        sub.includes('acespec')
      );
    });
    return (
      hasSpecialSubtype ||
      r.includes('ex') ||
      r.includes('sar') ||
      r.includes('sr') ||
      r.includes('ur') ||
      r.includes('secret') ||
      r.includes('promo') ||
      n.includes(' ex') ||
      n.includes('vmax') ||
      n.includes('vstar')
    );
  }, [card]);

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    balatroTilt.onPointerEnter(e);
    onHoverChange(true);
  };

  const handlePointerLeave = () => {
    balatroTilt.onPointerLeave();
    onHoverChange(false);
  };

  const dynamicStyle: React.CSSProperties = balatroTilt.isHovered
    ? {
        ...balatroTilt.transformStyle,
        zIndex: 50,
      }
    : {
        transform: `perspective(800px) rotate(${fanRotation.toFixed(1)}deg) translateY(${((isSelected ? -22 : fanTranslateY)).toFixed(1)}px) translateX(${magneticOffsetX}px)`,
        transition: 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease-out',
        willChange: 'transform',
        zIndex: isSelected ? 45 : 10,
      };

  return (
    <div
      id={`hand-card-${hIdx}`}
      data-testid="hand-card-item"
      role="button"
      tabIndex={0}
      draggable={false}
      onContextMenu={onContextMenu || ((e) => e.preventDefault())}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerMove={balatroTilt.onPointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        ...dynamicStyle,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
      }}
      className={`group relative flex-shrink-0 h-[clamp(62px,8.8vh,78px)] sm:h-[clamp(70px,9.5vh,90px)] md:h-[clamp(76px,10vh,105px)] lg:h-[clamp(82px,11vh,120px)] aspect-[63/88] w-auto cursor-grab active:cursor-grabbing touch-none select-none active:scale-95 ${
        isBeingDragged ? 'opacity-35 scale-90 ring-4 ring-emerald-400' : ''
      } ${isSelected ? 'ring-4 ring-emerald-400 shadow-2xl shadow-emerald-500/50' : ''}`}
      title={`${cardName} (ดับเบิลคลิกเพื่อดูภาพขยายเต็มจอ)`}
    >
      <div
        className={`w-full h-full rounded-lg sm:rounded-xl overflow-hidden shadow-xl border border-white/25 bg-slate-900 ${
          isHoloOrEx ? 'balatro-polychrome-shimmer' : ''
        } ${isNewlyDrawn ? 'ptcg-card-draw-entrance' : ''}`}
        style={isNewlyDrawn ? ({ '--draw-delay': `${drawDelayMs}ms` } as React.CSSProperties) : undefined}
      >
        <img
          src={imageUrl}
          alt={cardName}
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
          loading="lazy"
          onError={(e) => handleCardImageError(e, card)}
        />
        {/* Balatro Dynamic Specular Glint Sheen */}
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={balatroTilt.glintStyle}
        />
        <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/15 transition-colors pointer-events-none" />
        {/* Quick Zoom Button on Hand Card (Desktop only) */}
        <button
          id={`btn-zoom-hand-${hIdx}`}
          data-testid={`btn-zoom-hand-${hIdx}`}
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.nativeEvent?.stopImmediatePropagation?.();
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            e.nativeEvent?.stopImmediatePropagation?.();
            onZoom();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.nativeEvent?.stopImmediatePropagation?.();
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            e.nativeEvent?.stopImmediatePropagation?.();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onZoom();
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onZoom();
          }}
          title="ดูการ์ดขยายใหญ่เต็มจอ (หรือดับเบิลคลิกที่การ์ด)"
          style={{
            pointerEvents: 'auto',
          }}
          className="hidden sm:flex absolute top-1.5 right-1.5 z-30 w-7 h-7 rounded-lg bg-slate-950/95 hover:bg-indigo-600 active:bg-indigo-700 text-white items-center justify-center text-xs shadow-xl border border-white/50 backdrop-blur-sm cursor-pointer active:scale-90 transition-all opacity-0 group-hover:opacity-100"
        >
          🔍
        </button>
      </div>
    </div>
  );
});

export interface PlaymatV3CanvasProps {
  engineMode?: 'dom' | 'pixi';
  onSwitchEngine?: () => void;
}

export const PlaymatV3Canvas: React.FC<PlaymatV3CanvasProps> = ({
  engineMode: propEngineMode = 'dom',
  onSwitchEngine,
}) => {
  const setGameMode = useGameStore((s) => s.setGameMode);
  // Support both ultra-fast DOM mode (default) and PixiJS Hardware-Accelerated layer
  const [engineMode, setEngineMode] = useState<'dom' | 'pixi'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('playmat_v3_engine');
      if (saved === 'dom' || saved === 'pixi') return saved;
    }
    return propEngineMode || 'dom';
  });

  // Balatro-Style Floating Action Badges & Sparks
  const { badges, addBadge, dismissBadge } = useBalatroBadgeQueue();
  const [lastPlayEvent, setLastPlayEvent] = useState<{ x: number; y: number; color?: number; timestamp: number } | null>(null);
  const [hoveredHandIndex, setHoveredHandIndex] = useState<number | null>(null);

  // Balatro Card Flight Animation System
  const { flights, dismissFlight, triggerFlightBetweenElements } = useCardFlightManager();

  // PTCG Pocket / Hearthstone Card Draw Entrance System
  const [newlyDrawnCardMap, setNewlyDrawnCardMap] = useState<Map<string, number>>(new Map());
  const [isDeckPeeling, setIsDeckPeeling] = useState(false);
  const [isTopDeckPeeling, setIsTopDeckPeeling] = useState(false);

  // Empty Bench & Active Slot Picker Target
  const [emptySlotTarget, setEmptySlotTarget] = useState<{
    side: 'player1' | 'player2';
    position: 'ACTIVE' | number;
  } | null>(null);

  // Selected Hand Card for Mobile Tap-to-Lift
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);

  // View Mode: 'desktop' (16:9 Tabletop) vs 'mobile' (Thumb-friendly Mobile Arena)
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(() => {
    try {
      const saved = localStorage.getItem('playmat_view_mode');
      if (saved === 'desktop' || saved === 'mobile') return saved;
    } catch {}
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop';
  });


  // Unified atomic history state (past, present, future) for 100% reliable undo/redo
  const [history, setHistory] = useState<{
    past: TabletopV3State[];
    present: TabletopV3State;
    future: TabletopV3State[];
  }>(() => {
    let p1Cards = buildCharizardExDeck();
    let p1Name = 'Charizard ex Deck';

    try {
      const pendingRaw = sessionStorage.getItem('playmat_pending_custom_deck');
      if (pendingRaw) {
        sessionStorage.removeItem('playmat_pending_custom_deck');
        const pending = JSON.parse(pendingRaw);
        if (pending && pending.cards && Object.keys(pending.cards).length > 0) {
          const built = buildUserCustomDeck(pending);
          if (built.length > 0) {
            p1Cards = built;
            p1Name = pending.deckName || pending.name || 'Custom Deck';
          }
        }
      }
    } catch {}

    const defaultMeta = LIMITLESS_META_DECKS[1] || LIMITLESS_META_DECKS[0]; // Gardevoir ex or meta
    const p2Cards = buildMetaDeck(defaultMeta.id);
    return {
      past: [],
      present: createInitialTabletopState(p1Cards, p1Name, p2Cards, defaultMeta.name),
      future: [],
    };
  });

  const user = useAuthStore((s) => s.user);
  const state = history.present;
  const isSyncingFromRemoteRef = useRef(false);

  // Active perspective resolution
  const bottomSide: 'player1' | 'player2' = state.perspective === 'player2' ? 'player2' : 'player1';
  const topSide: 'player1' | 'player2' = bottomSide === 'player1' ? 'player2' : 'player1';

  const bottomPlayer = state[bottomSide];
  const topPlayer = state[topSide];

  const selectedHandCard = useMemo(() => {
    if (!selectedHandCardId) return null;
    return bottomPlayer.hand.find((c) => c.instanceId === selectedHandCardId) || null;
  }, [selectedHandCardId, bottomPlayer.hand]);

  const isMyTurn =
    state.roomMode === 'online'
      ? state.myRole !== 'spectator' && state.currentTurn === state.myRole
      : state.currentTurn === bottomSide;

  const getCombatProps = (side: 'player1' | 'player2', position: 'ACTIVE' | number) => {
    const cs = state.combatState;
    if (!cs) {
      return {
        isAttacker: false,
        isTarget: false,
        isWeaknessTarget: false,
        isResistanceTarget: false,
        onTargetSelect: undefined,
      };
    }
    const isAttacker = cs.attackerSide === side && cs.attackerPosition === position;
    const isTarget = cs.targetSide === side && cs.targetPosition === position;
    const canSelectAsTarget = cs.targetSide === side && cs.targetPosition !== position;
    const onTargetSelect = canSelectAsTarget
      ? () => {
          Sound.playCardPlacement();
          commitState((curr) => TabletopActions.setCombatTarget(curr, position));
        }
      : undefined;

    return {
      isAttacker,
      isTarget,
      isWeaknessTarget: isTarget && Boolean(cs.isWeakness),
      isResistanceTarget: isTarget && Boolean(cs.isResistance),
      onTargetSelect,
    };
  };

  // Track if any Pokemon on field is currently facedown (for Let's Play reveal all button)
  const hasAnyFacedownOnTable =
    Boolean(state.player1.active && (state.player1.active.isFacedown || state.player1.active.card.isFacedown)) ||
    state.player1.bench.some((b) => Boolean(b && (b.isFacedown || b.card.isFacedown))) ||
    Boolean(state.player2.active && (state.player2.active.isFacedown || state.player2.active.card.isFacedown)) ||
    state.player2.bench.some((b) => Boolean(b && (b.isFacedown || b.card.isFacedown)));

  // Modals state
  const [selectedField, setSelectedField] = useState<{
    side: 'player1' | 'player2';
    position: 'ACTIVE' | number;
  } | null>(null);

  const [selectedHandCardInfo, setSelectedHandCardInfo] = useState<{
    side: 'player1' | 'player2';
    card: CardInstance;
  } | null>(null);

  const [isDeckSearchOpen, setIsDeckSearchOpen] = useState(false);
  const [isTopCardsOpen, setIsTopCardsOpen] = useState(false);
  const [isDiscardLostOpen, setIsDiscardLostOpen] = useState(false);
  const [isRandomizerOpen, setIsRandomizerOpen] = useState(false);
  const [isDeckSelectorOpen, setIsDeckSelectorOpen] = useState(false);
  const [isNewMatchModalOpen, setIsNewMatchModalOpen] = useState(false);
  const [isOnlineRoomOpen, setIsOnlineRoomOpen] = useState(false);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);
  const [isHandExpanded, setIsHandExpanded] = useState(true);
  const [shuffleNotice, setShuffleNotice] = useState<string | null>(null);
  const [activeShuffleDeckEl, setActiveShuffleDeckEl] = useState<Element | null>(null);
  const [isSoloAutoSwitch, setIsSoloAutoSwitch] = useState(true);
  const [previewingCard, setPreviewingCard] = useState<CardInstance | null>(null);
  const [isMulliganModalOpen, setIsMulliganModalOpen] = useState(false);
  const [isHandToDeckOpen, setIsHandToDeckOpen] = useState(false);
  const [isHandToDiscardOpen, setIsHandToDiscardOpen] = useState(false);
  const [isPixiVfxEnabled, setIsPixiVfxEnabled] = useState(true);
  const [isTurnDecisionModalOpen, setIsTurnDecisionModalOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [showTurnSplash, setShowTurnSplash] = useState(false);
  const [isReviewingBoard, setIsReviewingBoard] = useState(false);
  const [dismissedSpotlightId, setDismissedSpotlightId] = useState<string | null>(null);
  const dismissedSpotlightIdsRef = useRef<Set<string>>(new Set());
  const resolvedCombatIdsRef = useRef<Set<string>>(new Set());
  const resolvedConsentIdsRef = useRef<Set<string>>(new Set());
  const lastResolvedCombatTimestampRef = useRef<number>(0);
  const prevTurnRef = useRef<string | null>(null);
  const prevGameStartedRef = useRef<boolean | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<RealtimeConnectionInfo | null>(null);
  const [damageMemory, setDamageMemory] = useState<Record<string, number>>({});
  const [reconnectBannerSession, setReconnectBannerSession] = useState<{
    roomCode: string;
    myRole: 'player1' | 'player2' | 'spectator';
    timestamp: number;
  } | null>(() => {
    try {
      const raw = sessionStorage.getItem('playmat_v3_session') || localStorage.getItem('playmat_v3_session');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.roomCode && data.myRole && Date.now() - data.timestamp < 2 * 60 * 60 * 1000) {
        return data;
      }
    } catch {}
    return null;
  });
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnectToSession = async () => {
    if (!reconnectBannerSession) return;
    setIsReconnecting(true);
    try {
      const { roomCode, myRole } = reconnectBannerSession;
      const remoteState = await TabletopSyncService.getRoom(roomCode);
      if (!remoteState) {
        sessionStorage.removeItem('playmat_v3_session');
        localStorage.removeItem('playmat_v3_session');
        setReconnectBannerSession(null);
        commitState((curr) =>
          TabletopActions.setActionToast(curr, {
            id: `reconnect-fail-${Date.now()}`,
            message: '⚠️ ไม่พบห้องนี้ หรือห้องถูกยุบไปแล้ว',
            icon: '⚠️',
            type: 'WARNING',
            timestamp: Date.now(),
          })
        );
        return;
      }
      setHistory({
        past: [],
        present: {
          ...remoteState,
          roomMode: 'online',
          roomCode,
          myRole,
          perspective: myRole === 'spectator' ? 'player1' : myRole,
        },
        future: [],
      });
      setReconnectBannerSession(null);
      Sound.playCardPlacement();
    } catch (err) {
      console.warn('Failed to reconnect to room:', err);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleDismissReconnect = () => {
    sessionStorage.removeItem('playmat_v3_session');
    localStorage.removeItem('playmat_v3_session');
    setReconnectBannerSession(null);
  };

  // Lock body & documentElement from scrolling or rubberbanding while Playmat is open
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    const origOverscroll = document.body.style.overscrollBehavior;
    const origHeight = document.body.style.height;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.height = '100dvh';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.documentElement.style.height = '100dvh';

    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.overscrollBehavior = origOverscroll;
      document.body.style.height = origHeight;
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      document.documentElement.style.height = '';
    };
  }, []);

  // Auto-Draw on Turn Start State (opt-in toggle)
  const [autoDrawOnTurn, setAutoDrawOnTurn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('playmat_v3_autodraw');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleAutoDraw = () => {
    setAutoDrawOnTurn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('playmat_v3_autodraw', String(next));
      } catch {}
      return next;
    });
  };

  // Real-time Opponent Cursor (Direct DOM Ref: 0 React re-renders, silky smooth 60fps)
  const opponentCursorElRef = useRef<HTMLDivElement>(null);
  const lastCursorSendRef = useRef(0);
  const cursorFadeTimeoutRef = useRef<any>(null);
  const cachedArenaRectRef = useRef<{ rect: DOMRect; timestamp: number } | null>(null);

  const handleBoardPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (state.roomMode !== 'online' || !state.roomCode) return;
      const role = state.myRole;
      if (role !== 'player1' && role !== 'player2') return;
      if (pointerDragRef.current?.isDragging) return; // Skip board cursor broadcast while actively dragging card

      const now = Date.now();
      if (now - lastCursorSendRef.current < 50) return; // 20 fps throttle is plenty for cursor tracking
      lastCursorSendRef.current = now;

      const arenaEl = document.getElementById('playmat-arena-container') || document.getElementById('playmat-v3-board');
      if (!arenaEl) return;

      let cached = cachedArenaRectRef.current;
      if (!cached || now - cached.timestamp > 400) {
        cached = { rect: arenaEl.getBoundingClientRect(), timestamp: now };
        cachedArenaRectRef.current = cached;
      }
      const rect = cached.rect;
      if (rect.width <= 0 || rect.height <= 0) return;

      const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      // Resolve semantic target zone under cursor using e.target first to avoid forced layout thrashing
      let targetZoneId: string | undefined;
      const targetEl = (e.target as Element) || document.elementFromPoint(e.clientX, e.clientY);
      if (targetEl && targetEl.closest) {
        const slotEl = targetEl.closest('[data-slot-zone]');
        if (slotEl) {
          const side = slotEl.getAttribute('data-slot-side');
          const pos = slotEl.getAttribute('data-slot-pos');
          if (side && pos) targetZoneId = `slot:${side}:${pos}`;
        } else if (targetEl.closest('[data-stadium-zone]')) {
          targetZoneId = 'stadium';
        } else {
          const deckEl = targetEl.closest('[data-deck-zone]');
          if (deckEl) {
            const side = deckEl.getAttribute('data-deck-side');
            if (side) targetZoneId = `deck:${side}`;
          } else {
            const discardEl = targetEl.closest('[data-discard-zone]');
            if (discardEl) {
              const side = discardEl.getAttribute('data-discard-side');
              if (side) targetZoneId = `discard:${side}`;
            } else {
              const prizeEl = targetEl.closest('[data-prize-side]');
              if (prizeEl) {
                const side = prizeEl.getAttribute('data-prize-side');
                const idx = prizeEl.getAttribute('data-prize-index');
                if (side && idx !== null) targetZoneId = `prize:${side}:${idx}`;
              }
            }
          }
        }
      }

      TabletopSyncService.sendCursorPosition(state.roomCode, role, normX, normY, targetZoneId);
    },
    [state.roomMode, state.roomCode, state.myRole]
  );



  // Drag and Drop State (Native HTML5 DnD)
  const [draggingItem, setDraggingItem] = useState<{
    type: 'HAND_CARD';
    card: CardInstance;
    side: 'player1' | 'player2';
  } | {
    type: 'BOARD_SLOT';
    side: 'player1' | 'player2';
    position: 'ACTIVE' | number;
  } | null>(null);

  // Universal Pointer Drag & Drop State (Desktop Mouse + Mobile/Tablet Touch)
  const [pointerDrag, setPointerDrag] = useState<{
    item:
      | { type: 'HAND_CARD'; card: CardInstance; side: 'player1' | 'player2' }
      | { type: 'BOARD_SLOT'; card: CardInstance; side: 'player1' | 'player2'; position: 'ACTIVE' | number };
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
    pointerType?: string;
  } | null>(null);

  const pointerDragRef = useRef(pointerDrag);
  pointerDragRef.current = pointerDrag;
  const touchHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPointerDrag = useCallback(
    (
      item:
        | { type: 'HAND_CARD'; card: CardInstance; side: 'player1' | 'player2' }
        | { type: 'BOARD_SLOT'; card: CardInstance; side: 'player1' | 'player2'; position: 'ACTIVE' | number },
      clientX: number,
      clientY: number,
      pointerType: string = 'mouse'
    ) => {
      if (state.myRole === 'spectator') return;

      if (touchHoldTimerRef.current) {
        clearTimeout(touchHoldTimerRef.current);
        touchHoldTimerRef.current = null;
      }

      const newDrag = {
        item,
        startX: clientX,
        startY: clientY,
        currentX: clientX,
        currentY: clientY,
        isDragging: false,
        pointerType,
      };
      pointerDragRef.current = newDrag;

      // On touch devices / tablets: Hold threshold (~140ms) with haptic feedback
      // If user holds for 140ms, lift the card into drag mode with subtle vibration
      if (pointerType === 'touch') {
        touchHoldTimerRef.current = setTimeout(() => {
          if (pointerDragRef.current) {
            pointerDragRef.current.isDragging = true;
            try {
              navigator.vibrate?.(12);
            } catch {}
            setPointerDrag({ ...pointerDragRef.current });
          }
        }, 140);
      }
    },
    [state.myRole]
  );

  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  // Helper: Commit a new state transition with undo snapshot and optional online sync
  const commitState = useCallback(
    (
      updater: TabletopV3State | ((prev: TabletopV3State) => TabletopV3State),
      isCheckpoint = false
    ) => {
      setHistory((curr) => {
        const nextState = typeof updater === 'function' ? updater(curr.present) : updater;
        // Broadcast to P2P / Firestore if online room is active
        if (nextState.roomMode === 'online' && nextState.roomCode && nextState.myRole !== 'spectator') {
          TabletopSyncService.syncState(nextState.roomCode, nextState, isCheckpoint);
          try {
            sessionStorage.setItem(
              'pokecount_tabletop_session',
              JSON.stringify({
                roomCode: nextState.roomCode,
                myRole: nextState.myRole,
                timestamp: Date.now(),
              })
            );
          } catch {}
        }
        return {
          past: [...curr.past.slice(-49), curr.present],
          present: nextState,
          future: [],
        };
      });
    },
    []
  );

  const handleRequestDiscardEnergy = useCallback(
    (targetSide: 'player1' | 'player2', targetPos: 'ACTIVE' | number, energyId: string) => {
      const slot = targetPos === 'ACTIVE' ? state[targetSide].active : state[targetSide].bench[targetPos];
      const energy = slot?.attachedEnergies.find((e) => e.instanceId === energyId);
      const cardName = slot?.card ? getCardDisplayName(slot.card) : 'โปเกมอน';
      const energyType = energy ? (energy.nameTh || energy.nameEn || 'พลังงาน') : 'พลังงาน';

      if (state.roomMode === 'online' && targetSide !== state.myRole && state.myRole !== 'both') {
        const mySide = state.myRole === 'player2' ? 'player2' : 'player1';
        const myName = state[mySide].name;
        Sound.playCardPlacement();
        commitState((curr) =>
          TabletopActions.requestConsent(curr, {
            id: `discard-energy-${Date.now()}`,
            requesterSide: mySide,
            requesterName: myName,
            actionType: 'DISCARD_ENERGY',
            description: `ขอถอดพลังงาน (${energyType}) ออกจาก ${cardName} ลงสุสาน`,
            timestamp: Date.now(),
            payload: { targetSide, targetPosition: targetPos, energyId, energyType },
            revealedCard: slot?.card,
          }),
          true
        );
        return;
      }

      Sound.playCardPlacement();
      commitState((curr) => TabletopActions.moveEnergy(curr, targetSide, targetPos, energyId, 'DISCARD'), true);
    },
    [state, commitState]
  );

  const handleDropOnSlot = useCallback(
    (
      targetSide: 'player1' | 'player2',
      targetPosition: 'ACTIVE' | number,
      itemOverride?:
        | { type: 'HAND_CARD'; card: CardInstance; side: 'player1' | 'player2' }
        | { type: 'BOARD_SLOT'; card?: CardInstance; side: 'player1' | 'player2'; position: 'ACTIVE' | number }
    ) => {
      if (state.myRole === 'spectator') return;
      const activeItem = itemOverride || draggingItem || pointerDragRef.current?.item;
      if (!activeItem) return;

      if (activeItem.type === 'HAND_CARD') {
        const card = activeItem.card;
        const side = activeItem.side;
        const dropX = pointerDragRef.current?.currentX || window.innerWidth / 2;
        const dropY = pointerDragRef.current?.currentY || window.innerHeight / 2;

        // 1. Energy
        if (card.supertype === 'Energy') {
          const slot = targetPosition === 'ACTIVE' ? state[targetSide].active : state[targetSide].bench[targetPosition];
          if (slot) {
            Sound.playCardPlacement();
            addBadge('+ENERGY', dropX, dropY, 'gold', '⚡');
            setLastPlayEvent({ x: dropX, y: dropY, color: 0xf59e0b, timestamp: Date.now() });
            commitState((curr) => TabletopActions.attachEnergyFromHand(curr, side, card.instanceId, targetPosition));
          }
          return;
        }

        // 2. Tool
        const isTool =
          card.supertype === 'Trainer' &&
          (card.subtypes?.some((s) => s.toLowerCase().includes('tool')) ||
            (card as any).trainerType === 'Tool');
        if (isTool) {
          const slot = targetPosition === 'ACTIVE' ? state[targetSide].active : state[targetSide].bench[targetPosition];
          if (slot) {
            Sound.playCardPlacement();
            addBadge('TOOL!', dropX, dropY, 'purple', '🛠️');
            setLastPlayEvent({ x: dropX, y: dropY, color: 0xa855f7, timestamp: Date.now() });
            commitState((curr) => TabletopActions.attachToolFromHand(curr, side, card.instanceId, targetPosition));
          }
          return;
        }

        // 3. Trainer -> play directly onto spotlight
        if (card.supertype === 'Trainer') {
          Sound.playCardPlacement();
          addBadge('TRAINER!', dropX, dropY, 'indigo', '🎴');
          setLastPlayEvent({ x: dropX, y: dropY, color: 0x6366f1, timestamp: Date.now() });
          commitState((curr) => TabletopActions.playTrainerToSpotlight(curr, side, card.instanceId));
          return;
        }

        // 4. Pokemon -> place or evolve
        if (card.supertype === 'Pokemon') {
          const slot = targetPosition === 'ACTIVE' ? state[targetSide].active : state[targetSide].bench[targetPosition];
          if (!slot) {
            Sound.playCardPlacement();
            const shouldBeFacedown = !state.isGameStarted;
            const badgeLabel = targetPosition === 'ACTIVE' ? 'ACTIVE!' : 'BENCH!';
            const badgeIcon = targetPosition === 'ACTIVE' ? '🌱' : '✨';
            const badgeColor = targetPosition === 'ACTIVE' ? 'emerald' : 'cyan';
            addBadge(badgeLabel, dropX, dropY, badgeColor, badgeIcon);
            setLastPlayEvent({
              x: dropX,
              y: dropY,
              color: targetPosition === 'ACTIVE' ? 0x10b981 : 0x06b6d4,
              timestamp: Date.now(),
            });
            commitState((curr) => TabletopActions.placeFromHand(curr, side, card.instanceId, targetPosition, shouldBeFacedown));
          } else {
            const targetNameTh = slot.card.nameTh;
            const targetNameEn = slot.card.nameEn;
            const isEvolution =
              (card.evolvesFrom && (card.evolvesFrom === targetNameTh || card.evolvesFrom === targetNameEn)) ||
              card.subtypes?.includes('Stage 1') ||
              card.subtypes?.includes('Stage 2') ||
              card.subtypes?.includes('Stage1') ||
              card.subtypes?.includes('Stage2') ||
              card.subtypes?.includes('VSTAR') ||
              card.subtypes?.includes('VMAX');

            if (isEvolution) {
              Sound.playCardPlacement();
              addBadge('EVOLVED!', dropX, dropY, 'crimson', '🔥');
              setLastPlayEvent({ x: dropX, y: dropY, color: 0xef4444, timestamp: Date.now() });
              commitState((curr) => TabletopActions.evolveFromHand(curr, side, card.instanceId, targetPosition));
            } else {
              Sound.playCardPlacement();
              addBadge('SWAP!', dropX, dropY, 'emerald', '🔄');
              setLastPlayEvent({ x: dropX, y: dropY, color: 0x10b981, timestamp: Date.now() });
              commitState((curr) => TabletopActions.placeFromHand(curr, side, card.instanceId, targetPosition));
            }
          }
          return;
        }
      }

      if (activeItem.type === 'BOARD_SLOT') {
        const fromSide = activeItem.side;
        const fromPos = activeItem.position;

        // Boss's Orders / Gust Consent Request:
        // If dragging opponent's bench Pokemon to Active (or towards player's board/active)
        const isOnline = state.roomMode === 'online';
        const isOpponentSide = fromSide !== state.myRole && state.myRole !== 'both';
        if (isOnline && isOpponentSide) {
          const isTargetingActive =
            (targetSide === fromSide && targetPosition === 'ACTIVE' && fromPos !== 'ACTIVE') ||
            (targetSide === state.myRole && fromPos !== 'ACTIVE');
          if (isTargetingActive) {
            const bIdx = typeof fromPos === 'number' ? fromPos : 0;
            const targetSlot = state[fromSide].bench[bIdx];
            if (targetSlot) {
              const mySide = state.myRole === 'player2' ? 'player2' : 'player1';
              const myName = state[mySide].name;
              const targetName = getCardDisplayName(targetSlot.card);
              Sound.playCardPlacement();
              commitState((curr) =>
                TabletopActions.requestConsent(curr, {
                  id: `switch-${Date.now()}`,
                  requesterSide: mySide,
                  requesterName: myName,
                  actionType: 'SWITCH_POKEMON',
                  description: `ขอสลับ ${targetName} ขึ้นมาเป็นตำแหน่ง Active (คำสั่งของบอส / Gust)`,
                  timestamp: Date.now(),
                  payload: { targetSide: fromSide, benchIndex: bIdx, revealedCard: targetSlot.card },
                  revealedCard: targetSlot.card,
                }),
                true
              );
              setSelectedField(null);
            }
            return;
          }
        }

        if (fromSide === targetSide) {
          if (fromPos !== 'ACTIVE' && targetPosition === 'ACTIVE') {
            Sound.playCardPlacement();
            commitState((curr) => TabletopActions.retreatActive(curr, fromSide, fromPos, []));
          } else if (fromPos === 'ACTIVE' && targetPosition !== 'ACTIVE') {
            Sound.playCardPlacement();
            commitState((curr) => TabletopActions.retreatActive(curr, fromSide, targetPosition, []));
          } else if (fromPos !== 'ACTIVE' && targetPosition !== 'ACTIVE' && fromPos !== targetPosition) {
            Sound.playCardPlacement();
            commitState((curr) => TabletopActions.swapBenchSlots(curr, fromSide, fromPos, targetPosition));
          }
        }
      }
    },
    [draggingItem, state, commitState, addBadge, setLastPlayEvent]
  );

  const handleDropOnCenterBoard = useCallback(
    (
      itemOverride?:
        | { type: 'HAND_CARD'; card: CardInstance; side: 'player1' | 'player2' }
        | { type: 'BOARD_SLOT'; card?: CardInstance; side: 'player1' | 'player2'; position: 'ACTIVE' | number }
    ) => {
      const activeItem = itemOverride || draggingItem || pointerDragRef.current?.item;
      if (!activeItem || activeItem.type !== 'HAND_CARD') return;

      const card = activeItem.card;
      const side = activeItem.side;
      const dropX = pointerDragRef.current?.currentX || window.innerWidth / 2;
      const dropY = pointerDragRef.current?.currentY || window.innerHeight / 2;

      if (card.supertype === 'Trainer') {
        Sound.playCardPlacement();
        addBadge('TRAINER!', dropX, dropY, 'indigo', '🎴');
        setLastPlayEvent({ x: dropX, y: dropY, color: 0x6366f1, timestamp: Date.now() });
        commitState((curr) => TabletopActions.playTrainerToSpotlight(curr, side, card.instanceId));
      }
    },
    [draggingItem, commitState, addBadge, setLastPlayEvent]
  );

  const handleDropOnStadium = useCallback(
    (
      itemOverride?:
        | { type: 'HAND_CARD'; card: CardInstance; side: 'player1' | 'player2' }
        | { type: 'BOARD_SLOT'; card?: CardInstance; side: 'player1' | 'player2'; position: 'ACTIVE' | number }
    ) => {
      const activeItem = itemOverride || draggingItem || pointerDragRef.current?.item;
      if (!activeItem || activeItem.type !== 'HAND_CARD') return;

      const card = activeItem.card;
      const side = activeItem.side;
      const dropX = pointerDragRef.current?.currentX || window.innerWidth / 2;
      const dropY = pointerDragRef.current?.currentY || window.innerHeight / 2;

      // In sandbox, player can play stadium (or any trainer dropped onto stadium slot)
      Sound.playCardPlacement();
      addBadge('STADIUM!', dropX, dropY, 'emerald', '🏟️');
      setLastPlayEvent({ x: dropX, y: dropY, color: 0x10b981, timestamp: Date.now() });
      commitState((curr) => TabletopActions.playStadium(curr, side, card.instanceId));
    },
    [draggingItem, commitState, addBadge, setLastPlayEvent]
  );

  const handleDropOnDiscard = useCallback(
    (
      targetSide?: 'player1' | 'player2',
      itemOverride?:
        | { type: 'HAND_CARD'; card: CardInstance; side: 'player1' | 'player2' }
        | { type: 'BOARD_SLOT'; card?: CardInstance; side: 'player1' | 'player2'; position: 'ACTIVE' | number }
    ) => {
      const activeItem = itemOverride || draggingItem || pointerDragRef.current?.item;
      if (!activeItem) return;

      const side = targetSide || activeItem.side;
      if (activeItem.type === 'HAND_CARD') {
        const card = activeItem.card;
        Sound.playCardPlacement();
        commitState((curr) => TabletopActions.discardFromHand(curr, side, card.instanceId));
        return;
      }

      if (activeItem.type === 'BOARD_SLOT') {
        const position = activeItem.position;
        Sound.playCardPlacement();
        commitState((curr) => TabletopActions.knockOut(curr, side, position, false));
      }
    },
    [draggingItem, commitState]
  );

  const handleDropOnDeck = useCallback(
    (
      targetSide?: 'player1' | 'player2',
      itemOverride?:
        | { type: 'HAND_CARD'; card: CardInstance; side: 'player1' | 'player2' }
        | { type: 'BOARD_SLOT'; card?: CardInstance; side: 'player1' | 'player2'; position: 'ACTIVE' | number }
    ) => {
      const activeItem = itemOverride || draggingItem || pointerDragRef.current?.item;
      if (!activeItem || activeItem.type !== 'HAND_CARD') return;

      const side = targetSide || activeItem.side;
      Sound.playCardPlacement();
      commitState((curr) => TabletopActions.putHandToDeck(curr, side, activeItem.card.instanceId, 'TOP'));
    },
    [draggingItem, commitState]
  );

  // Proximity & Hit Detection for Drop Targets (Direct Hit + 75px Snap Radius)
  const findDropTarget = useCallback(
    (
      clientX: number,
      clientY: number
    ):
      | { type: 'slot'; side: 'player1' | 'player2'; position: 'ACTIVE' | number }
      | { type: 'stadium' }
      | { type: 'discard'; side: 'player1' | 'player2' }
      | { type: 'deck'; side: 'player1' | 'player2' }
      | { type: 'center-board' }
      | null => {
      // 1. Direct hit-test
      const elem = document.elementFromPoint(clientX, clientY);
      const stadiumElem = elem?.closest('[data-stadium-zone]');
      const discardElem = elem?.closest('[data-discard-zone]');
      const deckElem = elem?.closest('[data-deck-zone]');
      const slotElem = elem?.closest('[data-slot-zone]');
      const centerElem = elem?.closest('#center-board-zone');

      if (stadiumElem) return { type: 'stadium' };
      if (discardElem) {
        const side = (discardElem.getAttribute('data-discard-side') as 'player1' | 'player2') || bottomSide;
        return { type: 'discard', side };
      }
      if (deckElem) {
        const side = (deckElem.getAttribute('data-deck-side') as 'player1' | 'player2') || bottomSide;
        return { type: 'deck', side };
      }
      if (slotElem) {
        const side = slotElem.getAttribute('data-slot-side') as 'player1' | 'player2';
        const posStr = slotElem.getAttribute('data-slot-pos');
        const position: 'ACTIVE' | number = posStr === 'ACTIVE' ? 'ACTIVE' : parseInt(posStr || '0', 10);
        return { type: 'slot', side, position };
      }
      if (centerElem) return { type: 'center-board' };

      // 2. ElementsFromPoint list
      const elements = document.elementsFromPoint(clientX, clientY);
      for (const el of elements) {
        if (el.closest('[data-stadium-zone]')) return { type: 'stadium' };
        const d = el.closest('[data-discard-zone]');
        if (d) {
          const side = (d.getAttribute('data-discard-side') as 'player1' | 'player2') || bottomSide;
          return { type: 'discard', side };
        }
        const dk = el.closest('[data-deck-zone]');
        if (dk) {
          const side = (dk.getAttribute('data-deck-side') as 'player1' | 'player2') || bottomSide;
          return { type: 'deck', side };
        }
        const s = el.closest('[data-slot-zone]');
        if (s) {
          const side = s.getAttribute('data-slot-side') as 'player1' | 'player2';
          const posStr = s.getAttribute('data-slot-pos');
          const position: 'ACTIVE' | number = posStr === 'ACTIVE' ? 'ACTIVE' : parseInt(posStr || '0', 10);
          return { type: 'slot', side, position };
        }
        if (el.closest('#center-board-zone')) {
          return { type: 'center-board' };
        }
      }

      // 3. Proximity check (snap within 75px)
      let closestTarget:
        | { type: 'slot'; side: 'player1' | 'player2'; position: 'ACTIVE' | number }
        | { type: 'stadium' }
        | { type: 'discard'; side: 'player1' | 'player2' }
        | { type: 'deck'; side: 'player1' | 'player2' }
        | null = null;
      const isTouch = pointerDragRef.current?.pointerType === 'touch';
      let minDistance = isTouch ? 95 : 75;

      const getEffectiveDist = (centerX: number, centerY: number) => {
        const d1 = Math.hypot(clientX - centerX, clientY - centerY);
        if (!isTouch) return d1;
        const d2 = Math.hypot(clientX - centerX, (clientY - 45) - centerY);
        return Math.min(d1, d2);
      };

      // Check slots
      const allSlots = document.querySelectorAll('[data-slot-zone]');
      allSlots.forEach((s) => {
        const rect = s.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = getEffectiveDist(centerX, centerY);
        if (dist < minDistance) {
          minDistance = dist;
          const side = s.getAttribute('data-slot-side') as 'player1' | 'player2';
          const posStr = s.getAttribute('data-slot-pos');
          const position: 'ACTIVE' | number = posStr === 'ACTIVE' ? 'ACTIVE' : parseInt(posStr || '0', 10);
          closestTarget = { type: 'slot', side, position };
        }
      });

      // Check Discard piles
      const allDiscards = document.querySelectorAll('[data-discard-zone]');
      allDiscards.forEach((d) => {
        const rect = d.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = getEffectiveDist(centerX, centerY);
        if (dist < minDistance) {
          minDistance = dist;
          const side = (d.getAttribute('data-discard-side') as 'player1' | 'player2') || bottomSide;
          closestTarget = { type: 'discard', side };
        }
      });

      // Check Deck piles
      const allDecks = document.querySelectorAll('[data-deck-zone]');
      allDecks.forEach((dk) => {
        const rect = dk.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = getEffectiveDist(centerX, centerY);
        if (dist < minDistance) {
          minDistance = dist;
          const side = (dk.getAttribute('data-deck-side') as 'player1' | 'player2') || bottomSide;
          closestTarget = { type: 'deck', side };
        }
      });

      // Check Stadium
      const stadiumSlot = document.querySelector('[data-stadium-zone]');
      if (stadiumSlot) {
        const rect = stadiumSlot.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = getEffectiveDist(centerX, centerY);
        if (dist < minDistance) {
          minDistance = dist;
          closestTarget = { type: 'stadium' };
        }
      }

      if (closestTarget) {
        return closestTarget;
      }

      // 4. Center Board proximity check (within 40px bounding box)
      const centerBoard = document.getElementById('center-board-zone');
      if (centerBoard) {
        const rect = centerBoard.getBoundingClientRect();
        const testY = isTouch ? Math.min(clientY, clientY - 45) : clientY;
        if (
          clientX >= rect.left - 40 &&
          clientX <= rect.right + 40 &&
          testY >= rect.top - 50 &&
          testY <= rect.bottom + 50
        ) {
          return { type: 'center-board' as const };
        }
      }

      return null;
    },
    [bottomSide]
  );

  const dragJustEndedRef = useRef(false);
  const handleDropOnSlotRef = useRef(handleDropOnSlot);
  handleDropOnSlotRef.current = handleDropOnSlot;
  const handleDropOnCenterBoardRef = useRef(handleDropOnCenterBoard);
  handleDropOnCenterBoardRef.current = handleDropOnCenterBoard;
  const handleDropOnStadiumRef = useRef(handleDropOnStadium);
  handleDropOnStadiumRef.current = handleDropOnStadium;
  const handleDropOnDiscardRef = useRef(handleDropOnDiscard);
  handleDropOnDiscardRef.current = handleDropOnDiscard;
  const handleDropOnDeckRef = useRef(handleDropOnDeck);
  handleDropOnDeckRef.current = handleDropOnDeck;
  const findDropTargetRef = useRef(findDropTarget);
  findDropTargetRef.current = findDropTarget;

  // Global Pointer Event Listeners for smooth mouse / touch drag (Mounted Permanently)
  useEffect(() => {
    let lastTargetCheckTime = 0;
    let lastTargetCheckX = 0;
    let lastTargetCheckY = 0;
    let lastHitZone: string | null = null;

    const handleWindowPointerMove = (e: PointerEvent) => {
      const current = pointerDragRef.current;
      if (!current) return;

      const dragThreshold = current.item.type === 'BOARD_SLOT' ? 18 : (current.pointerType === 'touch' ? 10 : 8);
      const dist = Math.hypot(e.clientX - current.startX, e.clientY - current.startY);

      // If user moves beyond threshold before hold timer fires, immediately activate drag
      if (dist > dragThreshold && !current.isDragging) {
        if (touchHoldTimerRef.current) {
          clearTimeout(touchHoldTimerRef.current);
          touchHoldTimerRef.current = null;
        }
        current.isDragging = true;
        setPointerDrag({ ...current });
      }

      current.currentX = e.clientX;
      current.currentY = e.clientY;

      if (current.isDragging) {
        if (e.cancelable) {
          e.preventDefault();
        }

        // Direct DOM update for floating avatar position (60/120 FPS buttery smooth motion without React re-render overhead)
        const avatarEl = document.getElementById('floating-drag-avatar');
        if (avatarEl) {
          avatarEl.style.left = `${e.clientX}px`;
          avatarEl.style.top = `${e.clientY}px`;
        }

        // Throttle target detection to avoid layout thrashing on every pixel
        const now = Date.now();
        const distMoved = Math.hypot(e.clientX - lastTargetCheckX, e.clientY - lastTargetCheckY);
        if (distMoved >= 6 || now - lastTargetCheckTime >= 32) {
          lastTargetCheckTime = now;
          lastTargetCheckX = e.clientX;
          lastTargetCheckY = e.clientY;

          const target = findDropTargetRef.current(e.clientX, e.clientY);
          let hitZone: string | null = null;
          if (target) {
            if (target.type === 'slot') {
              hitZone = `${target.side}-${target.position}`;
            } else if (target.type === 'stadium') {
              hitZone = 'stadium';
            } else if (target.type === 'discard') {
              hitZone = `discard-${target.side}`;
            } else if (target.type === 'deck') {
              hitZone = `deck-${target.side}`;
            } else if (target.type === 'center-board') {
              hitZone = 'center-board';
            }
          }

          if (hitZone !== lastHitZone) {
            lastHitZone = hitZone;
            setActiveDropZone(hitZone);
          }
        }
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      lastHitZone = null;
      if (touchHoldTimerRef.current) {
        clearTimeout(touchHoldTimerRef.current);
        touchHoldTimerRef.current = null;
      }

      const current = pointerDragRef.current;
      if (!current) return;

      const movedDist = Math.hypot(e.clientX - current.startX, e.clientY - current.startY);

      // Only suppress subsequent click if the user actually dragged the item (moved > 10px)
      if (current.isDragging && movedDist > 10) {
        dragJustEndedRef.current = true;
        setTimeout(() => {
          dragJustEndedRef.current = false;
        }, 150);

        const target = findDropTargetRef.current(e.clientX, e.clientY);
        if (target) {
          if (target.type === 'slot') {
            handleDropOnSlotRef.current(target.side, target.position, current.item);
          } else if (target.type === 'stadium') {
            handleDropOnStadiumRef.current(current.item);
          } else if (target.type === 'discard') {
            handleDropOnDiscardRef.current(target.side, current.item);
          } else if (target.type === 'deck') {
            handleDropOnDeckRef.current(target.side, current.item);
          } else if (target.type === 'center-board') {
            handleDropOnCenterBoardRef.current(current.item);
          }
        }
      }

      pointerDragRef.current = null;
      setPointerDrag(null);
      setActiveDropZone(null);
    };

    const handleWindowClickCapture = (e: MouseEvent) => {
      if (dragJustEndedRef.current) {
        dragJustEndedRef.current = false;
        e.stopPropagation();
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedHandCardId(null);
        setSelectedHandCardInfo(null);
        setPreviewingCard(null);
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('click', handleWindowClickCapture, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('click', handleWindowClickCapture, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getDropProps = (side: 'player1' | 'player2', position: 'ACTIVE' | number) => {
    const zoneId = `${side}-${position}`;
    const isDragTarget = activeDropZone === zoneId;
    const slot = position === 'ACTIVE' ? state[side].active : state[side].bench[position];

    const isDropTarget = isDragTarget;

    let dropHint = 'ปล่อยเพื่อวาง';
    const activeItem = pointerDrag?.item || draggingItem || null;

    if (activeItem?.type === 'HAND_CARD') {
      const card = activeItem.card;
      if (card.supertype === 'Energy') {
        dropHint = '⚡ ติดพลังงาน';
      } else if (card.supertype === 'Pokemon') {
        if (!slot) {
          dropHint = '🌱 วางลงสนาม';
        } else {
          dropHint = '🧬 วิวัฒนาการ / วางแทน';
        }
      } else if (card.supertype === 'Trainer') {
        dropHint = '🎴 เล่นการ์ด / ติดอุปกรณ์';
      }
    } else if (activeItem?.type === 'BOARD_SLOT') {
      dropHint = '🔄 สลับตำแหน่ง';
    }

    return {
      isDropTarget,
      dropHint,
      draggable: false,
      onDragStart: (e: React.DragEvent) => {
        if (!slot) return;
        e.dataTransfer.setData('text/plain', `slot-${side}-${position}`);
        e.dataTransfer.effectAllowed = 'move';
        setDraggingItem({ type: 'BOARD_SLOT', side, position });
      },
      onDragEnd: () => {
        setDraggingItem(null);
        setActiveDropZone(null);
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (activeDropZone !== zoneId) {
          setActiveDropZone(zoneId);
        }
      },
      onDragEnter: (e: React.DragEvent) => {
        e.preventDefault();
        setActiveDropZone(zoneId);
      },
      onDragLeave: (e: React.DragEvent) => {
        e.preventDefault();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        if (activeDropZone === zoneId) {
          setActiveDropZone(null);
        }
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        handleDropOnSlot(side, position);
        setActiveDropZone(null);
        setDraggingItem(null);
      },
      onPointerDown: (e: React.PointerEvent) => {
        if (!slot || state.combatState) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        } catch {}
        startPointerDrag(
          { type: 'BOARD_SLOT', side, position, card: slot.card },
          e.clientX,
          e.clientY,
          e.pointerType
        );
      },
      onPointerUp: (e: React.PointerEvent) => {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        } catch {}
      },
    };
  };

  // Quick swap active player hand and perspective (Solo Mode & Spectators)
  const handleSwapPerspective = useCallback(() => {
    if (state.roomMode === 'online' && state.myRole !== 'spectator') {
      // Locked in online mode for actual players to prevent peeking
      return;
    }
    Sound.playCardFlip();
    const nextP = bottomSide === 'player1' ? 'player2' : 'player1';
    commitState(TabletopActions.setPerspective(state, nextP));
  }, [bottomSide, commitState, state]);

  // Turn Pass: When in solo auto-switch mode, automatically flip perspective to new active player
  const handlePassTurn = useCallback(() => {
    if (state.roomMode === 'online' && state.currentTurn !== state.myRole) {
      return;
    }
    Sound.playTurnChange();
    const nextTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
    let nextState = TabletopActions.passTurn(state);
    if (isSoloAutoSwitch && state.roomMode !== 'online') {
      nextState = TabletopActions.setPerspective(nextState, nextTurn);
    }
    commitState(nextState, true);
  }, [commitState, isSoloAutoSwitch, state]);

  // In-Game Synchronized Coin Flip
  const handleTriggerInGameCoinFlip = useCallback(() => {
    Sound.playCardFlip();
    const flipId = `coin-${Date.now()}`;
    const initiatorName = state[bottomSide].name;
    const initialFlip: TabletopActiveCoinFlip = {
      id: flipId,
      initiatorSide: bottomSide,
      initiatorName,
      isFlipping: true,
      timestamp: Date.now(),
    };

    commitState(TabletopActions.setActiveCoinFlip(state, initialFlip));

    setTimeout(() => {
      const outcome: 'HEADS' | 'TAILS' = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
      const resolvedFlip: TabletopActiveCoinFlip = {
        id: flipId,
        initiatorSide: bottomSide,
        initiatorName,
        isFlipping: false,
        result: outcome,
        timestamp: Date.now(),
      };
      commitState((curr) => TabletopActions.setActiveCoinFlip(curr, resolvedFlip));
    }, 800);
  }, [bottomSide, commitState, state]);

  // Keyboard shortcut listener: H toggles hand tray, Tab toggles active player hand
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setIsHandExpanded((prev) => !prev);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        handleSwapPerspective();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwapPerspective]);

  // Real-time Firestore & WebRTC P2P sync subscription when in online room
  useEffect(() => {
    if (state.roomMode !== 'online' || !state.roomCode) {
      setConnectionInfo(null);
      return;
    }

    const p2pRole: 'player1' | 'player2' = state.myRole === 'player2' ? 'player2' : 'player1';

    const applyRemoteUpdate = (incoming: TabletopRemoteUpdate | TabletopV3State) => {
      isSyncingFromRemoteRef.current = true;
      setHistory((curr) => {
        let nextPresent: TabletopV3State;

        if ((incoming as TabletopRemoteUpdate).type === 'PARTITION') {
          const part = incoming as Extract<TabletopRemoteUpdate, { type: 'PARTITION' }>;
          // If the update came from myself, ignore to prevent echo loops
          if (part.senderRole === curr.present.myRole) {
            return curr;
          }
          const { senderRole, sideState, opponentBoard, shared } = part;

          // Spectator mirror mode: update both players seamlessly
          if (curr.present.myRole === 'spectator') {
            const updatedP1 = senderRole === 'player1' ? sideState : { ...curr.present.player1 };
            const updatedP2 = senderRole === 'player2' ? sideState : { ...curr.present.player2 };

            if (opponentBoard) {
              const targetPlayer = senderRole === 'player1' ? updatedP2 : updatedP1;
              reconcileBoardDamageByInstanceId(targetPlayer, opponentBoard);
            }

            nextPresent = {
              ...curr.present,
              player1: updatedP1,
              player2: updatedP2,
              stadium: shared?.stadium !== undefined ? shared.stadium : curr.present.stadium,
              activeSpotlight: shared?.activeSpotlight !== undefined ? shared.activeSpotlight : curr.present.activeSpotlight,
              currentTurn: shared?.currentTurn || curr.present.currentTurn,
              turnCount: shared?.turnCount || curr.present.turnCount,
              combatState: shared?.combatState !== undefined ? shared.combatState : curr.present.combatState,
              lastCombatResult: shared?.lastCombatResult !== undefined ? shared.lastCombatResult : curr.present.lastCombatResult,
              actionToast: shared?.actionToast !== undefined ? shared.actionToast : curr.present.actionToast,
              isGameStarted: shared?.isGameStarted !== undefined ? shared.isGameStarted : curr.present.isGameStarted,
              turnDecision: shared?.turnDecision !== undefined ? shared.turnDecision : curr.present.turnDecision,
              winner: shared?.winner !== undefined ? shared.winner : curr.present.winner,
              activeCoinFlip: shared?.activeCoinFlip !== undefined ? shared.activeCoinFlip : curr.present.activeCoinFlip,
              vfxEvent: shared?.vfxEvent !== undefined ? shared.vfxEvent : curr.present.vfxEvent,
              mulliganReveal: shared?.mulliganReveal !== undefined ? shared.mulliganReveal : curr.present.mulliganReveal,
              updatedAt: part.timestamp,
            };
            return {
              past: curr.past,
              present: nextPresent,
              future: curr.future,
            };
          }

          const myRole = curr.present.myRole as 'player1' | 'player2';

          // Reconcile opponent modifications to my active/bench damage & conditions strictly by card.instanceId
          let updatedMyPlayerState = curr.present[myRole];
          if (opponentBoard && updatedMyPlayerState) {
            reconcileBoardDamageByInstanceId(updatedMyPlayerState, opponentBoard);
          }

          // Reconcile pendingConsent with race-condition guard
          let resolvedPendingConsent = curr.present.pendingConsent;
          const incomingConsent = shared?.pendingConsent;
          if (incomingConsent !== undefined) {
            if (incomingConsent) {
              const isAlreadyResolved =
                (incomingConsent.id && resolvedConsentIdsRef.current.has(incomingConsent.id)) ||
                (curr.present.lastConsentResult &&
                  curr.present.lastConsentResult.timestamp >= incomingConsent.timestamp) ||
                (shared?.lastConsentResult &&
                  shared.lastConsentResult.timestamp >= incomingConsent.timestamp);
              if (isAlreadyResolved) {
                resolvedPendingConsent = null;
              } else if (!resolvedPendingConsent || incomingConsent.timestamp >= resolvedPendingConsent.timestamp) {
                resolvedPendingConsent = incomingConsent;
              }
            } else {
              resolvedPendingConsent = null;
            }
          }

          // Reconcile turnDecision with race-condition guard
          let resolvedTurnDecision = curr.present.turnDecision;
          const incomingTurnDecision = shared?.turnDecision;
          if (incomingTurnDecision !== undefined) {
            if (incomingTurnDecision) {
              if (!resolvedTurnDecision || incomingTurnDecision.timestamp >= (resolvedTurnDecision.timestamp || 0)) {
                resolvedTurnDecision = incomingTurnDecision;
              }
            } else {
              resolvedTurnDecision = null;
            }
          }

          // Reconcile combatState with race-condition guard
          let resolvedCombatState = curr.present.combatState;
          const incomingCombat = shared?.combatState;
          if (incomingCombat !== undefined) {
            if (incomingCombat) {
              const isResolved =
                (incomingCombat.id && resolvedCombatIdsRef.current.has(incomingCombat.id)) ||
                (curr.present.lastCombatResult && (
                  (incomingCombat.id && curr.present.lastCombatResult.id === incomingCombat.id) ||
                  incomingCombat.timestamp <= curr.present.lastCombatResult.timestamp
                )) ||
                (shared?.lastCombatResult && (
                  (incomingCombat.id && shared.lastCombatResult.id === incomingCombat.id) ||
                  incomingCombat.timestamp <= shared.lastCombatResult.timestamp
                )) ||
                incomingCombat.timestamp <= lastResolvedCombatTimestampRef.current;

              if (isResolved) {
                resolvedCombatState = null;
              } else if (!resolvedCombatState || incomingCombat.timestamp >= resolvedCombatState.timestamp) {
                resolvedCombatState = incomingCombat;
              }
            } else {
              resolvedCombatState = null;
            }
          }

          // Turn monotonicity guard: In turn-based play, incoming delayed packets must never roll back turnCount
          const incomingTurnCount = typeof shared?.turnCount === 'number' ? shared.turnCount : curr.present.turnCount;
          const isIncomingNewerTurn = incomingTurnCount > curr.present.turnCount;
          const isIncomingSameTurn = incomingTurnCount === curr.present.turnCount;
          const resolvedCurrentTurn =
            isIncomingNewerTurn || isIncomingSameTurn
              ? (shared?.currentTurn ?? curr.present.currentTurn)
              : curr.present.currentTurn;
          const resolvedTurnCount = Math.max(curr.present.turnCount, incomingTurnCount);

          nextPresent = {
            ...curr.present,
            [senderRole]: sideState,
            [myRole]: updatedMyPlayerState,
            stadium: shared?.stadium !== undefined ? shared.stadium : curr.present.stadium,
            activeSpotlight:
              shared?.activeSpotlight !== undefined
                ? shared.activeSpotlight?.id &&
                  dismissedSpotlightIdsRef.current.has(shared.activeSpotlight.id)
                  ? null
                  : shared.activeSpotlight
                : curr.present.activeSpotlight,
            currentTurn: resolvedCurrentTurn,
            turnCount: resolvedTurnCount,
            combatState: resolvedCombatState,
            lastCombatResult: shared?.lastCombatResult !== undefined ? shared.lastCombatResult : curr.present.lastCombatResult,
            actionToast: shared?.actionToast !== undefined ? shared.actionToast : curr.present.actionToast,
            isGameStarted: shared?.isGameStarted ?? curr.present.isGameStarted,
            pendingConsent: resolvedPendingConsent,
            lastConsentResult: shared?.lastConsentResult !== undefined ? shared.lastConsentResult : curr.present.lastConsentResult,
            turnDecision: resolvedTurnDecision,
            winner: shared?.winner !== undefined ? shared.winner : curr.present.winner,
            activeCoinFlip: shared?.activeCoinFlip !== undefined ? shared.activeCoinFlip : curr.present.activeCoinFlip,
            vfxEvent: shared?.vfxEvent !== undefined ? shared.vfxEvent : curr.present.vfxEvent,
            mulliganReveal: shared?.mulliganReveal !== undefined ? shared.mulliganReveal : curr.present.mulliganReveal,
            updatedAt: part.timestamp,
          };
        } else {
          // Full state fallback (initial room connection)
          const remoteState = ((incoming as any).state || incoming) as TabletopV3State;
          const myRole = curr.present.myRole;

          if (myRole === 'spectator') {
            nextPresent = {
              ...remoteState,
              myRole: 'spectator',
              perspective: curr.present.perspective,
            };
            return {
              past: curr.past,
              present: nextPresent,
              future: curr.future,
            };
          }

          // Protect local in-flight consent & turn decision against stale full state echoes
          let fullResolvedConsent = remoteState.pendingConsent || null;
          if (fullResolvedConsent) {
            const isAlreadyResolved =
              (fullResolvedConsent.id && resolvedConsentIdsRef.current.has(fullResolvedConsent.id)) ||
              (curr.present.lastConsentResult &&
                curr.present.lastConsentResult.timestamp >= fullResolvedConsent.timestamp) ||
              (remoteState.lastConsentResult &&
                remoteState.lastConsentResult.timestamp >= fullResolvedConsent.timestamp);
            if (isAlreadyResolved) {
              fullResolvedConsent = null;
            }
          }
          if (curr.present.pendingConsent && (!fullResolvedConsent || fullResolvedConsent.timestamp < curr.present.pendingConsent.timestamp)) {
            const isResolved =
              remoteState.lastConsentResult &&
              remoteState.lastConsentResult.timestamp >= curr.present.pendingConsent.timestamp;
            if (!isResolved) {
              fullResolvedConsent = curr.present.pendingConsent;
            }
          }

          let fullResolvedTurnDecision = remoteState.turnDecision || null;
          if (
            curr.present.turnDecision &&
            curr.present.turnDecision.phase !== 'IDLE' &&
            (!fullResolvedTurnDecision || fullResolvedTurnDecision.timestamp < curr.present.turnDecision.timestamp)
          ) {
            fullResolvedTurnDecision = curr.present.turnDecision;
          }

          let fullResolvedCombat = remoteState.combatState || null;
          if (fullResolvedCombat) {
            const isResolved =
              (fullResolvedCombat.id && resolvedCombatIdsRef.current.has(fullResolvedCombat.id)) ||
              (curr.present.lastCombatResult && (
                (fullResolvedCombat.id && curr.present.lastCombatResult.id === fullResolvedCombat.id) ||
                fullResolvedCombat.timestamp <= curr.present.lastCombatResult.timestamp
              )) ||
              (remoteState.lastCombatResult && (
                (fullResolvedCombat.id && remoteState.lastCombatResult.id === fullResolvedCombat.id) ||
                fullResolvedCombat.timestamp <= remoteState.lastCombatResult.timestamp
              )) ||
              fullResolvedCombat.timestamp <= lastResolvedCombatTimestampRef.current;

            if (isResolved) {
              fullResolvedCombat = null;
            }
          }

          nextPresent = {
            ...remoteState,
            // Keep local perspective and myRole intact
            perspective: curr.present.perspective,
            myRole: myRole,
            pendingConsent: fullResolvedConsent,
            turnDecision: fullResolvedTurnDecision,
            combatState: fullResolvedCombat,
            lastCombatResult: remoteState.lastCombatResult || curr.present.lastCombatResult,
            // Keep local player state intact so opponent full state cannot overwrite my hand/deck, but reconcile damage strictly by card.instanceId
            player1:
              myRole === 'player1'
                ? (() => {
                    const localP1 = {
                      ...curr.present.player1,
                      active: curr.present.player1.active ? { ...curr.present.player1.active } : null,
                      bench: curr.present.player1.bench.map((b) => (b ? { ...b } : null)),
                    };
                    if (remoteState.player1) {
                      const oppSync: OpponentBoardSync = {
                        active: remoteState.player1.active
                          ? {
                              instanceId: remoteState.player1.active.card?.instanceId,
                              damage: remoteState.player1.active.damage,
                              specialConditions: remoteState.player1.active.specialConditions || [],
                            }
                          : null,
                        bench: (remoteState.player1.bench || []).map((b) =>
                          b
                            ? {
                                instanceId: b.card?.instanceId,
                                damage: b.damage,
                                specialConditions: b.specialConditions || [],
                              }
                            : null
                        ),
                      };
                      reconcileBoardDamageByInstanceId(localP1, oppSync);
                    }
                    return localP1;
                  })()
                : remoteState.player1,
            player2:
              myRole === 'player2'
                ? (() => {
                    const localP2 = {
                      ...curr.present.player2,
                      active: curr.present.player2.active ? { ...curr.present.player2.active } : null,
                      bench: curr.present.player2.bench.map((b) => (b ? { ...b } : null)),
                    };
                    if (remoteState.player2) {
                      const oppSync: OpponentBoardSync = {
                        active: remoteState.player2.active
                          ? {
                              instanceId: remoteState.player2.active.card?.instanceId,
                              damage: remoteState.player2.active.damage,
                              specialConditions: remoteState.player2.active.specialConditions || [],
                            }
                          : null,
                        bench: (remoteState.player2.bench || []).map((b) =>
                          b
                            ? {
                                instanceId: b.card?.instanceId,
                                damage: b.damage,
                                specialConditions: b.specialConditions || [],
                              }
                            : null
                        ),
                      };
                      reconcileBoardDamageByInstanceId(localP2, oppSync);
                    }
                    return localP2;
                  })()
                : remoteState.player2,
            activeSpotlight:
              remoteState.activeSpotlight?.id &&
              dismissedSpotlightIdsRef.current.has(remoteState.activeSpotlight.id)
                ? null
                : remoteState.activeSpotlight,
          };
        }

        return {
          past: curr.past, // Do NOT push remote opponent updates to local undo history
          present: nextPresent,
          future: [],
        };
      });
      setTimeout(() => {
        isSyncingFromRemoteRef.current = false;
      }, 50);
    };

    // 1. Initialize WebRTC P2P DataChannel
    TabletopSyncService.initWebRtc(
      state.roomCode,
      p2pRole,
      applyRemoteUpdate
    );

    // 2. Track connection status changes
    const unsubStatus = TabletopSyncService.onConnectionStatusChange(
      state.roomCode,
      (info) => setConnectionInfo(info)
    );

    // 3. Subscribe to BroadcastChannel & Firestore
    const unsubscribe = TabletopSyncService.subscribeToRoom(
      state.roomCode,
      applyRemoteUpdate,
      (err) => {
        console.warn('Firestore real-time subscription error:', err);
      },
      p2pRole,
      (cursor) => {
        // Only display if cursor is from opponent
        if (state.myRole !== 'spectator' && cursor.senderRole === p2pRole) return;
        const cursorEl = opponentCursorElRef.current;
        if (!cursorEl) return;

        const displayX = cursor.x * 100;
        const displayY = (1 - cursor.y) * 100;

        // Zero React re-renders: update DOM directly in animation frame
        requestAnimationFrame(() => {
          if (!cursorEl) return;
          cursorEl.style.display = 'flex';
          cursorEl.style.opacity = '1';
          cursorEl.style.left = `${displayX}%`;
          cursorEl.style.top = `${displayY}%`;
        });

        // Auto fade cursor after inactivity
        if (cursorFadeTimeoutRef.current) clearTimeout(cursorFadeTimeoutRef.current);
        cursorFadeTimeoutRef.current = setTimeout(() => {
          if (opponentCursorElRef.current) {
            opponentCursorElRef.current.style.opacity = '0';
          }
        }, 3000);
      }
    );

    return () => {
      unsubStatus();
      unsubscribe();
      if (cursorFadeTimeoutRef.current) clearTimeout(cursorFadeTimeoutRef.current);
    };
  }, [state.roomMode, state.roomCode, state.myRole]);

  // Save active online room session to sessionStorage & localStorage for seamless Back/Forward reconnect
  useEffect(() => {
    if (state.roomMode === 'online' && state.roomCode && state.myRole) {
      try {
        const sessionData = JSON.stringify({
          roomCode: state.roomCode,
          myRole: state.myRole,
          perspective: state.perspective,
          timestamp: Date.now(),
        });
        sessionStorage.setItem('playmat_v3_session', sessionData);
        localStorage.setItem('playmat_v3_session', sessionData);
      } catch {}
    }
  }, [state.roomMode, state.roomCode, state.myRole, state.perspective]);

  // Auto-open requested action on requester machine when consent is approved by opponent
  const lastProcessedConsentRef = useRef<number>(0);
  useEffect(() => {
    if (!state.lastConsentResult) return;
    const res = state.lastConsentResult;
    if (res.timestamp > lastProcessedConsentRef.current) {
      lastProcessedConsentRef.current = res.timestamp;
      if (res.requesterSide === state.myRole && res.approved) {
        if (res.actionType === 'INSPECT_TOP') {
          setIsTopCardsOpen(true);
        } else if (res.actionType === 'SHUFFLE_DECK') {
          setShuffleNotice('สับแล้ว ✓ (ได้รับความยินยอม)');
          setTimeout(() => setShuffleNotice(null), 2500);
        } else if (res.actionType === 'START_GAME') {
          Sound.playGameVictory();
          commitState((curr) => {
            const next = TabletopActions.revealAllFacedown(curr);
            next.isGameStarted = true;
            next.pendingConsent = null;
            return TabletopActions.setActionToast(next, {
              id: `start-game-${Date.now()}`,
              message: "✨ ทั้งสองฝ่ายพร้อมแล้ว! เริ่มการแข่งขัน Let's Play!",
              icon: '🚀',
              type: 'SUCCESS',
            });
          });
        } else if (res.actionType === 'REMATCH') {
          Sound.playCardPlacement();
          commitState((curr) => {
            const next = TabletopActions.resetToSetup(curr);
            return TabletopActions.setActionToast(next, {
              id: `rematch-${Date.now()}`,
              message: '🔄 ทั้งสองฝ่ายตกลงเริ่มเกมใหม่! กรุณาเลือกเด็คของคุณ',
              icon: '🔄',
              type: 'INFO',
            });
          });
          setIsDeckSelectorOpen(true);
        } else if (res.actionType === 'SWITCH_POKEMON') {
          Sound.playCardPlacement();
          setSelectedField(null);
          setPreviewingCard(null);
          commitState((curr) => {
            const { targetSide, benchIndex } = res.payload || {};
            let next = curr;
            if (targetSide && typeof benchIndex === 'number') {
              const targetPlayer = curr[targetSide as 'player1' | 'player2'];
              const revealedCard = (res as any).revealedCard || res.payload?.revealedCard;
              const targetInstanceId = revealedCard?.instanceId;
              const isAlreadySwitched = targetInstanceId
                ? targetPlayer.active?.card?.instanceId === targetInstanceId
                : false;
              if (!isAlreadySwitched) {
                let actualBenchIndex = benchIndex;
                if (targetInstanceId) {
                  const foundIdx = targetPlayer.bench.findIndex(
                    (b: any) => b?.card?.instanceId === targetInstanceId
                  );
                  if (foundIdx >= 0) actualBenchIndex = foundIdx;
                }
                if (targetPlayer.bench[actualBenchIndex]) {
                  next = TabletopActions.switchActiveWithBench(curr, targetSide, actualBenchIndex);
                }
              }
            }
            return TabletopActions.setActionToast(next, {
              id: `switch-approved-${Date.now()}`,
              message: '🔄 ฝ่ายตรงข้ามยินยอมสลับตำแหน่งโปเกมอนแล้ว (คำสั่งของบอส)',
              icon: '🔄',
              type: 'SUCCESS',
            });
          });
        } else if (res.actionType === 'DISCARD_ENERGY') {
          Sound.playCardPlacement();
          commitState((curr) => {
            const { targetSide, targetPosition, energyId, energyType } = res.payload || {};
            let next = curr;
            if (targetSide && targetPosition !== undefined && energyId) {
              const targetSlot = targetPosition === 'ACTIVE'
                ? curr[targetSide as 'player1' | 'player2'].active
                : curr[targetSide as 'player1' | 'player2'].bench[targetPosition];
              const hasEnergy = targetSlot?.attachedEnergies.some((e) => e.instanceId === energyId);
              if (hasEnergy) {
                next = TabletopActions.moveEnergy(curr, targetSide, targetPosition, energyId, 'DISCARD');
              }
            }
            return TabletopActions.setActionToast(next, {
              id: `discard-energy-approved-${Date.now()}`,
              message: `💥 ฝ่ายตรงข้ามยินยอมให้ถอดพลังงาน (${energyType || 'Energy'}) ลงสุสานแล้ว`,
              icon: '💥',
              type: 'SUCCESS',
            });
          });
        }
      } else if (res.requesterSide === state.myRole && !res.approved) {
        if (res.actionType === 'SWITCH_POKEMON') {
          commitState((curr) =>
            TabletopActions.setActionToast(curr, {
              id: `switch-denied-${Date.now()}`,
              message: '❌ ฝ่ายตรงข้ามปฏิเสธคำขอสลับตำแหน่งโปเกมอน',
              icon: '❌',
              type: 'WARNING',
            })
          );
        } else if (res.actionType === 'DISCARD_ENERGY') {
          commitState((curr) =>
            TabletopActions.setActionToast(curr, {
              id: `discard-energy-denied-${Date.now()}`,
              message: '❌ ฝ่ายตรงข้ามปฏิเสธคำขอถอดพลังงาน',
              icon: '❌',
              type: 'WARNING',
            })
          );
        }
      }
    }
  }, [state.lastConsentResult, state.myRole, commitState]);

  // Reset reviewing board status when winner clears
  useEffect(() => {
    if (!state.winner) {
      setIsReviewingBoard(false);
    }
  }, [state.winner]);

  // Auto-close turn decision modal whenever decision reaches DECIDED
  useEffect(() => {
    if (state.turnDecision?.phase === 'DECIDED') {
      setIsTurnDecisionModalOpen(false);
    }
  }, [state.turnDecision?.phase]);

  // Turn splash animation when it becomes local player's turn
  useEffect(() => {
    if (!state.isGameStarted) {
      prevTurnRef.current = null;
      prevGameStartedRef.current = false;
      return;
    }

    const justStarted = !prevGameStartedRef.current && state.isGameStarted;
    const turnChanged = prevTurnRef.current !== null && prevTurnRef.current !== state.currentTurn;

    if (isMyTurn && (justStarted || turnChanged)) {
      setShowTurnSplash(true);
      Sound.playTurnChange();

      // Auto-draw 1 card upon turn start (skips Player 1's Turn 1 per Pokemon TCG official rules)
      const activeSide = state.roomMode === 'online' ? (state.myRole as 'player1' | 'player2') : bottomSide;
      const startingPlayer = state.turnDecision?.startingPlayer || 'player1';
      const isFirstTurnOfStartingPlayer = state.turnCount === 1 && state.currentTurn === startingPlayer;

      if (autoDrawOnTurn && !isFirstTurnOfStartingPlayer) {
        commitState((curr) => {
          if (curr[activeSide].deck.length === 0) return curr;
          let next = TabletopActions.drawCards(curr, activeSide, 1);
          const pName = next[activeSide].name;
          next = TabletopActions.setActionToast(next, {
            id: `autodraw-${Date.now()}`,
            message: `🎴 ${pName} จั่วการ์ดเริ่มเทิร์นอัตโนมัติ (1 ใบ)`,
            icon: '🎴',
            playerSide: activeSide,
            type: 'INFO',
            timestamp: Date.now(),
          });
          return next;
        });
      }

      const timer = setTimeout(() => {
        setShowTurnSplash(false);
      }, 1200);
      return () => clearTimeout(timer);
    }

    prevTurnRef.current = state.currentTurn;
    prevGameStartedRef.current = state.isGameStarted;
  }, [state.isGameStarted, state.currentTurn, isMyTurn, autoDrawOnTurn, bottomSide, state.roomMode, state.myRole, state.turnDecision?.startingPlayer, state.turnCount, commitState]);

  // Priority-based mutual dismissal of lower-tier action menus and modals
  useEffect(() => {
    // Tier 6: Winner announced -> Close all open action menus, modals, and viewers
    if (state.winner) {
      setSelectedField(null);
      setSelectedHandCardInfo(null);
      setIsDeckSearchOpen(false);
      setIsTopCardsOpen(false);
      setIsDiscardLostOpen(false);
      setIsRandomizerOpen(false);
      setIsHandToDeckOpen(false);
      setIsDeckSelectorOpen(false);
      setIsMulliganModalOpen(false);
      setIsTurnDecisionModalOpen(false);
      setPreviewingCard(null);
      return;
    }

    // Tier 5: Pending Consent arrived -> Dismiss local card action sheets
    if (state.pendingConsent) {
      setSelectedField(null);
      setSelectedHandCardInfo(null);
    }

    // Tier 4: Interactive coin toss or turn decision choice -> Dismiss local card action sheets
    if (state.turnDecision?.phase === 'FLIPPING' || state.turnDecision?.phase === 'CHOOSING') {
      setSelectedField(null);
      setSelectedHandCardInfo(null);
    }

    // Tier 4: Mulligan reveal -> Dismiss local card action sheets
    if (state.mulliganReveal && state.mulliganReveal.status !== 'DISMISSED') {
      setSelectedField(null);
      setSelectedHandCardInfo(null);
    }
  }, [state.winner, state.pendingConsent, state.turnDecision?.phase, state.mulliganReveal]);

  // Auto-sync user cloud decks on mount if authenticated
  useEffect(() => {
    const user = auth.currentUser;
    if (user?.uid) {
      useDeckStore.getState().loadUserDecksFromCloud(user.uid).catch(console.warn);
    }
  }, []);

  // Undo action
  const handleUndo = useCallback(() => {
    setHistory((curr) => {
      if (curr.past.length === 0) return curr;
      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, -1);
      if (previous.roomMode === 'online' && previous.roomCode) {
        TabletopSyncService.syncState(previous.roomCode, previous);
      }
      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future],
      };
    });
  }, []);

  // Redo action
  const handleRedo = useCallback(() => {
    setHistory((curr) => {
      if (curr.future.length === 0) return curr;
      const next = curr.future[0];
      const newFuture = curr.future.slice(1);
      if (next.roomMode === 'online' && next.roomCode) {
        TabletopSyncService.syncState(next.roomCode, next);
      }
      return {
        past: [...curr.past, curr.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  // Quick Setup for board (draw 7, place active, place prizes)
  const handleQuickSetup = useCallback(() => {
    Sound.playCardPlacement();
    const side = state.roomMode === 'online' ? (state.myRole === 'player2' ? 'player2' : 'player1') : 'both';
    commitState((curr) => TabletopActions.quickSetup(curr, side), state.roomMode === 'online');
  }, [commitState, state]);

  // Check board readiness for beginning the match
  const setupReadiness = useMemo(() => checkSetupReadiness(state), [state]);

  // Reveal all facedown cards together and officially start the match (Let's Play!)
  const handleRevealAllFacedown = useCallback(() => {
    const check = checkSetupReadiness(state);
    if (!check.isReady) {
      Sound.playWarning();
      commitState((curr) =>
        TabletopActions.setActionToast(curr, {
          id: `setup-warning-${Date.now()}`,
          message: check.message,
          icon: '⚠️',
          type: 'WARNING',
        })
      );
      return;
    }

    if (state.roomMode === 'online') {
      if (state.pendingConsent?.actionType === 'START_GAME') {
        Sound.playGameVictory();
        commitState((curr) => {
          const responded = TabletopActions.respondConsent(curr, true);
          const next = TabletopActions.revealAllFacedown(responded);
          next.isGameStarted = true;
          next.pendingConsent = null;
          return TabletopActions.setActionToast(next, {
            id: `start-game-${Date.now()}`,
            message: "✨ ทั้งสองฝ่ายพร้อมแล้ว! เริ่มการแข่งขัน Let's Play!",
            icon: '🚀',
            type: 'SUCCESS',
          });
        }, true);
        return;
      }

      Sound.playCardPlacement();
      const myName = state[state.myRole === 'player2' ? 'player2' : 'player1'].name;
      commitState((curr) =>
        TabletopActions.requestConsent(curr, {
          id: `start-game-${Date.now()}`,
          requesterSide: curr.myRole === 'player2' ? 'player2' : 'player1',
          requesterName: myName,
          actionType: 'START_GAME',
          description: "พร้อมเริ่มการแข่งขัน (Let's Play!) พลิกหงายโปเกมอนทั้งหมดและเริ่มเกมพร้อมกัน",
          timestamp: Date.now(),
        }),
        true
      );
      return;
    }

    Sound.playGameVictory();
    commitState((curr) => {
      const next = TabletopActions.revealAllFacedown(curr);
      next.isGameStarted = true;
      return TabletopActions.setActionToast(next, {
        id: `start-game-${Date.now()}`,
        message: "✨ พลิกหงายการ์ดทั้งหมดแล้ว! เริ่มการแข่งขัน Let's Play!",
        icon: '🚀',
        type: 'SUCCESS',
      });
    });
  }, [commitState, state]);

  // Reset Table / Start New Match: Open Deck Selection first
  const handleResetTable = useCallback(() => {
    if (state.roomMode === 'online') {
      Sound.playCardPlacement();
      const myName = state[state.myRole === 'player2' ? 'player2' : 'player1'].name;
      commitState((curr) =>
        TabletopActions.requestConsent(curr, {
          id: `rematch-${Date.now()}`,
          requesterSide: curr.myRole === 'player2' ? 'player2' : 'player1',
          requesterName: myName,
          actionType: 'REMATCH',
          description: 'ต้องการเริ่มเกมใหม่และเลือกเด็คใหม่พร้อมกัน (Rematch & Select Decks)',
          timestamp: Date.now(),
        }),
        true
      );
    } else {
      setIsNewMatchModalOpen(true);
    }
  }, [commitState, state]);

  // Confirm start new match with chosen decks and starting player
  const handleStartNewMatch = useCallback(
    (
      p1Cards: CardInstance[],
      p1Name: string,
      p2Cards: CardInstance[],
      p2Name: string,
      firstPlayer: 'player1' | 'player2' = 'player1'
    ) => {
      commitState(TabletopActions.startNewMatch(state, p1Cards, p1Name, p2Cards, p2Name, firstPlayer));
    },
    [commitState, state]
  );

  // Handle deck selection for specific player side
  const handleSelectDeckForSide = (
    side: 'player1' | 'player2',
    cards: CardInstance[],
    name: string
  ) => {
    commitState(TabletopActions.changeDeck(state, side, cards, name));
  };


  // 3D Casino Riffle Deck Shuffle Active Trigger
  const triggerShuffleAnimation = useCallback(
    (side: 'player1' | 'player2') => {
      const deckEl =
        document.querySelector(`[data-deck-zone="true"][data-deck-side="${side}"]`) ||
        (side === bottomSide ? document.querySelector('#deck-pile') : document.querySelector('#top-deck-pile-mobile'));
      if (deckEl) {
        setActiveShuffleDeckEl(deckEl);
      } else {
        Sound.playDeckShuffle();
      }
    },
    [bottomSide]
  );

  // Draw cards with PTCG Pocket / Hearthstone in-slot slide-up & 3D flip entrance (no floating card)
  const handleDrawCards = useCallback(
    (side: 'player1' | 'player2', count: number) => {
      const player = state[side];
      if (!player.deck.length) return;

      const actualCount = Math.min(count, player.deck.length);
      if (actualCount <= 0) return;

      const drawnCards = player.deck.slice(0, actualCount);

      if (side === bottomSide) {
        // 1. Deck peel motion on the local deck pile
        setIsDeckPeeling(true);
        setTimeout(() => {
          setIsDeckPeeling(false);
        }, 220 + (actualCount - 1) * 65);

        // 2. Map newly drawn cards to stagger delay for in-slot slide-up & 3D flip
        const newMap = new Map<string, number>();
        drawnCards.forEach((c, idx) => {
          newMap.set(c.instanceId, idx * 65);
        });
        setNewlyDrawnCardMap(newMap);

        // 3. Rhythmic tactile audio feedback (paper slide takeoff + mechanical slot snap)
        drawnCards.forEach((_, idx) => {
          const delay = idx * 65;
          if (delay === 0) {
            Sound.playCardDraw();
          } else {
            setTimeout(() => Sound.playCardDraw(), delay);
          }
          setTimeout(() => {
            Sound.playCardPlacement();
          }, delay + 220);
        });

        // 4. Auto-clear newly drawn map once animation sequence completes
        const totalDuration = 350 + (actualCount - 1) * 65 + 100;
        setTimeout(() => {
          setNewlyDrawnCardMap(new Map());
        }, totalDuration);
      } else {
        // Opponent draws: top deck peel & tactile audio
        setIsTopDeckPeeling(true);
        setTimeout(() => {
          setIsTopDeckPeeling(false);
        }, 220 + (actualCount - 1) * 65);

        for (let i = 0; i < actualCount; i++) {
          setTimeout(() => {
            Sound.playCardDraw();
            Sound.playCardPlacement();
          }, i * 65);
        }
      }

      setIsHandExpanded(true);
      commitState((curr) => TabletopActions.drawCards(curr, side, count));
    },
    [state, bottomSide, commitState]
  );

  // Click empty bench slot -> Only active in mobile mode
  const handleEmptyBenchClick = (side: 'player1' | 'player2', benchIndex: number) => {
    if (state.myRole === 'spectator') return;
    if (state[side].hand.length === 0) return;
    // On PC mode, card placement is strictly via drag-and-drop
    if (viewMode !== 'mobile') return;
    setEmptySlotTarget({ side, position: benchIndex });
  };

  // Toggle Bench Limit between 5 and 8 slots (e.g. for Area Zero Underdepths / Sky Field)
  const handleToggleBenchLimit = (side: 'player1' | 'player2') => {
    if (state.roomMode === 'online' && state.myRole !== 'both' && state.myRole !== side) return;
    Sound.playCardPlacement();
    const currentLimit = state[side].benchLimit || 5;
    const nextLimit = currentLimit === 5 ? 8 : 5;
    commitState((curr) => TabletopActions.setBenchLimit(curr, side, nextLimit));
  };

  // Click empty active spot -> Only active in mobile mode
  const handleEmptyActiveClick = (side: 'player1' | 'player2') => {
    if (state.myRole === 'spectator') return;
    if (state[side].hand.length === 0) return;
    // On PC mode, card placement is strictly via drag-and-drop
    if (viewMode !== 'mobile') return;
    setEmptySlotTarget({ side, position: 'ACTIVE' });
  };

  // Confirm slot placement from EmptySlotPickerModal
  const handleConfirmSlotPlacement = useCallback(
    (card: CardInstance, facedown: boolean) => {
      if (!emptySlotTarget) return;
      const { side, position } = emptySlotTarget;
      setEmptySlotTarget(null);

      const handCardEl =
        document.querySelector(`[data-testid="hand-card-item"][id*="${card.instanceId}"]`) ||
        document.querySelector('#hand-cards-tray');
      const targetSlotEl =
        position === 'ACTIVE'
          ? document.querySelector(`[data-slot-zone="true"][data-slot-side="${side}"][data-slot-pos="ACTIVE"]`)
          : document.querySelector(`[data-slot-zone="true"][data-slot-side="${side}"][data-slot-pos="${position}"]`);

      if (handCardEl && targetSlotEl) {
        triggerFlightBetweenElements(handCardEl, targetSlotEl, {
          card,
          isFacedown: facedown,
          type: 'HAND_TO_BOARD',
          durationMs: 340,
          onComplete: () => {
            Sound.playCardPlacement();
            const targetBox = targetSlotEl.getBoundingClientRect();
            const dropX = targetBox.left + targetBox.width / 2;
            const dropY = targetBox.top + targetBox.height / 2;
            const badgeLabel = position === 'ACTIVE' ? 'ACTIVE!' : 'BENCH!';
            const badgeIcon = position === 'ACTIVE' ? '🌱' : '✨';
            const badgeColor = position === 'ACTIVE' ? 'emerald' : 'cyan';
            addBadge(badgeLabel, dropX, dropY, badgeColor, badgeIcon);
            setLastPlayEvent({
              x: dropX,
              y: dropY,
              color: position === 'ACTIVE' ? 0x10b981 : 0x06b6d4,
              timestamp: Date.now(),
            });
          },
        });
      } else {
        Sound.playCardPlacement();
        const dropX = window.innerWidth / 2;
        const dropY = window.innerHeight / 2;
        addBadge(position === 'ACTIVE' ? 'ACTIVE!' : 'BENCH!', dropX, dropY, position === 'ACTIVE' ? 'emerald' : 'cyan');
        setLastPlayEvent({
          x: dropX,
          y: dropY,
          color: position === 'ACTIVE' ? 0x10b981 : 0x06b6d4,
          timestamp: Date.now(),
        });
      }

      commitState((curr) => TabletopActions.placeFromHand(curr, side, card.instanceId, position, facedown));
    },
    [emptySlotTarget, triggerFlightBetweenElements, addBadge, commitState]
  );

  // Balatro Tap-to-Target: Play lifted hand card directly to target slot with 3D arc flight
  const handleTapToTarget = useCallback(
    (targetSide: 'player1' | 'player2', targetPosition: 'ACTIVE' | number, card: CardInstance) => {
      if (state.myRole === 'spectator') return;

      const handCardEl =
        document.querySelector(`[data-testid="hand-card-item"][id*="${card.instanceId}"]`) ||
        document.querySelector('#hand-cards-tray');

      const posAttr = targetPosition === 'ACTIVE' ? 'ACTIVE' : String(targetPosition);
      const targetSlotEl =
        document.querySelector(`[data-slot-zone="true"][data-slot-side="${targetSide}"][data-slot-pos="${posAttr}"]`) ||
        document.getElementById(`slot-${targetPosition === 'ACTIVE' ? 'active' : `bench-${targetPosition}`}-card`) ||
        document.getElementById(`slot-${targetPosition === 'ACTIVE' ? 'active' : `bench-${targetPosition}`}`);

      if (handCardEl && targetSlotEl) {
        triggerFlightBetweenElements(handCardEl, targetSlotEl, {
          card,
          isFacedown: !state.isGameStarted && card.supertype === 'Pokemon',
          type: 'HAND_TO_BOARD',
          durationMs: 320,
          onComplete: () => {
            handleDropOnSlot(targetSide, targetPosition, { type: 'HAND_CARD', card, side: targetSide });
          },
        });
      } else {
        handleDropOnSlot(targetSide, targetPosition, { type: 'HAND_CARD', card, side: targetSide });
      }

      setSelectedHandCardId(null);
    },
    [handleDropOnSlot, state.isGameStarted, state.myRole, triggerFlightBetweenElements]
  );

  // Rename own player display name during active match
  const handleRenameSelf = useCallback(() => {
    if (state.roomMode !== 'online' || state.myRole === 'spectator' || state.myRole === 'both') {
      return;
    }
    const currentName = state[state.myRole].name;
    const newName = window.prompt('เปลี่ยนชื่อผู้เล่นของคุณ:', currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      const trimmed = newName.trim().slice(0, 20);
      try {
        localStorage.setItem('playmat_v3_display_name', trimmed);
      } catch {}
      commitState((curr) => ({
        ...curr,
        [state.myRole as 'player1' | 'player2']: {
          ...curr[state.myRole as 'player1' | 'player2'],
          name: trimmed,
        },
      }));
      if (state.roomCode) {
        TabletopSyncService.updatePlayerMeta(state.roomCode, state.myRole as 'player1' | 'player2', {
          name: trimmed,
          email: user?.email || undefined,
          uid: user?.uid || undefined,
        });
      }
    }
  }, [state, commitState, user]);

  // Selected Pokemon in play for PokemonActionModal
  const selectedPokemonSlot = selectedField
    ? selectedField.position === 'ACTIVE'
      ? state[selectedField.side].active
      : state[selectedField.side].bench[selectedField.position]
    : null;

  const handleCloseDeckSearch = (revealedCards: CardInstance[] = []) => {
    setIsDeckSearchOpen(false);
    if (state.roomMode === 'online') {
      const requesterSide: 'player1' | 'player2' =
        state.myRole && state.myRole !== 'both' ? (state.myRole as 'player1' | 'player2') : bottomSide;
      const requesterName =
        state[requesterSide].name || (requesterSide === 'player1' ? 'Player 1' : 'Player 2');
      const hasRevealed = revealedCards && revealedCards.length > 0;
      const cardNames = hasRevealed ? revealedCards.map((c) => getCardDisplayName(c)).join(', ') : '';
      const description = hasRevealed
        ? `${requesterName} ค้นหาและเลือก ${cardNames} จากสำรับ ต้องการให้ระบบสับหรือตัดเด็คหรือไม่?`
        : `${requesterName} ค้นหาสำรับเสร็จแล้ว ต้องการให้ระบบสับหรือตัดเด็คหรือไม่?`;

      commitState((curr) => {
        return TabletopActions.requestConsent(curr, {
          id: `consent-deck-cut-${Date.now()}`,
          actionType: 'SHUFFLE_DECK',
          requesterSide,
          requesterName,
          description,
          revealedCards: hasRevealed ? revealedCards : undefined,
          revealedCard: hasRevealed ? revealedCards[0] : undefined,
          timestamp: Date.now(),
        });
      }, true);
    } else {
      commitState((curr) => {
        return TabletopActions.setActionToast(curr, {
          id: `deck-search-done-${Date.now()}`,
          message: '🔍 ค้นหาสำรับเรียบร้อยแล้ว อย่าลืมสับเด็คของคุณ',
          icon: '🔀',
          type: 'INFO',
        });
      });
    }
  };

  return (
    <div
      id="playmat-v3-container"
      data-engine-mode={engineMode}
      className="fixed inset-0 w-full h-full h-[100dvh] max-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100 flex flex-col overflow-hidden select-none touch-none overscroll-none"
      style={{ height: '100dvh', maxHeight: '100dvh', overscrollBehavior: 'none' }}
    >
      {/* PixiJS Hardware-Accelerated Canvas Layer */}
      {engineMode === 'pixi' && (
        <PixiTabletopVfxLayer
          p1ActiveCard={state.player1.active?.card || null}
          p2ActiveCard={state.player2?.active?.card || null}
          p1DeckCount={state.player1.deck.length}
          p2DeckCount={state.player2.deck.length}
          p1HandCount={state.player1.hand.length}
          p2HandCount={state.player2.hand.length}
          currentTurn={state.currentTurn}
          turnCount={state.turnCount}
          isMyTurn={isMyTurn}
          shuffleNotice={shuffleNotice}
          combatState={state.combatState || null}
          stadium={state.stadium || null}
          lastPlayEvent={lastPlayEvent}
          particlesEnabled={isPixiVfxEnabled}
        />
      )}

      {/* Top Bar Header */}
      <header className="relative z-20 flex items-center justify-between px-2 sm:px-3 py-1 bg-slate-950/95 border-b border-white/10 backdrop-blur-md gap-1 select-none pt-[env(safe-area-inset-top,0px)]">
        {/* Left: Back, App title & Mode Toggle */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            id="btn-v3-back"
            onClick={() => setGameMode('deck')}
            className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer"
            title="ออกจากกระดาน"
          >
            <span>◀</span>
            <span className="hidden sm:inline">ออก</span>
          </button>

          <span className="text-xs font-black tracking-tight text-white whitespace-nowrap">
            🎲 Playmat V3
          </span>

          {/* Turn Indicator Capsule */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/90 border border-white/15 text-xs font-bold shadow-inner">
            <span className="text-amber-400 font-black whitespace-nowrap">Turn {state.turnCount}</span>
            <span className="hidden lg:inline text-slate-500">•</span>
            <span className="hidden lg:inline text-blue-300 font-bold truncate max-w-[110px]">
              {state.player1.deckName}
            </span>
            <span className="hidden lg:inline text-slate-500">vs</span>
            <span className="hidden lg:inline text-rose-300 font-bold truncate max-w-[110px]">
              {state.player2.deckName}
            </span>
          </div>

          {/* View Mode Toggle (Mobile Arena vs Desktop Tabletop) */}
          <button
            id="btn-toggle-view-mode"
            data-view-mode={viewMode}
            onClick={() => {
              const nextMode = viewMode === 'mobile' ? 'desktop' : 'mobile';
              setViewMode(nextMode);
              try {
                localStorage.setItem('playmat_view_mode', nextMode);
              } catch {}
              Sound.playCardFlip();
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold shadow-sm transition active:scale-95 cursor-pointer ${
              viewMode === 'mobile'
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50'
            }`}
            title="คลิกเพื่อสลับมุมมองระหว่างโหมดมือถือและโหมดโต๊ะแข่ง"
          >
            <span>{viewMode === 'mobile' ? '📱' : '🖥️'}</span>
            <span className="hidden sm:inline">{viewMode === 'mobile' ? 'โหมดมือถือ' : 'โหมดจอใหญ่'}</span>
          </button>
        </div>

        {/* Right: Primary actions + Quick Menu button */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 justify-end">
          {/* Quick Setup Button (Pre-game Auto Setup) */}
          {!state.isGameStarted && (
            <button
              id="btn-quick-setup"
              data-testid="btn-quick-setup"
              onClick={handleQuickSetup}
              title="จัดโต๊ะด่วน (จั่ว 7 ใบ, วาง Active คว่ำหน้า, วาง 6 ไพรซ์)"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white border border-amber-400/40 text-xs font-black shadow-lg shadow-amber-950/50 transition-all active:scale-95 cursor-pointer"
            >
              <span>⚡</span>
              <span className="hidden sm:inline">จัดด่วน</span>
            </button>
          )}

          {/* New Game Button */}
          <button
            id="btn-v3-new-game"
            data-testid="btn-reset-table"
            onClick={handleResetTable}
            title="เริ่มเกมใหม่ (เลือกเด็คและจัดโต๊ะ)"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 text-xs font-black shadow-lg shadow-emerald-950/50 transition-all active:scale-95 cursor-pointer"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">เริ่มใหม่</span>
          </button>

          {/* Online Room Sync (Local 2 Tabs / Multi-Window) */}
          <button
            id="btn-v3-online-room"
            data-room-code={state.roomCode || ''}
            onClick={() => setIsOnlineRoomOpen(true)}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
              state.roomMode === 'online'
                ? state.myRole === 'spectator'
                  ? 'bg-amber-950/80 border-amber-400 text-amber-200'
                  : 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                : 'bg-slate-800/80 hover:bg-slate-700 border-white/10 text-slate-300'
            }`}
            title="เล่น 2 จอ (Local Only)"
          >
            <span>{state.myRole === 'spectator' ? '👁️' : '💻'}</span>
            <span className="hidden sm:inline">
              {state.roomMode === 'online'
                ? state.myRole === 'spectator'
                  ? `เข้าชม ${state.roomCode}`
                  : `ห้อง ${state.roomCode}`
                : 'เล่น 2 จอ (Local)'}
            </span>
          </button>

          {/* Desktop Direct Change Deck Button */}
          <button
            id="btn-v3-change-deck"
            onClick={() => setIsDeckSelectorOpen(true)}
            className="hidden sm:flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-xs font-bold text-purple-200 transition-all active:scale-95 cursor-pointer"
            title="เลือกเด็ค (Meta Decks & Custom Decks)"
          >
            <span>🃏</span>
            <span>เลือกเด็ค</span>
          </button>

          {/* Realtime Connection Status Badge */}
          {state.roomMode === 'online' && connectionInfo && (
            <RealtimeConnectionBadge connectionInfo={connectionInfo} />
          )}

          {/* Online Role Badge (Always visible on all viewports in online mode) */}
          {state.roomMode === 'online' && (
            <div
              id="badge-online-role"
              className="flex px-2 py-0.5 rounded-full bg-slate-900 border border-emerald-400/40 text-[9px] sm:text-[10px] font-bold text-emerald-300 items-center gap-1 shadow whitespace-nowrap"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{state.myRole === 'player2' ? '🔴 Player 2' : '🔵 Player 1'}</span>
            </div>
          )}

          {/* Quick Menu Button (Settings, Tools, Secondary Toggles) */}
          <button
            id="btn-v3-menu"
            type="button"
            onClick={() => setIsQuickMenuOpen((prev) => !prev)}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
              isQuickMenuOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 border-white/15 text-slate-300 hover:text-white'
            }`}
            title="เมนูและการตั้งค่าเพิ่มเติม"
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">เมนู</span>
          </button>
        </div>
      </header>

      {/* Quick Menu Dropdown / Popover Modal */}
      {isQuickMenuOpen && (
        <div
          id="menu-v3-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-end p-2 sm:p-4 pt-12 animate-fadeIn"
          onClick={() => setIsQuickMenuOpen(false)}
        >
          <div
            id="menu-v3-dropdown"
            className="w-72 max-w-[90vw] bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 backdrop-blur-xl text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                <span>⚙️</span>
                <span>เมนูและการตั้งค่าเพิ่มเติม</span>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickMenuOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Change Deck (Visible in mobile where direct button is hidden) */}
            <button
              type="button"
              onClick={() => {
                setIsQuickMenuOpen(false);
                setIsDeckSelectorOpen(true);
              }}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-purple-900/50 border border-white/10 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>🃏</span>
                <span>เลือกเด็คการ์ด</span>
              </div>
              <span className="text-[10px] text-purple-300">Meta / Custom</span>
            </button>

            {/* 2-Player Consent Mode Toggle */}
            <button
              id="btn-toggle-consent-mode"
              type="button"
              onClick={() => commitState((curr) => TabletopActions.toggleConsentRequired(curr))}
              className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                state.isConsentRequired
                  ? 'bg-amber-950/60 border-amber-400/80 text-amber-200'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-white/10 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>🤝</span>
                <span>ระบบขอความยินยอม (Consent)</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                state.isConsentRequired ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-400'
              }`}>
                {state.isConsentRequired ? 'เปิด' : 'ปิด'}
              </span>
            </button>

            {/* Auto-Draw on Turn Toggle */}
            <button
              id="btn-toggle-autodraw"
              type="button"
              data-autodraw={autoDrawOnTurn ? 'true' : 'false'}
              onClick={handleToggleAutoDraw}
              className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                autoDrawOnTurn
                  ? 'bg-sky-950/60 border-sky-400/80 text-sky-200'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-white/10 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>🎴</span>
                <span>Auto จั่วการ์ดเมื่อเริ่มเทิร์น</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                autoDrawOnTurn ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-700 text-slate-400'
              }`}>
                {autoDrawOnTurn ? 'เปิด' : 'ปิด'}
              </span>
            </button>

            {/* Engine Mode Toggle (DOM vs PixiJS) */}
            <button
              id="btn-toggle-engine-mode"
              type="button"
              onClick={() => {
                const next = engineMode === 'dom' ? 'pixi' : 'dom';
                setEngineMode(next);
                onSwitchEngine?.();
                try {
                  localStorage.setItem('playmat_v3_engine', next);
                } catch {}
              }}
              className="flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer bg-slate-800/80 hover:bg-slate-700 border-white/10 text-slate-300"
            >
              <div className="flex items-center gap-2">
                <span>{engineMode === 'dom' ? '⚡' : '🎮'}</span>
                <span>เอนจินการแสดงผล</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                engineMode === 'dom' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/20 text-indigo-300'
              }`}>
                {engineMode === 'dom' ? 'DOM (เร็วพิเศษ)' : 'PixiJS (WebGL)'}
              </span>
            </button>

            {/* PixiJS VFX Toggle */}
            {engineMode === 'pixi' && (
              <button
                id="btn-toggle-pixi-vfx"
                type="button"
                onClick={() => setIsPixiVfxEnabled((prev) => !prev)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  isPixiVfxEnabled
                    ? 'bg-indigo-950/60 border-indigo-400/80 text-indigo-200'
                    : 'bg-slate-800/80 hover:bg-slate-700 border-white/10 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>⚡</span>
                  <span>เอฟเฟกต์ PixiJS VFX</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  isPixiVfxEnabled ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-slate-400'
                }`}>
                  {isPixiVfxEnabled ? 'เปิด' : 'ปิด'}
                </span>
              </button>
            )}

            {/* Action History Log Drawer */}
            <button
              id="btn-v3-toggle-log"
              type="button"
              onClick={() => {
                setIsQuickMenuOpen(false);
                setIsLogDrawerOpen(!isLogDrawerOpen);
              }}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-xs font-bold text-slate-200 transition-all active:scale-95 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>📜</span>
                <span>ประวัติการเล่น (History Log)</span>
              </div>
              <span className="text-[10px] text-slate-400">เปิดดู</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Floating Spectator Banner */}
      {state.roomMode === 'online' && state.myRole === 'spectator' && (
        <div
          id="banner-spectator-mode"
          className="relative z-30 flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-amber-950/95 via-amber-900/90 to-amber-950/95 border-b border-amber-500/40 backdrop-blur-md shadow-lg text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="font-bold text-amber-200">
              👁️ กำลังรับชมห้อง <span className="font-mono font-black text-amber-300">#{state.roomCode}</span>
            </span>
            <span className="text-amber-400/70 hidden sm:inline">•</span>
            <span className="text-slate-300 hidden sm:inline">
              {state.player1.name || 'Player 1'} vs {state.player2.name || 'Player 2'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-spectator-swap-perspective"
              onClick={handleSwapPerspective}
              className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
              title="สลับมุมมองกระดาน (ดูจากฝั่งตรงข้าม)"
            >
              <span>🔄</span>
              <span>มุมมอง: {bottomPlayer.name || (bottomSide === 'player1' ? 'P1' : 'P2')}</span>
            </button>
            <button
              id="btn-spectator-exit"
              onClick={() => {
                if (state.roomCode) {
                  try {
                    const savedUid = sessionStorage.getItem('playmat_v3_spectator_id');
                    if (savedUid) TabletopSyncService.leaveSpectator(state.roomCode, savedUid);
                  } catch {}
                }
                localStorage.removeItem('playmat_v3_session');
                sessionStorage.removeItem('playmat_v3_session');
                sessionStorage.removeItem('playmat_v3_spectator_id');
                window.location.reload();
              }}
              className="px-2 py-0.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              ออกจากการชม
            </button>
          </div>
        </div>
      )}

      {/* Reconnect Banner: If returning to page after accidental back/forward */}
      {reconnectBannerSession && state.roomMode === 'local' && (
        <div
          id="banner-reconnect-session"
          className="flex-shrink-0 z-30 px-3 py-1.5 bg-gradient-to-r from-amber-950/95 via-slate-900 to-indigo-950/95 border-b border-amber-500/40 text-white flex items-center justify-between gap-2 shadow-lg animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base animate-pulse">🔄</span>
            <div className="text-xs truncate">
              <span className="text-amber-300 font-bold">พบห้องออนไลน์ล่าสุดของคุณ: </span>
              <span className="font-mono font-black text-amber-200 bg-amber-900/50 px-1.5 py-0.5 rounded border border-amber-500/30">
                {reconnectBannerSession.roomCode}
              </span>
              <span className="ml-1.5 text-slate-300">
                ({reconnectBannerSession.myRole === 'player1' ? '🔵 Player 1 (Host)' : '🔴 Player 2 (Guest)'})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              id="btn-reconnect-session"
              onClick={handleReconnectToSession}
              disabled={isReconnecting}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isReconnecting ? 'กำลังเชื่อมต่อ...' : '⚡ กลับเข้าห้องเดิม'}
            </button>
            <button
              id="btn-dismiss-reconnect"
              onClick={handleDismissReconnect}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
              title="ละทิ้งห้องนี้"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Dynamic View Mode: Dedicated Mobile Arena vs Desktop Tabletop Mat */}
      {viewMode === 'mobile' ? (
        <PlaymatMobileArena
          state={state}
          commitState={commitState}
          topSide={topSide}
          bottomSide={bottomSide}
          isMyTurn={isMyTurn}
          shuffleNotice={shuffleNotice}
          selectedHandCardId={selectedHandCardId}
          setSelectedHandCardId={setSelectedHandCardId}
          selectedField={selectedField}
          setSelectedField={setSelectedField}
          activeDropZone={activeDropZone}
          setActiveDropZone={setActiveDropZone}
          history={history}
          handleSwapPerspective={handleSwapPerspective}
          handleDrawCards={handleDrawCards}
          handlePassTurn={handlePassTurn}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          handleResetTable={handleResetTable}
          handleSlotClick={(side, position) => setSelectedField({ side, position })}
          handleEmptyBenchClick={handleEmptyBenchClick}
          handleEmptyActiveClick={handleEmptyActiveClick}
          handleToggleBenchLimit={handleToggleBenchLimit}
          handleTapToTarget={handleTapToTarget}
          setIsDeckSearchOpen={setIsDeckSearchOpen}
          setIsTopCardsOpen={setIsTopCardsOpen}
          setIsDiscardLostOpen={setIsDiscardLostOpen}
          setIsRandomizerOpen={setIsRandomizerOpen}
          setPreviewingCard={setPreviewingCard}
          setSelectedHandMenuCard={(card) => {
            if (card) {
              setSelectedHandCardInfo({ card, side: bottomSide });
            }
          }}
          handleTriggerCoinFlip={handleTriggerInGameCoinFlip}
          handleDiscardStadium={() => commitState((curr) => TabletopActions.discardStadium(curr))}
          onTriggerMulligan={(targetSide) => {
            const side = targetSide || bottomSide;
            setIsMulliganModalOpen(true);
            commitState((curr) => TabletopActions.openMulliganReveal(curr, side));
          }}
          onRevealAllFacedown={handleRevealAllFacedown}
          onOpenTurnDecision={() => setIsTurnDecisionModalOpen(true)}
          hasFacedownCards={hasAnyFacedownOnTable}
          isReadyForLetsPlay={setupReadiness.isReady}
          missingSetupTooltip={setupReadiness.message}
        />
      ) : (
        <>
          {/* Main Arena Felt Mat: Two-Player Arena with Shared Center Board */}
          <main
        id="playmat-v3-board"
        onPointerMove={handleBoardPointerMove}
        onClick={(e) => {
          if (selectedHandCardId && (e.target === e.currentTarget || (e.target as HTMLElement).id === 'playmat-arena-container')) {
            setSelectedHandCardId(null);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        className="relative flex-1 flex flex-col justify-center items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1 py-0.5 sm:py-1 md:py-1.5 overflow-hidden min-h-0 select-none pb-0.5 sm:pb-1 playmat-custom-cursor"
      >
        {/* Soft Arena Felt Mat Texture */}
        <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/15 via-slate-950/60 to-black/90" />

        {/* Playmat Arena Container: Shared coordinate bounding box for 1:1 cross-screen precision */}
        <div id="playmat-arena-container" className="relative w-full max-w-screen-2xl 2xl:max-w-[1720px] min-[2200px]:max-w-[2100px] min-[3200px]:max-w-[2600px] mx-auto flex flex-col justify-center items-center gap-1 sm:gap-1.5 md:gap-2 px-1 sm:px-2 min-h-0 overflow-hidden my-auto">
          {/* Opponent Real-time Mouse Cursor (Direct-DOM driven: 0 React re-renders, silky smooth 60fps) */}
          <div
            id="opponent-live-cursor"
            data-testid="opponent-live-cursor"
            ref={opponentCursorElRef}
            className="pointer-events-none absolute z-50 transition-all duration-75 ease-out flex flex-col items-start"
            style={{
              display: 'none',
              opacity: 0,
              left: '50%',
              top: '50%',
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Precision glowing pointer arrow */}
            <svg
              className="w-5 h-5 text-rose-400 drop-shadow-[0_2px_8px_rgba(244,63,94,0.9)] -rotate-12"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M3 3l7 18 3-7 7-3L3 3z" />
            </svg>
            {/* Opponent player name badge */}
            <div className="mt-0.5 px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/70 text-[9px] font-black text-rose-200 whitespace-nowrap shadow-xl backdrop-blur-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              <span>{topPlayer.name || 'คู่ต่อสู้'}</span>
            </div>
          </div>

        {/* ========================================================================= */}
        {/* SECTION 1: TOP PLAYER SIDE (Opponent / Inverted Perspective) */}
        {/* ========================================================================= */}
        <section
          id="top-player-zone"
          className="relative z-10 w-full max-w-screen-2xl mx-auto flex flex-col gap-0.5 rounded-xl sm:rounded-2xl bg-black/25 p-0.5 sm:p-1 border border-white/5"
        >
          {/* Top Player Status Header & Hand Cards */}
          <div className="flex items-center justify-between px-2 flex-wrap gap-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black flex items-center gap-1 ${topSide === 'player1' ? 'text-blue-300' : 'text-rose-300'}`}>
                <span>{topSide === 'player1' ? '🔵' : '🔴'}</span> {topPlayer.name}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">({topPlayer.deckName})</span>
              <button
                id="btn-top-switch-to-me"
                onClick={handleSwapPerspective}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                title={
                  state.myRole === 'spectator'
                    ? `สลับมุมมองไปที่ฝั่ง ${topPlayer.name}`
                    : `สลับมาควบคุมฝั่ง ${topPlayer.name} (${topSide === 'player1' ? 'P1' : 'P2'})`
                }
              >
                <span>🔄</span>
                <span className="hidden sm:inline">
                  {state.myRole === 'spectator' ? 'สลับมุมมอง' : 'สลับมาเล่นฝั่งนี้'}
                </span>
              </button>
            </div>

            {/* Mobile Opponent HUD Strip (Prizes, Deck, Discard accessible in 1 tap on mobile portrait) */}
            <div className="flex sm:hidden items-center gap-1 px-1.5 py-0.5 rounded-lg bg-slate-900/90 border border-white/10 text-[9px] font-bold text-slate-300">
              <button
                id="top-deck-pile-mobile"
                data-deck-zone="true"
                data-deck-side={topSide}
                onClick={() => handleDrawCards(topSide, 1)}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-950/70 border border-sky-400/30 text-sky-300 active:scale-95 cursor-pointer"
                title="เด็คคู่ต่อสู้"
              >
                <span>🃏</span>
                <span className="font-mono">{topPlayer.deck.length}</span>
              </button>
              <button
                id="top-prizes-mobile"
                onClick={() => {
                  if (topPlayer.prizes.length > 0) {
                    commitState((curr) => TabletopActions.takePrize(curr, topSide, 0));
                  }
                }}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-400/30 text-amber-300 active:scale-95 cursor-pointer"
                title="ไพรซ์คู่ต่อสู้"
              >
                <span>★</span>
                <span className="font-mono">{topPlayer.prizes.length}</span>
              </button>
              <button
                id="top-discard-mobile"
                data-discard-zone="true"
                data-discard-side={topSide}
                onClick={() => {
                  Sound.playCardFlip();
                  setIsDiscardLostOpen(true);
                }}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800 border border-white/20 text-slate-200 active:scale-95 cursor-pointer"
                title="สุสานคู่ต่อสู้"
              >
                <span>🗑️</span>
                <span className="font-mono">{topPlayer.discard.length}</span>
              </button>
            </div>

            {/* Top Player Hand Cards (Facedown 🎴 by default for privacy, or faceup in Solo Study Mode) */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400">
                Hand ({topPlayer.hand.length} ใบ)
              </span>
              {topPlayer.hand.length === 0 ? (
                state.myRole !== 'spectator' ? (
                  <button
                    id="btn-top-draw-7"
                    onClick={() => {
                      Sound.playCardFlip();
                      commitState(TabletopActions.drawCards(state, topSide, 7));
                    }}
                    className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-[10px] font-bold text-rose-300 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title="จั่ว 7 ใบให้ฝั่งบน"
                  >
                    + จั่ว 7 ใบ
                  </button>
                ) : null
              ) : (
                <div className="flex items-center -space-x-2.5 sm:-space-x-3">
                  {topPlayer.hand.map((card, hIdx) => {
                    const isRevealed = state.soloRevealAllHands;
                    const isBeingDragged =
                      pointerDrag?.isDragging &&
                      pointerDrag.item.type === 'HAND_CARD' &&
                      pointerDrag.item.card.instanceId === card.instanceId;
                    return (
                      <div
                        key={card.instanceId || hIdx}
                        id={`top-hand-card-${hIdx}`}
                        role="button"
                        tabIndex={0}
                        draggable={false}
                        onDragStart={(e) => {
                          if (!isRevealed) return;
                          e.dataTransfer.setData('text/plain', card.instanceId);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggingItem({ type: 'HAND_CARD', card, side: topSide });
                        }}
                        onDragEnd={() => {
                          setDraggingItem(null);
                          setActiveDropZone(null);
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        onPointerDown={(e) => {
                          if (!isRevealed) return;
                          if (e.button !== 0 && e.pointerType === 'mouse') return;
                          try {
                            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                          } catch {}
                          startPointerDrag({ type: 'HAND_CARD', card, side: topSide }, e.clientX, e.clientY, e.pointerType);
                        }}
                        onClick={() => {
                          if (dragJustEndedRef.current || pointerDragRef.current?.isDragging) return;
                          if (isRevealed) {
                            Sound.playCardFlip();
                            setSelectedHandCardInfo({ side: topSide, card });
                          }
                        }}
                        style={{
                          touchAction: 'none',
                          WebkitTouchCallout: 'none',
                          userSelect: 'none',
                        }}
                        className={`relative h-[clamp(38px,6vh,70px)] aspect-[63/88] w-auto rounded-md border border-white/20 shadow-md select-none touch-none transition-all ${
                          isRevealed
                            ? 'cursor-grab active:cursor-grabbing touch-none hover:-translate-y-1.5 hover:z-20 bg-slate-900'
                            : 'bg-gradient-to-br from-red-950 via-slate-900 to-indigo-950 flex items-center justify-center'
                        } ${isBeingDragged ? 'opacity-35 scale-90 ring-2 ring-emerald-400' : ''}`}
                        title={isRevealed ? getCardDisplayName(card) : 'การ์ดบนมือคู่ต่อสู้ (คว่ำอยู่)'}
                      >
                        {isRevealed ? (
                          <img
                            src={resolveCardImageUrl(card)}
                            alt={getCardDisplayName(card)}
                            draggable={false}
                            className="w-full h-full object-cover rounded-md pointer-events-none"
                            onError={(e) => handleCardImageError(e, card)}
                          />
                        ) : (
                          <span className="text-[9px] sm:text-[10px] select-none">🎴</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Top Player Arena Layout: Left (Deck & Discard) | Center (Bench & Active) | Right (Prizes) - Authentic 180° Perspective */}
          <div className="flex items-center justify-between sm:justify-center gap-1 sm:gap-3 lg:gap-5 w-full">
            {/* Top Left: Deck on Top, Discard Pile Underneath, Lost Zone (Desktop flank) */}
            <div className="hidden sm:flex w-[85px] md:w-[105px] lg:w-[125px] xl:w-[155px] 2xl:w-[175px] shrink-0 flex-col items-center justify-center gap-1 sm:gap-1.5">
              {/* Deck Pile */}
              <div className="flex flex-col items-center gap-0.5">
                <button
                  id="top-deck-pile"
                  data-deck-zone="true"
                  data-deck-side={topSide}
                  onClick={() => {
                    handleDrawCards(topSide, 1);
                  }}
                  className={`relative card-deck-size rounded-lg border-2 flex flex-col items-center justify-center shadow hover:scale-105 transition-all cursor-pointer ${
                    activeDropZone === `deck-${topSide}`
                      ? 'border-sky-400 bg-sky-500/30 ring-4 ring-sky-400 scale-105 animate-pulse'
                      : 'border-sky-400/50 bg-gradient-to-br from-blue-950 to-slate-900'
                  }`}
                  title="คลิกเพื่อจั่วการ์ดให้ฝั่งบน"
                >
                  <span className="text-[10px] sm:text-xs">🃏</span>
                  <span className="text-[9px] sm:text-[10px] font-black text-sky-300 font-mono">{topPlayer.deck.length}</span>
                  {isTopDeckPeeling && (
                    <div className="absolute inset-0 deck-peel-animation rounded-lg overflow-hidden pointer-events-none shadow-2xl z-30">
                      <PokemonCardBack className="w-full h-full rounded-lg" />
                    </div>
                  )}
                </button>
                {topPlayer.hand.length === 0 && (
                  <button
                    id="btn-setup-top-draw7"
                    onClick={() => {
                      handleDrawCards(topSide, 7);
                    }}
                    className="px-1.5 py-0.2 rounded bg-sky-950/80 border border-sky-400/40 text-[8px] text-sky-300 font-bold hover:bg-sky-900 active:scale-95 transition-all cursor-pointer"
                    title="จั่ว 7 ใบให้ฝั่งบน"
                  >
                    + จั่ว 7
                  </button>
                )}
              </div>

              {/* Under Deck: Discard Pile & Lost Zone */}
              <div className="flex items-center gap-1">
                {/* Discard Pile with drop target support */}
                <div className="flex flex-col items-center">
                  <button
                    id="top-btn-discard"
                    data-discard-zone="true"
                    data-discard-side={topSide}
                    onClick={() => {
                      Sound.playCardFlip();
                      setIsDiscardLostOpen(true);
                    }}
                    className={`relative card-discard-size rounded-lg border overflow-hidden flex flex-col items-center justify-center shadow transition-all cursor-pointer ${
                      activeDropZone === `discard-${topSide}`
                        ? 'border-rose-400 bg-rose-500/30 ring-4 ring-rose-400 scale-105 animate-pulse'
                        : 'border-white/25 bg-slate-900/80 hover:border-white/50'
                    }`}
                    title="สุสานฝั่งบน (ลากการ์ดมาทิ้งที่นี่ หรือคลิกเพื่อดู)"
                  >
                    {topPlayer.discard.length > 0 ? (
                      <>
                        <img
                          src={resolveCardImageUrl(topPlayer.discard[topPlayer.discard.length - 1])}
                          alt="Top Discard"
                          draggable={false}
                          className="w-full h-full object-cover pointer-events-none opacity-60"
                          onError={(e) => handleCardImageError(e, topPlayer.discard[topPlayer.discard.length - 1])}
                        />
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] sm:text-xs">🗑️</span>
                          <span className="text-[9px] sm:text-[10px] font-bold text-white font-mono">{topPlayer.discard.length}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] sm:text-xs">🗑️</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 font-mono">0</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Lost Zone */}
                <div className="flex flex-col items-center">
                  <div
                    className="card-prize-size rounded-lg border border-purple-500/40 bg-purple-950/30 flex flex-col items-center justify-center text-purple-300"
                    title="Lost Zone"
                  >
                    <span className="text-[8px] sm:text-[9px]">🌀</span>
                    <span className="text-[8px] sm:text-[9px] font-bold font-mono">{topPlayer.lostZone.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Center: Bench (Top Row) & Active Spot (Bottom Row) */}
            <div className="flex-1 flex flex-col items-center justify-center gap-0.5 sm:gap-1 min-w-0 w-full">
              {/* Top Bench Row & Side Flank Toggle */}
              <div className="relative flex items-center justify-center w-full max-w-full">
                {/* Top Bench Row (cards snugly placed with dynamic tight gap and horizontal scroll on mobile) */}
                <div className="w-full flex items-center justify-center overflow-x-auto no-scrollbar py-0.5 px-1">
                  <div className={`flex items-center justify-center mx-auto ${topPlayer.benchLimit === 8 ? 'gap-0.5 sm:gap-1 md:gap-1.5' : 'gap-1 sm:gap-1.5 md:gap-2'}`}>
                  {Array.from({ length: topPlayer.benchLimit || 5 }, (_, i) => topPlayer.bench[i] ?? null).map((bSlot, bIdx) => {
                    const combatProps = getCombatProps(topSide, bIdx);
                    const dropProps = getDropProps(topSide, bIdx);
                    const isTopInteractive = state.roomMode !== 'online' || topSide === state.myRole || state.myRole === 'both';
                    return (
                      <TabletopPokemonCard
                        key={`top-bench-${bIdx}-${bSlot?.card.instanceId || 'empty'}`}
                        slot={bSlot}
                        position={bIdx}
                        side={topSide}
                        label={`B${bIdx + 1}`}
                        {...combatProps}
                        {...dropProps}
                        onSelectSlot={() => setSelectedField({ side: topSide, position: bIdx })}
                        onDiscardEnergy={(energyId) => handleRequestDiscardEnergy(topSide, bIdx, energyId)}
                        onEmptySlotClick={() => {}}
                        onToggleFacedown={isTopInteractive ? () => commitState((curr) => TabletopActions.toggleFacedown(curr, topSide, bIdx)) : undefined}
                        onToggleAbility={isTopInteractive ? () => commitState((curr) => TabletopActions.toggleAbility(curr, topSide, bIdx)) : undefined}
                        onZoomCard={() => topPlayer.bench[bIdx] && setPreviewingCard(topPlayer.bench[bIdx]!.card)}
                      />
                    );
                  })}
                  </div>
                </div>

                {/* Right Flank: Top Bench Toggle Button (Out of flow at left-full ml-2 so it never shifts bench center or overlaps cards) */}
                {(state.roomMode !== 'online' || topSide === state.myRole || state.myRole === 'both') && (
                  <div className="absolute left-full ml-2 sm:ml-3 top-1/2 -translate-y-1/2 z-10 pointer-events-auto whitespace-nowrap">
                    <button
                      id="btn-toggle-bench-limit-top"
                      type="button"
                      onClick={() => handleToggleBenchLimit(topSide)}
                      className="flex flex-col items-center justify-center px-1.5 sm:px-2 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/20 hover:border-indigo-400 text-[8px] sm:text-[9px] font-black text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-md select-none"
                      title={`คลิกเพื่อสลับขนาดเบนช์ (${topPlayer.benchLimit || 5} ⇄ ${topPlayer.benchLimit === 8 ? 5 : 8} ช่อง)`}
                    >
                      <span className="text-[10px] sm:text-xs leading-none">👥</span>
                      <span className="leading-none mt-0.5 whitespace-nowrap">{topPlayer.benchLimit === 8 ? '8 ช่อง' : '5 ช่อง'}</span>
                      <span className="text-[6.5px] sm:text-[7.5px] text-slate-400 font-mono mt-0.5 leading-none">
                        Bench ({topPlayer.bench.slice(0, topPlayer.benchLimit || 5).filter(Boolean).length}/{topPlayer.benchLimit || 5})
                      </span>
                    </button>
                  </div>
                )}
              </div>

                {/* Top Active Spot & Revealed Card Slot */}
                <div className="relative w-full flex items-center justify-center py-0.5 min-h-[var(--playmat-active-h)]">
                  {/* Center: Centered Active Pokémon (Locked to 50% centerline) */}
                  <div className="flex items-center justify-center">
                    {(() => {
                      const isTopInteractive = state.roomMode !== 'online' || topSide === state.myRole || state.myRole === 'both';
                      return (
                        <TabletopPokemonCard
                          key={`top-active-${topPlayer.active?.card.instanceId || 'empty'}`}
                          slot={topPlayer.active}
                          position="ACTIVE"
                          side={topSide}
                          label="Active (บน)"
                          {...getCombatProps(topSide, 'ACTIVE')}
                          {...getDropProps(topSide, 'ACTIVE')}
                          onSelectSlot={() => setSelectedField({ side: topSide, position: 'ACTIVE' })}
                          onDiscardEnergy={(energyId) => handleRequestDiscardEnergy(topSide, 'ACTIVE', energyId)}
                          onEmptySlotClick={() => {}}
                          onToggleFacedown={isTopInteractive ? () => commitState((curr) => TabletopActions.toggleFacedown(curr, topSide, 'ACTIVE')) : undefined}
                          onToggleAbility={isTopInteractive ? () => commitState((curr) => TabletopActions.toggleAbility(curr, topSide, 'ACTIVE')) : undefined}
                          onZoomCard={() => topPlayer.active && setPreviewingCard(topPlayer.active!.card)}
                        />
                      );
                    })()}
                  </div>

                  {/* Right Flank: Top Player Revealed Card (In-Play Trainer, absolute right-0 aligned with Bench 5) */}
                  {topPlayer.revealedCard && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center z-20">
                      <div
                        id="top-revealed-card-slot"
                        className="flex flex-col items-center gap-1 p-1 sm:p-1.5 rounded-xl border-2 border-amber-400/80 bg-slate-900/95 shadow-xl shadow-amber-950/60 z-20 animate-in fade-in zoom-in-95 duration-150"
                      >
                        <span className="text-[8px] sm:text-[9.5px] font-black text-amber-300">
                          {topPlayer.revealedCard.supertype === 'Trainer' ? '✨ การ์ดที่เล่น (In-Play)' : '🎴 การ์ดที่เปิดเผย'}
                        </span>
                        <div
                          id="top-revealed-card-image"
                          onClick={() => setPreviewingCard(topPlayer.revealedCard!)}
                          className="group relative card-active-size rounded-lg overflow-hidden border border-amber-400/60 shadow cursor-pointer hover:scale-105 transition-transform shrink-0"
                          title="คลิกเพื่อดูการ์ดขนาดใหญ่"
                        >
                          <img
                            src={resolveCardImageUrl(topPlayer.revealedCard)}
                            alt={getCardDisplayName(topPlayer.revealedCard)}
                            className="w-full h-full object-cover"
                            onError={(e) => handleCardImageError(e, topPlayer.revealedCard)}
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-[9px] bg-black/80 px-1 py-0.5 rounded text-white font-bold">🔍</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            id="btn-zoom-revealed-top"
                            type="button"
                            onClick={() => setPreviewingCard(topPlayer.revealedCard!)}
                            className="px-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[7px] sm:text-[8.5px] font-bold border border-white/10"
                            title="ขยายดูการ์ด"
                          >
                            🔍
                          </button>
                          <button
                            id="btn-discard-revealed-top"
                            type="button"
                            onClick={() => {
                              Sound.playCardPlacement();
                              commitState((curr) => TabletopActions.dismissRevealedCard(curr, topSide, 'DISCARD'));
                            }}
                            className="px-1 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 text-[7px] sm:text-[8.5px] font-bold border border-rose-500/30"
                            title="ทิ้งลงสุสาน"
                          >
                            🗑️
                          </button>
                          <button
                            id="btn-retract-revealed-top"
                            type="button"
                            onClick={() => {
                              Sound.playCardFlip();
                              commitState((curr) => TabletopActions.dismissRevealedCard(curr, topSide, 'HAND'));
                            }}
                            className="px-1 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 text-[7px] sm:text-[8.5px] font-bold border border-indigo-500/30"
                            title="เก็บขึ้นมือ"
                          >
                            ✋
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            {/* Top Right: Prizes (Authentic Playmat: 3 rows x 2 cols grid on Right flank) */}
            <div className="hidden sm:flex w-[85px] md:w-[105px] lg:w-[125px] xl:w-[155px] 2xl:w-[175px] shrink-0 flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1">
                <span className="text-[8px] sm:text-[9px] font-bold text-amber-400 uppercase tracking-wider">Prizes</span>
                {topPlayer.prizes.length > 0 && (
                  <span className="text-[8px] sm:text-[9px] font-bold text-amber-200 font-mono">({topPlayer.prizes.length})</span>
                )}
              </div>
              {topPlayer.prizes.length === 0 ? (
                <button
                  id="btn-setup-top-prizes"
                  onClick={() => {
                    Sound.playCardPlacement();
                    commitState(TabletopActions.setupPrizes(state, topSide, 6));
                  }}
                  className="px-1.5 sm:px-2 py-1 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-[9px] sm:text-[10px] font-bold text-amber-300 shadow hover:scale-105 transition-all cursor-pointer animate-pulse text-center"
                  title="วาง 6 ไพรซ์ให้ฝั่งบน"
                >
                  + 6 ไพรซ์
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-1 max-w-[50px] sm:max-w-[95px]">
                  {topPlayer.prizes.map((p, pIdx) => (
                    <button
                      key={p.instanceId || pIdx}
                      id={`top-prize-${pIdx}`}
                      data-prize-side={topSide}
                      data-prize-index={pIdx}
                      onClick={() => {
                        Sound.playCardFlip();
                        commitState((curr) => TabletopActions.takePrize(curr, topSide, pIdx));
                      }}
                      className="card-prize-size rounded-md bg-gradient-to-br from-amber-900 via-amber-950 to-slate-950 border border-amber-400/50 text-[8px] sm:text-[9px] flex items-center justify-center text-amber-200 shadow-md cursor-pointer hover:scale-110 hover:border-amber-300 transition-transform active:scale-95"
                      title={`หยิบไพรซ์ใบที่ ${pIdx + 1} ขึ้นมือ`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: CENTER BOARD ZONE (กระดานกลาง + Stadium + Turn + Spotlight) */}
        {/* ========================================================================= */}
        <CenterBoardZone
          activeSpotlight={
            state.activeSpotlight &&
            (!state.activeSpotlight.id || !dismissedSpotlightIdsRef.current.has(state.activeSpotlight.id)) &&
            state.activeSpotlight.id !== dismissedSpotlightId
              ? state.activeSpotlight
              : null
          }
          currentTurn={state.currentTurn}
          soloRevealAllHands={state.soloRevealAllHands}
          perspective={state.perspective}
          isOnlineMode={state.roomMode === 'online'}
          myRole={state.myRole}
          hasFacedownCards={hasAnyFacedownOnTable}
          isGameStarted={state.isGameStarted}
          isTurnDecided={Boolean(state.turnDecision?.startingPlayer || state.turnDecision?.phase === 'DECIDED')}
          isReadyForLetsPlay={setupReadiness.isReady}
          missingSetupTooltip={setupReadiness.message}
          hasAttachedEnergyThisTurn={state[state.currentTurn]?.hasAttachedEnergyThisTurn}
          hasPlayedSupporterThisTurn={state[state.currentTurn]?.hasPlayedSupporterThisTurn}
          onRevealAllFacedown={handleRevealAllFacedown}
          onDismissSpotlight={(toZone) => {
            if (state.activeSpotlight?.id) {
              dismissedSpotlightIdsRef.current.add(state.activeSpotlight.id);
              setDismissedSpotlightId(state.activeSpotlight.id);
            }
            commitState((curr) => {
              if (curr.activeSpotlight?.actionType === 'REVEAL_CARD') {
                return { ...curr, activeSpotlight: null };
              }
              return TabletopActions.dismissSpotlight(curr, toZone);
            });
          }}
          onPassTurn={handlePassTurn}
          onToggleSoloReveal={() => {
            commitState(TabletopActions.toggleSoloReveal(state));
          }}
          onTogglePerspective={handleSwapPerspective}
          onToggleTurnTracking={(type) => {
            commitState((curr) => TabletopActions.toggleTurnTracking(curr, curr.currentTurn, type));
          }}
          onOpenTurnDecision={() => {
            setIsTurnDecisionModalOpen(true);
            commitState((curr) => TabletopActions.setTurnDecision(curr, { phase: 'IDLE', timestamp: Date.now() }));
          }}
          isMyTurn={isMyTurn}
          onTriggerCoinFlip={handleTriggerInGameCoinFlip}
          isDropTarget={activeDropZone === 'center-board' || Boolean(selectedHandCard && selectedHandCard.supertype === 'Trainer')}
          onClick={() => {
            if (selectedHandCard && selectedHandCard.supertype === 'Trainer') {
              const handEl =
                document.querySelector(`[data-testid="hand-card-item"][id*="${selectedHandCard.instanceId}"]`) ||
                document.querySelector('#hand-cards-tray');
              const centerEl = document.getElementById('center-board-zone');
              if (handEl && centerEl) {
                triggerFlightBetweenElements(handEl, centerEl, {
                  card: selectedHandCard,
                  type: 'HAND_TO_BOARD',
                  durationMs: 320,
                  onComplete: () => {
                    handleDropOnCenterBoard();
                  },
                });
              } else {
                handleDropOnCenterBoard();
              }
              setSelectedHandCardId(null);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (activeDropZone !== 'center-board') {
              setActiveDropZone('center-board');
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setActiveDropZone('center-board');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            if (activeDropZone === 'center-board') {
              setActiveDropZone(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDropOnCenterBoard();
            setActiveDropZone(null);
            setDraggingItem(null);
          }}
        />


        {/* ========================================================================= */}
        {/* SECTION 3: BOTTOM PLAYER SIDE (Active Player / You) */}
        {/* ========================================================================= */}
        <section
          id="bottom-player-zone"
          className="relative z-10 w-full max-w-screen-2xl mx-auto flex flex-col gap-0.5 rounded-xl sm:rounded-2xl bg-black/25 p-0.5 sm:p-1 border border-white/5"
        >
          {/* Mobile Bottom Player Info Strip (Deck, Prizes, Discard accessible at a glance) */}
          <div className="flex sm:hidden items-center justify-between px-2 py-0.5 text-[9px] font-bold text-slate-300">
            <span className="text-emerald-400 font-black flex items-center gap-1">
              <span>{bottomSide === 'player1' ? '🔵' : '🔴'}</span> {bottomPlayer.name}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sky-300">🃏 เด็ค: {bottomPlayer.deck.length}</span>
              <span className="text-amber-300">★ ไพรซ์: {bottomPlayer.prizes.length}</span>
              <span className="text-slate-400">🗑️ สุสาน: {bottomPlayer.discard.length}</span>
            </div>
          </div>

          {/* Bottom Player Arena Layout: Left (Stadium/Discard) | Center (Active & Bench) | Right (Prizes & Deck) */}
          <div className="flex items-center justify-between sm:justify-center gap-1 sm:gap-3 lg:gap-5 w-full">
            {/* Bottom Left: Prizes (Authentic Playmat: 3 rows x 2 cols grid on Left flank - Desktop) */}
            <div className="hidden sm:flex w-[85px] md:w-[105px] lg:w-[125px] xl:w-[155px] 2xl:w-[175px] shrink-0 flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1">
                <span className="text-[8px] sm:text-[9px] font-bold text-amber-400 uppercase tracking-wider">Prizes</span>
                {bottomPlayer.prizes.length > 0 && (
                  <span className="text-[8px] sm:text-[9px] font-bold text-amber-200 font-mono">({bottomPlayer.prizes.length})</span>
                )}
              </div>
              {bottomPlayer.prizes.length === 0 ? (
                <button
                  id="btn-setup-prizes"
                  onClick={() => {
                    Sound.playCardPlacement();
                    commitState(TabletopActions.setupPrizes(state, bottomSide, 6));
                  }}
                  className="px-1.5 sm:px-2 py-1 rounded-lg bg-amber-900/80 hover:bg-amber-800 border border-amber-400/60 text-[9px] sm:text-[10px] font-black text-amber-200 shadow hover:scale-105 transition-all cursor-pointer animate-pulse text-center"
                  title="คลิกเพื่อวาง 6 ไพรซ์"
                >
                  <span id="btn-place-prizes-empty" className="pointer-events-none">+ 6 ไพรซ์</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-1 max-w-[50px] sm:max-w-[95px]">
                  {bottomPlayer.prizes.map((p, pIdx) => (
                    <button
                      key={p.instanceId || pIdx}
                      id={`prize-card-${pIdx}`}
                      data-prize-side={bottomSide}
                      data-prize-index={pIdx}
                      onClick={() => {
                        Sound.playCardFlip();
                        commitState((curr) => TabletopActions.takePrize(curr, bottomSide, pIdx));
                      }}
                      className="card-prize-size rounded-md bg-gradient-to-br from-amber-800 via-amber-900 to-slate-950 border border-amber-400/60 text-[8px] sm:text-[9px] flex items-center justify-center text-amber-200 shadow-md cursor-pointer hover:scale-110 hover:border-amber-300 transition-transform active:scale-95"
                      title={`หยิบไพรซ์ใบที่ ${pIdx + 1} ขึ้นมือ`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Center: Active Spot (Top) & Bench (Bottom) */}
            <div className="flex-1 flex flex-col items-center justify-center gap-0.5 sm:gap-1 min-w-0 w-full">
              <div className="w-full sm:w-fit flex flex-col items-center gap-0.5 sm:gap-1 mx-auto">
                {/* Bottom Active Spot & Stadium Slot & Revealed Card Slot */}
                <div className="relative w-full flex items-center justify-center py-0.5 min-h-[var(--playmat-active-h)]">
                  {/* Left Flank: Stadium Slot (Absolute left-0 aligned with Bench 1) */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center z-20">
                    {state.stadium ? (
                      <div
                        id="center-stadium-card"
                        data-stadium-zone="true"
                        data-testid="stadium-card"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (activeDropZone !== 'stadium') setActiveDropZone('stadium');
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          setActiveDropZone('stadium');
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                          if (activeDropZone === 'stadium') setActiveDropZone(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnStadium();
                          setActiveDropZone(null);
                          setDraggingItem(null);
                        }}
                        className={`group relative flex flex-col items-center rounded-xl overflow-hidden border-2 border-teal-400/90 bg-slate-950/95 shadow-xl shadow-teal-950/60 backdrop-blur-md transition-all ${
                          activeDropZone === 'stadium'
                            ? 'ring-4 ring-teal-400 scale-105 shadow-2xl animate-pulse'
                            : 'hover:scale-105 hover:border-teal-300'
                        } card-active-size`}
                      >
                        <img
                          id="btn-zoom-stadium"
                          src={resolveCardImageUrl(state.stadium)}
                          alt="Stadium"
                          onClick={(e) => {
                            e.stopPropagation();
                            Sound.playCardFlip();
                            setPreviewingCard(state.stadium!);
                          }}
                          className="w-full h-full object-cover cursor-pointer"
                          title="คลิกเพื่อดูสเตเดียมขนาดใหญ่"
                          onError={(e) => handleCardImageError(e, state.stadium)}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                          <span className="text-[9px] bg-black/80 px-1.5 py-0.5 rounded text-white font-bold">🔍 ซูม</span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-slate-950/90 backdrop-blur-md border-t border-teal-500/40 p-0.5 flex items-center justify-between pointer-events-auto">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              Sound.playCardFlip();
                              setPreviewingCard(state.stadium!);
                            }}
                            className="text-[6.5px] sm:text-[8px] font-black text-white truncate max-w-[70%] cursor-pointer hover:text-teal-200"
                            title={getCardDisplayName(state.stadium)}
                          >
                            {getCardDisplayName(state.stadium)}
                          </span>
                          <button
                            id="btn-discard-stadium"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              Sound.playCardPlacement();
                              commitState(TabletopActions.discardStadium(state));
                            }}
                            className="text-[6.5px] sm:text-[7.5px] px-1 py-0.2 rounded bg-rose-950/90 hover:bg-rose-800 text-rose-200 border border-rose-500/40 cursor-pointer flex-shrink-0"
                            title="ทิ้งสเตเดียมลงสุสานของเจ้าของการ์ด"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        id="center-stadium-empty"
                        data-stadium-zone="true"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (activeDropZone !== 'stadium') setActiveDropZone('stadium');
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          setActiveDropZone('stadium');
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                          if (activeDropZone === 'stadium') setActiveDropZone(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnStadium();
                          setActiveDropZone(null);
                          setDraggingItem(null);
                        }}
                        className={`group relative flex flex-col items-center justify-center p-0.5 sm:p-1 rounded-xl border-2 border-dashed transition-all select-none cursor-pointer backdrop-blur-md shadow-lg ${
                          activeDropZone === 'stadium'
                            ? 'border-teal-400 bg-teal-500/30 ring-2 ring-teal-400 scale-105 text-teal-100 animate-pulse'
                            : 'border-teal-500/50 bg-slate-950/95 hover:border-teal-400/80 text-teal-300'
                        } card-active-size`}
                        title="สเตเดียม: ลากการ์ดสเตเดียมมาวางที่นี่"
                      >
                        <span className="text-[11px] sm:text-base lg:text-lg">🏟️</span>
                        <span className="text-[6.5px] sm:text-[9px] font-black tracking-wider uppercase text-teal-300">
                          Stadium
                        </span>
                        <span className="hidden sm:inline text-[6.5px] sm:text-[7.5px] text-teal-400/70 text-center line-clamp-1">
                          {activeDropZone === 'stadium' ? 'ปล่อยวาง' : 'วางที่นี่'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Center: Bottom Active Pokémon (In-flow, locked to 50% centerline matching Top Active) */}
                  <div className="flex items-center justify-center">
                    <TabletopPokemonCard
                      key={`bottom-active-${bottomPlayer.active?.card.instanceId || 'empty'}`}
                      slot={bottomPlayer.active}
                      position="ACTIVE"
                      side={bottomSide}
                      label="Active (คุณ)"
                      {...getCombatProps(bottomSide, 'ACTIVE')}
                      {...getDropProps(bottomSide, 'ACTIVE')}
                      onSelectSlot={() => {
                        setSelectedField({ side: bottomSide, position: 'ACTIVE' });
                      }}
                      onDiscardEnergy={(energyId) => handleRequestDiscardEnergy(bottomSide, 'ACTIVE', energyId)}
                      onEmptySlotClick={() => {}}
                      onToggleFacedown={() => commitState((curr) => TabletopActions.toggleFacedown(curr, bottomSide, 'ACTIVE'))}
                      onToggleAbility={() => commitState((curr) => TabletopActions.toggleAbility(curr, bottomSide, 'ACTIVE'))}
                      onZoomCard={() => bottomPlayer.active && setPreviewingCard(bottomPlayer.active!.card)}
                    />
                  </div>

                  {/* Right Flank: Bottom Player Revealed Card (In-Play Trainer, absolute right-0 aligned with Bench 5) */}
                  {bottomPlayer.revealedCard && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center z-20">
                      <div
                        id="bottom-revealed-card-slot"
                        className="flex flex-col items-center gap-1 p-1 sm:p-1.5 rounded-xl border-2 border-amber-400/80 bg-slate-900/95 shadow-xl shadow-amber-950/60 z-20 animate-in fade-in zoom-in-95 duration-150"
                      >
                        <span className="text-[8px] sm:text-[9.5px] font-black text-amber-300">
                          {bottomPlayer.revealedCard.supertype === 'Trainer' ? '✨ การ์ดที่เล่น (In-Play)' : '🎴 การ์ดที่เปิดเผย'}
                        </span>
                        <div
                          id="bottom-revealed-card-image"
                          onClick={() => setPreviewingCard(bottomPlayer.revealedCard!)}
                          className="group relative card-active-size rounded-lg overflow-hidden border border-amber-400/60 shadow cursor-pointer hover:scale-105 transition-transform shrink-0"
                          title="คลิกเพื่อดูการ์ดขนาดใหญ่"
                        >
                          <img
                            src={resolveCardImageUrl(bottomPlayer.revealedCard)}
                            alt={getCardDisplayName(bottomPlayer.revealedCard)}
                            className="w-full h-full object-cover"
                            onError={(e) => handleCardImageError(e, bottomPlayer.revealedCard)}
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-[9px] bg-black/80 px-1 py-0.5 rounded text-white font-bold">🔍</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            id="btn-zoom-revealed-bottom"
                            type="button"
                            onClick={() => setPreviewingCard(bottomPlayer.revealedCard!)}
                            className="px-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[7px] sm:text-[8.5px] font-bold border border-white/10"
                            title="ขยายดูการ์ด"
                          >
                            🔍
                          </button>
                          <button
                            id="btn-discard-revealed-bottom"
                            type="button"
                            onClick={() => {
                              Sound.playCardPlacement();
                              commitState((curr) => TabletopActions.dismissRevealedCard(curr, bottomSide, 'DISCARD'));
                            }}
                            className="px-1 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 text-[7px] sm:text-[8.5px] font-bold border border-rose-500/30"
                            title="ทิ้งลงสุสาน"
                          >
                            🗑️
                          </button>
                          <button
                            id="btn-retract-revealed-bottom"
                            type="button"
                            onClick={() => {
                              Sound.playCardFlip();
                              commitState((curr) => TabletopActions.dismissRevealedCard(curr, bottomSide, 'HAND'));
                            }}
                            className="px-1 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 text-[7px] sm:text-[8.5px] font-bold border border-indigo-500/30"
                            title="เก็บขึ้นมือ"
                          >
                            ✋
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Bench Row & Side Flank Toggle (Out of flow flank position so cards remain perfectly centered with Active spot) */}
                <div className="relative flex items-center justify-center w-full max-w-full">
                  {/* Bottom Bench Row (cards snugly placed with dynamic tight gap and horizontal scroll on mobile) */}
                  <div className="w-full flex items-center justify-center overflow-x-auto no-scrollbar py-0.5 px-1">
                    <div className={`flex items-center justify-center mx-auto ${bottomPlayer.benchLimit === 8 ? 'gap-0.5 sm:gap-1 md:gap-1.5' : 'gap-1 sm:gap-1.5 md:gap-2'}`}>
                    {Array.from({ length: bottomPlayer.benchLimit || 5 }, (_, i) => i).map((bIdx) => {
                      const combatProps = getCombatProps(bottomSide, bIdx);
                      const dropProps = getDropProps(bottomSide, bIdx);
                      return (
                        <TabletopPokemonCard
                          key={`bottom-bench-${bIdx}-${bottomPlayer.bench[bIdx]?.card.instanceId || 'empty'}`}
                          slot={bottomPlayer.bench[bIdx] ?? null}
                          position={bIdx}
                          side={bottomSide}
                          label={`B${bIdx + 1}`}
                          {...combatProps}
                          {...dropProps}
                          onSelectSlot={() => {
                            setSelectedField({ side: bottomSide, position: bIdx });
                          }}
                          onDiscardEnergy={(energyId) => handleRequestDiscardEnergy(bottomSide, bIdx, energyId)}
                          onEmptySlotClick={() => {}}
                          onToggleFacedown={() => commitState((curr) => TabletopActions.toggleFacedown(curr, bottomSide, bIdx))}
                          onToggleAbility={() => commitState((curr) => TabletopActions.toggleAbility(curr, bottomSide, bIdx))}
                          onZoomCard={() => bottomPlayer.bench[bIdx] && setPreviewingCard(bottomPlayer.bench[bIdx]!.card)}
                        />
                      );
                    })}
                    </div>
                  </div>

                  {/* Right Flank: Bottom Bench Toggle Button (Out of flow at left-full ml-2 so it never shifts bench center or overlaps cards) */}
                  {(state.roomMode !== 'online' || bottomSide === state.myRole || state.myRole === 'both') && (
                    <div className="absolute left-full ml-2 sm:ml-3 top-1/2 -translate-y-1/2 z-10 pointer-events-auto whitespace-nowrap">
                      <button
                        id="btn-toggle-bench-limit-bottom"
                        type="button"
                        onClick={() => handleToggleBenchLimit(bottomSide)}
                        className="flex flex-col items-center justify-center px-1.5 sm:px-2 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-emerald-400/60 hover:border-emerald-300 text-[8px] sm:text-[9px] font-black text-emerald-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-md shadow-emerald-950/40 select-none"
                        title={`คลิกเพื่อสลับขนาดเบนช์ (${bottomPlayer.benchLimit || 5} ⇄ ${bottomPlayer.benchLimit === 8 ? 5 : 8} ช่อง)`}
                      >
                        <span className="text-[10px] sm:text-xs leading-none">👥</span>
                        <span className="leading-none mt-0.5 whitespace-nowrap">{bottomPlayer.benchLimit === 8 ? '8 ช่อง' : '5 ช่อง'}</span>
                        <span className="text-[6.5px] sm:text-[7.5px] text-emerald-400/90 font-mono mt-0.5 leading-none">
                          Bench ({bottomPlayer.bench.slice(0, bottomPlayer.benchLimit || 5).filter(Boolean).length}/{bottomPlayer.benchLimit || 5})
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Right: Deck on Top, Discard Pile Underneath, Lost Zone (Desktop flank) */}
            <div className="hidden sm:flex w-[85px] md:w-[105px] lg:w-[125px] xl:w-[155px] 2xl:w-[175px] shrink-0 flex-col items-center justify-center gap-1 sm:gap-1.5">
              {/* Deck Pile */}
              <div className="flex flex-col items-center gap-0.5">
                <button
                  id="deck-pile"
                  data-deck-zone="true"
                  data-deck-side={bottomSide}
                  onClick={() => {
                    handleDrawCards(bottomSide, 1);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (activeDropZone !== `deck-${bottomSide}`) setActiveDropZone(`deck-${bottomSide}`);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setActiveDropZone(`deck-${bottomSide}`);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    if (activeDropZone === `deck-${bottomSide}`) setActiveDropZone(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropOnDeck(bottomSide);
                    setActiveDropZone(null);
                    setDraggingItem(null);
                  }}
                  className={`relative card-deck-size rounded-lg border-2 flex flex-col items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                    activeDropZone === `deck-${bottomSide}`
                      ? 'border-sky-400 bg-sky-500/30 ring-4 ring-sky-400 scale-105 animate-pulse'
                      : 'border-sky-400/50 bg-gradient-to-br from-blue-900 to-indigo-950'
                  }`}
                  title="คลิกเพื่อจั่ว 1 ใบ (หรือลากการ์ดจากมือมาวางเพื่อคืนเข้าเด็ค)"
                >
                  <span className="text-[10px] sm:text-xs">🃏</span>
                  <span className="text-[9px] sm:text-[10px] font-black text-sky-300 font-mono">{bottomPlayer.deck.length}</span>
                  {isDeckPeeling && (
                    <div className="absolute inset-0 deck-peel-animation rounded-lg overflow-hidden pointer-events-none shadow-2xl z-30">
                      <PokemonCardBack className="w-full h-full rounded-lg" />
                    </div>
                  )}
                </button>
                {bottomPlayer.hand.length === 0 && (
                  <button
                    id="btn-setup-draw7"
                    onClick={() => {
                      handleDrawCards(bottomSide, 7);
                    }}
                    className="px-1.5 py-0.2 rounded bg-sky-950/80 border border-sky-400/40 text-[8px] text-sky-300 font-bold hover:bg-sky-900 active:scale-95 transition-all cursor-pointer"
                    title="จั่ว 7 ใบเริ่มต้นเกม"
                  >
                    + จั่ว 7
                  </button>
                )}
              </div>

              {/* Under Deck: Discard Pile & Lost Zone */}
              <div className="flex items-center gap-1">
                {/* Discard Pile with drop target support */}
                <div className="flex flex-col items-center">
                  <button
                    id="btn-view-discard"
                    data-discard-zone="true"
                    data-discard-side={bottomSide}
                    onClick={() => {
                      Sound.playCardFlip();
                      setIsDiscardLostOpen(true);
                    }}
                    className={`relative card-discard-size rounded-lg border overflow-hidden flex flex-col items-center justify-center shadow transition-all cursor-pointer ${
                      activeDropZone === `discard-${bottomSide}`
                        ? 'border-rose-400 bg-rose-500/30 ring-4 ring-rose-400 scale-105 animate-pulse'
                        : 'border-white/25 bg-slate-900/80 hover:border-white/50'
                    }`}
                    title="สุสานฝั่งคุณ (ลากการ์ดมาทิ้งที่นี่ หรือคลิกเพื่อดู)"
                  >
                    {bottomPlayer.discard.length > 0 ? (
                      <>
                        <img
                          src={resolveCardImageUrl(bottomPlayer.discard[bottomPlayer.discard.length - 1])}
                          alt="Bottom Discard"
                          draggable={false}
                          className="w-full h-full object-cover pointer-events-none opacity-60"
                          onError={(e) => handleCardImageError(e, bottomPlayer.discard[bottomPlayer.discard.length - 1])}
                        />
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] sm:text-xs">🗑️</span>
                          <span className="text-[9px] sm:text-[10px] font-bold text-white font-mono">{bottomPlayer.discard.length}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] sm:text-xs">🗑️</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 font-mono">0</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Lost Zone */}
                <div className="flex flex-col items-center">
                  <div
                    className="card-prize-size rounded-lg border border-purple-500/40 bg-purple-950/30 flex flex-col items-center justify-center text-purple-300"
                    title="Lost Zone"
                  >
                    <span className="text-[8px] sm:text-[9px]">🌀</span>
                    <span className="text-[8px] sm:text-[9px] font-bold font-mono">{bottomPlayer.lostZone.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* BOTTOM CONSOLE: Hand Cards Tray & Tabletop Action Dock */}
      {/* ========================================================================= */}
      <footer
        id="bottom-hand-console"
        className="relative z-30 w-full flex flex-col items-center bg-slate-950/95 border-t border-white/15 backdrop-blur-2xl shadow-2xl transition-all duration-200"
      >
        {/* Console Header Bar: Dual Hand Tabs, Quick Swap, Auto-Switch Toggle, Tray Toggle */}
        <div className="w-full flex items-center justify-between gap-1 px-2 sm:px-6 py-0.5 sm:py-1 bg-slate-900/90 border-b border-white/10 text-xs overflow-x-auto scrollbar-none">
          {/* Left: Hand Zone Controls (Streamlined: Online vs Solo) */}
          <div className="flex items-center gap-1 sm:gap-2 flex-nowrap sm:flex-wrap flex-shrink-0">
            {/* Online Mode: Player Identity & Hand Info Badge */}
            {state.roomMode === 'online' ? (
              <div
                id="hand-zone-turn-indicator"
                data-my-turn={isMyTurn}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all select-none ${
                  state.myRole === 'spectator'
                    ? 'bg-amber-950/70 border-amber-400/50 text-amber-300'
                    : isMyTurn
                    ? 'bg-emerald-950/70 border-emerald-400/50 text-emerald-300'
                    : 'bg-slate-900/80 border-white/10 text-slate-300'
                }`}
                title={
                  state.myRole === 'spectator'
                    ? `โหมดผู้เข้าชม: กำลังดูมุมมองของ ${bottomPlayer.name} (Turn ${state.turnCount})`
                    : isMyTurn
                    ? `เทิร์นของคุณ (Turn ${state.turnCount})`
                    : `เทิร์นของฝ่ายตรงข้าม (Turn ${state.turnCount})`
                }
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    state.myRole === 'spectator'
                      ? 'bg-amber-400'
                      : isMyTurn
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
                <span>{bottomSide === 'player1' ? '🔵' : '🔴'}</span>
                <span className="font-black text-white">{bottomPlayer.name}</span>
                {state.myRole !== 'spectator' && (
                  <button
                    id="btn-rename-self"
                    onClick={handleRenameSelf}
                    className="px-1 py-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-all text-[11px] cursor-pointer"
                    title="เปลี่ยนชื่อแสดงผลของคุณ"
                  >
                    ✏️
                  </button>
                )}
                <span>
                  {state.myRole === 'spectator'
                    ? `มือของ ${bottomPlayer.name} (${bottomPlayer.hand.length} ใบ)`
                    : `มือของคุณ (${bottomPlayer.hand.length} ใบ)`}
                </span>
                <span className="text-slate-400 text-[11px] font-medium border-l border-white/15 pl-1.5 ml-0.5">
                  {state.myRole === 'spectator'
                    ? `${topPlayer.name}: ${topPlayer.hand.length} ใบ`
                    : `คู่แข่ง: ${topPlayer.hand.length} ใบ`}
                </span>
                {shuffleNotice && (
                  <span
                    id="shuffle-notice-badge"
                    className="ml-1 px-2 py-0.5 rounded-md bg-blue-900/80 text-blue-200 border border-blue-400/50 text-[10px] font-bold animate-pulse"
                  >
                    {shuffleNotice}
                  </span>
                )}
              </div>
            ) : (
              /* Solo Mode: Turn Indicator & Dual Hand Tabs */
              <>
                <div
                  id="hand-zone-turn-indicator"
                  data-my-turn={isMyTurn}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-xl text-[10px] sm:text-xs font-black shadow-md border transition-all select-none flex-shrink-0 ${
                    isMyTurn
                      ? 'bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-950 border-emerald-400 text-emerald-300 shadow-emerald-950/60 ring-1 ring-emerald-400/40 animate-pulse'
                      : 'bg-slate-950/90 border-amber-500/40 text-amber-300/90'
                  }`}
                  title={
                    isMyTurn
                      ? `ตอนนี้เป็นเทิร์นของคุณ (Turn ${state.turnCount})`
                      : `ตอนนี้เป็นเทิร์นของฝ่ายตรงข้าม (Turn ${state.turnCount})`
                  }
                >
                  <span
                    className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full ${
                      isMyTurn ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping' : 'bg-amber-400'
                    }`}
                  />
                  <span className="tracking-wide hidden sm:inline">
                    {isMyTurn ? '🟢 เทิร์นของคุณ (YOUR TURN)' : '⏳ เทิร์นฝ่ายตรงข้าม (OPPONENT)'}
                  </span>
                  <span className="tracking-wide sm:hidden">
                    {isMyTurn ? '🟢 เทิร์นคุณ' : '⏳ เทิร์นคู่แข่ง'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full bg-black/40 font-mono text-slate-300 border border-white/10">
                    T{state.turnCount}
                  </span>
                </div>

                {/* Solo Practice Mode Indicator */}
                <div className="hidden 2xl:flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  <span>🥋</span>
                  <span>ซ้อมคนเดียว:</span>
                </div>

                {/* P1 Hand Tab */}
                <button
                  id="btn-hand-tab-p1"
                  onClick={() => {
                    if (bottomSide !== 'player1') {
                      Sound.playCardFlip();
                      commitState(TabletopActions.setPerspective(state, 'player1'));
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    bottomSide === 'player1'
                      ? 'bg-blue-600/90 text-white shadow-md shadow-blue-950/60 border border-blue-400/60 ring-1 ring-blue-400/40'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-white/10 hover:bg-slate-800'
                  }`}
                  title="สลับไปควบคุมมือและบอร์ดของ Player 1 (Shortcut: Tab)"
                >
                  <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${bottomSide === 'player1' ? 'bg-blue-300 animate-pulse' : 'bg-slate-600'}`} />
                  <span>🔵 P1</span>
                  {bottomSide === 'player1' ? (
                    <span className="text-white font-bold">
                      มือของคุณ ({state.player1.hand.length} ใบ)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">({state.player1.hand.length})</span>
                  )}
                </button>

                {/* P2 Hand Tab */}
                <button
                  id="btn-hand-tab-p2"
                  onClick={() => {
                    if (bottomSide !== 'player2') {
                      Sound.playCardFlip();
                      commitState(TabletopActions.setPerspective(state, 'player2'));
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    bottomSide === 'player2'
                      ? 'bg-rose-600/90 text-white shadow-md shadow-rose-950/60 border border-rose-400/60 ring-1 ring-rose-400/40'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-white/10 hover:bg-slate-800'
                  }`}
                  title="สลับไปควบคุมมือและบอร์ดของ Player 2 (Shortcut: Tab)"
                >
                  <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${bottomSide === 'player2' ? 'bg-rose-300 animate-pulse' : 'bg-slate-600'}`} />
                  <span>🔴 P2</span>
                  {bottomSide === 'player2' ? (
                    <span className="text-white font-bold">
                      มือของคุณ ({state.player2.hand.length} ใบ)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">({state.player2.hand.length})</span>
                  )}
                </button>

                {/* Quick Hand Swap Button */}
                <button
                  id="btn-swap-hand"
                  onClick={handleSwapPerspective}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/20 text-xs font-bold text-amber-300 hover:text-amber-200 transition-all active:scale-95 shadow cursor-pointer"
                  title="สลับมือเล่นระหว่าง P1 และ P2 (Shortcut: Tab)"
                >
                  <span>🔄</span>
                  <span className="hidden sm:inline">สลับมือ</span>
                  <kbd className="hidden sm:inline-block text-[9px] bg-slate-950/80 px-1 py-0.2 rounded text-slate-400 font-mono">Tab</kbd>
                </button>

                {/* Auto Swap on Pass Turn Toggle */}
                <button
                  id="btn-toggle-solo-auto-swap"
                  onClick={() => setIsSoloAutoSwitch((prev) => !prev)}
                  className={`hidden sm:flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border ${
                    isSoloAutoSwitch
                      ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                  title={
                    isSoloAutoSwitch
                      ? 'สลับมืออัตโนมัติเมื่อจบเทิร์น: เปิดอยู่ (เมื่อกด Pass Turn จะสลับมือและมุมมองให้อีกฝั่งทันที)'
                      : 'สลับมืออัตโนมัติเมื่อจบเทิร์น: ปิดอยู่ (คลิกเพื่อเปิดใช้งาน)'
                  }
                >
                  <span>⚡</span>
                  <span className="hidden md:inline">
                    {isSoloAutoSwitch ? 'สลับมือออโต้ (เปิด)' : 'สลับมือออโต้ (ปิด)'}
                  </span>
                </button>

                {/* Shuffle Deck (Solo Mode) */}
                <button
                  id="btn-setup-shuffle"
                  onClick={() => {
                    triggerShuffleAnimation(bottomSide);
                    commitState(TabletopActions.shuffleDeck(state, bottomSide));
                    setShuffleNotice('สับแล้ว ✓');
                    setTimeout(() => setShuffleNotice(null), 1800);
                  }}
                  title="สับเด็คของคุณ"
                  className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-blue-950 hover:bg-blue-900 border border-blue-400/40 text-[10px] font-bold text-blue-300 transition-all active:scale-95 cursor-pointer"
                >
                  {shuffleNotice || '🔀 สับ'}
                </button>
              </>
            )}

            {/* Consolidated Quick Draw, Mulligan & Return Hand (Hidden for Spectators) */}
            {state.myRole !== 'spectator' && (
              <>
                <div className="inline-flex items-center rounded-lg border border-sky-400/30 bg-slate-950/80 p-0.5 shadow-sm">
                  <button
                    id="btn-quick-draw"
                    onClick={() => {
                      Sound.playCardFlip();
                      setIsHandExpanded(true);
                      commitState((curr) => {
                        const side = curr.perspective === 'player2' ? 'player2' : 'player1';
                        return TabletopActions.drawCards(curr, side, 1);
                      });
                    }}
                    title="จั่วการ์ด 1 ใบ (Shortcut: D)"
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold text-sky-300 hover:bg-sky-900/60 transition-all active:scale-95 cursor-pointer"
                  >
                    + จั่ว 1
                  </button>
                  <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />
                  <button
                    id="btn-setup-draw-7"
                    onClick={() => {
                      Sound.playCardFlip();
                      setIsHandExpanded(true);
                      commitState((curr) => {
                        const side = curr.perspective === 'player2' ? 'player2' : 'player1';
                        return TabletopActions.drawCards(curr, side, 7);
                      });
                    }}
                    title="จั่วการ์ด 7 ใบ"
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-300 hover:bg-emerald-900/60 transition-all active:scale-95 cursor-pointer"
                  >
                    +7
                  </button>
                </div>

                {/* Mulligan */}
                <button
                  id="btn-setup-mulligan"
                  onClick={() => {
                    setIsMulliganModalOpen(true);
                    commitState((curr) => TabletopActions.openMulliganReveal(curr, bottomSide));
                  }}
                  title="มัลลิแกน (เปิดเผยการ์ดบนมือให้คู่แข่งร่วมตรวจสอบว่าไม่มี Basic Pokémon)"
                  className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-rose-950 hover:bg-rose-900 border border-rose-400/40 text-[10px] font-bold text-rose-300 transition-all active:scale-95 cursor-pointer"
                >
                  🔄 มัลลิแกน
                </button>

                {/* Return Hand Cards to Deck / Discard */}
                {bottomPlayer.hand.length > 0 && (
                  <>
                    <button
                      id="btn-open-hand-to-discard"
                      onClick={() => setIsHandToDiscardOpen(true)}
                      title="เลือกการ์ดบนมือเพื่อทิ้งลงสุสาน หรือส่งไปยัง Lost Zone"
                      className="flex px-2 py-0.5 rounded-md bg-rose-950 hover:bg-rose-900 border border-rose-400/50 text-[10px] font-bold text-rose-200 transition-all active:scale-95 cursor-pointer items-center gap-1 shadow-sm"
                    >
                      <span>🗑️</span>
                      <span className="hidden sm:inline">ทิ้งการ์ด</span>
                    </button>

                    <button
                      id="btn-hand-return-deck"
                      onClick={() => setIsHandToDeckOpen(true)}
                      title="เลือกการ์ดบนมือเพื่อนำกลับเข้ากองสำรับ (บนสุด/ใต้สุด/สับเข้ากอง)"
                      className="hidden md:flex px-2 py-0.5 rounded-md bg-indigo-950 hover:bg-indigo-900 border border-indigo-400/50 text-[10px] font-bold text-indigo-200 transition-all active:scale-95 cursor-pointer items-center gap-1 shadow-sm"
                    >
                      <span>📥</span>
                      <span className="hidden sm:inline">คืนเข้าเด็ค</span>
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Center: Expand / Collapse Hand Toggle Button */}
          <button
            id="btn-toggle-hand-tray"
            onClick={() => setIsHandExpanded((prev) => !prev)}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/20 text-[11px] sm:text-xs font-bold text-slate-200 hover:text-white transition-all active:scale-95 shadow cursor-pointer flex-shrink-0"
            title="ย่อ/ขยายการ์ดบนมือเพื่อดูโต๊ะชัดเจน (Shortcut: H)"
          >
            <span>{isHandExpanded ? '▼' : '▲'}</span>
            <span className="hidden sm:inline">{isHandExpanded ? 'ย่อลง (ดูโต๊ะเต็มจอ)' : `แสดงการ์ดบนมือ (${bottomPlayer.hand.length})`}</span>
            <span className="sm:hidden">{isHandExpanded ? 'ย่อลง' : `มือ (${bottomPlayer.hand.length})`}</span>
            <kbd className="hidden sm:inline-block text-[9px] bg-slate-950/80 px-1.5 py-0.2 rounded text-slate-400 border border-white/10 font-mono">
              H
            </kbd>
          </button>

          {/* Right: Helpful Hints */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-400">
            {state.roomMode !== 'online' && (
              <>
                <span>Tab: สลับมือ</span>
                <span>•</span>
              </>
            )}
            <span>D: จั่ว</span>
            <span>•</span>
            <span>Space: จบเทิร์น</span>
            <span>•</span>
            <span>Ctrl+Z: ย้อนกลับ</span>
          </div>
        </div>

        {/* Balatro Floating Card Action Pill */}
        {selectedHandCard && isHandExpanded && (
          <div
            id="balatro-floating-card-action-bar"
            data-testid="balatro-floating-card-action-bar"
            className="absolute -top-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/95 border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.55)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[95vw] overflow-x-auto"
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-emerald-400 text-xs font-black">
                {selectedHandCard.supertype === 'Energy' ? '⚡' : selectedHandCard.supertype === 'Pokemon' ? '🌱' : '🎴'}
              </span>
              <span className="text-white text-[11px] sm:text-xs font-black truncate max-w-[110px] sm:max-w-[180px]">
                {getCardDisplayName(selectedHandCard)}
              </span>
            </div>

            <span className="text-[10px] sm:text-[11px] text-emerald-300/90 border-l border-white/20 pl-2 hidden xs:inline whitespace-nowrap">
              {selectedHandCard.supertype === 'Energy'
                ? 'ลากไปวางที่โปเกมอนเพื่อติดพลังงาน'
                : selectedHandCard.supertype === 'Pokemon'
                ? 'ลากการ์ดไปวางที่ช่องสนาม (Active/Bench)'
                : 'ลากลงกระดานเพื่อใช้งาน'}
            </span>

            {selectedHandCard.supertype === 'Trainer' && (
              <button
                id="btn-quick-play-trainer"
                type="button"
                onClick={() => {
                  Sound.playCardPlacement();
                  commitState((curr) => TabletopActions.playTrainerToSpotlight(curr, bottomSide, selectedHandCard.instanceId));
                  setSelectedHandCardId(null);
                }}
                className="px-2 py-0.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shadow active:scale-95 whitespace-nowrap"
              >
                ✨ ใช้งาน
              </button>
            )}

            <button
              id="btn-open-card-menu"
              type="button"
              onClick={() => setSelectedHandCardInfo({ side: bottomSide, card: selectedHandCard })}
              className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-white/20 active:scale-95 whitespace-nowrap"
              title="เปิดเมนูการ์ด"
            >
              📋 เมนู
            </button>

            <button
              id="btn-cancel-card-selection"
              type="button"
              onClick={() => setSelectedHandCardId(null)}
              className="w-5 h-5 rounded-full bg-rose-950/80 hover:bg-rose-800 text-rose-300 flex items-center justify-center text-[11px] font-bold border border-rose-500/40 active:scale-90 shrink-0"
              title="ยกเลิกการเลือก"
            >
              ✕
            </button>
          </div>
        )}

        {/* Hand Cards Fan Tray */}
        {isHandExpanded && (
          <div
            id="hand-cards-tray"
            className={`w-full max-w-screen-2xl flex items-center justify-center px-1 sm:px-6 pt-1 sm:pt-4 pb-1 sm:pb-1.5 overflow-x-auto scrollbar-thin animate-in fade-in slide-in-from-bottom-2 duration-150 transition-colors ${
              isMyTurn ? 'bg-emerald-950/15 ring-1 ring-emerald-500/20' : 'bg-transparent'
            } ${
              bottomPlayer.hand.length > 8
                ? '-space-x-2 sm:-space-x-3 md:-space-x-4'
                : 'gap-1 sm:gap-2 md:gap-2.5'
            }`}
          >
            {bottomPlayer.hand.map((card, hIdx) => {
              const isBeingDragged =
                pointerDrag?.isDragging &&
                pointerDrag.item.type === 'HAND_CARD' &&
                pointerDrag.item.card.instanceId === card.instanceId;
              const isNeighborHovered = hoveredHandIndex !== null && Math.abs(hoveredHandIndex - hIdx) === 1;
              const neighborDirection = hoveredHandIndex !== null && isNeighborHovered
                ? hIdx < hoveredHandIndex ? 'left' : 'right'
                : null;
              return (
                <PlaymatHandCardItem
                  key={card.instanceId || hIdx}
                  card={card}
                  hIdx={hIdx}
                  totalCards={bottomPlayer.hand.length}
                  isBeingDragged={Boolean(isBeingDragged)}
                  isSelected={selectedHandCardId === card.instanceId}
                  isNewlyDrawn={newlyDrawnCardMap.has(card.instanceId)}
                  drawDelayMs={newlyDrawnCardMap.get(card.instanceId) ?? 0}
                  isNeighborHovered={isNeighborHovered}
                  neighborDirection={neighborDirection}
                  onPointerDown={(e) => {
                    if (e.button !== 0 && e.pointerType === 'mouse') return;
                    try {
                      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                    } catch {}
                    startPointerDrag(
                      { type: 'HAND_CARD', card, side: bottomSide },
                      e.clientX,
                      e.clientY,
                      e.pointerType
                    );
                  }}
                  onPointerUp={(e) => {
                    try {
                      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                    } catch {}
                  }}
                  onPointerCancel={() => {
                    if (touchHoldTimerRef.current) {
                      clearTimeout(touchHoldTimerRef.current);
                      touchHoldTimerRef.current = null;
                    }
                  }}
                  onClick={() => {
                    if (dragJustEndedRef.current || pointerDragRef.current?.isDragging) return;
                    Sound.playCardFlip();
                    setSelectedHandCardId((prev) => (prev === card.instanceId ? null : card.instanceId));
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    // Right-click provides the secondary action menu on PC if needed
                    setSelectedHandCardInfo({ side: bottomSide, card });
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    Sound.playCardFlip();
                    setPreviewingCard(card);
                  }}
                  onZoom={() => {
                    setPreviewingCard(card);
                  }}
                  onHoverChange={(hovered) => {
                    setHoveredHandIndex(hovered ? hIdx : null);
                  }}
                />
              );
            })}
            {bottomPlayer.hand.length === 0 && (
              <div className="py-1.5 px-3 rounded-xl bg-slate-900/50 border border-white/10 text-xs text-slate-500">
                ไม่มีการ์ดในมือ (คลิกเด็คหรือกด D เพื่อจั่ว)
              </div>
            )}
          </div>
        )}

        {/* Action Dock (Always positioned cleanly below the hand tray) */}
        <div className="w-full flex justify-center py-1">
          {state.myRole === 'spectator' ? (
            <div
              id="spectator-dock"
              className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-1.5 rounded-2xl bg-slate-900/95 border border-amber-500/40 shadow-2xl backdrop-blur-xl text-xs select-none"
            >
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-black">👁️ โหมดผู้เข้าชม</span>
                <span className="text-slate-500">•</span>
                <span className="text-white font-bold">
                  {state.currentTurn === 'player1'
                    ? `🔵 เทิร์น ${state.player1.name}`
                    : `🔴 เทิร์น ${state.player2.name}`}
                </span>
                <span className="text-amber-300 font-mono text-[11px]">(Turn {state.turnCount})</span>
              </div>
              <div className="h-4 w-[1px] bg-white/20" />
              <div className="flex items-center gap-2.5 text-slate-300 text-xs">
                <span className="text-blue-300 font-bold">
                  🔵 ไพรซ์ {state.player1.prizes.length}/6
                </span>
                <span className="text-rose-300 font-bold">
                  🔴 ไพรซ์ {state.player2.prizes.length}/6
                </span>
              </div>
              <div className="h-4 w-[1px] bg-white/20" />
              <button
                id="btn-spectator-swap-view"
                onClick={handleSwapPerspective}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold transition-all active:scale-95 cursor-pointer"
                title="สลับมุมมองระหว่าง Player 1 และ Player 2"
              >
                <span>🔄</span>
                <span>สลับมุมมอง ({bottomSide === 'player1' ? 'P1' : 'P2'})</span>
              </button>
              <button
                id="btn-spectator-log"
                onClick={() => setIsLogDrawerOpen((prev) => !prev)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/20 text-slate-200 font-bold transition-all active:scale-95 cursor-pointer"
                title="เปิดประวัติการเล่น"
              >
                <span>📜</span>
                <span className="hidden sm:inline">ประวัติ</span>
              </button>
            </div>
          ) : (
            <TabletopV3Dock
              deckCount={bottomPlayer.deck.length}
              discardCount={bottomPlayer.discard.length}
              lostZoneCount={bottomPlayer.lostZone.length}
              prizeCount={bottomPlayer.prizes.length}
              canUndo={history.past.length > 0}
              canRedo={history.future.length > 0}
              isMyTurn={isMyTurn}
              turnCount={state.turnCount}
              onDrawCard={(count) => {
                handleDrawCards(bottomSide, count);
              }}
              onOpenDeckSearch={() => {
                setEmptySlotTarget(null);
                setIsDeckSearchOpen(true);
              }}
              onOpenTopCards={() => {
                if (state.isConsentRequired || state.roomMode === 'online') {
                  commitState((curr) =>
                    TabletopActions.requestConsent(curr, {
                      id: `consent-${Date.now()}`,
                      requesterSide: bottomSide,
                      requesterName: state[bottomSide].name,
                      actionType: 'INSPECT_TOP',
                      description: 'ขอดูการ์ดบนสุดของกองสำรับ (Inspect Top Cards)',
                      timestamp: Date.now(),
                    })
                  );
                } else {
                  setIsTopCardsOpen(true);
                }
              }}
              onOpenPrizes={() => {
                if (bottomPlayer.prizes.length > 0) {
                  commitState((curr) => TabletopActions.takePrize(curr, bottomSide, 0));
                }
              }}
              onOpenDiscardAndLostZone={() => setIsDiscardLostOpen(true)}
              onOpenRandomizer={() => setIsRandomizerOpen(true)}
              onPassTurn={handlePassTurn}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onResetTable={handleResetTable}
              onShuffleDeck={() => {
                if (state.isConsentRequired || state.roomMode === 'online') {
                  commitState((curr) =>
                    TabletopActions.requestConsent(curr, {
                      id: `consent-${Date.now()}`,
                      requesterSide: bottomSide,
                      requesterName: state[bottomSide].name,
                      actionType: 'SHUFFLE_DECK',
                      description: 'ขอสับกองสำรับการ์ด (Shuffle Deck)',
                      timestamp: Date.now(),
                    })
                  );
                } else {
                  triggerShuffleAnimation(bottomSide);
                  commitState(TabletopActions.shuffleDeck(state, bottomSide));
                  setShuffleNotice('สับแล้ว ✓');
                  setTimeout(() => setShuffleNotice(null), 1800);
                }
              }}
            />
          )}
        </div>
      </footer>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* MODAL 1: Field Pokemon Action Modal */}
      {selectedPokemonSlot && selectedField && (
        <PokemonActionModal
          slot={selectedPokemonSlot}
          position={selectedField.position}
          benchSlots={state[selectedField.side].bench.slice(0, state[selectedField.side].benchLimit || 5)}
          hasActive={state[selectedField.side].active !== null}
          onClose={() => setSelectedField(null)}
          onAdjustDamage={(delta) =>
            commitState((curr) => TabletopActions.adjustDamage(curr, selectedField.side, selectedField.position, delta), true)
          }
          onSetDamage={(total) =>
            commitState((curr) => TabletopActions.setDamage(curr, selectedField.side, selectedField.position, total), true)
          }
          onToggleStatus={(cond) =>
            commitState((curr) => TabletopActions.toggleStatus(curr, selectedField.side, selectedField.position, cond), true)
          }
          onSwitchWithBench={(bIdx) => {
            if (state.roomMode === 'online' && selectedField.side !== state.myRole && state.myRole !== 'both') {
              const mySide = state.myRole === 'player2' ? 'player2' : 'player1';
              const myName = state[mySide].name;
              const targetBenchSlot = typeof bIdx === 'number' ? state[selectedField.side].bench[bIdx] : selectedPokemonSlot;
              const targetSlot = targetBenchSlot || selectedPokemonSlot;
              const targetName = getCardDisplayName(targetSlot.card);
              Sound.playCardPlacement();
              commitState((curr) =>
                TabletopActions.requestConsent(curr, {
                  id: `switch-${Date.now()}`,
                  requesterSide: mySide,
                  requesterName: myName,
                  actionType: 'SWITCH_POKEMON',
                  description: `ขอสลับ ${targetName} ขึ้นมาเป็นตำแหน่ง Active (คำสั่งของบอส / Gust)`,
                  timestamp: Date.now(),
                  payload: { targetSide: selectedField.side, benchIndex: bIdx, revealedCard: targetSlot.card },
                  revealedCard: targetSlot.card,
                }),
                true
              );
              setSelectedField(null);
              return;
            }
            commitState((curr) => TabletopActions.switchActiveWithBench(curr, selectedField.side, bIdx));
          }}
          onRetractToHand={() =>
            commitState((curr) => TabletopActions.retractToHand(curr, selectedField.side, selectedField.position))
          }
          onDevolve={() =>
            commitState((curr) => TabletopActions.devolve(curr, selectedField.side, selectedField.position))
          }
          onKnockOut={(toLost) =>
            commitState((curr) => TabletopActions.knockOut(curr, selectedField.side, selectedField.position, toLost))
          }
          onShuffleToDeck={() =>
            commitState((curr) => TabletopActions.shufflePokemonToDeck(curr, selectedField.side, selectedField.position))
          }
          onMoveEnergy={(energyId, dest) => {
            if (dest === 'DISCARD') {
              handleRequestDiscardEnergy(selectedField.side, selectedField.position, energyId);
              setSelectedField(null);
            } else {
              commitState((curr) => TabletopActions.moveEnergy(curr, selectedField.side, selectedField.position, energyId, dest));
            }
          }}
          onToggleFacedown={() =>
            commitState((curr) => TabletopActions.toggleFacedown(curr, selectedField.side, selectedField.position))
          }
          onToggleAbility={() =>
            commitState((curr) => TabletopActions.toggleAbility(curr, selectedField.side, selectedField.position))
          }
          onRetreatActive={(bIdx, discardEnergyIds) =>
            commitState((curr) => TabletopActions.retreatActive(curr, selectedField.side, bIdx, discardEnergyIds))
          }
          onZoomCard={() => {
            if (selectedPokemonSlot) {
              setPreviewingCard(selectedPokemonSlot.card);
            }
          }}
          onDeclareAttack={(attackName, damage) => {
            const side = selectedField.side;
            const pos = selectedField.position;
            Sound.playAttack();
            commitState((curr) =>
              TabletopActions.startAttackDeclaration(
                curr,
                side,
                pos,
                attackName,
                damage || 0
              )
            );
            setSelectedField(null);
          }}
          handEnergies={state[selectedField.side].hand.filter((c) => c.supertype === 'Energy')}
          onAttachEnergyFromHand={(energyCardId) => {
            commitState((curr) =>
              TabletopActions.attachEnergyFromHand(curr, selectedField.side, energyCardId, selectedField.position)
            );
          }}
          onPreviewCard={(card) => setPreviewingCard(card)}
          handTools={state[selectedField.side].hand.filter(
            (c) =>
              (c.subtypes && c.subtypes.includes('Pokémon Tool')) ||
              (c as any).trainerType === 'TOOL' ||
              (c.supertype === 'Trainer' &&
                (c.nameTh?.includes('ไอเท็มติดโปเกมอน') ||
                  c.nameEn?.toLowerCase().includes('tool') ||
                  (c as any).isTool))
          )}
          onAttachToolFromHand={(toolCardId) => {
            commitState((curr) =>
              TabletopActions.attachToolFromHand(curr, selectedField.side, toolCardId, selectedField.position)
            );
          }}
          onDetachTool={(toZone) => {
            commitState((curr) =>
              TabletopActions.detachTool(curr, selectedField.side, selectedField.position, toZone)
            );
          }}
          damageMemory={damageMemory}
          onUpdateDamageMemory={(key, val) => setDamageMemory((prev) => ({ ...prev, [key]: val }))}
          isOpponent={selectedField.side !== state.myRole && state.myRole !== 'both'}
        />
      )}

      {/* MODAL 2: Hand Card Action Sheet / Popover */}
      {selectedHandCardInfo && (
        <HandCardMenuModal
          card={selectedHandCardInfo.card}
          isGameStarted={state.isGameStarted}
          activeSlot={state[selectedHandCardInfo.side].active}
          benchSlots={state[selectedHandCardInfo.side].bench.slice(0, state[selectedHandCardInfo.side].benchLimit || 5)}
          benchLimit={state[selectedHandCardInfo.side].benchLimit || 5}
          onClose={() => setSelectedHandCardInfo(null)}
          onZoomCard={() => {
            if (selectedHandCardInfo) {
              setPreviewingCard(selectedHandCardInfo.card);
            }
          }}
          onPlaceActive={(facedown) =>
            commitState((curr) => TabletopActions.placeFromHand(curr, selectedHandCardInfo.side, selectedHandCardInfo.card.instanceId, 'ACTIVE', facedown))
          }
          onPlaceBench={(bIdx, facedown) =>
            commitState((curr) => TabletopActions.placeFromHand(curr, selectedHandCardInfo.side, selectedHandCardInfo.card.instanceId, bIdx, facedown))
          }
          onAttachEnergy={(target, isSpecialAttach) =>
            commitState((curr) => TabletopActions.attachEnergyFromHand(curr, selectedHandCardInfo.side, selectedHandCardInfo.card.instanceId, target, isSpecialAttach))
          }
          onAttachTool={(target) =>
            commitState(TabletopActions.attachToolFromHand(state, selectedHandCardInfo.side, selectedHandCardInfo.card.instanceId, target))
          }
          onEvolve={(target) =>
            commitState(TabletopActions.evolveFromHand(state, selectedHandCardInfo.side, selectedHandCardInfo.card.instanceId, target))
          }
          onPlayStadium={() =>
            commitState(TabletopActions.playStadium(state, selectedHandCardInfo.side, selectedHandCardInfo.card.instanceId))
          }
          onDiscard={() =>
            commitState(TabletopActions.discardFromHand(state, selectedHandCardInfo.side, selectedHandCardInfo.card.instanceId))
          }
          onLostZone={() =>
            commitState(TabletopActions.lostZoneFromHand(state, selectedHandCardInfo.side, selectedHandCardInfo.card.instanceId))
          }
          onPutDeckTop={() =>
            commitState(TabletopActions.putHandToDeck(state, selectedHandCardInfo.side, selectedHandCardInfo.card.instanceId, 'TOP'))
          }
          onPutDeckBottom={() =>
            commitState(TabletopActions.putHandToDeck(state, selectedHandCardInfo.side, selectedHandCardInfo.card.instanceId, 'BOTTOM'))
          }
          onShuffleToDeck={() =>
            commitState(TabletopActions.putHandToDeck(state, selectedHandCardInfo.side, selectedHandCardInfo.card.instanceId, 'SHUFFLE'))
          }
          onPutPrizes={() =>
            commitState(TabletopActions.putHandToPrizes(state, selectedHandCardInfo.side, selectedHandCardInfo.card.instanceId))
          }
          onPlayTrainer={() =>
            commitState(TabletopActions.playTrainerToSpotlight(state, selectedHandCardInfo.side, selectedHandCardInfo.card.instanceId))
          }
          onRevealCard={() =>
            commitState(TabletopActions.revealCardToSpotlight(state, selectedHandCardInfo.side, selectedHandCardInfo.card))
          }
        />
      )}

      {/* MODAL: Mulligan Verification Modal (Anti-Cheat Check & Synchronized Bonus Draw) */}
      {(() => {
        const isRevealing = !!(
          state.mulliganReveal &&
          state.mulliganReveal.status !== 'DISMISSED' &&
          state.roomMode === 'online' &&
          state.myRole &&
          state.myRole !== 'both' &&
          state.myRole !== state.mulliganReveal.side
        );
        const isLocalOpen = isMulliganModalOpen;
        if (!isRevealing && !isLocalOpen) return null;

        const reveal = state.mulliganReveal;
        const targetSide = reveal ? reveal.side : bottomSide;
        const targetPlayer = state[targetSide];
        const isReviewer = Boolean(
          reveal &&
            state.roomMode === 'online' &&
            state.myRole &&
            state.myRole !== 'both' &&
            state.myRole !== reveal.side
        );

        return (
          <MulliganCheckModal
            isOpen={true}
            onClose={() => {
              setIsMulliganModalOpen(false);
              if (state.mulliganReveal) {
                commitState((curr) => TabletopActions.dismissMulliganReveal(curr));
              }
            }}
            handCards={reveal ? reveal.handCards : targetPlayer.hand}
            playerName={
              reveal
                ? reveal.playerName
                : targetPlayer.name || (targetSide === 'player1' ? 'ผู้เล่น 1' : 'ผู้เล่น 2')
            }
            playerSide={targetSide}
            isReviewer={isReviewer}
            mulliganStatus={reveal ? reveal.status : 'PENDING'}
            onConfirmMulligan={() => {
              Sound.playShuffle();
              setIsHandExpanded(true);
              commitState((curr) => TabletopActions.confirmMulligan(curr, targetSide));
            }}
            onClaimBonusDraw={() => {
              const mySide = state.myRole === 'player2' ? 'player2' : 'player1';
              commitState((curr) => TabletopActions.claimMulliganBonusDraw(curr, mySide));
            }}
          />
        );
      })()}

      {/* MODAL: Hand Cards to Deck Modal (Bulk Return) */}
      <HandToDeckModal
        isOpen={isHandToDeckOpen}
        onClose={() => setIsHandToDeckOpen(false)}
        handCards={bottomPlayer.hand}
        onReturnToDeck={(cardIds, position) => {
          commitState(TabletopActions.putMultipleHandToDeck(state, bottomSide, cardIds, position));
        }}
      />

      {/* MODAL: Hand Cards to Discard Modal (Bulk Discard / Lost Zone) */}
      <HandToDiscardModal
        isOpen={isHandToDiscardOpen}
        onClose={() => setIsHandToDiscardOpen(false)}
        handCards={bottomPlayer.hand}
        playerName={bottomPlayer.name}
        onDiscard={(cardIds) => {
          commitState(TabletopActions.discardMultipleFromHand(state, bottomSide, cardIds));
        }}
        onLostZone={(cardIds) => {
          commitState(TabletopActions.lostZoneMultipleFromHand(state, bottomSide, cardIds));
        }}
      />

      {/* MODAL 3: Deck Search Modal */}
      {isDeckSearchOpen && (
        <DeckSearchModal
          deck={bottomPlayer.deck}
          playerActive={bottomPlayer.active as any}
          playerBench={bottomPlayer.bench as any}
          onClose={handleCloseDeckSearch}
          onMoveCard={(cardId, toZone, options) => {
            commitState((curr) => {
              const searchSide: 'player1' | 'player2' =
                curr.roomMode === 'online' && curr.myRole && curr.myRole !== 'both'
                  ? (curr.myRole as 'player1' | 'player2')
                  : (curr.perspective === 'player2' ? 'player2' : 'player1');
              const cardToReveal = curr[searchSide].deck.find((c) => c.instanceId === cardId);
              let next = TabletopActions.moveCardBetweenZones(
                curr,
                searchSide,
                cardId,
                'DECK',
                toZone,
                options
              );
              if (options?.revealToOpponent && cardToReveal && curr.roomMode !== 'online') {
                const pName = curr[searchSide].name;
                const cardName = getCardDisplayName(cardToReveal);
                next.actionToast = {
                  id: `reveal-${Date.now()}`,
                  message: `🔍 ${pName} ค้นหาและเลือกการ์ด: ${cardName}`,
                  icon: '🔍',
                  cardImageUrl: resolveCardImageUrl(cardToReveal),
                  cardName,
                  playerSide: searchSide,
                  type: 'INFO',
                  timestamp: Date.now(),
                };
              }
              return next;
            });
            if (toZone === 'HAND') {
              setIsHandExpanded(true);
            }
          }}
          onMoveCards={(cardIds, toZone, options) => {
            commitState((curr) => {
              const searchSide: 'player1' | 'player2' =
                curr.roomMode === 'online' && curr.myRole && curr.myRole !== 'both'
                  ? (curr.myRole as 'player1' | 'player2')
                  : (curr.perspective === 'player2' ? 'player2' : 'player1');
              const cardsToReveal = curr[searchSide].deck.filter((c) =>
                cardIds.includes(c.instanceId)
              );
              let next = TabletopActions.moveMultipleCardsBetweenZones(
                curr,
                searchSide,
                cardIds,
                'DECK',
                toZone,
                options
              );
              if (options?.revealToOpponent && cardsToReveal.length > 0 && curr.roomMode !== 'online') {
                const pName = curr[searchSide].name;
                const cardNames = cardsToReveal
                  .map((c) => getCardDisplayName(c))
                  .join(', ');
                next.actionToast = {
                  id: `reveal-${Date.now()}`,
                  message: `🔍 ${pName} ค้นหาและเลือกการ์ด (${cardsToReveal.length} ใบ): ${cardNames}`,
                  icon: '🔍',
                  cardImageUrl: resolveCardImageUrl(cardsToReveal[0]),
                  cardName: cardNames,
                  playerSide: searchSide,
                  type: 'INFO',
                  timestamp: Date.now(),
                };
              }
              return next;
            });
            if (toZone === 'HAND') {
              setIsHandExpanded(true);
            }
          }}
          onShuffleDeck={() => {
            const currentBottomSide: 'player1' | 'player2' =
              state.roomMode === 'online' && state.myRole && state.myRole !== 'both'
                ? (state.myRole as 'player1' | 'player2')
                : (state.perspective === 'player2' ? 'player2' : 'player1');
            triggerShuffleAnimation(currentBottomSide);
            commitState((curr) => TabletopActions.shuffleDeck(curr, currentBottomSide));
          }}
        />
      )}

      {/* MODAL 4: Top Cards Inspector Modal */}
      {isTopCardsOpen && (
        <TopCardsViewerModal
          deck={bottomPlayer.deck}
          onClose={() => setIsTopCardsOpen(false)}
          onMoveCard={(cardId, toZone) => {
            commitState((curr) => {
              const currentBottomSide: 'player1' | 'player2' =
                curr.perspective === 'player2' ? 'player2' : 'player1';
              return TabletopActions.moveCardBetweenZones(
                curr,
                currentBottomSide,
                cardId,
                'DECK',
                toZone
              );
            });
            if (toZone === 'HAND') {
              setIsHandExpanded(true);
            }
          }}
          onResolveRemainder={(action, remainingCardIds) => {
            if (action === 'SHUFFLE') {
              Sound.playShuffle();
              commitState((curr) => {
                const currentBottomSide: 'player1' | 'player2' =
                  curr.perspective === 'player2' ? 'player2' : 'player1';
                return TabletopActions.shuffleDeck(curr, currentBottomSide);
              });
            } else if (action === 'BOTTOM') {
              Sound.playCardPlacement();
              commitState((curr) => {
                const currentBottomSide: 'player1' | 'player2' =
                  curr.perspective === 'player2' ? 'player2' : 'player1';
                return TabletopActions.putInspectedCardsToBottom(
                  curr,
                  currentBottomSide,
                  remainingCardIds || []
                );
              });
            }
          }}
        />
      )}

      {/* MODAL 5: Discard & Lost Zone Inspector Modal */}
      {isDiscardLostOpen && (
        <DiscardAndLostZoneModal
          discard={bottomPlayer.discard}
          lostZone={bottomPlayer.lostZone}
          playerActive={bottomPlayer.active as any}
          onClose={() => setIsDiscardLostOpen(false)}
          onMoveCard={(cardId, fromZone, toZone) => {
            commitState((curr) => {
              const currentBottomSide: 'player1' | 'player2' =
                curr.perspective === 'player2' ? 'player2' : 'player1';
              return TabletopActions.moveCardBetweenZones(
                curr,
                currentBottomSide,
                cardId,
                fromZone,
                toZone
              );
            });
            if (toZone === 'HAND') {
              setIsHandExpanded(true);
            }
          }}
        />
      )}

      {/* MODAL 6: Randomizer Dice & Coin Modal */}
      {isRandomizerOpen && (
        <RandomizerModal
          onClose={() => setIsRandomizerOpen(false)}
          onLogResult={(msg) => {
            setHistory((curr) => ({
              ...curr,
              present: {
                ...curr.present,
                historyLog: [...curr.present.historyLog, msg],
              },
            }));
          }}
        />
      )}

      {/* MODAL 6B: Turn Decision Modal (Coin Toss & Pick First/Second) */}
      {(isTurnDecisionModalOpen || (state.roomMode === 'online' && !!state.turnDecision && state.turnDecision.phase !== 'DECIDED')) && (
        <TurnDecisionModal
          onClose={() => {
            setIsTurnDecisionModalOpen(false);
            if (state.roomMode === 'online') {
              commitState((curr) => TabletopActions.setTurnDecision(curr, null));
            }
          }}
          p1Name={state.player1.name}
          p2Name={state.player2.name}
          myRole={state.roomMode === 'online' ? state.myRole : 'both'}
          roomMode={state.roomMode}
          currentTurn={state.currentTurn}
          currentDecision={state.turnDecision}
          onApplyDecision={(decision) => {
            commitState((curr) => {
              let updated = { ...curr };
              if (decision.startingPlayer) {
                updated.currentTurn = decision.startingPlayer;
                const winnerName =
                  decision.winnerSide === 'player1' ? curr.player1.name : curr.player2.name;
                const chosenText = decision.chosenOrder === 'FIRST' ? 'เล่นก่อน' : 'เล่นหลัง';
                const toastMsg = `🪙 ${winnerName} ชนะการทอยเหรียญ และเลือก [${chosenText}]!`;
                updated = TabletopActions.setActionToast(updated, {
                  id: `turn-decide-${Date.now()}`,
                  message: toastMsg,
                  icon: '🪙',
                  type: 'INFO',
                });
                updated.historyLog = [
                  ...updated.historyLog,
                  `🪙 ${winnerName} ชนะการทอยเหรียญ (ผล: ${
                    decision.coinResult === 'HEADS' ? 'หัว' : 'ก้อย'
                  }) และเลือก [${chosenText}] -> ฝ่ายเริ่มก่อนคือ ${
                    decision.startingPlayer === 'player1' ? curr.player1.name : curr.player2.name
                  }`,
                ];
              }
              updated.turnDecision = decision;
              return updated;
            }, true);
          }}
        />
      )}

      {/* MODAL 6C: In-Game Real-Time Synchronized Coin Flip Overlay */}
      {state.activeCoinFlip && (
        <TabletopCoinFlipOverlay
          coinFlip={state.activeCoinFlip}
          myRole={state.roomMode === 'online' ? state.myRole : 'both'}
          onClose={() => {
            commitState(TabletopActions.setActiveCoinFlip(state, null));
          }}
        />
      )}

      {/* Tabletop VFX Overlay for Ability & Evolution */}
      <TabletopVfxOverlay
        vfxEvent={state.vfxEvent}
        onDismiss={() => {
          commitState((curr) => TabletopActions.setVfxEvent(curr, null));
        }}
      />

      {/* MODAL 7: Meta & Custom Deck Selector Modal (Single Side Change) */}
      {isDeckSelectorOpen && (
        <TabletopDeckSelectorModal
          targetSideOnly={state.roomMode === 'online' ? (state.myRole === 'player2' ? 'player2' : 'player1') : undefined}
          onClose={() => setIsDeckSelectorOpen(false)}
          onSelectDeck={handleSelectDeckForSide}
        />
      )}

      {/* MODAL 7B: New Match Deck Selection Modal (Prompt Deck Selection for Both Sides First) */}
      {isNewMatchModalOpen && (
        <TabletopDeckSelectorModal
          isNewMatchMode={state.roomMode !== 'online'}
          targetSideOnly={state.roomMode === 'online' ? (state.myRole === 'player2' ? 'player2' : 'player1') : undefined}
          p1DeckName={state.player1.deckName}
          p2DeckName={state.player2.deckName}
          onClose={() => setIsNewMatchModalOpen(false)}
          onSelectDeck={handleSelectDeckForSide}
          onConfirmStartNewMatch={(p1Cards, p1Name, p2Cards, p2Name, firstPlayer) => {
            handleStartNewMatch(p1Cards, p1Name, p2Cards, p2Name, firstPlayer);
            setIsNewMatchModalOpen(false);
          }}
        />
      )}


      {/* MODAL 8: Online Room Modal (2 Devices Real-time Sync) */}
      {isOnlineRoomOpen && (
        <OnlineRoomModal
          currentState={state}
          onClose={() => setIsOnlineRoomOpen(false)}
          onConnected={(code, role, syncedState) => {
            commitState(
              {
                ...syncedState,
                roomMode: 'online',
                roomCode: code,
                myRole: role,
                perspective: role === 'spectator' ? 'player1' : role,
              },
              true
            );
          }}
          onDisconnect={() => {
            commitState({
              ...state,
              roomMode: 'local',
              roomCode: null,
              myRole: 'both',
            });
          }}
        />
      )}

      {/* DRAWER: Tabletop Action History Log */}
      {isLogDrawerOpen && (
        <div
          id="action-log-drawer"
          className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-slate-950/98 border-l border-white/15 shadow-2xl p-4 flex flex-col gap-3 text-white backdrop-blur-xl animate-in slide-in-from-right duration-200"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📜</span>
              <h3 className="text-sm font-black">ประวัติการกระทำบนโต๊ะ</h3>
            </div>
            <button
              onClick={() => setIsLogDrawerOpen(false)}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 text-xs text-slate-300 font-mono">
            {state.historyLog.slice().reverse().map((entry, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-slate-900/80 border border-white/5"
              >
                {entry}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 9: Large Card Preview & Clear Text Reader */}
      {previewingCard && (
        <CardImagePreviewModal
          cardId={previewingCard.cardCode || previewingCard.instanceId}
          imageUrl={resolveCardImageUrl(previewingCard, true) || null}
          officialImageUrl={previewingCard.officialImageUrl}
          cardName={getCardDisplayName(previewingCard)}
          setInfo={(previewingCard as any).set || (previewingCard as any).setName}
          collectorNumber={(previewingCard as any).number}
          rarityCode={(previewingCard as any).rarity}
          hp={previewingCard.hp}
          supertype={previewingCard.supertype}
          subtypes={previewingCard.subtypes}
          abilities={previewingCard.abilities}
          attacks={previewingCard.attacks}
          rulesText={(previewingCard as any).rulesText || (previewingCard as any).effect || (previewingCard as any).text}
          onClose={() => setPreviewingCard(null)}
        />
      )}

      {/* MODAL 10: Opponent Consent Request Modal */}
      {state.myRole !== 'spectator' && state.pendingConsent && !(state.isGameStarted && state.pendingConsent.actionType === 'START_GAME') && (
        <TabletopConsentModal
        pendingConsent={state.pendingConsent}
        myRole={state.myRole}
        isOnline={state.roomMode === 'online'}
        isGameStarted={state.isGameStarted}
        onApprove={() => {
          const req = state.pendingConsent;
          if (req?.id) resolvedConsentIdsRef.current.add(req.id);
          if (req?.actionType === 'INSPECT_TOP') {
            if (state.myRole === req.requesterSide || state.myRole === 'both') {
              setIsTopCardsOpen(true);
            }
          } else if (req?.actionType === 'SHUFFLE_DECK' || req?.actionType === 'CUT_DECK') {
            Sound.playShuffle();
            commitState((curr) => {
              const shuffled = TabletopActions.shuffleDeck(curr, req.requesterSide);
              const responded = TabletopActions.respondConsent(shuffled, true);
              return TabletopActions.setActionToast(responded, {
                id: `shuffle-done-${Date.now()}`,
                message: `🔀 สับ/ตัดเด็คของ ${req.requesterName} เรียบร้อยแล้ว`,
                icon: '🔀',
                type: 'SUCCESS',
              });
            }, true);
            return;
          } else if (req?.actionType === 'START_GAME') {
            Sound.playGameVictory();
            commitState((curr) => {
              const responded = TabletopActions.respondConsent(curr, true);
              const next = TabletopActions.revealAllFacedown(responded);
              next.isGameStarted = true;
              next.pendingConsent = null;
              return TabletopActions.setActionToast(next, {
                id: `start-game-${Date.now()}`,
                message: "✨ ทั้งสองฝ่ายพร้อมแล้ว! เริ่มการแข่งขัน Let's Play!",
                icon: '🚀',
                type: 'SUCCESS',
              });
            }, true);
            return;
          } else if (req?.actionType === 'REMATCH') {
            Sound.playCardPlacement();
            commitState((curr) => {
              const responded = TabletopActions.respondConsent(curr, true);
              const next = TabletopActions.resetToSetup(responded);
              return TabletopActions.setActionToast(next, {
                id: `rematch-${Date.now()}`,
                message: '🔄 ทั้งสองฝ่ายตกลงเริ่มเกมใหม่! กรุณาเลือกเด็คของคุณ',
                icon: '🔄',
                type: 'INFO',
              });
            }, true);
            setIsDeckSelectorOpen(true);
            return;
          } else if (req?.actionType === 'SWITCH_POKEMON') {
            Sound.playCardPlacement();
            setSelectedField(null);
            setPreviewingCard(null);
            commitState((curr) => {
              const responded = TabletopActions.respondConsent(curr, true);
              const { targetSide, benchIndex } = req.payload || {};
              if (targetSide && typeof benchIndex === 'number') {
                const targetPlayer = responded[targetSide as 'player1' | 'player2'];
                const targetInstanceId = req.revealedCard?.instanceId || req.payload?.revealedCard?.instanceId;
                let actualBenchIndex = benchIndex;
                if (targetInstanceId) {
                  const foundIdx = targetPlayer.bench.findIndex(
                    (b: any) => b?.card?.instanceId === targetInstanceId
                  );
                  if (foundIdx >= 0) actualBenchIndex = foundIdx;
                }
                const switched = TabletopActions.switchActiveWithBench(responded, targetSide, actualBenchIndex);
                const targetCard = switched[targetSide as 'player1' | 'player2'].active?.card;
                const targetName = targetCard ? getCardDisplayName(targetCard) : 'โปเกมอน';
                return TabletopActions.setActionToast(switched, {
                  id: `switch-done-${Date.now()}`,
                  message: `🔄 สลับ ${targetName} ขึ้นเป็น Active แล้ว (คำสั่งของบอส)`,
                  icon: '🔄',
                  type: 'SUCCESS',
                });
              }
              return responded;
            }, true);
            return;
          } else if (req?.actionType === 'DISCARD_ENERGY') {
            Sound.playCardPlacement();
            commitState((curr) => {
              const responded = TabletopActions.respondConsent(curr, true);
              const { targetSide, targetPosition, energyId, energyType } = req.payload || {};
              if (targetSide && targetPosition !== undefined && energyId) {
                const moved = TabletopActions.moveEnergy(responded, targetSide, targetPosition, energyId, 'DISCARD');
                return TabletopActions.setActionToast(moved, {
                  id: `discard-energy-done-${Date.now()}`,
                  message: `💥 ถอดพลังงาน (${energyType || 'Energy'}) ลงสุสานเรียบร้อยแล้ว`,
                  icon: '💥',
                  type: 'SUCCESS',
                });
              }
              return responded;
            }, true);
            return;
          }
          commitState((curr) => TabletopActions.respondConsent(curr, true), true);
        }}
        onDeny={() => {
          const req = state.pendingConsent;
          if (req?.id) resolvedConsentIdsRef.current.add(req.id);
          if (req?.actionType === 'SHUFFLE_DECK' || req?.actionType === 'CUT_DECK') {
            commitState((curr) => {
              const responded = TabletopActions.respondConsent(curr, false);
              return TabletopActions.setActionToast(responded, {
                id: `skip-shuffle-${Date.now()}`,
                message: '⏩ ข้ามการสับ/ตัดเด็ค',
                icon: '⏩',
                type: 'INFO',
              });
            }, true);
            return;
          } else if (req?.actionType === 'SWITCH_POKEMON') {
            commitState((curr) => {
              const responded = TabletopActions.respondConsent(curr, false);
              return TabletopActions.setActionToast(responded, {
                id: `switch-denied-${Date.now()}`,
                message: '❌ ปฏิเสธการสลับตำแหน่งโปเกมอน',
                icon: '❌',
                type: 'INFO',
              });
            }, true);
            return;
          } else if (req?.actionType === 'DISCARD_ENERGY') {
            commitState((curr) => {
              const responded = TabletopActions.respondConsent(curr, false);
              return TabletopActions.setActionToast(responded, {
                id: `discard-energy-denied-${Date.now()}`,
                message: '❌ ปฏิเสธการถอดพลังงานลงสุสาน',
                icon: '❌',
                type: 'INFO',
              });
            }, true);
            return;
          }
          commitState((curr) => TabletopActions.respondConsent(curr, false), true);
        }}
        onCancel={() => {
          const req = state.pendingConsent;
          if (req?.id) resolvedConsentIdsRef.current.add(req.id);
          commitState((curr) => TabletopActions.respondConsent(curr, false), true);
        }}
      />
      )}

      {/* MODAL 11: Match Victory / Defeat Modal (6 Prizes Claimed) */}
      {state.winner && !isReviewingBoard && (
        <TabletopVictoryModal
          winner={state.winner}
          myRole={state.myRole}
          isOnline={state.roomMode === 'online'}
          onRematch={handleResetTable}
          onClose={() => setIsReviewingBoard(true)}
        />
      )}

      {/* Turn Transition Screen Animation */}
      {showTurnSplash && (
        <div
          id="turn-splash-banner"
          data-testid="turn-splash-banner"
          onClick={() => setShowTurnSplash(false)}
          className="fixed inset-0 z-[90] pointer-events-auto flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-150 select-none cursor-pointer"
        >
          <div className="relative max-w-xl w-full mx-4 px-8 sm:px-14 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-slate-950/95 via-emerald-950/90 to-slate-950/95 border-y-2 border-emerald-400/90 shadow-[0_0_60px_rgba(16,185,129,0.5)] backdrop-blur-xl flex flex-col items-center gap-1.5 transform animate-in zoom-in-95 slide-in-from-top-4 duration-200">
            <div className="text-2xl sm:text-3xl md:text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-100 to-yellow-300 drop-shadow-[0_0_20px_rgba(52,211,153,0.7)]">
              เทิร์นของคุณแล้ว!
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 text-xs sm:text-sm font-black tracking-widest uppercase shadow">
                ⚡ YOUR TURN!
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs sm:text-sm font-bold text-emerald-200/90 font-mono">
                รอบที่ {state.turnCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Action Toast Notification */}
      <TabletopActionToast
        toast={state.actionToast}
        onDismiss={() => commitState((curr) => TabletopActions.clearActionToast(curr))}
      />

      {/* Combat Targeting & 1-Tap Damage Execution Banner */}
      <TabletopCombatBanner
        combatState={state.combatState}
        onApplyDamage={(dmg) => {
          if (state.combatState) {
            if (state.combatState.id) {
              resolvedCombatIdsRef.current.add(state.combatState.id);
            }
            lastResolvedCombatTimestampRef.current = Math.max(
              lastResolvedCombatTimestampRef.current,
              state.combatState.timestamp || 0,
              Date.now()
            );
          }
          Sound.playAttack();
          commitState((curr) => TabletopActions.applyCombatDamage(curr, dmg), true);
        }}
        onCancel={() => {
          if (state.combatState) {
            if (state.combatState.id) {
              resolvedCombatIdsRef.current.add(state.combatState.id);
            }
            lastResolvedCombatTimestampRef.current = Math.max(
              lastResolvedCombatTimestampRef.current,
              state.combatState.timestamp || 0,
              Date.now()
            );
          }
          commitState((curr) => TabletopActions.cancelCombat(curr), true);
        }}
      />
      {/* Floating Drag Avatar (Unified Mouse / Touch Drag Preview) */}
      {pointerDrag && pointerDrag.isDragging && (
        <div
          id="floating-drag-avatar"
          className="fixed pointer-events-none z-[90] select-none transition-transform duration-75"
          style={{
            left: `${pointerDrag.currentX}px`,
            top: `${pointerDrag.currentY}px`,
            transform: pointerDrag.pointerType === 'touch'
              ? 'translate(-50%, -125%) rotate(3.5deg) scale(1.18)'
              : 'translate(-50%, -50%) rotate(3.5deg) scale(1.15)',
          }}
        >
          <div className="relative w-16 xs:w-18 sm:w-20 md:w-24 aspect-[63/88] rounded-xl overflow-hidden shadow-2xl ring-4 ring-emerald-400 bg-slate-900 border-2 border-white/90">
            <img
              src={resolveCardImageUrl(
                pointerDrag.item.type === 'HAND_CARD'
                  ? pointerDrag.item.card
                  : pointerDrag.item.card
              )}
              alt="Dragging Card"
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
              onError={(e) => handleCardImageError(e, pointerDrag.item.card)}
            />
          </div>
          <div className="mt-1 px-3 py-1 rounded-full bg-slate-950/95 text-white font-black text-[10px] sm:text-xs shadow-2xl border border-emerald-400/80 whitespace-nowrap text-center">
            {activeDropZone ? (
              <span className="text-emerald-300 flex items-center justify-center gap-1">
                <span>📥</span> ปล่อยเพื่อวาง
              </span>
            ) : (
              <span className="text-amber-300">
                {pointerDrag.item.type === 'HAND_CARD'
                  ? pointerDrag.item.card.supertype === 'Energy'
                    ? '⚡ ลากไปวางบนโปเกมอน'
                    : pointerDrag.item.card.supertype === 'Pokemon'
                    ? '🌱 ลากไป Active หรือ Bench'
                    : '🎴 ลากไปที่กระดานกลาง'
                  : '🔄 ลากไปที่ Active หรือ Bench'}
              </span>
            )}
          </div>
        </div>
      )}
      {/* Balatro Card Flight Animation Layer */}
      <CardFlightLayer flights={flights} onDismissFlight={dismissFlight} />

      {/* 3D Casino Riffle Deck Shuffle Overlay */}
      {activeShuffleDeckEl && (
        <DeckShuffleOverlay
          deckElement={activeShuffleDeckEl}
          onComplete={() => setActiveShuffleDeckEl(null)}
        />
      )}

      {/* Balatro Floating Action Badges Overlay */}
      <BalatroFloaterOverlay badges={badges} onDismissBadge={dismissBadge} />

      {/* Bench / Active Empty Slot Placement Modal */}
      {emptySlotTarget && !isDeckSearchOpen && !isTopCardsOpen && !isDiscardLostOpen && !isOnlineRoomOpen && !isDeckSelectorOpen && (
        <EmptySlotPickerModal
          isOpen={Boolean(emptySlotTarget && !isDeckSearchOpen && !isTopCardsOpen && !isDiscardLostOpen && !isOnlineRoomOpen && !isDeckSelectorOpen)}
          targetSide={emptySlotTarget.side}
          targetPosition={emptySlotTarget.position}
          handCards={state[emptySlotTarget.side].hand}
          isGameStarted={Boolean(state.isGameStarted)}
          onSelectCard={handleConfirmSlotPlacement}
          onClose={() => setEmptySlotTarget(null)}
          onDrawCard={() => handleDrawCards(emptySlotTarget.side, 1)}
        />
      )}
    </div>
  );
};

