import React, { useState, useEffect, useRef } from 'react';
import { Sound } from '../../../engine/pixi/SoundEffects';
import type { TabletopTurnDecision } from '../types';
import { MetallicCoin } from './MetallicCoin';

interface TurnDecisionModalProps {
  onClose: () => void;
  p1Name: string;
  p2Name: string;
  myRole: 'player1' | 'player2' | 'both' | 'spectator';
  roomMode: 'local' | 'online';
  currentTurn: 'player1' | 'player2';
  currentDecision?: TabletopTurnDecision | null;
  onApplyDecision: (decision: TabletopTurnDecision) => void;
}

export const TurnDecisionModal: React.FC<TurnDecisionModalProps> = ({
  onClose,
  p1Name,
  p2Name,
  myRole,
  roomMode,
  currentDecision,
  onApplyDecision,
}) => {
  const [phase, setPhase] = useState<'IDLE' | 'FLIPPING' | 'CHOOSING' | 'DECIDED'>(
    currentDecision?.phase === 'CHOOSING' ? 'CHOOSING' : currentDecision?.phase === 'FLIPPING' ? 'FLIPPING' : 'IDLE'
  );
  const [coinResult, setCoinResult] = useState<'HEADS' | 'TAILS' | null>(
    currentDecision?.coinResult || null
  );
  const [winnerSide, setWinnerSide] = useState<'player1' | 'player2' | null>(
    currentDecision?.winnerSide || null
  );
  const [isFlippingAnim, setIsFlippingAnim] = useState(currentDecision?.phase === 'FLIPPING');

  // Sync with incoming remote decision updates
  useEffect(() => {
    if (currentDecision) {
      if (currentDecision.phase) {
        setPhase(currentDecision.phase);
        if (currentDecision.phase === 'FLIPPING') {
          setIsFlippingAnim(true);
        } else {
          setIsFlippingAnim(false);
        }
        if (currentDecision.phase === 'DECIDED') {
          const timer = setTimeout(() => {
            onClose();
          }, 500);
          return () => clearTimeout(timer);
        }
      }
      if (currentDecision.coinResult) setCoinResult(currentDecision.coinResult);
      if (currentDecision.winnerSide) setWinnerSide(currentDecision.winnerSide);
    }
  }, [currentDecision, onClose]);

  const isOnline = roomMode === 'online';
  const winnerName = winnerSide === 'player1' ? p1Name : p2Name;
  const isYouWinner =
    myRole !== 'spectator' &&
    winnerSide !== null &&
    (!isOnline || myRole === 'both' ? winnerSide === 'player1' : winnerSide === myRole);

  const isMyTurnToChoose =
    myRole !== 'spectator' &&
    (!isOnline || myRole === 'both' || (winnerSide && myRole === winnerSide));

  // Perform Coin Flip
  const handleFlipCoin = () => {
    setIsFlippingAnim(true);
    setPhase('FLIPPING');
    Sound.playCardFlip();

    // If online, broadcast the flipping phase immediately so the opponent sees the 3D flip animation
    if (isOnline) {
      onApplyDecision({
        phase: 'FLIPPING',
        timestamp: Date.now(),
      });
    }

    setTimeout(() => {
      const winner: 'player1' | 'player2' = Math.random() < 0.5 ? 'player1' : 'player2';
      const flip: 'HEADS' | 'TAILS' = winner === 'player1' ? 'HEADS' : 'TAILS';

      setCoinResult(flip);
      setWinnerSide(winner);
      setIsFlippingAnim(false);
      setPhase('CHOOSING');
      Sound.playCardPlacement();

      // If online, broadcast the intermediate choosing phase
      if (isOnline) {
        onApplyDecision({
          phase: 'CHOOSING',
          coinResult: flip,
          winnerSide: winner,
          timestamp: Date.now(),
        });
      }
    }, 900);
  };

  // Manual Winner Pick (for physical coin flips at the table)
  const handleManualWinner = (winner: 'player1' | 'player2') => {
    setCoinResult('HEADS');
    setWinnerSide(winner);
    setPhase('CHOOSING');
    Sound.playCardPlacement();

    if (isOnline) {
      onApplyDecision({
        phase: 'CHOOSING',
        coinResult: 'HEADS',
        winnerSide: winner,
        timestamp: Date.now(),
      });
    }
  };

  const closeTimerRef = useRef<any>(null);
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Winner Chooses First or Second
  const handleSelectTurnOrder = (order: 'FIRST' | 'SECOND') => {
    if (!winnerSide) return;
    Sound.playTurnChange();

    const startingPlayer: 'player1' | 'player2' =
      order === 'FIRST'
        ? winnerSide
        : winnerSide === 'player1'
        ? 'player2'
        : 'player1';

    const finalDecision: TabletopTurnDecision = {
      phase: 'DECIDED',
      coinResult: coinResult || 'HEADS',
      winnerSide,
      chosenOrder: order,
      startingPlayer,
      timestamp: Date.now(),
    };

    onApplyDecision(finalDecision);
    setPhase('DECIDED');
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      style={{ touchAction: 'auto' }}
    >
      <div
        id="turn-decision-modal"
        className="relative w-full max-w-lg bg-slate-900/95 border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col text-white max-h-[88dvh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-white/10 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">🪙</span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5 flex-wrap">
                <span className="truncate">เลือกฝ่ายเริ่มก่อน / หลัง</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300 font-bold whitespace-nowrap">
                  Pre-Game
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                ทอยเหรียญเพื่อให้ผู้ชนะเลือกว่าจะเริ่มเล่นก่อนหรือหลัง
              </p>
            </div>
          </div>
          <button
            id="btn-close-turn-decision"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div
          className="p-4 sm:p-5 flex-1 overflow-y-auto overscroll-contain flex flex-col items-center gap-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          {/* Animated Perspective Coin Visual (YOU vs OPP) */}
          <div className="flex flex-col items-center gap-2.5">
            <div id="coin-toss-visual">
              <span className="sr-only">YOU / OPP</span>
              <MetallicCoin
                size="xl"
                variant="PRE_GAME"
                side={winnerSide ? (isYouWinner ? 'YOU' : 'OPP') : 'IDLE'}
                isFlipping={isFlippingAnim}
                onClick={phase === 'IDLE' && !isFlippingAnim ? handleFlipCoin : undefined}
              />
            </div>

            <div id="coin-result-label" className="text-xs font-black tracking-wide text-center">
              {isFlippingAnim ? (
                <span className="text-amber-300 animate-pulse">กำลังทอยเหรียญ YOU / OPP...</span>
              ) : winnerSide ? (
                isYouWinner ? (
                  <span className="text-emerald-300 flex items-center gap-1.5 justify-center">
                    <span>🎉</span>
                    <span>ออกหน้า: YOU (คุณเป็นฝ่ายชนะการทอยเหรียญ!)</span>
                  </span>
                ) : (
                  <span className="text-indigo-300 flex items-center gap-1.5 justify-center">
                    <span>🛡️</span>
                    <span>ออกหน้า: OPP (ฝ่ายตรงข้ามชนะการทอยเหรียญ)</span>
                  </span>
                )
              ) : (
                <span className="text-slate-400">เหรียญจะออกผลเป็น YOU หรือ OPP ตามมุมมองของคุณ</span>
              )}
            </div>
          </div>

          {/* Phase 1: Coin Flip Controls */}
          {phase === 'IDLE' || phase === 'FLIPPING' ? (
            <div className="w-full flex flex-col items-center gap-3">
              <button
                id="btn-action-flip-coin"
                type="button"
                disabled={isFlippingAnim}
                onClick={handleFlipCoin}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-950/60 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>🪙</span>
                <span>{isFlippingAnim ? 'กำลังหมุนเหรียญ...' : 'ทอยเหรียญ YOU / OPP (Flip Coin)'}</span>
              </button>

              {/* Manual selection fallback */}
              <div className="w-full pt-3 border-t border-white/10 flex flex-col items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">
                  หรือระบุผู้ชนะเอง (กรณีทอยเหรียญจริงที่โต๊ะ):
                </span>
                <div className="flex gap-2 w-full">
                  <button
                    id="btn-manual-winner-p1"
                    type="button"
                    onClick={() => handleManualWinner(isOnline ? (myRole === 'player2' ? 'player2' : 'player1') : 'player1')}
                    className="flex-1 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-400/40 text-emerald-200 text-xs font-black transition active:scale-95 cursor-pointer"
                  >
                    👑 คุณชนะ (YOU)
                  </button>
                  <button
                    id="btn-manual-winner-p2"
                    type="button"
                    onClick={() => handleManualWinner(isOnline ? (myRole === 'player2' ? 'player1' : 'player2') : 'player2')}
                    className="flex-1 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-400/40 text-indigo-200 text-xs font-black transition active:scale-95 cursor-pointer"
                  >
                    🛡️ ฝ่ายตรงข้าม (OPP)
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Phase 2: Winner Chooses First or Second */}
          {phase === 'CHOOSING' || phase === 'DECIDED' ? (
            <div className="w-full flex flex-col gap-3.5 animate-in fade-in duration-200">
              {/* Winner Announcement Banner */}
              <div
                id="turn-winner-banner"
                className={`p-3.5 rounded-2xl border flex items-center justify-between shadow-lg ${
                  isYouWinner
                    ? 'bg-gradient-to-r from-emerald-950/80 to-teal-950/60 border-emerald-400/60 shadow-emerald-950/50'
                    : 'bg-gradient-to-r from-indigo-950/80 to-slate-900/90 border-indigo-400/50 shadow-indigo-950/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{isYouWinner ? '👑' : '🛡️'}</span>
                  <div>
                    <div className="text-[11px] font-bold text-slate-300">
                      {isYouWinner ? 'คุณเป็นผู้ชนะการทอยเหรียญ:' : 'ฝ่ายตรงข้ามชนะการทอยเหรียญ:'}
                    </div>
                    <div className="text-sm font-black text-white flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 border border-white/20">
                        {isYouWinner ? 'YOU' : 'OPP'}
                      </span>
                      <span>{winnerName}</span>
                      {isYouWinner && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-black">
                          คุณได้สิทธิ์เลือก
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-reflip-coin"
                    type="button"
                    onClick={handleFlipCoin}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  >
                    🔄 ทอยใหม่
                  </button>
                  <button
                    id="btn-reset-turn-decision"
                    type="button"
                    onClick={() => {
                      setPhase('IDLE');
                      setWinnerSide(null);
                      setCoinResult(null);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  >
                    ⚙️ รีเซ็ต
                  </button>
                </div>
              </div>

              {/* Prompt */}
              <div className="text-center text-xs font-bold text-slate-300">
                {isMyTurnToChoose ? (
                  <span className="text-emerald-300 font-black flex items-center justify-center gap-1.5">
                    <span>👉</span>
                    <span>กรุณาเลือกว่าต้องการ [เล่นก่อน] หรือ [เล่นหลัง]:</span>
                  </span>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>กำลังรอให้ {winnerName} (OPP) เลือกว่าจะเล่นก่อนหรือหลัง...</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Go First vs Go Second */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="btn-choose-go-first"
                  type="button"
                  disabled={!isMyTurnToChoose || phase === 'DECIDED'}
                  onClick={() => handleSelectTurnOrder('FIRST')}
                  className="p-3.5 rounded-2xl bg-gradient-to-b from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-blue-950/60 border border-blue-400/40 active:scale-95 transition-all flex flex-col items-center text-center gap-1 cursor-pointer"
                >
                  <span className="text-2xl">⚡</span>
                  <span className="text-sm font-black tracking-tight">เล่นก่อน (Go First)</span>
                  <span className="text-[10px] text-blue-200/90 leading-tight">
                    เริ่มเป็น Turn 1 ติดพลังงานและวิวัฒนาการก่อน
                  </span>
                </button>

                <button
                  id="btn-choose-go-second"
                  type="button"
                  disabled={!isMyTurnToChoose || phase === 'DECIDED'}
                  onClick={() => handleSelectTurnOrder('SECOND')}
                  className="p-3.5 rounded-2xl bg-gradient-to-b from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-emerald-950/60 border border-emerald-400/40 active:scale-95 transition-all flex flex-col items-center text-center gap-1 cursor-pointer"
                >
                  <span className="text-2xl">🛡️</span>
                  <span className="text-sm font-black tracking-tight">เล่นหลัง (Go Second)</span>
                  <span className="text-[10px] text-emerald-200/90 leading-tight">
                    เริ่มเป็น Turn 2 โจมตีและใช้ Supporter ได้ในเทิร์นแรก
                  </span>
                </button>
              </div>

              {/* Manual selection fallback during Phase 2 */}
              <div className="w-full pt-2.5 border-t border-white/10 flex flex-col items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">
                  หรือระบุผู้ชนะเอง (กรณีทอยเหรียญจริงที่โต๊ะ):
                </span>
                <div className="flex gap-2 w-full">
                  <button
                    id="btn-manual-winner-p1"
                    type="button"
                    onClick={() => handleManualWinner('player1')}
                    className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer ${
                      winnerSide === 'player1'
                        ? 'bg-blue-600 border-blue-300 text-white shadow-md'
                        : 'bg-blue-950/80 border-blue-500/40 text-blue-200 hover:bg-blue-900'
                    }`}
                  >
                    🔵 {p1Name} ชนะ
                  </button>
                  <button
                    id="btn-manual-winner-p2"
                    type="button"
                    onClick={() => handleManualWinner('player2')}
                    className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer ${
                      winnerSide === 'player2'
                        ? 'bg-rose-600 border-rose-300 text-white shadow-md'
                        : 'bg-rose-950/80 border-rose-500/40 text-rose-200 hover:bg-rose-900'
                    }`}
                  >
                    🔴 {p2Name} ชนะ
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
