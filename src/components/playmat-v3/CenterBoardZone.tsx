import React from 'react';
import type { CardInstance, CenterSpotlightCard } from './types';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { Sound } from '../../engine/pixi/SoundEffects';
import { getCardDisplayName } from '../../utils/pokemonThaiTranslator';

interface CenterBoardZoneProps {
  activeSpotlight: CenterSpotlightCard | null;
  currentTurn: 'player1' | 'player2';
  soloRevealAllHands: boolean;
  perspective: 'player1' | 'player2' | 'both';
  hasFacedownCards?: boolean;
  isReadyForLetsPlay?: boolean;
  missingSetupTooltip?: string;
  hasAttachedEnergyThisTurn?: boolean;
  hasPlayedSupporterThisTurn?: boolean;
  onRevealAllFacedown?: () => void;
  onDismissSpotlight: (toZone: 'DISCARD' | 'LOST_ZONE' | 'HAND') => void;
  onPassTurn: () => void;
  onToggleSoloReveal: () => void;
  onTogglePerspective: () => void;
  onToggleTurnTracking?: (type: 'ENERGY' | 'SUPPORTER') => void;
  onOpenTurnDecision?: () => void;
  onTriggerCoinFlip?: () => void;
  isMyTurn?: boolean;
  isOnlineMode?: boolean;
  myRole?: 'player1' | 'player2' | 'both' | 'spectator';
  isDropTarget?: boolean;
  onClick?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;

  // Shared Stadium Slot
  stadium?: CardInstance | null;
  stadiumOwnerSide?: 'player1' | 'player2' | null;
  stadiumOwnerName?: string;
  onDropOnStadium?: () => void;
  onDiscardStadium?: () => void;
  onZoomStadium?: (card: CardInstance) => void;
  activeDropZone?: string | null;
  isGameStarted?: boolean;
  isTurnDecided?: boolean;
}

