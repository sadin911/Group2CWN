import React from 'react';
import type { TabletopConsentRequest } from './types';
import { Sound } from '../../engine/pixi/SoundEffects';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { getCardDisplayName } from '../../utils/pokemonThaiTranslator';

interface TabletopConsentModalProps {
  pendingConsent?: TabletopConsentRequest | null;
  myRole: 'player1' | 'player2' | 'both' | 'spectator';
  isOnline: boolean;
  isGameStarted?: boolean;
  onApprove: () => void;
  onDeny: () => void;
  onCancel: () => void;
}

export const TabletopConsentModal: React.FC<TabletopConsentModalProps> = ({
  pendingConsent,
  myRole,
  isOnline,
  isGameStarted,
  onApprove,
  onDeny,
  onCancel,
}) => {
  const isCriticalAction =
    pendingConsent?.actionType === 'START_GAME' || pendingConsent?.actionType === 'REMATCH';
  const isShuffleDeck =
    pendingConsent?.actionType === 'SHUFFLE_DECK' || pendingConsent?.actionType === 'CUT_DECK';
  const initialDuration = isShuffleDeck ? 5 : 3;

  const [secondsLeft, setSecondsLeft] = React.useState(initialDuration);
  const onApproveRef = React.useRef(onApprove);
  onApproveRef.current = onApprove;

  const hasRespondedRef = React.useRef(false);
  const consentId = pendingConsent?.id;

  React.useEffect(() => {
    hasRespondedRef.current = false;
  }, [consentId]);

  const handleApprove = React.useCallback(() => {
    if (hasRespondedRef.current) return;
    hasRespondedRef.current = true;
    Sound.playAttack();
    onApprove();
  }, [onApprove]);

  const handleDeny = React.useCallback(() => {
    if (hasRespondedRef.current) return;
    hasRespondedRef.current = true;
    Sound.playCardPlacement();
    onDeny();
  }, [onDeny]);

  const handleCancel = React.useCallback(() => {
    if (hasRespondedRef.current) return;
    hasRespondedRef.current = true;
    Sound.playCardPlacement();
    onCancel();
  }, [onCancel]);

  React.useEffect(() => {
    if (!consentId || isCriticalAction) return;
    setSecondsLeft(initialDuration);
    hasRespondedRef.current = false;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!hasRespondedRef.current) {
            hasRespondedRef.current = true;
            onApproveRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [consentId, isCriticalAction, initialDuration]);

  if (!pendingConsent || hasRespondedRef.current) return null;
  if (isGameStarted && pendingConsent.actionType === 'START_GAME') return null;

  const isRequester = isOnline && myRole === pendingConsent.requesterSide;
  const isStartGame = pendingConsent.actionType === 'START_GAME';
  const isRematch = pendingConsent.actionType === 'REMATCH';
  const isSwitchPokemon = pendingConsent.actionType === 'SWITCH_POKEMON';
  const isDiscardEnergy = pendingConsent.actionType === 'DISCARD_ENERGY';

  return (
    <div
      id="tabletop-consent-modal"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none"
    >
      <div
        className={`relative w-full max-w-md bg-slate-900/98 border-2 rounded-3xl shadow-2xl p-6 text-white flex flex-col items-center gap-4 text-center overflow-hidden ${
          isStartGame
            ? 'border-emerald-400/80 shadow-emerald-950/60'
            : isRematch
            ? 'border-indigo-400/80 shadow-indigo-950/60'
            : isShuffleDeck
            ? 'border-teal-400/80 shadow-teal-950/60'
            : isSwitchPokemon
            ? 'border-amber-400/80 shadow-amber-950/60'
            : isDiscardEnergy
            ? 'border-rose-400/80 shadow-rose-950/60'
            : 'border-amber-400/70 shadow-amber-950/60'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Countdown Progress Bar (for standard & shuffle actions) */}
        {!isCriticalAction && (
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${
                isShuffleDeck
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-400'
                  : isDiscardEnergy
                  ? 'bg-gradient-to-r from-rose-500 to-amber-400'
                  : 'bg-gradient-to-r from-amber-400 to-emerald-400'
              }`}
              style={{ width: `${(secondsLeft / initialDuration) * 100}%` }}
            />
          </div>
        )}

        {/* Header Icon */}
        <div
          className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl shadow-inner ${
            isStartGame
              ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-300 animate-bounce'
              : isRematch
              ? 'bg-indigo-950/80 border-indigo-400/60 text-indigo-300'
              : isShuffleDeck
              ? 'bg-teal-950/80 border-teal-400/60 text-teal-300 animate-pulse'
              : isSwitchPokemon
              ? 'bg-amber-950/80 border-amber-400/60 text-amber-300 animate-bounce'
              : isDiscardEnergy
              ? 'bg-rose-950/80 border-rose-400/60 text-rose-300 animate-pulse'
              : 'bg-amber-950/70 border-amber-400/50 text-amber-300 animate-bounce'
          }`}
        >
          {isStartGame ? '🎮' : isRematch ? '🔄' : isShuffleDeck ? '🔀' : isSwitchPokemon ? '🔄' : isDiscardEnergy ? '💥' : isRequester ? '⏳' : '🤝'}
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-black tracking-tight">
            {isStartGame ? (
              isRequester ? (
                <span className="text-emerald-300">พร้อมเริ่มการแข่งขัน (Let's Play!)</span>
              ) : (
                <span className="text-emerald-300">ฝ่ายตรงข้ามกด Let's Play แล้ว!</span>
              )
            ) : isRematch ? (
              isRequester ? (
                <span className="text-indigo-300">ส่งคำขอเริ่มเกมใหม่ (Rematch)</span>
              ) : (
                <span className="text-indigo-300">ฝ่ายตรงข้ามขอเริ่มเกมใหม่ (Rematch)</span>
              )
            ) : isShuffleDeck ? (
              isRequester ? (
                <span className="text-teal-300">รอฝ่ายตรงข้ามเลือกสับเด็ค</span>
              ) : (
                <span className="text-teal-300">
                  คู่ต่อสู้ค้นหาสำรับเสร็จแล้ว
                  <span className="block text-xs font-semibold text-amber-300/90 mt-0.5">
                    คำขอความยินยอม (Consent Request)
                  </span>
                </span>
              )
            ) : isSwitchPokemon ? (
              isRequester ? (
                <span className="text-amber-300">ขอสลับตำแหน่งโปเกมอนของคู่ต่อสู้ (คำสั่งของบอส)</span>
              ) : (
                <span className="text-amber-300">คำขอสลับตำแหน่งโปเกมอน (คำสั่งของบอส / Gust)</span>
              )
            ) : isDiscardEnergy ? (
              isRequester ? (
                <span className="text-rose-300">ขอถอดพลังงานของฝ่ายตรงข้าม</span>
              ) : (
                <span className="text-rose-300">คำขอถอดพลังงานโปเกมอนลงสุสาน</span>
              )
            ) : isRequester ? (
              <span className="text-amber-300">กำลังรอการยินยอม</span>
            ) : (
              <span className="text-amber-300">คำขอความยินยอม (Consent Request)</span>
            )}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isStartGame ? (
              isRequester ? (
                <span>คุณกดพร้อมเริ่มเกมแล้ว กำลังรอให้ฝ่ายตรงข้ามกดยืนยันเพื่อเริ่มเกมพร้อมกัน...</span>
              ) : (
                <span>
                  <strong className="text-emerald-400">{pendingConsent.requesterName}</strong>{' '}
                  พร้อมเริ่มการแข่งขันแล้ว คุณพร้อมเริ่มการแข่งขันพร้อมกันหรือไม่?
                </span>
              )
            ) : isRematch ? (
              isRequester ? (
                <span>ส่งคำขอเริ่มเกมใหม่ไปยังฝ่ายตรงข้ามแล้ว รอฝ่ายตรงข้ามยอมรับเพื่อเลือกเด็คใหม่พร้อมกัน...</span>
              ) : (
                <span>
                  <strong className="text-indigo-400">{pendingConsent.requesterName}</strong>{' '}
                  ต้องการเริ่มเกมใหม่และเลือกเด็คใหม่พร้อมกัน คุณยินยอมหรือไม่?
                </span>
              )
            ) : isShuffleDeck ? (
              isRequester ? (
                <span>คุณค้นหาสำรับเสร็จแล้ว รอให้อีกฝ่ายเลือกว่าจะสับเด็คหรือไม่ (อนุมัติอัตโนมัติใน {secondsLeft}s)</span>
              ) : (
                <span>
                  <strong className="text-teal-300">{pendingConsent.requesterName}</strong>{' '}
                  ค้นหาสำรับเสร็จสิ้น ต้องการให้ระบบสับ/ตัดเด็คหรือไม่? (อนุมัติอัตโนมัติใน {secondsLeft}s)
                </span>
              )
            ) : isSwitchPokemon ? (
              isRequester ? (
                <span>ส่งคำขอสลับตำแหน่งโปเกมอนไปยังฝ่ายตรงข้ามแล้ว (อนุมัติอัตโนมัติใน {secondsLeft}s)</span>
              ) : (
                <span>
                  <strong className="text-amber-400">{pendingConsent.requesterName}</strong>{' '}
                  ขอสลับตำแหน่งโปเกมอนของคุณ (คำสั่งของบอส / Gust) (อนุมัติอัตโนมัติใน {secondsLeft}s):
                </span>
              )
            ) : isDiscardEnergy ? (
              isRequester ? (
                <span>ส่งคำขอถอดพลังงานของฝ่ายตรงข้ามแล้ว (อนุมัติอัตโนมัติใน {secondsLeft}s)</span>
              ) : (
                <span>
                  <strong className="text-rose-400">{pendingConsent.requesterName}</strong>{' '}
                  ขอถอดพลังงาน {pendingConsent.payload?.energyType ? `[${pendingConsent.payload.energyType}]` : ''} ออกจากโปเกมอนของคุณลงสุสาน (อนุมัติอัตโนมัติใน {secondsLeft}s):
                </span>
              )
            ) : isRequester ? (
              <span>ส่งคำขอไปยังฝ่ายตรงข้ามแล้ว (อนุมัติอัตโนมัติใน {secondsLeft}s)</span>
            ) : (
              <span>
                <strong className="text-amber-400">{pendingConsent.requesterName}</strong>{' '}
                ต้องการดำเนินการสำคัญ (อนุมัติอัตโนมัติใน {secondsLeft}s):
              </span>
            )}
          </p>
        </div>

        {/* Revealed Cards / Target Card (if any) */}
        {((pendingConsent.revealedCards && pendingConsent.revealedCards.length > 0) ||
          pendingConsent.revealedCard) && (
          <div
            id="consent-revealed-cards-box"
            className="w-full bg-slate-950/95 border-2 border-amber-400/60 rounded-2xl p-3.5 flex flex-col items-center gap-2.5 shadow-xl shadow-amber-950/40 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
              <span className="text-sm">👁️</span>
              <span>
                {isSwitchPokemon
                  ? 'โปเกมอนเป้าหมายที่จะสลับตำแหน่ง'
                  : isDiscardEnergy
                  ? 'โปเกมอนเป้าหมายที่จะถูกถอดพลังงาน'
                  : isRequester
                  ? `การ์ดที่คุณค้นหาและเลือกจากเด็ค (${(pendingConsent.revealedCards || [pendingConsent.revealedCard]).length} ใบ)`
                  : `การ์ดที่คู่แข่งค้นหาและเลือกจากเด็ค (${(pendingConsent.revealedCards || [pendingConsent.revealedCard]).length} ใบ)`}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap max-h-56 overflow-y-auto p-1 w-full">
              {(pendingConsent.revealedCards || [pendingConsent.revealedCard])
                .filter(Boolean)
                .map((card: any, idx: number) => {
                  const cardImg = resolveCardImageUrl(card, true);
                  const cardName = getCardDisplayName(card);
                  return (
                    <div key={card.instanceId || idx} className="flex flex-col items-center gap-1 group">
                      <div className="relative w-20 sm:w-24 aspect-[63/88] rounded-xl overflow-hidden shadow-xl border-2 border-amber-400/80 bg-slate-900 transition-transform duration-150 group-hover:scale-105">
                        <img
                          src={cardImg}
                          alt={cardName}
                          onError={(e) => handleCardImageError(e, card)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[10px] font-black text-amber-200 max-w-[96px] truncate text-center">
                        {cardName}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Request Details Box */}
        <div className="w-full p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col gap-1.5 shadow-inner">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            รายละเอียดการกระทำ
          </span>
          <p className="text-sm font-black text-white">{pendingConsent.description}</p>
        </div>

        {/* Action Buttons */}
        {isRequester ? (
          <div className="w-full flex justify-center pt-2">
            <button
              id="btn-consent-cancel"
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/20 text-xs font-bold text-slate-300 hover:text-white transition-all active:scale-95 shadow cursor-pointer"
            >
              ✕ ยกเลิกคำขอ
            </button>
          </div>
        ) : (
          <div className="w-full grid grid-cols-2 gap-3 pt-2">
            <button
              id="btn-consent-deny"
              type="button"
              onClick={handleDeny}
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-rose-500/40 text-rose-300 hover:text-rose-200 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{isShuffleDeck ? '⏩' : '❌'}</span>
              <span>{isStartGame ? 'ยังไม่พร้อม' : isRematch ? 'ปฏิเสธ' : isShuffleDeck ? 'ไม่สับ (Skip)' : 'ปฏิเสธ (Deny)'}</span>
            </button>

            <button
              id="btn-consent-approve"
              type="button"
              onClick={handleApprove}
              className={`py-3 rounded-xl text-white font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 animate-pulse ${
                isStartGame
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 border border-emerald-300 shadow-emerald-950/70'
                  : isRematch
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border border-indigo-300 shadow-indigo-950/70'
                  : isShuffleDeck
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 border border-teal-400/60 shadow-teal-950/70'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/50 shadow-emerald-950/60'
              }`}
            >
              <span>{isShuffleDeck ? '🔀' : '✅'}</span>
              <span>
                {isStartGame
                  ? '✨ ตกลง / พร้อมเริ่มเกม'
                  : isRematch
                  ? 'ตกลง เริ่มเกมใหม่'
                  : isShuffleDeck
                  ? `สับเด็ค (Shuffle) (${secondsLeft}s)`
                  : isSwitchPokemon
                  ? `ยินยอมสลับตัว (${secondsLeft}s)`
                  : `ยินยอม (Approve) (${secondsLeft}s)`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
