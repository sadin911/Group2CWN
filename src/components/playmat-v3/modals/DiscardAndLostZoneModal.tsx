import React, { useState } from 'react';
import type { CardInstance, PokemonInPlay } from '../../../engine/types';
import { resolveCardImageUrl, handleCardImageError } from '../../../utils/cardImage';
import { Sound } from '../../../engine/pixi/SoundEffects';
import { getCardDisplayName } from '../../../utils/pokemonThaiTranslator';

interface DiscardAndLostZoneModalProps {
  discard: CardInstance[];
  lostZone: CardInstance[];
  playerActive?: PokemonInPlay | null;
  onClose: () => void;
  onMoveCard: (
    cardInstanceId: string,
    fromZone: 'DISCARD' | 'LOST_ZONE',
    toZone: 'HAND' | 'DECK' | 'BENCH' | 'LOST_ZONE',
    options?: { attachToPokemonId?: string }
  ) => void;
}

export const DiscardAndLostZoneModal: React.FC<DiscardAndLostZoneModalProps> = ({
  discard,
  lostZone,
  playerActive,
  onClose,
  onMoveCard,
}) => {
  void playerActive;
  const [activeTab, setActiveTab] = useState<'DISCARD' | 'LOST_ZONE'>('DISCARD');
  const [searchQuery, setSearchQuery] = useState('');

  const currentList = activeTab === 'DISCARD' ? discard : lostZone;
  const filteredList = currentList.filter((c) => {
    const cardName = getCardDisplayName(c);
    const searchLower = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      cardName.toLowerCase().includes(searchLower) ||
      (c.nameEn && c.nameEn.toLowerCase().includes(searchLower)) ||
      (c.cardCode && c.cardCode.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md"
      style={{ touchAction: 'auto' }}
    >
      <div
        id="discard-lost-modal"
        className="relative w-full max-w-4xl max-h-[88dvh] bg-slate-900/95 border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col text-white overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3.5 border-b border-white/10 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">{activeTab === 'DISCARD' ? '🪦' : '🌀'}</span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black tracking-tight truncate">
                {activeTab === 'DISCARD' ? 'สุสานการ์ด (Discard Pile)' : 'โซนสาบสูญ (Lost Zone)'}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                จำนวนการ์ดทั้งหมด: <span className="font-bold text-sky-400 font-mono">{currentList.length} ใบ</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 font-bold"
            title="ปิด"
          >
            ✕
          </button>
        </div>

        {/* Tab & Search Controls */}
        <div className="px-3 py-2 bg-slate-950/50 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setActiveTab('DISCARD')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'DISCARD'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <span>🪦 สุสาน</span>
              <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full font-mono">
                {discard.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('LOST_ZONE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'LOST_ZONE'
                  ? 'bg-purple-900 text-purple-200 border border-purple-500/50 shadow-md shadow-purple-950'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <span>🌀 Lost Zone</span>
              <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full font-mono text-purple-300">
                {lostZone.length}
              </span>
            </button>
          </div>

          <input
            type="text"
            placeholder="ค้นหาชื่อการ์ด..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-2.5 py-1 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 flex-1 sm:flex-initial sm:w-48"
          />
        </div>

        {/* Cards Grid */}
        <div
          className="flex-1 p-2.5 sm:p-4 overflow-y-auto overscroll-contain min-h-[200px] pb-[max(env(safe-area-inset-bottom),0.75rem)]"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          {filteredList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
              <span className="text-4xl mb-2">📭</span>
              <p className="text-sm">ไม่มีการ์ดในโซนนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3">
              {filteredList.map((card) => {
                const cardName = getCardDisplayName(card);
                return (
                  <div
                    key={card.instanceId}
                    className="flex flex-col gap-1.5 p-2 rounded-2xl bg-slate-800/40 border border-slate-700/60 shadow-md"
                  >
                    <div className="aspect-[63/88] rounded-xl overflow-hidden bg-slate-950">
                      <img
                        src={resolveCardImageUrl(card)}
                        alt={cardName}
                        className="w-full h-full object-cover"
                        onError={(e) => handleCardImageError(e, card)}
                      />
                    </div>
                    <div className="text-[11px] font-bold truncate text-slate-200 px-0.5">
                      {cardName}
                    </div>

                  {/* Actions for Discard cards */}
                  {activeTab === 'DISCARD' && (
                    <div className="flex flex-wrap gap-1 mt-auto">
                      <button
                        onClick={() => {
                          Sound.playCardFlip();
                          onMoveCard(card.instanceId, 'DISCARD', 'HAND');
                        }}
                        className="flex-1 py-1 bg-sky-600 hover:bg-sky-500 rounded-lg text-[10px] font-bold text-white transition active:scale-95 cursor-pointer"
                      >
                        ขึ้นมือ
                      </button>
                      <button
                        onClick={() => {
                          Sound.playCardFlip();
                          onMoveCard(card.instanceId, 'DISCARD', 'DECK');
                        }}
                        className="py-1 px-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-semibold text-slate-200 transition active:scale-95 cursor-pointer"
                      >
                        เข้ากอง
                      </button>
                      <button
                        onClick={() => {
                          Sound.playCardFlip();
                          onMoveCard(card.instanceId, 'DISCARD', 'LOST_ZONE');
                        }}
                        className="py-1 px-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-500/40 rounded-lg text-[10px] font-bold text-purple-200 transition active:scale-95 cursor-pointer"
                      >
                        Lost Zone
                      </button>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