export const CenterBoardZone: React.FC<CenterBoardZoneProps> = ({
  activeSpotlight,
  currentTurn,
  soloRevealAllHands,
  perspective,
  isOnlineMode = false,
  myRole,
  hasFacedownCards,
  isGameStarted = false,
  isTurnDecided = false,

  isReadyForLetsPlay = true,
  missingSetupTooltip,
  hasAttachedEnergyThisTurn,
  hasPlayedSupporterThisTurn,
  onRevealAllFacedown,
  onDismissSpotlight,
  onPassTurn,
  onToggleSoloReveal,
  onTogglePerspective,
  onToggleTurnTracking,
  onOpenTurnDecision,
  onTriggerCoinFlip,
  isMyTurn,
  isDropTarget = false,
  onClick,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}) => {
  // Auto-dismiss REVEAL_CARD spotlight after 6 seconds so it never blocks gameplay
  const spotlightKey = activeSpotlight?.id || activeSpotlight?.timestamp;
  const isRevealSpotlight = activeSpotlight?.actionType === 'REVEAL_CARD';
  React.useEffect(() => {
    if (!isRevealSpotlight) return;
    const timer = setTimeout(() => {
      onDismissSpotlight('HAND');
    }, 6000);
    return () => clearTimeout(timer);
  }, [spotlightKey, isRevealSpotlight, onDismissSpotlight]);

  return (
    <>
      <div
        id="center-board-zone"
        data-center-board="true"
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={(e) => {
          if (onClick && isDropTarget && (e.target === e.currentTarget || !(e.target as HTMLElement).closest('button'))) {
            onClick();
          }
        }}
        className={`relative z-20 w-full max-w-screen-2xl mx-auto min-h-[30px] sm:min-h-[34px] flex items-center justify-between sm:justify-center gap-1 sm:gap-3 lg:gap-5 select-none my-0 sm:my-0.5 px-2 overflow-visible transition-all duration-150 ${
          isDropTarget
            ? 'border-2 border-dashed border-emerald-400 bg-emerald-500/20 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-400/50 rounded-2xl cursor-pointer'
            : ''
        }`}
      >
        {/* Subtle glowing center divider line passing behind */}
        <div className="absolute inset-x-2 sm:inset-x-8 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-teal-400/30 via-emerald-400/30 to-transparent pointer-events-none" />

        {/* Drop Target Overlay when dragging Trainer Card */}
        {isDropTarget && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-emerald-950/80 rounded-2xl border-2 border-emerald-400 backdrop-blur-xs animate-in zoom-in-95 pointer-events-none">
            <div className="px-3 py-1 rounded-full bg-slate-950/95 border border-emerald-400 text-emerald-300 text-xs font-black shadow-xl flex items-center gap-1.5 animate-bounce">
              <span>🎴</span>
              <span>ปล่อยเพื่อเล่นการ์ดลงกระดาน</span>
            </div>
          </div>
        )}

        {/* CENTER ARENA: Action Trackers & Turn Status Controls */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 lg:gap-2.5 relative z-10 overflow-x-auto no-scrollbar py-0.5">
          {/* Turn Action Trackers: Energy & Support */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-emerald-400/30 backdrop-blur-xl shadow-md shadow-black/50 shrink-0">
            <span className="hidden md:inline text-[7.5px] sm:text-[8.5px] font-black uppercase text-emerald-400 tracking-wider">
              Turn Action:
            </span>

            {/* Energy Turn Tracking */}
            <button
              id="btn-toggle-turn-energy"
              type="button"
              onClick={() => {
                Sound.playCardPlacement();
                onToggleTurnTracking?.('ENERGY');
              }}
              className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black border transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
                hasAttachedEnergyThisTurn
                  ? 'bg-amber-950/90 border-amber-400 text-amber-300 shadow-sm shadow-amber-900/50 ring-1 ring-amber-400/50'
                  : 'bg-slate-900/90 border-white/20 text-slate-400 hover:text-white hover:border-white/40'
              }`}
              title="Tracking: ติด Energy รอบนี้ (คลิกเพื่อสลับ/รีเซ็ต)"
            >
              <span>⚡</span>
              <span>
                <span className="hidden xs:inline">Energy: </span>
                <span className="font-mono">{hasAttachedEnergyThisTurn ? '1/1 ✓' : '0/1'}</span>
              </span>
            </button>

            {/* Supporter Turn Tracking */}
            <button
              id="btn-toggle-turn-supporter"
              type="button"
              onClick={() => {
                Sound.playCardPlacement();
                onToggleTurnTracking?.('SUPPORTER');
              }}
              className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black border transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
                hasPlayedSupporterThisTurn
                  ? 'bg-purple-950/90 border-purple-400 text-purple-300 shadow-sm shadow-purple-900/50 ring-1 ring-purple-400/50'
                  : 'bg-slate-900/90 border-white/20 text-slate-400 hover:text-white hover:border-white/40'
              }`}
              title="Tracking: ใช้ Supporter รอบนี้ (คลิกเพื่อสลับ/รีเซ็ต)"
            >
              <span>👤</span>
              <span>
                <span className="hidden xs:inline">Support: </span>
                <span className="font-mono">{hasPlayedSupporterThisTurn ? '1/1 ✓' : '0/1'}</span>
              </span>
            </button>
          </div>

          {/* Turn Status & Quick Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-950/90 border border-white/15 backdrop-blur-xl shadow-md shadow-black/50 shrink-0">
            {/* Let's Play! Reveal All Facedown Button (Only before game starts) */}
            {hasFacedownCards && !isGameStarted && onRevealAllFacedown && (
              <button
                id="btn-reveal-all-facedown"
                data-ready={isReadyForLetsPlay}
                onClick={() => {
                  onRevealAllFacedown();
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[8.5px] sm:text-[10px] shadow-lg active:scale-95 transition-all cursor-pointer whitespace-nowrap ${
                  isReadyForLetsPlay
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-amber-500/30 border border-amber-200 animate-pulse'
                    : 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/50 shadow-black/40 hover:border-amber-400'
                }`}
                title={
                  isReadyForLetsPlay
                    ? "Let's Play! พลิกหงายการ์ดที่คว่ำหน้าทั้งหมดบนสนามพร้อมกัน"
                    : missingSetupTooltip || "ยังไม่พร้อมเริ่มเกม: ต้องวาง Active และ Prize ให้ครบทั้ง 2 ฝ่าย"
                }
              >
                <span>{isReadyForLetsPlay ? '✨' : '⚠️'}</span>
                <span>Let's Play!</span>
              </button>
            )}

            {/* Pre-Game Coin Toss & Turn Decision Button: Only before game starts AND before turn is decided */}
            {/* Pre-Game Coin Toss & Turn Decision Button: Only before game starts */}
            {!isGameStarted && onOpenTurnDecision && (
              <button
                id="btn-open-turn-decision"
                type="button"
                onClick={() => {
                  Sound.playCardFlip();
                  onOpenTurnDecision();
                }}
                className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/90 to-yellow-600/90 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-[8.5px] sm:text-[10px] shadow active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                title="ทอยเหรียญเลือกว่าใครได้สิทธิ์เลือกว่าจะเล่นก่อนหรือหลัง"
              >
                <span>🪙</span>
                <span className="hidden sm:inline">ทอยเหรียญเลือกเริ่มก่อน/หลัง</span>
                <span className="sm:hidden">ก่อน/หลัง</span>
              </button>
            )}

            {/* In-Game Coin Flip (Synchronized between players, active when game started or turn decided) */}
            {onTriggerCoinFlip && (isGameStarted || isTurnDecided) && (
              <button
                id="btn-center-coin-flip"
                type="button"
                onClick={() => {
                  Sound.playCardFlip();
                  onTriggerCoinFlip();
                }}
                className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-amber-400/50 hover:border-amber-400 text-amber-300 font-bold text-[8.5px] sm:text-[10px] shadow active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                title="ทอยเหรียญระหว่างเล่น (แสดง Animation และผลลัพธ์ให้ทั้ง 2 ฝ่ายเห็นพร้อมกัน)"
              >
                <span>🪙</span>
                <span className="hidden xs:inline">ทอยเหรียญ</span>
              </button>
            )}

            {/* Turn Indicator */}
            <button
              id="btn-setup-toggle-first"
              data-testid="badge-turn-indicator"
              disabled={isOnlineMode && isMyTurn === false}
              onClick={() => {
                if (isOnlineMode && isMyTurn === false) return;
                Sound.playTurnChange();
                onPassTurn();
              }}
              className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full border text-[8.5px] sm:text-[10px] font-bold shadow-inner transition-all whitespace-nowrap ${
                isOnlineMode && isMyTurn === false
                  ? 'bg-slate-950 border-white/10 opacity-60 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 border-white/15 hover:border-amber-400/40 cursor-pointer active:scale-95'
              }`}
              title={isOnlineMode && isMyTurn === false ? 'ยังไม่ถึงเทิร์นของคุณ (รอฝ่ายตรงข้าม)' : 'คลิกเพื่อสลับเทิร์น / ฝ่ายเริ่มก่อน'}
            >
              <span className="text-[10px] sm:text-xs">
                {currentTurn === 'player1' ? '🔵' : '🔴'}
              </span>
              <span className="hidden sm:inline text-white">
                {currentTurn === 'player1' ? 'Player 1' : 'Player 2'}{' '}
                {isOnlineMode
                  ? currentTurn === perspective
                    ? '(เทิร์นของคุณ)'
                    : '(เทิร์นคู่แข่ง)'
                  : currentTurn === 'player1'
                  ? '(คุณ)'
                  : '(คู่ต่อสู้)'}
              </span>
              <span className="sm:hidden text-white font-bold">
                {currentTurn === 'player1' ? 'P1' : 'P2'}
              </span>
            </button>

            {/* Pass Turn */}
            <button
              id="btn-center-pass-turn"
              disabled={isOnlineMode && isMyTurn === false}
              onClick={() => {
                if (isOnlineMode && isMyTurn === false) return;
                Sound.playTurnChange();
                onPassTurn();
              }}
              className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[10px] font-bold shadow transition-all flex items-center gap-0.5 sm:gap-1 whitespace-nowrap ${
                isOnlineMode && isMyTurn === false
                  ? 'opacity-35 bg-slate-800 text-slate-500 cursor-not-allowed pointer-events-none'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
              }`}
              title={isOnlineMode && isMyTurn === false ? 'ยังไม่ถึงเทิร์นของคุณ' : 'สลับเทิร์นให้อีกฝ่าย'}
            >
              <span>⏭️</span>
              <span className="hidden sm:inline">สลับเทิร์น</span>
            </button>
          </div>
        </div>

        {/* 3. RIGHT FLANK: Auxiliary Toggles (Only on SM and larger screens, balanced spacer on mobile) */}
        <div className="w-[50px] xs:w-[58px] sm:w-[90px] md:w-[110px] lg:w-[130px] xl:w-[160px] 2xl:w-[180px] shrink-0 flex items-center justify-center">
          {isOnlineMode ? (
            <div
              id="badge-online-role-center"
              className="flex px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-900 border border-emerald-400/40 text-[8px] xs:text-[9px] sm:text-[10px] font-bold text-emerald-300 items-center gap-1 shadow whitespace-nowrap"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{perspective === 'player1' ? '🔵 Player 1' : '🔴 Player 2'}</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1">
              {/* Hand Privacy Toggle */}
              <button
                id="btn-toggle-solo-reveal"
                onClick={onToggleSoloReveal}
                className={`px-1.5 sm:px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-bold shadow active:scale-95 transition-all flex items-center gap-0.5 cursor-pointer whitespace-nowrap ${
                  soloRevealAllHands
                    ? 'bg-amber-950/80 border-amber-400 text-amber-300'
                    : 'bg-slate-900 border-white/15 text-slate-300 hover:text-white'
                }`}
                title={
                  soloRevealAllHands
                    ? 'โหมดซ้อมคนเดียว: หงายดูการ์ดทั้ง 2 ฝั่ง'
                    : 'โหมดป้องกันการแอบดู: คว่ำการ์ดบนมืออีกฝั่ง'
                }
              >
                <span>{soloRevealAllHands ? '👁️' : '🔒'}</span>
                <span className="hidden lg:inline">
                  {soloRevealAllHands ? 'โหมดซ้อม' : 'คว่ำมือ'}
                </span>
              </button>

              {/* Perspective Flip / Hand Switch */}
              <button
                id="btn-toggle-perspective"
                onClick={onTogglePerspective}
                className="px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-white/30 text-[9px] sm:text-[10px] font-bold text-slate-300 hover:text-white active:scale-95 transition-all flex items-center gap-0.5 sm:gap-1 cursor-pointer shadow whitespace-nowrap"
                title="สลับมือเล่น / สลับมุมมองโต๊ะ (Player 1 ↔ Player 2)"
              >
                <span>🔄</span>
                <span className="hidden md:inline">สลับ:</span>
                <span className={perspective === 'player1' ? 'text-blue-400 font-black' : 'text-rose-400 font-black'}>
                  {perspective === 'player1' ? '🔵 P1' : '🔴 P2'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CENTER SPOTLIGHT CARD OVERLAY (When a Trainer is played or a card is revealed) */}
      {activeSpotlight &&
        !(
          isOnlineMode &&
          activeSpotlight.actionType === 'REVEAL_CARD' &&
          ((myRole && myRole !== 'both' && activeSpotlight.sourceSide === myRole) ||
            activeSpotlight.sourceSide === perspective)
        ) && (
        <div
          id="center-spotlight-modal"
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          onClick={() =>
            onDismissSpotlight(activeSpotlight.actionType === 'REVEAL_CARD' ? 'HAND' : 'DISCARD')
          }
        >
          <div
            className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-950 border-2 border-amber-400/80 rounded-3xl shadow-2xl p-5 text-white flex flex-col items-center gap-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Badge */}
            <div className="flex items-center justify-between w-full border-b border-white/10 pb-2">
              <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {activeSpotlight.actionType === 'PLAY_TRAINER'
                  ? '✨ เล่นการ์ด Trainer กลางกระดาน'
                  : '👁️ โชว์การ์ดให้อีกฝั่งดู (Reveal)'}
              </span>
              <button
                id="btn-spotlight-dismiss"
                onClick={() =>
                  onDismissSpotlight(activeSpotlight.actionType === 'REVEAL_CARD' ? 'HAND' : 'DISCARD')
                }
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs cursor-pointer transition-all active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* Announcement Message */}
            <p className="text-xs font-bold text-slate-200 text-center">
              {activeSpotlight.message}
            </p>

            {/* Card Image(s) */}
            {activeSpotlight.cards && activeSpotlight.cards.length > 1 ? (
              <div className="flex items-center gap-2 max-w-full overflow-x-auto p-1 scrollbar-thin">
                {activeSpotlight.cards.map((c, i) => (
                  <div
                    key={c.instanceId || i}
                    className="relative w-28 aspect-[63/88] rounded-xl overflow-hidden shadow-xl border border-white/30 flex-shrink-0"
                  >
                    <img
                      src={resolveCardImageUrl(c, true)}
                      alt={getCardDisplayName(c)}
                      className="w-full h-full object-cover"
                      onError={(e) => handleCardImageError(e, c)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative w-44 aspect-[63/88] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30">
                <img
                  src={resolveCardImageUrl(activeSpotlight.card, true)}
                  alt={getCardDisplayName(activeSpotlight.card)}
                  className="w-full h-full object-cover"
                  onError={(e) => handleCardImageError(e, activeSpotlight.card)}
                />
              </div>
            )}

            {/* Card Name and Subtypes */}
            <div className="text-center">
              <h3 className="text-base font-black text-white">
                {getCardDisplayName(activeSpotlight.card)}
              </h3>
              {activeSpotlight.card.nameEn && activeSpotlight.card.nameEn !== getCardDisplayName(activeSpotlight.card) && (
                <p className="text-xs text-slate-400">{activeSpotlight.card.nameEn}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-white/10">
              {activeSpotlight.actionType === 'PLAY_TRAINER' ? (
                <>
                  <button
                    id="btn-spotlight-discard"
                    onClick={() => {
                      Sound.playCardPlacement();
                      onDismissSpotlight('DISCARD');
                    }}
                    className="col-span-2 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-xs font-black shadow active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>🗑️</span> เสร็จสิ้น / ทิ้งลงสุสาน (Done & Discard)
                  </button>
                  <button
                    onClick={() => {
                      Sound.playCardFlip();
                      onDismissSpotlight('HAND');
                    }}
                    className="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    ↩️ เก็บกลับขึ้นมือ
                  </button>
                  <button
                    onClick={() => {
                      Sound.playCardPlacement();
                      onDismissSpotlight('LOST_ZONE');
                    }}
                    className="py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-200 text-xs font-semibold"
                  >
                    🌀 ส่งไป Lost Zone
                  </button>
                </>
              ) : (
                <button
                  id="btn-spotlight-close"
                  onClick={() => {
                    Sound.playCardFlip();
                    onDismissSpotlight('HAND');
                  }}
                  className="col-span-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-black shadow active:scale-95 transition-all cursor-pointer"
                >
                  รับทราบ / ปิดหน้าต่าง (OK)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
