import React from 'react';
import type { CardInstance } from '../../engine/types';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { Sound } from '../../engine/pixi/SoundEffects';
import { getCardDisplayName } from '../../utils/pokemonThaiTranslator';

export function isBasicPokemonCard(card: CardInstance): boolean {
  if (card.supertype !== 'Pokemon') return false;
  if (card.subtypes?.some((s) => s.toLowerCase() === 'basic')) return true;
  if (card.evolvesFrom) return false;
  const isEvolution = card.subtypes?.some((s) => {
    const lower = s.toLowerCase();
    return (
      lower.includes('stage 1') ||
      lower.includes('stage 2') ||
      lower.includes('stage1') ||
      lower.includes('stage2') ||
      lower.includes('vstar') ||
      lower.includes('vmax') ||
      lower.includes('break')
    );
  });
  if (isEvolution) return false;
  return true;
}

interface MulliganCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  handCards: CardInstance[];
  playerName: string;
  playerSide: 'player1' | 'player2';
  isReviewer?: boolean;
  mulliganStatus?: 'PENDING' | 'CONFIRMED' | 'DISMISSED';
  onConfirmMulligan: () => void;
  onClaimBonusDraw?: () => void;
}

export const MulliganCheckModal: React.FC<MulliganCheckModalProps> = ({
  isOpen,
  onClose,
  handCards,
  playerName,
  playerSide,
  isReviewer = false,
  mulliganStatus = 'PENDING',
  onConfirmMulligan,
  onClaimBonusDraw,
}) => {
  if (!isOpen) return null;

  const basicCards = handCards.filter(isBasicPokemonCard);
  const hasBasic = basicCards.length > 0;

  return (
    <div
      id="mulligan-verification-modal"
      data-testid="mulligan-verification-modal"
      data-has-basic={hasBasic ? 'true' : 'false'}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-950 border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🔄</span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>{isReviewer ? 'ตรวจสอบมัลลิแกนของคู่แข่ง (Mulligan Inspection)' : 'ตรวจสอบสิทธิ์มัลลิแกน (Mulligan Proof)'}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    playerSide === 'player1'
                      ? 'bg-blue-950/80 text-blue-300 border-blue-400/40'
                      : 'bg-rose-950/80 text-rose-300 border-rose-400/40'
                  }`}
                >
                  {playerName}
                </span>
                {isReviewer && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    ฝ่ายตรงข้าม (คุณคือผู้ตรวจสอบ)
                  </span>
                )}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                {isReviewer
                  ? `คู่แข่งเปิดเผยการ์ดบนมือทั้งหมด ${handCards.length} ใบเพื่อยืนยันว่าไม่มี Basic Pokémon จริง`
                  : 'เปิดเผยการ์ดบนมือให้คู่แข่งร่วมตรวจสอบว่าไม่มีโปเกมอนร่างแรก (Basic Pokémon) จริงๆ'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-mulligan-modal"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Verification Status Banner */}
        <div className="p-3 sm:p-4">
          {hasBasic ? (
            <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-rose-950/90 via-red-950/80 to-slate-950 border-2 border-rose-500/80 shadow-lg shadow-rose-950/50">
              <span className="text-2xl sm:text-3xl flex-shrink-0">🚫</span>
              <div className="flex-1">
                <h3 className="text-xs sm:text-sm font-black text-rose-200 flex items-center gap-1.5">
                  <span>{isReviewer ? 'ตรวจพบ Basic Pokémon บนมือคู่แข่ง — ไม่อนุญาตให้มัลลิแกน!' : 'ตรวจพบ Basic Pokémon บนมือ — ไม่อนุญาตให้มัลลิแกน!'}</span>
                  <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px]">
                    พบ {basicCards.length} ใบ
                  </span>
                </h3>
                <p className="text-[11px] text-rose-300/90 mt-1 leading-relaxed">
                  ตามกฎการแข่งสากลของ Pokémon TCG หากผู้เล่นมีการ์ด <strong>Basic Pokémon</strong>{' '}
                  อย่างน้อย 1 ใบในมือเริ่มต้น จะ<strong>ไม่สามารถขอมัลลิแกนได้ (กันมั่วนิ่ม)</strong>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-slate-950 border-2 border-emerald-400/80 shadow-lg shadow-emerald-950/50">
              <span className="text-2xl sm:text-3xl flex-shrink-0">✅</span>
              <div className="flex-1">
                <h3 className="text-xs sm:text-sm font-black text-emerald-200 flex items-center gap-1.5">
                  <span>
                    {isReviewer
                      ? `ผ่านการตรวจสอบ: ${playerName} ไม่มี Basic Pokémon บนมือ (0/${handCards.length} ใบ)`
                      : `ผ่านการตรวจสอบ: ไม่มี Basic Pokémon บนมือ (0/${handCards.length} ใบ)`}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[10px]">
                    มัลลิแกนได้ถูกต้อง
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-300/90 mt-1 leading-relaxed">
                  {isReviewer
                    ? `คู่แข่งสับการ์ดเข้ากองและจั่วใหม่แล้ว ตามกฎการแข่งสากลคุณมีสิทธิ์รับการ์ดโบนัส 1 ใบเข้ามือคุณ!`
                    : `คู่แข่งสามารถตรวจสอบการ์ดทั้ง ${handCards.length} ใบด้านล่างได้ชัดเจน เมื่อกดยืนยันจะสับการ์ดเข้ากองและจั่วใหม่ 7 ใบ`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Hand Cards Gallery (Proof Display) */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>🎴</span>
              <span>การ์ดบนมือทั้งหมด ({handCards.length} ใบ):</span>
            </span>
            <span className="text-[10px] text-slate-400">
              {hasBasic ? (
                <span className="text-rose-400 font-bold">⚠️ กรอบแดงคือ Basic Pokémon</span>
              ) : (
                <span className="text-emerald-400 font-bold">✓ ทั้งหมดเป็น Trainer / Energy / Evolution</span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
            {handCards.map((card, idx) => {
              const isBasic = isBasicPokemonCard(card);
              const imageUrl = resolveCardImageUrl(card);
              const cardName = getCardDisplayName(card);

              return (
                <div
                  key={card.instanceId || idx}
                  data-mulligan-card={card.instanceId || idx}
                  data-is-basic={isBasic ? 'true' : 'false'}
                  className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all ${
                    isBasic
                      ? 'border-2 border-rose-500 ring-4 ring-rose-500/50 bg-rose-950/40 shadow-xl shadow-rose-950/70 scale-102 animate-pulse'
                      : 'border-white/20 bg-slate-900 shadow-md'
                  }`}
                >
                  <div className="relative aspect-[63/88] w-full bg-slate-950">
                    <img
                      src={imageUrl}
                      alt={cardName}
                      className="w-full h-full object-cover"
                      loading="eager"
                      onError={(e) => handleCardImageError(e, card)}
                    />
                    {isBasic && (
                      <div className="absolute top-1 inset-x-1 flex items-center justify-center">
                        <span className="px-1 py-0.2 rounded bg-rose-600 text-white font-black text-[7.5px] sm:text-[8.5px] tracking-tight shadow border border-rose-300">
                          ⚠️ เป็น Basic!
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Type Tag */}
                  <div className="p-1 flex flex-col gap-0.5 bg-slate-950/90 text-center">
                    <span className="text-[8px] sm:text-[9px] font-bold text-slate-200 truncate">
                      {cardName}
                    </span>
                    <span
                      className={`text-[7px] sm:text-[8px] font-semibold px-1 py-0.2 rounded-full ${
                        isBasic
                          ? 'bg-rose-900/80 text-rose-200'
                          : card.supertype === 'Trainer'
                          ? 'bg-purple-900/80 text-purple-200'
                          : card.supertype === 'Energy'
                          ? 'bg-amber-900/80 text-amber-200'
                          : 'bg-blue-900/80 text-blue-200'
                      }`}
                    >
                      {isBasic
                        ? 'Basic Pokémon'
                        : card.supertype === 'Pokemon'
                        ? card.subtypes?.find((s) => s.toLowerCase().includes('stage')) || 'Evolution'
                        : card.supertype}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          {isReviewer ? (
            <>
              <button
                id="btn-cancel-mulligan"
                type="button"
                onClick={onClose}
                className="px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/15 transition-all active:scale-95 cursor-pointer"
              >
                ✕ ข้าม / ปิด (ไม่รับสิทธิ์จั่วโบนัส)
              </button>

              {!hasBasic && onClaimBonusDraw && (
                <button
                  id="btn-mulligan-bonus-draw"
                  type="button"
                  onClick={() => {
                    Sound.playCardFlip();
                    onClaimBonusDraw();
                    onClose();
                  }}
                  className="px-4 sm:px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs sm:text-sm font-black shadow-xl shadow-amber-950/60 border border-amber-300/60 transition-all active:scale-95 animate-pulse cursor-pointer flex items-center gap-1.5"
                >
                  <span>🎁</span>
                  <span>รับสิทธิ์จั่วการ์ดโบนัส 1 ใบ (+1 Draw)</span>
                </button>
              )}
            </>
          ) : mulliganStatus === 'CONFIRMED' ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <span>✓</span> สับการ์ดและจั่วใหม่ 7 ใบแล้ว (รอคู่แข่งตรวจสอบและตัดสินใจจั่วโบนัส)
              </span>
              <button
                id="btn-close-mulligan-confirmed"
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/15 transition-all cursor-pointer"
              >
                ✕ ปิดหน้าต่าง
              </button>
            </div>
          ) : (
            <>
              <button
                id="btn-cancel-mulligan"
                type="button"
                onClick={onClose}
                className="px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/15 transition-all active:scale-95 cursor-pointer"
              >
                ✕ {hasBasic ? 'รับทราบและกลับไปจัดสนาม' : 'ยกเลิก'}
              </button>

              <div className="flex items-center gap-2">
                {hasBasic ? (
                  <button
                    id="btn-force-mulligan"
                    type="button"
                    onClick={() => {
                      Sound.playShuffle();
                      onConfirmMulligan();
                      onClose();
                    }}
                    className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-700 to-rose-700 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-black shadow-lg border border-amber-400/40 transition-all active:scale-95 cursor-pointer"
                    title="โหมดฝึกซ้อมคนเดียว: ฝืนสับการ์ดแม้จะมี Basic Pokémon"
                  >
                    <span>⚠️</span> ฝืนมัลลิแกน (โหมดทดสอบ/ซ้อมคนเดียว)
                  </button>
                ) : (
                  <button
                    id="btn-confirm-mulligan"
                    type="button"
                    onClick={() => {
                      Sound.playShuffle();
                      onConfirmMulligan();
                      onClose();
                    }}
                    className="px-4 sm:px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white text-xs sm:text-sm font-black shadow-xl shadow-emerald-950/60 border border-emerald-300/50 transition-all active:scale-95 animate-pulse cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🔀</span> ยืนยันสับเข้ากองและจั่วใหม่ 7 ใบ
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
