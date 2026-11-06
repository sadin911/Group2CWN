import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { TabletopV3State, CardInstance, TabletopPokemonSlot } from './types';
import { TabletopActions } from './tabletopStateHelper';
import { Sound } from '../../engine/pixi/SoundEffects';
import { getCardDisplayName } from '../../utils/pokemonThaiTranslator';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';

interface PlaymatMobileArenaProps {
  state: TabletopV3State;
  commitState: (updater: (prev: TabletopV3State) => TabletopV3State, forceCloudSync?: boolean) => void;
  topSide: 'player1' | 'player2';
  bottomSide: 'player1' | 'player2';
  isMyTurn: boolean;
  selectedHandCardId: string | null;
  setSelectedHandCardId: (id: string | null) => void;
  selectedField: { side: 'player1' | 'player2'; position: 'ACTIVE' | number } | null;
  setSelectedField: (field: { side: 'player1' | 'player2'; position: 'ACTIVE' | number } | null) => void;
  activeDropZone: string | null;
  setActiveDropZone: (zone: string | null) => void;
  history: { past: TabletopV3State[]; future: TabletopV3State[] };

  // Handlers
  handleSwapPerspective: () => void;
  handleDrawCards: (side: 'player1' | 'player2', count: number) => void;
  handlePassTurn: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleResetTable: () => void;
  handleSlotClick: (side: 'player1' | 'player2', position: 'ACTIVE' | number) => void;
  handleEmptyBenchClick: (side: 'player1' | 'player2', benchIndex: number) => void;
  handleEmptyActiveClick: (side: 'player1' | 'player2') => void;
  handleToggleBenchLimit: (side: 'player1' | 'player2') => void;
  handleTapToTarget: (targetSide: 'player1' | 'player2', targetPosition: 'ACTIVE' | number, card: CardInstance) => void;

  // Modals & Triggers
  setIsDeckSearchOpen: (open: boolean) => void;
  setIsTopCardsOpen: (open: boolean) => void;
  setIsDiscardLostOpen: (open: boolean) => void;
  setIsRandomizerOpen: (open: boolean) => void;
  setPreviewingCard: (card: CardInstance | null) => void;
  setSelectedHandMenuCard: (card: CardInstance | null) => void;
  handleTriggerCoinFlip: () => void;
  handleDiscardStadium: () => void;

  // Pre-game controls & Readiness
  onTriggerMulligan?: (side?: 'player1' | 'player2') => void;
  onRevealAllFacedown?: () => void;
  onOpenTurnDecision?: () => void;
  hasFacedownCards?: boolean;
  isReadyForLetsPlay?: boolean;
  missingSetupTooltip?: string;
  shuffleNotice?: string | null;
}

interface DragTargetInfo {
  side: 'player1' | 'player2';
  position: 'ACTIVE' | number | 'STADIUM' | 'DISCARD' | 'SPOTLIGHT';
}

interface DragState {
  card: CardInstance;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  hoveredTarget: DragTargetInfo | null;
}

function getEnergyIcon(energyType?: string): string {
  switch (energyType) {
    case 'Fire': return '🔥';
    case 'Water': return '💧';
    case 'Grass': return '🍃';
    case 'Lightning': return '⚡';
    case 'Psychic': return '🔮';
    case 'Fighting': return '🥋';
    case 'Darkness': return '🌑';
    case 'Metal': return '⚙️';
    case 'Dragon': return '🐉';
    default: return '⚪';
  }
}

function getSlotHpInfo(slot: TabletopPokemonSlot | null) {
  if (!slot?.card) return null;
  const maxHp = slot.card.hp || 100;
  const currentHp = Math.max(0, maxHp - (slot.damage || 0));
  return { maxHp, currentHp };
}

/**
 * PlaymatMobileArena
 * Complete rewrite of the Mobile Vertical Playmat, faithfully reproducing
 * the PC Tabletop design system in portrait orientation with full touch gestures.
 */
