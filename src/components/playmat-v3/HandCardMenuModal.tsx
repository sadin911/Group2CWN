import React, { useState } from 'react';
import type { CardInstance } from '../../engine/types';
import type { TabletopPokemonSlot } from './types';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { Sound } from '../../engine/pixi/SoundEffects';
import {
  translateSupertype,
  translateSubtype,
  getCardDisplayName,
} from '../../utils/pokemonThaiTranslator';

interface HandCardMenuModalProps {
  card: CardInstance;
  activeSlot: TabletopPokemonSlot | null;
  benchSlots: (TabletopPokemonSlot | null)[];
  onClose: () => void;
  onPlaceActive: (facedown?: boolean) => void;
  onPlaceBench: (benchIndex: number, facedown?: boolean) => void;
  onAttachEnergy: (target: 'ACTIVE' | number, isSpecialAttach?: boolean) => void;
  onAttachTool: (target: 'ACTIVE' | number) => void;
  onEvolve: (target: 'ACTIVE' | number) => void;
  onPlayStadium: () => void;
  onDiscard: () => void;
  onLostZone: () => void;
  onPutDeckTop: () => void;
  onPutDeckBottom: () => void;
  onShuffleToDeck?: () => void;
  onPutPrizes: () => void;
  onPlayTrainer?: () => void;
  onRevealCard?: () => void;
  onZoomCard?: () => void;
  isGameStarted?: boolean;
  benchLimit?: 5 | 8;
}