export const PlaymatMobileArena: React.FC<PlaymatMobileArenaProps> = ({
  state,
  commitState,
  topSide,
  bottomSide,
  isMyTurn,
  selectedHandCardId,
  setSelectedHandCardId,
  selectedField: _selectedField,
  setSelectedField: _setSelectedField,
  activeDropZone: _activeDropZone,
  setActiveDropZone: _setActiveDropZone,
  history,
  handleSwapPerspective,
  handleDrawCards,
  handlePassTurn,
  handleUndo,
  handleRedo,
  handleResetTable: _handleResetTable,
  handleSlotClick,
  handleEmptyBenchClick: _handleEmptyBenchClick,
  handleEmptyActiveClick: _handleEmptyActiveClick,
  handleToggleBenchLimit,
  handleTapToTarget: _handleTapToTarget,
  setIsDeckSearchOpen,
  setIsTopCardsOpen,
  setIsDiscardLostOpen,
  setIsRandomizerOpen: _setIsRandomizerOpen,
  setPreviewingCard,
  setSelectedHandMenuCard,
  handleTriggerCoinFlip,
  handleDiscardStadium,
  onTriggerMulligan,
  onRevealAllFacedown,
  onOpenTurnDecision,
  hasFacedownCards,
  isReadyForLetsPlay,
  missingSetupTooltip,
  shuffleNotice,
}) => {
  const topPlayer = state[topSide];
  const bottomPlayer = state[bottomSide];
  const selectedHandCard = selectedHandCardId ? bottomPlayer.hand.find((c) => c.instanceId === selectedHandCardId) : null;

  // Mobile Hand Tray expand/collapse state (defaults to expanded)
  const [handTrayCollapsed, setHandTrayCollapsed] = useState(false);

  // Drag-and-Drop & Scroll gesture state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const handTrayRef = useRef<HTMLDivElement | null>(null);
  const pointerStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialTrayScrollLeftRef = useRef<number>(0);
  const pointerScrollModeRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeDraggedCardRef = useRef<CardInstance | null>(null);
  const activeDropTargetRef = useRef<DragTargetInfo | null>(null);
  const dragActiveRef = useRef(false);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  // Check drop target under point (uses elementsFromPoint to penetrate overlays and followers)
  const findDropTargetUnderPoint = useCallback((x: number, y: number): DragTargetInfo | null => {
    const elements = typeof document !== 'undefined' && document.elementsFromPoint
      ? document.elementsFromPoint(x, y)
      : [typeof document !== 'undefined' ? document.elementFromPoint(x, y) : null].filter(Boolean) as Element[];
    if (!elements || elements.length === 0) return null;

    for (const elem of elements) {
      // Check Trainer drop zone, Center Board Zone, or In-Play Revealed Card Slot
      const trainerZone = elem.closest('#center-trainer-drop-zone, [data-trainer-zone="true"], #mobile-bottom-revealed-card-slot');
      if (trainerZone) {
        return { side: bottomSide, position: 'SPOTLIGHT' };
      }

      // Check Stadium slot
      const stadiumZone = elem.closest('#center-stadium-empty, #center-stadium-card, [data-stadium-zone="true"]');
      if (stadiumZone) {
        return { side: bottomSide, position: 'STADIUM' };
      }

      // Check Discard pile
      const discardZone = elem.closest('[data-discard-zone="true"]');
      if (discardZone) {
        const side = (discardZone.getAttribute('data-discard-side') as 'player1' | 'player2') || bottomSide;
        return { side, position: 'DISCARD' };
      }

      // Check Pokemon slots (Active or Bench)
      const slotZone = elem.closest('[data-slot-zone="true"]');
      if (slotZone) {
        const sideAttr = slotZone.getAttribute('data-slot-side');
        const side = sideAttr === 'top' ? topSide : (sideAttr === 'bottom' ? bottomSide : (sideAttr as 'player1' | 'player2') || bottomSide);
        const posAttr = slotZone.getAttribute('data-slot-pos');
        if (posAttr) {
          const position = posAttr === 'ACTIVE' ? ('ACTIVE' as const) : parseInt(posAttr, 10);
          return { side, position };
        }
      }

      // Check Center Board Zone fallback (broad clash line between arenas)
      const centerBoardZone = elem.closest('#center-board-zone');
      if (centerBoardZone) {
        return { side: bottomSide, position: 'SPOTLIGHT' };
      }
    }

    return null;
  }, [bottomSide, topSide]);

  // Execute drop action
  const handleDropCardOnTarget = useCallback((card: CardInstance, target: DragTargetInfo) => {
    if (target.position === 'SPOTLIGHT') {
      if (card.supertype === 'Trainer') {
        const isStadium = card.subtypes?.some((s) => s.toLowerCase() === 'stadium');
        if (isStadium) {
          Sound.playCardPlacement();
          commitState((curr) => TabletopActions.playStadium(curr, target.side, card.instanceId));
        } else {
          Sound.playCardPlacement();
          commitState((curr) => TabletopActions.playTrainerToSpotlight(curr, target.side, card.instanceId));
        }
      } else {
        Sound.playCardPlacement();
        commitState((curr) => TabletopActions.revealCardToSpotlight(curr, target.side, card));
      }
      return;
    }

    if (target.position === 'STADIUM') {
      if (card.supertype === 'Trainer' && card.subtypes?.some((s) => s.toLowerCase() === 'stadium')) {
        Sound.playCardPlacement();
        commitState((curr) => TabletopActions.playStadium(curr, target.side, card.instanceId));
      } else if (card.supertype === 'Trainer') {
        Sound.playCardPlacement();
        commitState((curr) => TabletopActions.playTrainerToSpotlight(curr, target.side, card.instanceId));
      }
      return;
    }

    if (target.position === 'DISCARD') {
      Sound.playCardPlacement();
      commitState((curr) => TabletopActions.discardFromHand(curr, target.side, card.instanceId));
      return;
    }

    const pos = target.position as 'ACTIVE' | number;
    const player = state[target.side];
    const isTargetEmpty = pos === 'ACTIVE' ? !player.active : !player.bench[pos];

    if (isTargetEmpty) {
      // Empty Active or Bench slot: Place card facedown before match start (PC Tabletop behavior)
      const shouldBeFacedown = !state.isGameStarted;
      Sound.playCardPlacement();
      commitState((curr) => TabletopActions.placeFromHand(curr, target.side, card.instanceId, pos, shouldBeFacedown));
    } else if (card.supertype === 'Pokemon') {
      // Occupied slot: Evolve Pokemon
      Sound.playCardPlacement();
      commitState((curr) => TabletopActions.evolveFromHand(curr, target.side, card.instanceId, pos));
    } else if (card.supertype === 'Energy') {
      // Occupied slot: Attach Energy
      Sound.playEnergyAttach();
      commitState((curr) => TabletopActions.attachEnergyFromHand(curr, target.side, card.instanceId, pos));
    } else if (card.supertype === 'Trainer') {
      const isTool = card.subtypes?.some((s) => s.toLowerCase() === 'tool' || s.toLowerCase() === 'pokemon tool');
      if (isTool) {
        Sound.playCardPlacement();
        commitState((curr) => TabletopActions.attachToolFromHand(curr, target.side, card.instanceId, pos));
      } else {
        Sound.playCardPlacement();
        commitState((curr) => TabletopActions.playTrainerToSpotlight(curr, target.side, card.instanceId));
      }
    }
  }, [commitState, state]);

  // Hand card pointer down (starts drag / horizontal scroll / long-press timer)
  const handleHandCardPointerDown = (e: React.PointerEvent | React.MouseEvent, card: CardInstance) => {
    e.stopPropagation();
    if (activeDraggedCardRef.current) return;

    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    initialTrayScrollLeftRef.current = handTrayRef.current ? handTrayRef.current.scrollLeft : 0;
    dragActiveRef.current = false;
    pointerScrollModeRef.current = false;
    activeDraggedCardRef.current = card;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (!dragActiveRef.current && !pointerScrollModeRef.current) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(40);
        }
        Sound.playCardFlip();
        setPreviewingCard(card);
        setSelectedHandMenuCard(card);
      }
    }, 400);

    const onGlobalMove = (moveEv: PointerEvent | MouseEvent) => {
      if (!activeDraggedCardRef.current) return;
      const dx = moveEv.clientX - pointerStartPosRef.current.x;
      const dy = moveEv.clientY - pointerStartPosRef.current.y;

      // Distinguish gesture intent:
      // 1. Upward drag (dy < -10) = user wants to play card onto the arena field
      // 2. Horizontal swipe (|dx| > 6) = user wants to scroll the hand tray
      if (!dragActiveRef.current && !pointerScrollModeRef.current) {
        if (dy < -10) {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          dragActiveRef.current = true;
        } else if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          pointerScrollModeRef.current = true;
        }
      }

      if (pointerScrollModeRef.current) {
        if (handTrayRef.current) {
          handTrayRef.current.scrollLeft = initialTrayScrollLeftRef.current - dx;
        }
        return;
      }

      if (dragActiveRef.current) {
        const hovered = findDropTargetUnderPoint(moveEv.clientX, moveEv.clientY);
        activeDropTargetRef.current = hovered;
        setDragState({
          card: activeDraggedCardRef.current,
          startX: pointerStartPosRef.current.x,
          startY: pointerStartPosRef.current.y,
          currentX: moveEv.clientX,
          currentY: moveEv.clientY,
          hoveredTarget: hovered,
        });
      }
    };

    const onGlobalUp = (upEv: PointerEvent | MouseEvent) => {
      window.removeEventListener('pointermove', onGlobalMove);
      window.removeEventListener('mousemove', onGlobalMove);
      window.removeEventListener('pointerup', onGlobalUp);
      window.removeEventListener('mouseup', onGlobalUp);
      window.removeEventListener('pointercancel', onGlobalUp);

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      const dragged = activeDraggedCardRef.current;
      const wasDragging = dragActiveRef.current;
      const wasScrolling = pointerScrollModeRef.current;

      if (wasDragging && dragged) {
        const dropTarget = findDropTargetUnderPoint(upEv.clientX, upEv.clientY) || activeDropTargetRef.current;
        if (dropTarget) {
          handleDropCardOnTarget(dragged, dropTarget);
        }
      } else if (!wasDragging && !wasScrolling && dragged) {
        // Normal quick tap: toggles card selection (subtle lift)
        Sound.playCardFlip();
        setSelectedHandCardId(selectedHandCardId === dragged.instanceId ? null : dragged.instanceId);
      }

      dragActiveRef.current = false;
      pointerScrollModeRef.current = false;
      activeDraggedCardRef.current = null;
      activeDropTargetRef.current = null;
      setDragState(null);
    };

    window.addEventListener('pointermove', onGlobalMove, { passive: true });
    window.addEventListener('mousemove', onGlobalMove, { passive: true });
    window.addEventListener('pointerup', onGlobalUp);
    window.addEventListener('mouseup', onGlobalUp);
    window.addEventListener('pointercancel', onGlobalUp);
  };

  // Dedicated Mobile Pokémon Slot Component (faithful to PC TabletopPokemonCard)
  const renderPokemonCardSlot = (
    slot: TabletopPokemonSlot | null,
    side: 'player1' | 'player2',
    position: 'ACTIVE' | number,
    label: string,
    isOpponent: boolean = false
  ) => {
    const isPlayerBottom = side === bottomSide;
    const posId = position === 'ACTIVE'
      ? (isPlayerBottom ? 'bottom-active' : 'top-active')
      : (isPlayerBottom ? `bottom-bench-${position}` : `top-bench-${position}`);
    const slotId = slot ? `${posId}-card` : `${posId}-empty`;
    const hpInfo = getSlotHpInfo(slot);

    const isTargetedByDrag =
      dragState?.hoveredTarget?.side === side && dragState?.hoveredTarget?.position === position;

    // Slot Long Press handler for opening full PokemonActionModal
    const handleSlotPointerDown = (e: React.PointerEvent) => {
      e.stopPropagation();
      pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        if (slot?.card) {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(40);
          }
          Sound.playCardFlip();
          handleSlotClick(side, position);
        }
      }, 400);
    };

    const handleSlotPointerMove = (e: React.PointerEvent) => {
      const dx = e.clientX - pointerStartPosRef.current.x;
      const dy = e.clientY - pointerStartPosRef.current.y;
      if (Math.hypot(dx, dy) > 8) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    };

    const handleSlotPointerUp = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    // Empty Slot
    if (!slot || !slot.card) {
      return (
        <div
          id={position === 'ACTIVE' ? 'slot-active-empty' : `slot-bench-${position}-empty`}
          data-mobile-id={slotId}
          data-slot-zone="true"
          data-slot-side={side}
          data-slot-player={side}
          data-slot-perspective={isPlayerBottom ? 'bottom' : 'top'}
          data-slot-pos={position}
          onPointerDown={handleSlotPointerDown}
          onPointerMove={handleSlotPointerMove}
          onPointerUp={handleSlotPointerUp}
          className={`w-full h-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all select-none ${
            isTargetedByDrag
              ? 'border-amber-400 bg-amber-500/25 ring-4 ring-amber-400/80 scale-105 shadow-[0_0_16px_rgba(245,158,11,0.8)]'
              : 'border-white/20 bg-slate-900/40 hover:border-sky-400/60'
          }`}
          title={`${label} ว่าง (ลากการ์ดมาวาง)`}
        >
          <span className="text-[10px] font-bold text-white/40">{label}</span>
          <span className="text-[8px] text-white/25">ว่าง</span>
        </div>
      );
    }

    const { card, damage = 0, attachedEnergies = [], specialConditions = [] } = slot;
    const isFacedown = Boolean(slot.isFacedown || card.isFacedown);

    return (
      <div
        id={position === 'ACTIVE' ? 'slot-active-card' : `slot-bench-${position}-card`}
        data-mobile-id={slotId}
        data-slot-zone="true"
        data-slot-side={side}
        data-slot-player={side}
        data-slot-perspective={isPlayerBottom ? 'bottom' : 'top'}
        data-slot-pos={position}
        data-facedown={isFacedown ? 'true' : 'false'}
        onPointerDown={handleSlotPointerDown}
        onPointerMove={handleSlotPointerMove}
        onPointerUp={handleSlotPointerUp}
        onClick={() => handleSlotClick(side, position)}
        className={`group relative w-full h-full rounded-xl overflow-hidden border-2 shadow-lg transition-all select-none cursor-pointer ${
          isTargetedByDrag
            ? 'border-amber-400 ring-4 ring-amber-400/90 scale-105 shadow-[0_0_20px_#f59e0b] z-20'
            : isOpponent
            ? 'border-rose-500/40 hover:border-rose-400'
            : 'border-sky-400/60 hover:border-sky-300'
        }`}
        title={`${getCardDisplayName(card)} (แตะเพื่อจัดการ / แตะค้างเพื่อดูตัวเลือกเต็ม)`}
      >
        {/* Card Image / Facedown Back */}
        {isFacedown ? (
          <div
            id={`${slotId}-facedown`}
            className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-blue-950 to-slate-950 border-2 border-sky-400/40 p-0.5 select-none overflow-hidden"
          >
            {/* Holographic radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />

            {/* Pokeball Motif */}
            <div className="relative w-5 h-5 xs:w-6 xs:h-6 rounded-full border border-sky-300/60 bg-gradient-to-b from-rose-600 via-rose-500 to-slate-950 flex items-center justify-center shadow-lg">
              <div className="w-full h-0.5 bg-slate-950 absolute" />
              <div className="w-2 h-2 xs:w-2.5 xs:h-2.5 rounded-full bg-white border border-slate-950 flex items-center justify-center z-10 shadow-inner">
                <div className="w-0.5 h-0.5 rounded-full bg-slate-950" />
              </div>
            </div>

            {/* Facedown Label Badge (Thai) */}
            <div className="mt-0.5 flex items-center gap-0.5 px-1 py-0.2 rounded-full bg-black/80 border border-sky-400/50 text-[6.5px] xs:text-[7.5px] font-black text-sky-200 tracking-wide uppercase shadow">
              <span>🎴</span>
              <span>คว่ำหน้า</span>
            </div>
          </div>
        ) : (
          <img
            src={resolveCardImageUrl(card)}
            alt={getCardDisplayName(card)}
            className="w-full h-full object-cover pointer-events-none"
            onError={(e) => handleCardImageError(e, card)}
          />
        )}

        {/* Top-Right HP Pill (PC Tabletop Style) */}
        {!isFacedown && hpInfo && (
          <div className="absolute top-0.5 right-0.5 px-1.5 py-0.2 rounded-md bg-slate-950/90 border border-white/30 flex items-center gap-0.5 shadow backdrop-blur-sm">
            <span className="text-[8.5px] font-black font-mono text-white leading-none">
              {hpInfo.currentHp}
            </span>
            <span className="text-[7.5px] leading-none">
              {getEnergyIcon(card.energyType)}
            </span>
          </div>
        )}

        {/* Damage Counter Overlay */}
        {damage > 0 && (
          <div
            id={position === 'ACTIVE' ? 'damage-counter-active' : `damage-counter-bench-${position}`}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-rose-600/95 border border-rose-300 text-white font-mono font-black text-xs shadow-xl animate-pulse z-20"
          >
            {damage}
          </div>
        )}

        {/* Attached Energies Stack (PC Tabletop Energy Orbs) */}
        {attachedEnergies.length > 0 && (
          <div className="absolute bottom-0.5 left-0.5 flex flex-wrap gap-0.5 max-w-[85%] z-10">
            {attachedEnergies.slice(0, 4).map((en, eIdx) => (
              <div
                key={en.instanceId || eIdx}
                className="w-3.5 h-3.5 rounded-full bg-slate-950/90 border border-white/40 flex items-center justify-center text-[7.5px] shadow"
                title={getCardDisplayName(en)}
              >
                {getEnergyIcon(en.energyType)}
              </div>
            ))}
            {attachedEnergies.length > 4 && (
              <div className="w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 font-mono font-black text-[7.5px] flex items-center justify-center shadow">
                +{attachedEnergies.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Status Condition Badges */}
        {specialConditions.length > 0 && (
          <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 z-10">
            {specialConditions.map((cond) => (
              <span
                key={cond}
                className="px-1 py-0.2 rounded bg-red-950/90 border border-red-500/50 text-[7px] font-bold text-red-200 shadow"
              >
                {cond === 'POISON' ? '🟣' : cond === 'BURN' ? '🔥' : cond === 'ASLEEP' ? '💤' : '⚡'}
              </span>
            ))}
          </div>
        )}

        {/* Attached Tool Badge */}
        {slot.attachedTool && (
          <div
            className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded bg-emerald-950/90 border border-emerald-400/60 flex items-center justify-center text-[8px] text-emerald-300 shadow"
            title={`อุปกรณ์: ${getCardDisplayName(slot.attachedTool)}`}
          >
            🧰
          </div>
        )}
      </div>
    );
  };

  // Attached Stadium Card
  const stadiumCard = state.stadium;

  return (
    <div
      id="playmat-mobile-arena"
      className="relative w-full flex-1 min-h-0 flex flex-col bg-slate-950 text-white overflow-hidden select-none font-sans"
      style={{ touchAction: 'none' }}
    >
      {/* Playmat Felt Texture Background (Faithful PC Gradient) */}
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950/70 to-black/95" />

      {/* ========================================================================= */}
      {/* SECTION 1: TOP PLAYER ZONE (Opponent Mat / Inverted Perspective)          */}
      {/* ========================================================================= */}
      <section
        id="top-player-zone"
        className="relative z-10 w-full px-2 pt-1 pb-0.5 flex flex-col gap-0.5 sm:gap-1 border-b border-white/10 bg-black/25 shrink min-h-0"
      >
        {/* Top Header: Player Name, Perspective Switch, Hand Cards Strip */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className={`font-black flex items-center gap-1 ${topSide === 'player1' ? 'text-sky-300' : 'text-rose-300'}`}>
              <span>{topSide === 'player1' ? '🔵' : '🔴'}</span> {topPlayer.name}
            </span>
            <button
              id="btn-top-switch-to-me"
              type="button"
              onClick={handleSwapPerspective}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-[10px] font-bold text-slate-300 active:scale-95 transition"
              title="สลับมุมมอง"
            >
              🔄 สลับ
            </button>
          </div>

          {/* Opponent Hand Strip */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-bold">
              มือ ({topPlayer.hand.length} ใบ)
            </span>
            {topPlayer.hand.length === 0 ? (
              <button
                id="btn-setup-top-draw7"
                type="button"
                onClick={() => handleDrawCards(topSide, 7)}
                className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-[9px] font-bold text-rose-300 active:scale-95"
              >
                + จั่ว 7
              </button>
            ) : (
              <div className="flex items-center gap-1">
                {!state.isGameStarted && onTriggerMulligan && (
                  <button
                    id="btn-top-setup-mulligan"
                    data-testid="btn-top-setup-mulligan"
                    type="button"
                    onClick={() => onTriggerMulligan(topSide)}
                    className="px-1.5 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-[9px] font-bold text-rose-300 active:scale-95 transition cursor-pointer"
                    title="มัลลิแกนฝ่ายตรงข้าม (เปิดเผยการ์ดบนมือให้ตรวจสอบ)"
                  >
                    🔄 มัลลิแกน
                  </button>
                )}
                <div className="flex items-center -space-x-2">
                  {topPlayer.hand.slice(0, 6).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-5 h-7 rounded bg-gradient-to-br from-red-950 via-slate-900 to-indigo-950 border border-white/20 shadow flex items-center justify-center text-[7px]"
                    >
                      🎴
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Arena Layout: Left Flank (Deck/Discard) | Center (Bench + Active) | Right Flank (Prizes) */}
        <div className="flex items-center justify-between gap-1.5 w-full">
          {/* Top Left Flank: Deck & Discard */}
          <div className="w-11 xs:w-12 shrink-0 flex flex-col items-center gap-1">
            <button
              id="top-deck-pile"
              data-deck-zone="true"
              data-deck-side={topSide}
              type="button"
              onClick={() => handleDrawCards(topSide, 1)}
              className="relative w-9 h-13 xs:w-10 xs:h-14 rounded-lg bg-gradient-to-br from-blue-950 to-slate-900 border border-sky-400/40 flex flex-col items-center justify-center shadow active:scale-95 transition"
              title="เด็คคู่ต่อสู้ (แตะเพื่อจั่ว)"
            >
              <span className="text-xs">🃏</span>
              <span className="text-[9px] font-bold text-sky-300 font-mono">{topPlayer.deck.length}</span>
            </button>
            <button
              id="top-btn-discard"
              data-discard-zone="true"
              data-discard-side={topSide}
              type="button"
              onClick={() => {
                Sound.playCardFlip();
                setIsDiscardLostOpen(true);
              }}
              className="relative w-9 h-9 xs:w-10 xs:h-10 rounded-lg bg-slate-900 border border-white/20 flex flex-col items-center justify-center shadow active:scale-95 transition overflow-hidden"
              title="สุสานคู่ต่อสู้"
            >
              {topPlayer.discard.length > 0 ? (
                <>
                  <img
                    src={resolveCardImageUrl(topPlayer.discard[topPlayer.discard.length - 1])}
                    alt="Top Discard"
                    className="w-full h-full object-cover opacity-50 pointer-events-none"
                  />
                  <span className="absolute text-[9px] font-bold font-mono text-white drop-shadow">
                    🗑️ {topPlayer.discard.length}
                  </span>
                </>
              ) : (
                <span className="text-[9px] text-slate-400 font-mono">🗑️ 0</span>
              )}
            </button>
          </div>

          {/* Top Center: Bench Row & Active Pokémon in front */}
          <div className="flex-1 flex flex-col items-center gap-0.5 sm:gap-1 min-w-0">
            {/* Top Bench Row (5 slots) */}
            <div className="w-full flex items-center justify-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {Array.from({ length: topPlayer.benchLimit || 5 }, (_, bIdx) => (
                <div key={`top-b-${bIdx}`} className="w-11 h-15 xs:w-12 xs:h-16 sm:w-14 sm:h-18 shrink-0">
                  {renderPokemonCardSlot(topPlayer.bench[bIdx] ?? null, topSide, bIdx, `B${bIdx + 1}`, true)}
                </div>
              ))}
            </div>

            {/* Top Active Slot */}
            <div className="w-14 h-19 xs:w-16 xs:h-22 sm:w-18 sm:h-24 shrink-0">
              {renderPokemonCardSlot(topPlayer.active, topSide, 'ACTIVE', 'Active (บน)', true)}
            </div>
          </div>

          {/* Top Right Flank: 6 Prizes */}
          <div className="w-11 xs:w-12 shrink-0 flex flex-col items-center gap-1">
            <div className="text-[8px] font-bold text-amber-400 uppercase tracking-wider">
              ไพรซ์ ({topPlayer.prizes.length})
            </div>
            {topPlayer.prizes.length === 0 ? (
              <button
                id="btn-setup-top-prizes"
                type="button"
                onClick={() => commitState((curr) => TabletopActions.setupPrizes(curr, topSide, 6))}
                className="px-1.5 py-1 rounded bg-amber-950/80 border border-amber-500/50 text-[9px] font-bold text-amber-300 active:scale-95"
              >
                +6
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-0.5">
                {topPlayer.prizes.map((p, pIdx) => (
                  <button
                    key={p.instanceId || pIdx}
                    id={`top-prize-${pIdx}`}
                    data-prize-side={topSide}
                    data-prize-index={pIdx}
                    type="button"
                    onClick={() => {
                      Sound.playCardFlip();
                      commitState((curr) => TabletopActions.takePrize(curr, topSide, pIdx));
                    }}
                    className="w-4.5 h-6.5 xs:w-5 xs:h-7 rounded bg-gradient-to-br from-amber-900 to-slate-950 border border-amber-400/50 text-amber-200 text-[8px] flex items-center justify-center shadow active:scale-95 cursor-pointer"
                    title={`หยิบไพรซ์ใบที่ ${pIdx + 1}`}
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
      {/* SECTION 2: CENTER BOARD ZONE (Stadium + In-Play Trainer + Turn Indicator) */}
      {/* ========================================================================= */}
      <div
        id="center-board-zone"
        data-trainer-zone="true"
        className="relative z-10 w-full px-2 py-0.5 sm:py-1 flex items-center justify-between gap-1 border-y border-white/10 bg-slate-950/70 shrink-0 overflow-x-auto no-scrollbar"
      >
        {/* Left: Stadium Slot (Drop Target & Interactive Card) */}
        <div className="flex items-center gap-1 shrink-0">
          {stadiumCard ? (
            <div
              id="center-stadium-card"
              data-stadium-zone="true"
              className="relative flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-teal-950/80 border border-teal-400/70 shadow-md shrink-0"
            >
              <img
                id="btn-zoom-stadium"
                src={resolveCardImageUrl(stadiumCard)}
                alt="Stadium"
                onClick={() => {
                  Sound.playCardFlip();
                  setPreviewingCard(stadiumCard);
                }}
                className="w-5 h-7 xs:w-6 xs:h-8 object-cover rounded border border-teal-300/40 cursor-pointer"
                title="แตะเพื่อดูสเตเดียม"
              />
              <div className="flex flex-col max-w-[70px] xs:max-w-[85px]">
                <span
                  onClick={() => {
                    Sound.playCardFlip();
                    setPreviewingCard(stadiumCard);
                  }}
                  className="text-[8.5px] font-bold text-teal-200 truncate cursor-pointer"
                  title={getCardDisplayName(stadiumCard)}
                >
                  {getCardDisplayName(stadiumCard)}
                </span>
                <button
                  id="btn-discard-stadium"
                  type="button"
                  onClick={handleDiscardStadium}
                  className="text-[7px] px-1 py-0.2 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 cursor-pointer w-fit mt-0.5"
                >
                  🗑️ ทิ้ง
                </button>
              </div>
            </div>
          ) : (
            <div
              id="center-stadium-empty"
              data-stadium-zone="true"
              className={`w-14 h-12 rounded-lg border border-dashed flex flex-col items-center justify-center gap-0.5 transition-all shrink-0 ${
                dragState?.hoveredTarget?.position === 'STADIUM'
                  ? 'border-teal-300 bg-teal-500/30 text-teal-200 scale-105'
                  : 'border-white/20 bg-slate-900/50 text-slate-400'
              }`}
              title="ช่องสเตเดียม (ลากสเตเดียมมาวางที่นี่)"
            >
              <span className="text-xs">🏟️</span>
              <span className="text-[8px] font-bold">สเตเดียม</span>
            </div>
          )}
        </div>

        {/* Center: In-Play Trainer Card Slot OR Trainer Drop Zone */}
        <div className="flex items-center justify-center gap-1 flex-1 min-w-0 px-0.5">
          {bottomPlayer.revealedCard ? (
            <div
              id="mobile-bottom-revealed-card-slot"
              data-trainer-zone="true"
              className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-xl bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border-2 border-amber-400/80 shadow-lg shadow-amber-950/50 animate-in fade-in zoom-in-95 duration-150 shrink-0"
            >
              <div
                id="btn-mobile-zoom-revealed"
                onClick={() => {
                  Sound.playCardFlip();
                  setPreviewingCard(bottomPlayer.revealedCard!);
                }}
                className="relative w-7 h-10 xs:w-8 xs:h-11 rounded-lg overflow-hidden border border-amber-400/70 shadow cursor-pointer shrink-0 active:scale-95 transition-transform"
                title="แตะเพื่อดูการ์ดขนาดใหญ่"
              >
                <img
                  src={resolveCardImageUrl(bottomPlayer.revealedCard)}
                  alt={getCardDisplayName(bottomPlayer.revealedCard)}
                  className="w-full h-full object-cover"
                  onError={(e) => handleCardImageError(e, bottomPlayer.revealedCard!)}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[7px] xs:text-[8px] font-black text-amber-300 uppercase tracking-tight truncate">
                  ✨ {bottomPlayer.revealedCard.supertype === 'Trainer' ? 'การ์ดที่เล่น (In-Play)' : 'การ์ดเปิดเผย'}
                </span>
                <span
                  onClick={() => {
                    Sound.playCardFlip();
                    setPreviewingCard(bottomPlayer.revealedCard!);
                  }}
                  className="text-[8.5px] xs:text-[9.5px] font-black text-white max-w-[85px] xs:max-w-[110px] truncate cursor-pointer hover:underline"
                >
                  {getCardDisplayName(bottomPlayer.revealedCard)}
                </span>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <button
                    id="btn-mobile-discard-revealed"
                    type="button"
                    onClick={() => {
                      Sound.playCardPlacement();
                      commitState((curr) => TabletopActions.dismissRevealedCard(curr, bottomSide, 'DISCARD'));
                    }}
                    className="px-1 py-0.2 rounded bg-rose-950 hover:bg-rose-900 border border-rose-500/50 text-[7.5px] font-bold text-rose-200 active:scale-95 transition cursor-pointer"
                    title="ใช้เสร็จสิ้น / ทิ้งลงสุสาน"
                  >
                    🗑️ ทิ้ง
                  </button>
                  <button
                    id="btn-mobile-hand-revealed"
                    type="button"
                    onClick={() => {
                      Sound.playCardFlip();
                      commitState((curr) => TabletopActions.dismissRevealedCard(curr, bottomSide, 'HAND'));
                    }}
                    className="px-1 py-0.2 rounded bg-slate-800 hover:bg-slate-700 border border-white/20 text-[7.5px] font-bold text-slate-200 active:scale-95 transition cursor-pointer"
                    title="เก็บกลับขึ้นมือ"
                  >
                    ✋ คืนมือ
                  </button>
                  <button
                    id="btn-mobile-lost-revealed"
                    type="button"
                    onClick={() => {
                      Sound.playCardPlacement();
                      commitState((curr) => TabletopActions.dismissRevealedCard(curr, bottomSide, 'LOST_ZONE'));
                    }}
                    className="px-1 py-0.2 rounded bg-purple-950 hover:bg-purple-900 border border-purple-500/50 text-[7.5px] font-bold text-purple-200 active:scale-95 transition cursor-pointer"
                    title="ส่งไป Lost Zone"
                  >
                    🌀 Lost
                  </button>
                </div>
              </div>
            </div>
          ) : topPlayer.revealedCard ? (
            <div
              id="mobile-top-revealed-card-slot"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-slate-900/95 border border-sky-400/60 shadow shrink-0"
            >
              <div
                onClick={() => {
                  Sound.playCardFlip();
                  setPreviewingCard(topPlayer.revealedCard!);
                }}
                className="relative w-7 h-10 rounded-lg overflow-hidden border border-white/20 cursor-pointer shrink-0"
              >
                <img
                  src={resolveCardImageUrl(topPlayer.revealedCard)}
                  alt={getCardDisplayName(topPlayer.revealedCard)}
                  className="w-full h-full object-cover"
                  onError={(e) => handleCardImageError(e, topPlayer.revealedCard!)}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[7px] font-bold text-sky-300">
                  🎴 {topPlayer.name} เล่น:
                </span>
                <span className="text-[8px] font-bold text-white max-w-[80px] truncate">
                  {getCardDisplayName(topPlayer.revealedCard)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    Sound.playCardFlip();
                    setPreviewingCard(topPlayer.revealedCard!);
                  }}
                  className="text-[7px] text-sky-300 underline mt-0.5 text-left cursor-pointer"
                >
                  🔍 ซูมดู
                </button>
              </div>
            </div>
          ) : (
            <div
              id="center-trainer-drop-zone"
              data-trainer-zone="true"
              className={`px-2 py-1 rounded-xl border border-dashed flex items-center justify-center gap-1 transition-all shrink-0 cursor-pointer ${
                dragState?.card.supertype === 'Trainer' || dragState?.hoveredTarget?.position === 'SPOTLIGHT'
                  ? 'border-amber-400 bg-amber-500/25 text-amber-200 ring-2 ring-amber-400/70 scale-105 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse'
                  : 'border-white/15 bg-slate-900/40 text-slate-400 hover:border-white/30'
              }`}
              title="พื้นที่เล่นการ์ด Trainer (ลากการ์ดมาวางที่นี่)"
            >
              <span className="text-xs">✨</span>
              <span className="text-[8px] xs:text-[8.5px] font-bold whitespace-nowrap">
                {dragState?.card.supertype === 'Trainer' ? 'วางที่นี่เพื่อเล่น Trainer' : 'เล่น Trainer ที่นี่'}
              </span>
            </div>
          )}
        </div>

        {/* Right: Pre-game controls or Active Turn Status */}
        <div className="flex items-center gap-1 shrink-0">
          {!state.isGameStarted && (
            <div className="flex items-center gap-1">
              {onOpenTurnDecision && (
                <button
                  id="btn-open-turn-decision"
                  type="button"
                  onClick={onOpenTurnDecision}
                  className="px-2 py-0.5 rounded-full bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-400/60 text-indigo-200 text-[9px] font-bold active:scale-95 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="ทอยเหรียญตัดสินว่าใครเริ่มก่อน/หลัง"
                >
                  <span>🪙</span>
                  <span className="hidden xs:inline">เริ่มก่อน/หลัง</span>
                </button>
              )}

              {hasFacedownCards && onRevealAllFacedown && (
                <button
                  id="btn-reveal-all-facedown"
                  data-ready={isReadyForLetsPlay}
                  type="button"
                  onClick={onRevealAllFacedown}
                  className={`px-2.5 py-0.5 rounded-full font-black text-[10px] shadow-lg transition active:scale-95 flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                    isReadyForLetsPlay
                      ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-amber-500/50 ring-2 ring-yellow-300 animate-pulse'
                      : 'bg-amber-950/80 text-amber-200 border border-amber-400/50 hover:bg-amber-900'
                  }`}
                  title={missingSetupTooltip || "คลิกเพื่อพลิกหงายการ์ดที่คว่ำไว้ทั้งหมดและเริ่มการแข่งขัน"}
                >
                  <span>✨</span>
                  <span>Let's Play!</span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              id="btn-setup-toggle-first"
              type="button"
              onClick={handlePassTurn}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 border border-white/15 shadow cursor-pointer active:scale-95 transition"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isMyTurn ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span className="text-[9px] font-bold text-slate-200 whitespace-nowrap">
                {isMyTurn ? 'เทิร์นของคุณ' : 'เทิร์นคู่แข่ง'}
              </span>
            </button>

            <button
              id="btn-mobile-coin-flip"
              type="button"
              onClick={handleTriggerCoinFlip}
              className="px-1.5 py-0.5 rounded-full bg-amber-900/70 hover:bg-amber-800 border border-amber-400/40 text-amber-200 text-[9px] font-bold active:scale-95 transition whitespace-nowrap"
              title="โยนเหรียญ"
            >
              🪙
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: BOTTOM PLAYER ZONE (Player Mat / Active Perspective)           */}
      {/* ========================================================================= */}
      <section
        id="bottom-player-zone"
        className="relative z-10 w-full flex-1 px-2 py-0.5 sm:py-1 flex flex-col justify-between overflow-hidden bg-black/15 min-h-0"
      >
        {/* Bottom Arena: Left Flank (Prizes) | Center (Active + Bench) | Right Flank (Deck/Discard) */}
        <div className="flex items-center justify-between gap-1.5 w-full flex-1 min-h-0">
          {/* Bottom Left Flank: 6 Prizes */}
          <div className="w-11 xs:w-12 shrink-0 flex flex-col items-center gap-1">
            <div className="text-[8px] font-bold text-amber-400 uppercase tracking-wider">
              ไพรซ์ ({bottomPlayer.prizes.length})
            </div>
            {bottomPlayer.prizes.length === 0 ? (
              <button
                id="btn-setup-prizes"
                type="button"
                onClick={() => commitState((curr) => TabletopActions.setupPrizes(curr, bottomSide, 6))}
                className="px-1.5 py-1 rounded bg-amber-900/90 border border-amber-400/60 text-[9px] font-black text-amber-200 shadow active:scale-95"
              >
                +6 ไพรซ์
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-0.5">
                {bottomPlayer.prizes.map((p, pIdx) => (
                  <button
                    key={p.instanceId || pIdx}
                    id={`prize-card-${pIdx}`}
                    data-prize-side={bottomSide}
                    data-prize-index={pIdx}
                    type="button"
                    onClick={() => {
                      Sound.playCardFlip();
                      commitState((curr) => TabletopActions.takePrize(curr, bottomSide, pIdx));
                    }}
                    className="w-4.5 h-6.5 xs:w-5 xs:h-7 rounded bg-gradient-to-br from-amber-800 to-slate-950 border border-amber-400/60 text-amber-200 text-[8px] flex items-center justify-center shadow active:scale-95 cursor-pointer hover:border-amber-300"
                    title={`หยิบไพรซ์ใบที่ ${pIdx + 1} ขึ้นมือ`}
                  >
                    ★
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Center: Active Spot in front & Bench Row behind */}
          <div className="flex-1 flex flex-col items-center justify-center gap-0.5 sm:gap-1 min-w-0 h-full">
            {/* Player Active Pokémon (The Hero Card) */}
            <div className="w-15 h-21 xs:w-18 xs:h-25 sm:w-20 sm:h-28 shrink-0">
              {renderPokemonCardSlot(bottomPlayer.active, bottomSide, 'ACTIVE', 'Active (คุณ)', false)}
            </div>

            {/* Player Bench Row (5 or 8 slots) */}
            <div className="w-full flex items-center justify-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {Array.from({ length: bottomPlayer.benchLimit || 5 }, (_, bIdx) => (
                <div key={`bottom-b-${bIdx}`} className="w-11 h-15 xs:w-12 xs:h-16 sm:w-14 sm:h-18 shrink-0">
                  {renderPokemonCardSlot(bottomPlayer.bench[bIdx] ?? null, bottomSide, bIdx, `B${bIdx + 1}`, false)}
                </div>
              ))}
            </div>

            {/* Bench Limit Toggle Pill */}
            <button
              id="btn-toggle-bench-limit-bottom"
              type="button"
              onClick={() => handleToggleBenchLimit(bottomSide)}
              className="px-2 py-0.2 rounded-full bg-slate-900 border border-white/15 text-[8px] font-bold text-slate-300 active:scale-95 transition"
            >
              👥 เบนช์ {bottomPlayer.benchLimit || 5} ช่อง (แตะเพื่อสลับ)
            </button>
          </div>

          {/* Bottom Right Flank: Deck & Discard */}
          <div className="w-11 xs:w-12 shrink-0 flex flex-col items-center gap-1">
            <button
              id="bottom-deck-pile"
              data-deck-zone="true"
              data-deck-side={bottomSide}
              type="button"
              onClick={() => handleDrawCards(bottomSide, 1)}
              className="relative w-9 h-13 xs:w-10 xs:h-14 rounded-lg bg-gradient-to-br from-blue-900 to-slate-900 border border-sky-400/60 flex flex-col items-center justify-center shadow-lg active:scale-95 transition cursor-pointer"
              title="เด็คของคุณ (แตะเพื่อจั่ว 1 ใบ)"
            >
              <span className="text-xs">🃏</span>
              <span className="text-[9px] font-bold text-sky-200 font-mono">{bottomPlayer.deck.length}</span>
            </button>

            <button
              id="bottom-btn-discard"
              data-discard-zone="true"
              data-discard-side={bottomSide}
              type="button"
              onClick={() => {
                Sound.playCardFlip();
                setIsDiscardLostOpen(true);
              }}
              className="relative w-9 h-9 xs:w-10 xs:h-10 rounded-lg bg-slate-900 border border-white/25 flex flex-col items-center justify-center shadow active:scale-95 transition overflow-hidden cursor-pointer"
              title="สุสานของคุณ (แตะเพื่อดูการ์ด)"
            >
              {bottomPlayer.discard.length > 0 ? (
                <>
                  <img
                    src={resolveCardImageUrl(bottomPlayer.discard[bottomPlayer.discard.length - 1])}
                    alt="Top Discard"
                    className="w-full h-full object-cover opacity-60 pointer-events-none"
                  />
                  <span className="absolute text-[9px] font-bold font-mono text-white drop-shadow">
                    🗑️ {bottomPlayer.discard.length}
                  </span>
                </>
              ) : (
                <span className="text-[9px] text-slate-400 font-mono">🗑️ 0</span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: BOTTOM TRAY & DOCK (Upright Hand Cards + Commands)             */}
      {/* ========================================================================= */}
      <footer className="relative z-30 flex flex-col bg-slate-950/95 border-t border-white/15 shadow-2xl backdrop-blur-md shrink-0">
        {/* Hand Cards Header & Toggle Bar */}
        <div className="flex items-center justify-between px-3 py-1 bg-slate-900/90 border-b border-white/10 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-bold">
            <span>🃏</span>
            <span>มือของคุณ ({bottomPlayer.hand.length} ใบ)</span>
            {shuffleNotice && (
              <span
                id="shuffle-notice-badge"
                className="ml-1 px-2 py-0.5 rounded-md bg-blue-900/80 text-blue-200 border border-blue-400/50 text-[10px] font-bold animate-pulse"
              >
                {shuffleNotice}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!state.isGameStarted && bottomPlayer.hand.length > 0 && onTriggerMulligan && (
              <button
                id="btn-mobile-mulligan"
                data-testid="btn-mobile-mulligan"
                type="button"
                onClick={() => onTriggerMulligan(bottomSide)}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/90 hover:bg-rose-900 border border-rose-400/50 text-[10px] sm:text-[11px] font-bold text-rose-200 active:scale-95 transition shadow cursor-pointer"
                title="มัลลิแกน (เปิดเผยการ์ดบนมือให้คู่แข่งร่วมตรวจสอบว่าไม่มี Basic Pokémon)"
              >
                <span>🔄</span>
                <span>มัลลิแกน</span>
              </button>
            )}
            <button
              id="btn-toggle-hand-tray"
              type="button"
              onClick={() => setHandTrayCollapsed((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/20 text-[11px] text-slate-200 font-bold active:scale-95 transition shadow cursor-pointer"
              title="ย่อ/ขยายการ์ดบนมือ"
            >
              <span>{handTrayCollapsed ? '▲ ขยายมือ' : '▼ ย่อมือ'}</span>
            </button>
          </div>
        </div>

        {/* Selected Card Mobile Quick Action Bar (1-Tap Fast Play for Trainers / Pokemon / Energy) */}
        {selectedHandCard && (
          <div
            id="mobile-hand-quick-bar"
            className="flex items-center justify-between gap-1 px-2.5 py-1 bg-gradient-to-r from-slate-900 via-amber-950/80 to-slate-900 border-b border-amber-500/40 text-xs shadow-lg animate-in slide-in-from-bottom-2 duration-150 z-20"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs shrink-0">
                {selectedHandCard.supertype === 'Trainer' ? '🎴' : selectedHandCard.supertype === 'Pokemon' ? '⚡' : '🔮'}
              </span>
              <span className="text-[10px] xs:text-[11px] font-black text-amber-200 truncate">
                {getCardDisplayName(selectedHandCard)}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {selectedHandCard.supertype === 'Trainer' && (
                <button
                  id="btn-quick-play-trainer"
                  type="button"
                  onClick={() => {
                    Sound.playCardPlacement();
                    const isStadium = selectedHandCard.subtypes?.some((s) => s.toLowerCase() === 'stadium');
                    if (isStadium) {
                      commitState((curr) => TabletopActions.playStadium(curr, bottomSide, selectedHandCard.instanceId));
                    } else {
                      commitState((curr) => TabletopActions.playTrainerToSpotlight(curr, bottomSide, selectedHandCard.instanceId));
                    }
                    setSelectedHandCardId(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-[10px] shadow active:scale-95 transition flex items-center gap-1 cursor-pointer"
                >
                  <span>✨</span>
                  <span>เล่นการ์ดนี้</span>
                </button>
              )}

              {selectedHandCard.supertype === 'Pokemon' && (
                <button
                  id="btn-quick-place-pokemon"
                  type="button"
                  onClick={() => {
                    Sound.playCardPlacement();
                    const emptyBenchIdx = bottomPlayer.bench.findIndex((b) => !b);
                    const targetPos = !bottomPlayer.active ? 'ACTIVE' : (emptyBenchIdx !== -1 ? emptyBenchIdx : 'ACTIVE');
                    const shouldBeFacedown = !state.isGameStarted;
                    commitState((curr) => TabletopActions.placeFromHand(curr, bottomSide, selectedHandCard.instanceId, targetPos, shouldBeFacedown));
                    setSelectedHandCardId(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-[10px] shadow active:scale-95 transition flex items-center gap-1 cursor-pointer"
                >
                  <span>✨</span>
                  <span>ลงสนาม</span>
                </button>
              )}

              {selectedHandCard.supertype === 'Energy' && bottomPlayer.active && (
                <button
                  id="btn-quick-attach-energy"
                  type="button"
                  onClick={() => {
                    Sound.playEnergyAttach();
                    commitState((curr) => TabletopActions.attachEnergyFromHand(curr, bottomSide, selectedHandCard.instanceId, 'ACTIVE'));
                    setSelectedHandCardId(null);
                  }}
                  className="px-2 py-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-400 text-slate-950 font-black text-[10px] shadow active:scale-95 transition flex items-center gap-1 cursor-pointer"
                >
                  <span>⚡</span>
                  <span>ติด Active</span>
                </button>
              )}

              <button
                id="btn-quick-zoom-card"
                type="button"
                onClick={() => {
                  Sound.playCardFlip();
                  setPreviewingCard(selectedHandCard);
                }}
                className="px-1.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-[10px] font-bold text-slate-200 active:scale-95 transition cursor-pointer"
                title="ขยายดูการ์ด"
              >
                🔍 ดู
              </button>

              <button
                id="btn-open-card-menu"
                data-testid="btn-quick-more-options"
                type="button"
                onClick={() => {
                  Sound.playCardFlip();
                  setSelectedHandMenuCard(selectedHandCard);
                }}
                className="px-1.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-[10px] font-bold text-slate-200 active:scale-95 transition cursor-pointer"
                title="เมนูตัวเลือกทั้งหมด"
              >
                ⚙️ เมนู
              </button>

              <button
                id="btn-quick-cancel-selection"
                type="button"
                onClick={() => setSelectedHandCardId(null)}
                className="w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center cursor-pointer active:scale-95"
                title="ยกเลิกการเลือก"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Hand Cards Tray (Upright Fanned Cards with Gesture & Overscroll Containment) */}
        {!handTrayCollapsed && (
          <div
            id="hand-cards-tray"
            ref={handTrayRef}
            style={{ touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
            className="relative w-full px-5 sm:px-6 pt-1.5 pb-1.5 overflow-x-auto no-scrollbar flex items-center justify-start bg-black/50 min-h-[84px] sm:min-h-[96px] overscroll-x-contain"
          >
            {bottomPlayer.hand.length === 0 ? (
              <div className="w-full flex items-center justify-center gap-2 py-3 text-xs text-slate-400">
                <span>ไม่มีการ์ดบนมือ</span>
                <button
                  id="btn-setup-draw-7"
                  type="button"
                  onClick={() => handleDrawCards(bottomSide, 7)}
                  className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs active:scale-95 transition shadow cursor-pointer"
                >
                  + จั่ว 7 ใบ
                </button>
              </div>
            ) : (
              bottomPlayer.hand.map((card, hIdx) => {
                const isSelected = selectedHandCardId === card.instanceId;
                const handCount = bottomPlayer.hand.length;
                const overlapClass =
                  hIdx === 0
                    ? ''
                    : handCount <= 5
                    ? 'ml-1'
                    : handCount <= 8
                    ? '-ml-3 sm:-ml-2'
                    : handCount <= 11
                    ? '-ml-5 sm:-ml-3'
                    : '-ml-7 sm:-ml-5';

                return (
                  <div
                    key={card.instanceId || hIdx}
                    data-testid="hand-card-item"
                    id={`hand-card-${hIdx}`}
                    data-card-instance={card.instanceId}
                    data-card-index={hIdx}
                    data-card-supertype={card.supertype}
                    onPointerDown={(e) => handleHandCardPointerDown(e, card)}
                    onMouseDown={(e) => {
                      if (e.button === 0) handleHandCardPointerDown(e, card);
                    }}
                    className={`group relative shrink-0 w-14 h-20 xs:w-16 xs:h-22 sm:w-18 sm:h-25 rounded-lg overflow-hidden border-2 shadow-xl transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${overlapClass} ${
                      isSelected
                        ? 'border-amber-400 -translate-y-4 ring-4 ring-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.9)] scale-110 z-30'
                        : 'border-white/20 hover:border-sky-400 hover:-translate-y-3 hover:scale-105 hover:z-20'
                    }`}
                    title={`${getCardDisplayName(card)} (ลากไปวางบนสนาม / แตะค้างเพื่อซูมดู)`}
                  >
                    <img
                      src={resolveCardImageUrl(card)}
                      alt={card.nameTh || card.nameEn}
                      className="w-full h-full object-cover pointer-events-none"
                      onError={(e) => handleCardImageError(e, card)}
                    />
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Bottom Dock: Utility Tools & End Turn Button (Protected by Safe Area) */}
        <div id="tabletop-v3-dock" className="flex items-center justify-between gap-1 px-2.5 pt-1 pb-[max(env(safe-area-inset-bottom,0px),8px)]">
          {/* Left Utilities */}
          <div className="flex items-center gap-1">
            <button
              id="btn-dock-undo"
              type="button"
              disabled={history.past.length === 0}
              onClick={handleUndo}
              className="w-7 h-7 rounded-xl bg-slate-900 border border-white/15 text-slate-300 flex items-center justify-center text-xs active:scale-95 disabled:opacity-30 cursor-pointer shadow"
              title="ย้อนกลับ (Undo)"
            >
              ↩️
            </button>
            <button
              id="btn-dock-redo"
              type="button"
              disabled={history.future.length === 0}
              onClick={handleRedo}
              className="w-7 h-7 rounded-xl bg-slate-900 border border-white/15 text-slate-300 flex items-center justify-center text-xs active:scale-95 disabled:opacity-30 cursor-pointer shadow"
              title="ทำซ้ำ (Redo)"
            >
              ↪️
            </button>
            <button
              id="btn-dock-search"
              type="button"
              onClick={() => setIsDeckSearchOpen(true)}
              className="px-2 py-1 rounded-xl bg-slate-900 border border-white/15 text-slate-300 flex items-center gap-1 text-[10px] font-bold active:scale-95 cursor-pointer shadow"
              title="ค้นหาในสำรับ"
            >
              🔍 ค้นหา
            </button>
            <button
              id="btn-dock-shuffle"
              type="button"
              onClick={() => {
                if (state.isConsentRequired || state.roomMode === 'online') {
                  commitState((curr) =>
                    TabletopActions.requestConsent(curr, {
                      id: `consent-${Date.now()}`,
                      requesterSide: bottomSide,
                      requesterName: state[bottomSide].name,
                      actionType: 'SHUFFLE_DECK',
                      description: 'ขอสับเด็คของคุณ (Shuffle Deck)',
                      timestamp: Date.now(),
                    }),
                    true
                  );
                } else {
                  Sound.playShuffle();
                  commitState((curr) => TabletopActions.shuffleDeck(curr, bottomSide));
                }
              }}
              className="w-7 h-7 rounded-xl bg-slate-900 border border-white/15 text-slate-300 flex items-center justify-center text-xs active:scale-95 cursor-pointer shadow"
              title="สับสำรับ"
            >
              🔀
            </button>
            <button
              id="btn-dock-top-cards"
              type="button"
              onClick={() => {
                if (state.isConsentRequired || state.roomMode === 'online') {
                  commitState((curr) =>
                    TabletopActions.requestConsent(curr, {
                      id: `consent-${Date.now()}`,
                      requesterSide: bottomSide,
                      requesterName: state[bottomSide].name,
                      actionType: 'INSPECT_TOP',
                      description: 'ขอดูการ์ดบนสุดของกองสำรับ (Inspect Top Cards)',
                      timestamp: Date.now(),
                    }),
                    true
                  );
                } else {
                  setIsTopCardsOpen(true);
                }
              }}
              className="w-7 h-7 rounded-xl bg-slate-900 border border-white/15 text-slate-300 flex items-center justify-center text-xs active:scale-95 cursor-pointer shadow"
              title="ดูการ์ดใบบนสุด"
            >
              👁️
            </button>
            <button
              id="btn-dock-prizes"
              type="button"
              onClick={() => {
                if (bottomPlayer.prizes.length > 0) {
                  Sound.playCardFlip();
                  commitState((curr) => TabletopActions.takePrize(curr, bottomSide, 0));
                }
              }}
              className="px-2 py-1 rounded-xl bg-amber-950/80 border border-amber-400/50 text-amber-200 text-[10px] font-bold flex items-center gap-0.5 active:scale-95 shadow cursor-pointer"
              title="หยิบไพรซ์ 1 ใบ"
            >
              ★ {bottomPlayer.prizes.length}
            </button>
          </div>

          {/* Pre-game Let's Play Button when cards are facedown */}
          {hasFacedownCards && !state.isGameStarted && onRevealAllFacedown && (
            <button
              id="btn-dock-reveal-all"
              type="button"
              onClick={onRevealAllFacedown}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl font-black text-xs shadow-xl transition-all active:scale-95 cursor-pointer ${
                isReadyForLetsPlay
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-amber-500/50 ring-2 ring-yellow-300 animate-pulse'
                  : 'bg-amber-900/90 text-amber-100 border border-amber-400/60 shadow-amber-900/50'
              }`}
              title={missingSetupTooltip || "คลิกเพื่อพลิกหงายการ์ดที่คว่ำไว้ทั้งหมดและเริ่มการแข่งขัน"}
            >
              <span className="text-sm">✨</span>
              <span>Let's Play!</span>
            </button>
          )}

          {/* Right Action: Pass Turn */}
          <button
            id="btn-dock-pass-turn"
            type="button"
            onClick={handlePassTurn}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl font-black text-xs shadow-xl transition-all active:scale-95 cursor-pointer ${
              isMyTurn
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 shadow-emerald-500/50 ring-2 ring-emerald-300 animate-pulse'
                : 'bg-slate-800 text-slate-400 border border-white/10 opacity-70'
            }`}
          >
            <span className="text-sm">⚡</span>
            <span>{isMyTurn ? 'จบเทิร์น' : 'รอคู่แข่ง...'}</span>
          </button>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* SECTION 5: FLOATING DRAGGED CARD FOLLOWER                                  */}
      {/* ========================================================================= */}
      {dragState && (
        <div
          className="fixed pointer-events-none z-50 transition-none"
          style={{
            left: `${dragState.currentX}px`,
            top: `${dragState.currentY}px`,
            transform: 'translate(-50%, -50%) rotate(3deg) scale(1.15)',
          }}
        >
          <div className="w-18 h-25 rounded-lg overflow-hidden border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.9)] bg-slate-950 pointer-events-none select-none">
            <img
              src={resolveCardImageUrl(dragState.card)}
              alt="Dragging Card"
              className="w-full h-full object-cover pointer-events-none select-none"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: MOBILE ACTIVE SPOTLIGHT CARD OVERLAY                           */}
      {/* ========================================================================= */}
      {state.activeSpotlight && (
        <div
          id="center-spotlight-modal"
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          onClick={() =>
            commitState((curr) => TabletopActions.dismissSpotlight(curr, curr.activeSpotlight?.actionType === 'REVEAL_CARD' ? 'HAND' : 'DISCARD'))
          }
        >
          <div
            className="relative w-full max-w-xs bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-950 border-2 border-amber-400/80 rounded-3xl shadow-2xl p-4 text-white flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Badge */}
            <div className="flex items-center justify-between w-full border-b border-white/10 pb-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {state.activeSpotlight.actionType === 'PLAY_TRAINER'
                  ? '✨ เล่นการ์ด Trainer กลางกระดาน'
                  : '👁️ โชว์การ์ดให้อีกฝั่งดู (Reveal)'}
              </span>
              <button
                id="btn-spotlight-dismiss"
                type="button"
                onClick={() =>
                  commitState((curr) => TabletopActions.dismissSpotlight(curr, curr.activeSpotlight?.actionType === 'REVEAL_CARD' ? 'HAND' : 'DISCARD'))
                }
                className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs cursor-pointer active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* Announcement Message */}
            {state.activeSpotlight.message && (
              <p className="text-xs font-bold text-slate-200 text-center">
                {state.activeSpotlight.message}
              </p>
            )}

            {/* Card Image */}
            <div className="relative w-36 aspect-[63/88] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 shrink-0">
              <img
                src={resolveCardImageUrl(state.activeSpotlight.card, true)}
                alt={getCardDisplayName(state.activeSpotlight.card)}
                className="w-full h-full object-cover"
                onError={(e) => handleCardImageError(e, state.activeSpotlight!.card)}
              />
            </div>

            {/* Card Name */}
            <div className="text-center">
              <h3 className="text-sm font-black text-white">
                {getCardDisplayName(state.activeSpotlight.card)}
              </h3>
              {state.activeSpotlight.card.nameEn && state.activeSpotlight.card.nameEn !== getCardDisplayName(state.activeSpotlight.card) && (
                <p className="text-[10px] text-slate-400">{state.activeSpotlight.card.nameEn}</p>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-1.5 w-full pt-2 border-t border-white/10">
              {state.activeSpotlight.actionType === 'PLAY_TRAINER' ? (
                <>
                  <button
                    id="btn-spotlight-discard"
                    type="button"
                    onClick={() => {
                      Sound.playCardPlacement();
                      commitState((curr) => TabletopActions.dismissSpotlight(curr, 'DISCARD'));
                    }}
                    className="col-span-2 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-black shadow active:scale-95 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>🗑️</span>
                    <span>เสร็จสิ้น / ทิ้งลงสุสาน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      Sound.playCardFlip();
                      commitState((curr) => TabletopActions.dismissSpotlight(curr, 'HAND'));
                    }}
                    className="py-1.5 rounded-xl bg-slate-800 text-slate-300 text-[11px] font-bold active:scale-95 cursor-pointer"
                  >
                    ✋ เก็บขึ้นมือ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      Sound.playCardPlacement();
                      commitState((curr) => TabletopActions.dismissSpotlight(curr, 'LOST_ZONE'));
                    }}
                    className="py-1.5 rounded-xl bg-purple-950 text-purple-200 text-[11px] font-bold active:scale-95 cursor-pointer"
                  >
                    🌀 Lost Zone
                  </button>
                </>
              ) : (
                <button
                  id="btn-spotlight-close"
                  type="button"
                  onClick={() => {
                    Sound.playCardFlip();
                    commitState((curr) => TabletopActions.dismissSpotlight(curr, 'HAND'));
                  }}
                  className="col-span-2 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black shadow active:scale-95 cursor-pointer"
                >
                  รับทราบ / ปิดหน้าต่าง
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