export const HandCardMenuModal: React.FC<HandCardMenuModalProps> = ({
  card,
  activeSlot,
  benchSlots,
  onClose,
  onPlaceActive,
  onPlaceBench,
  onAttachEnergy,
  onAttachTool,
  onEvolve,
  onPlayStadium,
  onDiscard,
  onLostZone,
  onPutDeckTop,
  onPutDeckBottom,
  onShuffleToDeck,
  onPutPrizes,
  onPlayTrainer,
  onRevealCard,
  onZoomCard,
  isGameStarted = false,
  benchLimit,
}) => {
  const [showZoom, setShowZoom] = useState(false);

  const cardName = getCardDisplayName(card);
  const imageUrl = resolveCardImageUrl(card, showZoom);
  const isPokemon = card.supertype === 'Pokemon';
  const isStadium = card.subtypes?.includes('Stadium');
  const isTool = card.subtypes?.includes('Tool') || card.subtypes?.includes('Pokémon Tool');

  const allPokemonSlots: { label: string; target: 'ACTIVE' | number; slot: TabletopPokemonSlot }[] = [];
  if (activeSlot) allPokemonSlots.push({ label: `Active (${getCardDisplayName(activeSlot.card)})`, target: 'ACTIVE', slot: activeSlot });
  benchSlots.forEach((b, idx) => {
    if (b) allPokemonSlots.push({ label: `Bench #${idx + 1} (${getCardDisplayName(b.card)})`, target: idx, slot: b });
  });

  return (
    <div
      id="hand-card-menu-modal"
      className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      style={{ touchAction: 'auto' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-md bg-slate-900/95 border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl text-white flex flex-col max-h-[88dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header with Card Art & Title */}
        <div className="flex items-start gap-2.5 sm:gap-3 border-b border-white/10 p-3 sm:p-4 bg-slate-950/80 shrink-0">
          <div
            id="btn-zoom-hand-card"
            onClick={() => {
              Sound.playCardFlip();
              if (onZoomCard) {
                onZoomCard();
              } else {
                setShowZoom(!showZoom);
              }
            }}
            className="cursor-pointer group relative flex-shrink-0 rounded-xl overflow-hidden"
            title="คลิกเพื่อดูการ์ดขนาดใหญ่ (อ่าน Text ชัดๆ)"
          >
            <img
              src={imageUrl}
              alt={cardName}
              className={`rounded-xl border border-white/20 shadow-md transition-all ${
                showZoom ? 'w-48 h-68 scale-110 z-30' : 'w-14 h-20 sm:w-16 sm:h-22 group-hover:scale-105'
              } object-cover`}
              onError={(e) => handleCardImageError(e, card)}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="text-[10px] bg-black/85 px-1.5 py-0.5 rounded-full text-white font-bold">🔍 ขยาย</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-300">
                {translateSupertype(card.supertype)}
              </span>
              {card.subtypes?.map((st) => (
                <span key={st} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {translateSubtype(st)}
                </span>
              ))}
            </div>
            <h3 className="text-sm sm:text-base font-black text-white truncate mt-1">{cardName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {card.cardCode && <span className="text-[10px] text-slate-400 font-mono">{card.cardCode}</span>}
              {onZoomCard && (
                <button
                  id="btn-zoom-hand-action"
                  type="button"
                  onClick={() => {
                    Sound.playCardFlip();
                    onZoomCard();
                  }}
                  className="px-2 py-0.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-400/50 text-[10px] sm:text-[11px] font-bold text-sky-300 hover:text-sky-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                  title="คลิกเพื่อดูการ์ดขนาดใหญ่ (อ่าน Text ชัดๆ)"
                >
                  <span>🔍</span>
                  <span>ดูการ์ดใหญ่</span>
                </button>
              )}
            </div>
          </div>

          <button
            id="btn-close-hand-menu"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Actions Body */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 flex flex-col gap-3 pb-[max(env(safe-area-inset-bottom),1rem)]"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          {/* Primary Placement Actions */}
          <div className="flex flex-col gap-2">
            {/* Play Trainer / Item / Supporter onto Tabletop Board */}
            {onPlayTrainer && (
            <button
              id="btn-hand-play-trainer"
              onClick={() => {
                Sound.playCardPlacement();
                onPlayTrainer();
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 border border-amber-300 cursor-pointer"
            >
              <span>▶️</span> เล่นการ์ดลงกระดาน (Play to Table)
            </button>
          )}

          {/* Reveal Card to Opponent */}
          {onRevealCard && (
            <button
              id="btn-hand-reveal-card"
              onClick={() => {
                Sound.playCardFlip();
                onRevealCard();
                onClose();
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 border border-purple-400/40"
            >
              <span>👁️</span> โชว์การ์ดให้อีกฝั่งดู (Reveal to Opponent)
            </button>
          )}

          {/* Place Active (Face-Up or Face-Down) */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              id="btn-hand-place-active"
              onClick={() => {
                Sound.playCardPlacement();
                onPlaceActive(!isGameStarted);
                onClose();
              }}
              className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-black shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <span>{isGameStarted ? '⭐' : '🎴'}</span> {isGameStarted ? 'วาง Active (หงาย)' : 'วาง Active (คว่ำ)'}
            </button>
            <button
              id="btn-hand-place-active-facedown"
              onClick={() => {
                Sound.playCardPlacement();
                onPlaceActive(true);
                onClose();
              }}
              className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-indigo-700 to-blue-800 hover:from-indigo-600 hover:to-blue-700 text-xs font-black shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5 border border-sky-400/40"
            >
              <span>🎴</span> วาง Active (คว่ำ)
            </button>
          </div>

          {/* Place on Bench (Face-Up / Auto-Facedown before start) */}
          {(() => {
            const effectiveBenchLimit = benchLimit || (benchSlots.length >= 8 ? 8 : 5);
            const benchIndices = Array.from({ length: effectiveBenchLimit }, (_, i) => i);
            const gridClass = effectiveBenchLimit === 8
              ? 'grid grid-cols-4 sm:grid-cols-8 gap-1 sm:gap-1.5'
              : 'grid grid-cols-5 gap-1.5';

            return (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {isGameStarted ? 'วางลงเบนช์ (หงายหน้า):' : 'วางลงเบนช์ (คว่ำหน้าอัตโนมัติก่อนเริ่มเกม):'}
                  </span>
                  <div className={gridClass}>
                    {benchIndices.map((idx) => {
                      const isOccupied = benchSlots[idx] !== null && benchSlots[idx] !== undefined;
                      return (
                        <button
                          key={idx}
                          id={`btn-hand-place-bench-${idx}`}
                          onClick={() => {
                            Sound.playCardPlacement();
                            onPlaceBench(idx, !isGameStarted);
                            onClose();
                          }}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                            isOccupied
                              ? 'bg-slate-800/80 border-white/10 text-amber-300'
                              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                          }`}
                        >
                          #{idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Place on Bench (Face-Down Row) */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-sky-300 font-semibold flex items-center gap-1">
                    <span>🎴</span> วางลงเบนช์ (คว่ำหน้า):
                  </span>
                  <div className={gridClass}>
                    {benchIndices.map((idx) => {
                      const isOccupied = benchSlots[idx] !== null && benchSlots[idx] !== undefined;
                      return (
                        <button
                          key={idx}
                          id={`btn-hand-place-bench-facedown-${idx}`}
                          onClick={() => {
                            Sound.playCardPlacement();
                            onPlaceBench(idx, true);
                            onClose();
                          }}
                          className={`py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                            isOccupied
                              ? 'bg-slate-800/80 border-white/10 text-slate-500'
                              : 'bg-indigo-950/60 border-indigo-500/40 text-sky-300 hover:bg-indigo-900/80'
                          }`}
                        >
                          🎴 #{idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}

          {/* Evolve Option if Pokemon exists */}
          {allPokemonSlots.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-semibold">วิวัฒนาการทับ (Evolve Over):</span>
              <div className="flex flex-wrap gap-1.5">
                {allPokemonSlots.map(({ label, target }) => (
                  <button
                    key={target}
                    onClick={() => {
                      Sound.playCardPlacement();
                      onEvolve(target);
                      onClose();
                    }}
                    className="py-1.5 px-2.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-500/30 text-amber-200 text-xs font-bold active:scale-95 transition-all"
                  >
                    ⬆️ {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attach as Energy (Turn Attach vs Special Attach) */}
          {allPokemonSlots.length > 0 && (
            <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-950/60 border border-indigo-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-indigo-300 font-bold">แนบเป็นพลังงาน (Attach as Energy):</span>
                <span className="text-[9px] text-slate-400">เลือกติดแบบตามรอบ หรือ แบบพิเศษ</span>
              </div>
              
              {/* Standard Turn Attach (1/1) */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-slate-400 font-semibold">⚡ ติดตามรอบเทิร์นปกติ (Turn 1/1):</span>
                <div className="flex flex-wrap gap-1.5">
                  {allPokemonSlots.map(({ label, target }) => (
                    <button
                      key={target}
                      id={`btn-hand-attach-energy-${target}`}
                      onClick={() => {
                        Sound.playCardPlacement();
                        onAttachEnergy(target, false);
                        onClose();
                      }}
                      className="py-1.5 px-2.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 text-xs font-bold active:scale-95 transition-all"
                    >
                      ⚡ {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special / Effect Attach */}
              <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                <span className="text-[9px] text-amber-300/80 font-semibold">✨ ติดเพิ่ม / พลังงานพิเศษ (Special / Ability):</span>
                <div className="flex flex-wrap gap-1.5">
                  {allPokemonSlots.map(({ label, target }) => (
                    <button
                      key={target}
                      id={`btn-hand-attach-energy-special-${target}`}
                      onClick={() => {
                        Sound.playCardPlacement();
                        onAttachEnergy(target, true);
                        onClose();
                      }}
                      className="py-1 px-2 rounded-lg bg-amber-950/50 hover:bg-amber-900/70 border border-amber-500/30 text-amber-200 text-[11px] font-semibold active:scale-95 transition-all"
                    >
                      ✨ {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Attach as Tool */}
          {(isTool || !isPokemon) && allPokemonSlots.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-semibold">แนบเป็นไอเท็มติดตัว (Attach Tool):</span>
              <div className="flex flex-wrap gap-1.5">
                {allPokemonSlots.map(({ label, target }) => (
                  <button
                    key={target}
                    onClick={() => {
                      Sound.playCardPlacement();
                      onAttachTool(target);
                      onClose();
                    }}
                    className="py-1.5 px-2.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-200 text-xs font-bold active:scale-95 transition-all"
                  >
                    🛠️ {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Play Stadium */}
          {isStadium && (
            <button
              onClick={() => {
                Sound.playCardPlacement();
                onPlayStadium();
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-xs font-black shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>🏟️</span> วางเป็นสเตเดียม (Stadium)
            </button>
          )}
        </div>

        {/* Secondary Zone Moves */}
        <div className="border-t border-white/10 pt-3 grid grid-cols-2 gap-2">
          <button
            id="btn-hand-discard"
            onClick={() => {
              Sound.playCardFlip();
              onDiscard();
              onClose();
            }}
            className="py-2 px-3 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/30 text-red-200 text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>🗑️</span> ทิ้งสุสาน (Discard)
          </button>

          <button
            id="btn-hand-lost-zone"
            onClick={() => {
              Sound.playCardFlip();
              onLostZone();
              onClose();
            }}
            className="py-2 px-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/30 text-purple-200 text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>🌀</span> Lost Zone
          </button>

          {/* Dedicated Return to Deck Section */}
          <div className="col-span-2 flex flex-col gap-1.5 p-2 rounded-xl bg-slate-950/70 border border-sky-500/30">
            <span className="text-[10px] text-sky-300 font-bold flex items-center gap-1">
              <span>📚</span> นำการ์ดใบนี้กลับเข้ากองสำรับ (Return to Deck):
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                id="btn-hand-put-deck-top"
                type="button"
                onClick={() => {
                  Sound.playCardFlip();
                  onPutDeckTop();
                  onClose();
                }}
                className="py-2 px-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-200 text-xs font-bold active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow"
                title="วางการ์ดใบนี้บนสุดของกองสำรับ"
              >
                <span className="text-sm">⬆️</span>
                <span>วางบนสุด</span>
              </button>
              <button
                id="btn-hand-put-deck-bottom"
                type="button"
                onClick={() => {
                  Sound.playCardFlip();
                  onPutDeckBottom();
                  onClose();
                }}
                className="py-2 px-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 text-xs font-bold active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow"
                title="ใส่การ์ดใบนี้ใต้สุดของกองสำรับ"
              >
                <span className="text-sm">⬇️</span>
                <span>ใส่ใต้สุด</span>
              </button>
              <button
                id="btn-hand-shuffle-deck"
                type="button"
                onClick={() => {
                  Sound.playShuffle();
                  (onShuffleToDeck || onPutDeckTop)();
                  onClose();
                }}
                className="py-2 px-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-bold active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow"
                title="ใส่การ์ดใบนี้เข้ากองแล้วสับเด็คทันที"
              >
                <span className="text-sm">🔀</span>
                <span>สับเข้ากอง</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              Sound.playCardFlip();
              onPutPrizes();
              onClose();
            }}
            className="col-span-2 py-2 px-3 rounded-xl bg-amber-950/50 hover:bg-amber-900/70 border border-amber-500/30 text-amber-200 text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>🏆</span> คว่ำไว้ในการ์ดรางวัล (Prize Pool)
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};
