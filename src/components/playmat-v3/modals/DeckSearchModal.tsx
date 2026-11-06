import React, { useState, useMemo } from 'react';
import type { CardInstance, PokemonInPlay } from '../../../engine/types';
import { resolveCardImageUrl, handleCardImageError } from '../../../utils/cardImage';
import { Sound } from '../../../engine/pixi/SoundEffects';
import {
  translateSupertype,
  translateSubtypes,
  getCardDisplayName,
} from '../../../utils/pokemonThaiTranslator';

interface DeckSearchModalProps {
  deck: CardInstance[];
  playerActive: PokemonInPlay | any | null;
  playerBench: (PokemonInPlay | any | null)[];
  onClose: (revealedCards?: CardInstance[]) => void;
  onMoveCard: (
    cardInstanceId: string,
    toZone: 'HAND' | 'BENCH' | 'ACTIVE' | 'DISCARD' | 'LOST_ZONE' | 'DECK',
    options?: {
      deckPosition?: 'TOP' | 'BOTTOM';
      attachToPokemonId?: string;
      shuffleDeck?: boolean;
      facedown?: boolean;
      revealToOpponent?: boolean;
    }
  ) => void;
  onMoveCards?: (
    cardInstanceIds: string[],
    toZone: 'HAND' | 'BENCH' | 'ACTIVE' | 'DISCARD' | 'LOST_ZONE' | 'DECK',
    options?: {
      deckPosition?: 'TOP' | 'BOTTOM';
      attachToPokemonId?: string;
      shuffleDeck?: boolean;
      facedown?: boolean;
      revealToOpponent?: boolean;
    }
  ) => void;
  onShuffleDeck?: () => void;
}

export const DeckSearchModal: React.FC<DeckSearchModalProps> = ({
  deck = [],
  playerActive,
  playerBench = [],
  onClose,
  onMoveCard,
  onMoveCards,
  onShuffleDeck,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'BASIC' | 'EVO' | 'TRAINER' | 'STADIUM' | 'ENERGY'>('ALL');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [shouldShuffle, setShouldShuffle] = useState(true);
  const [revealToOpponent, setRevealToOpponent] = useState(true);

  const filteredDeck = useMemo(() => {
    return (deck || []).filter((card) => {
      const cardName = getCardDisplayName(card);
      const matchQuery =
        !searchQuery ||
        cardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (card.nameEn && card.nameEn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (card.cardCode && card.cardCode.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchQuery) return false;

      if (activeCategory === 'BASIC') {
        return card.supertype === 'Pokemon' && card.subtypes.includes('Basic');
      }
      if (activeCategory === 'EVO') {
        return card.supertype === 'Pokemon' && !card.subtypes.includes('Basic');
      }
      if (activeCategory === 'TRAINER') {
        return card.supertype === 'Trainer';
      }
      if (activeCategory === 'STADIUM') {
        return (
          card.supertype === 'Trainer' &&
          (card.subtypes.includes('Stadium') ||
            (card.nameEn && card.nameEn.toLowerCase().includes('stadium')) ||
            (card.nameTh && card.nameTh.includes('สเตเดียม')))
        );
      }
      if (activeCategory === 'ENERGY') {
        return card.supertype === 'Energy';
      }
      return true;
    });
  }, [deck, searchQuery, activeCategory]);

  const selectedCards = useMemo(
    () => (deck || []).filter((c) => selectedCardIds.includes(c.instanceId)),
    [deck, selectedCardIds]
  );
  const singleSelectedCard = selectedCards.length === 1 ? selectedCards[0] : null;

  const toggleSelectCard = (id: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredDeck.map((c) => c.instanceId);
    setSelectedCardIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
  };

  const handleClearSelection = () => {
    setSelectedCardIds([]);
  };

  const handleAction = (
    toZone: 'HAND' | 'BENCH' | 'ACTIVE' | 'DISCARD' | 'LOST_ZONE' | 'DECK',
    options?: { deckPosition?: 'TOP' | 'BOTTOM'; attachToPokemonId?: string; facedown?: boolean; revealToOpponent?: boolean }
  ) => {
    if (selectedCardIds.length === 0) return;
    Sound.playCardPlacement();

    if (onMoveCards) {
      onMoveCards(selectedCardIds, toZone, {
        ...options,
        shuffleDeck: shouldShuffle,
        revealToOpponent,
      });
    } else {
      selectedCardIds.forEach((id, idx) => {
        onMoveCard(id, toZone, {
          ...options,
          shuffleDeck: shouldShuffle && idx === selectedCardIds.length - 1,
          revealToOpponent,
        });
      });
    }

    const cardsToPass = revealToOpponent ? selectedCards : [];
    setSelectedCardIds([]);
    onClose(cardsToPass);
  };

  const emptyBenchCount = Math.max(0, 5 - (playerBench || []).filter(Boolean).length);
  const allSelectedArePokemon = selectedCards.length > 0 && selectedCards.every((c) => c.supertype === 'Pokemon');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-black/80 backdrop-blur-md"
      style={{ touchAction: 'auto' }}
    >
      <div
        id="deck-search-modal"
        className="relative w-full max-w-4xl h-[90dvh] max-h-[90dvh] bg-slate-900/95 border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col text-white overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3.5 border-b border-white/10 bg-slate-950/90 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl sm:text-2xl shrink-0">🔍</span>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-black tracking-tight truncate">ค้นหาในกองสำรับ (Search Deck)</h2>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                  คงเหลือ: <span className="font-bold text-sky-400 font-mono">{(deck || []).length} ใบ</span>
                  {selectedCardIds.length > 0 && (
                    <span className="ml-1.5 font-bold text-emerald-400 font-mono">
                      (เลือกแล้ว {selectedCardIds.length})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              id="btn-deck-search-close"
              onClick={() => onClose([])}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 font-bold"
              title="ปิด"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <label className="flex items-center gap-1.5 text-[11px] sm:text-xs text-amber-300 font-bold select-none cursor-pointer bg-amber-950/60 hover:bg-amber-950/90 px-2 py-0.5 sm:py-1 rounded-lg border border-amber-500/40 transition">
              <input
                id="checkbox-reveal-opponent"
                type="checkbox"
                checked={revealToOpponent}
                onChange={(e) => setRevealToOpponent(e.target.checked)}
                className="rounded bg-slate-800 border-amber-500 text-amber-400 focus:ring-amber-400"
              />
              <span>👁️ โชว์ใบที่เลือก</span>
            </label>

            <label className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-300 select-none cursor-pointer bg-slate-800/60 px-2 py-0.5 sm:py-1 rounded-lg border border-white/5">
              <input
                type="checkbox"
                checked={shouldShuffle}
                onChange={(e) => setShouldShuffle(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500"
              />
              <span>สับเด็คหลังค้นหา</span>
            </label>

            {onShuffleDeck && (
              <button
                id="btn-deck-search-shuffle"
                onClick={() => {
                  Sound.playShuffle();
                  onShuffleDeck();
                }}
                className="px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition active:scale-95"
                title="สับกองการ์ด"
              >
                🔀 สับเด็ค
              </button>
            )}
          </div>
        </div>

        {/* Filters & Multi-Select Toolbar */}
        <div className="px-3 py-2 bg-slate-950/50 border-b border-white/10 flex flex-col gap-2 shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-xs">
            {(['ALL', 'BASIC', 'EVO', 'TRAINER', 'STADIUM', 'ENERGY'] as const).map((cat) => (
              <button
                key={cat}
                id={`btn-deck-category-${cat.toLowerCase()}`}
                aria-label={
                  cat === 'ALL'
                    ? 'All'
                    : cat === 'BASIC'
                    ? 'Basic Pokémon'
                    : cat === 'EVO'
                    ? 'Evolution Pokémon'
                    : cat === 'TRAINER'
                    ? 'Trainer'
                    : cat === 'STADIUM'
                    ? 'Stadium'
                    : 'Energy'
                }
                title={
                  cat === 'ALL'
                    ? 'All'
                    : cat === 'BASIC'
                    ? 'Basic Pokémon'
                    : cat === 'EVO'
                    ? 'Evolution Pokémon'
                    : cat === 'TRAINER'
                    ? 'Trainer'
                    : cat === 'STADIUM'
                    ? 'Stadium'
                    : 'Energy'
                }
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition shrink-0 ${
                  activeCategory === cat
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-950'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {cat === 'ALL' && 'ทั้งหมด'}
                {cat === 'BASIC' && 'โปเกมอนพื้นฐาน'}
                {cat === 'EVO' && 'วิวัฒนาการ'}
                {cat === 'TRAINER' && 'เทรนเนอร์'}
                {cat === 'STADIUM' && 'สเตเดียม'}
                {cat === 'ENERGY' && 'พลังงาน'}
              </button>
            ))}
          </div>

          {/* Quick Multi-Select Controls & Search */}
          <div className="flex items-center gap-1.5">
            <button
              id="btn-deck-select-all"
              type="button"
              onClick={handleSelectAllFiltered}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-[11px] text-sky-300 font-semibold transition whitespace-nowrap shrink-0 active:scale-95"
              title="เลือกการ์ดทั้งหมดตามตัวกรองปัจจุบัน"
            >
              ☑️ ทั้งหมด ({filteredDeck.length})
            </button>

            {selectedCardIds.length > 0 && (
              <button
                id="btn-deck-clear-selection"
                type="button"
                onClick={handleClearSelection}
                className="px-2 py-1 bg-slate-800 hover:bg-rose-900/60 border border-rose-500/40 rounded-lg text-[11px] text-rose-300 font-semibold transition whitespace-nowrap shrink-0 active:scale-95"
                title="ยกเลิกการเลือกทั้งหมด"
              >
                ✕ ล้าง ({selectedCardIds.length})
              </button>
            )}

            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <input
                id="deck-search-input"
                type="text"
                placeholder="ค้นหาชื่อการ์ด..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2.5 py-1 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card Grid */}
        <div
          className="min-h-0 flex-1 p-2.5 sm:p-4 overflow-y-auto overscroll-contain"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          {filteredDeck.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
              <span className="text-4xl mb-2">📭</span>
              <p className="text-sm">ไม่พบการ์ดที่ตรงกับตัวกรอง</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
              {filteredDeck.map((card) => {
                const isSelected = selectedCardIds.includes(card.instanceId);
                const selectOrder = selectedCardIds.indexOf(card.instanceId) + 1;
                const cardName = getCardDisplayName(card);
                return (
                  <div
                    key={card.instanceId}
                    data-card-id={card.instanceId}
                    data-card-name={cardName}
                    data-selected={isSelected ? 'true' : 'false'}
                    onClick={() => toggleSelectCard(card.instanceId)}
                    className={`relative group rounded-xl overflow-hidden cursor-pointer transition-all transform duration-150 deck-search-card ${
                      isSelected
                        ? 'ring-4 ring-sky-400 scale-105 shadow-xl shadow-sky-950/80 z-10'
                        : 'hover:scale-102 hover:ring-2 hover:ring-white/40'
                    }`}
                  >
                    {/* Selection Checkmark Badge */}
                    {isSelected && (
                      <div
                        id={`deck-search-select-badge-${selectOrder - 1}`}
                        data-testid="deck-search-select-badge"
                        data-card-instance={card.instanceId}
                        className="absolute top-1 right-1 z-20 px-1.5 py-0.2 rounded-full bg-sky-500 text-white font-black text-[9px] shadow-lg border border-white flex items-center gap-0.5"
                      >
                        <span>✓</span>
                        {selectedCardIds.length > 1 && <span>{selectOrder}</span>}
                      </div>
                    )}
                    <img
                      src={resolveCardImageUrl(card)}
                      alt={cardName}
                      className="w-full aspect-[63/88] object-cover bg-slate-800"
                      onError={(e) => handleCardImageError(e, card)}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5 text-[10px] text-white truncate font-medium">
                      {cardName}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions: Single Card Selection (Preserves exact IDs and behaviors) */}
        {singleSelectedCard && (
          <div
            className="flex-shrink-0 max-h-[34dvh] sm:max-h-none overflow-y-auto overscroll-contain p-2 sm:p-3.5 bg-slate-950/98 border-t border-white/15 flex flex-col gap-2 shadow-2xl animate-in slide-in-from-bottom-2 duration-150 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
            style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
          >
            {/* Top Row: Card Info + Primary Action (Take to Hand) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={resolveCardImageUrl(singleSelectedCard)}
                  alt={getCardDisplayName(singleSelectedCard)}
                  className="w-8 h-11 sm:w-10 sm:h-14 object-cover rounded border border-white/20 flex-shrink-0"
                  onError={(e) => handleCardImageError(e, singleSelectedCard)}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {getCardDisplayName(singleSelectedCard)}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {translateSupertype(singleSelectedCard.supertype)} {translateSubtypes(singleSelectedCard.subtypes).join(', ')}
                  </p>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                id="btn-deck-take-hand"
                onClick={() => handleAction('HAND')}
                className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 rounded-xl text-white font-black text-xs shadow-md shadow-sky-600/30 active:scale-95 transition cursor-pointer flex-shrink-0 flex items-center gap-1.5"
              >
                <span>✋</span>
                <span>เอาขึ้นมือ</span>
              </button>
            </div>

            {/* Action Buttons Section */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-bold">
              {singleSelectedCard.supertype === 'Pokemon' && !playerActive && (
                <>
                  <button
                    id="btn-deck-put-active"
                    onClick={() => handleAction('ACTIVE', { facedown: false })}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-xl text-white shadow-md active:scale-95 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>⭐</span>
                    <span>วางลง Active</span>
                  </button>
                  <button
                    id="btn-deck-put-active-facedown"
                    onClick={() => handleAction('ACTIVE', { facedown: true })}
                    className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 border border-sky-400/40 rounded-xl text-sky-200 shadow-md active:scale-95 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>🎴</span>
                    <span>วาง Active (คว่ำ)</span>
                  </button>
                </>
              )}

              {singleSelectedCard.supertype === 'Pokemon' && (
                <>
                  <button
                    id="btn-deck-put-bench"
                    onClick={() => handleAction('BENCH', { facedown: false })}
                    disabled={(playerBench || []).filter(Boolean).length >= 5}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white shadow-md active:scale-95 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>🌱</span>
                    <span>วางลง Bench</span>
                  </button>
                  <button
                    id="btn-deck-put-bench-facedown"
                    onClick={() => handleAction('BENCH', { facedown: true })}
                    disabled={(playerBench || []).filter(Boolean).length >= 5}
                    className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 border border-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sky-200 shadow-md active:scale-95 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>🎴</span>
                    <span>วาง Bench (คว่ำ)</span>
                  </button>
                </>
              )}

              {/* Attach options: to Active or any Bench pokemon on field */}
              {(singleSelectedCard.supertype === 'Energy' ||
                singleSelectedCard.subtypes?.some((s) => s.toLowerCase().includes('tool')) ||
                singleSelectedCard.supertype === 'Trainer') && (
                <div className="flex items-center gap-1.5 p-1 bg-amber-950/40 border border-amber-500/30 rounded-xl overflow-x-auto max-w-full">
                  {playerActive && (
                    <button
                      id="btn-deck-attach-active"
                      type="button"
                      onClick={() => {
                        const activeId =
                          (playerActive as any).card?.instanceId ||
                          (playerActive as any).instanceId ||
                          (playerActive as any).id;
                        handleAction('ACTIVE', { attachToPokemonId: activeId });
                      }}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-white shadow-md active:scale-95 transition text-[11px] cursor-pointer whitespace-nowrap"
                      title="ติดให้ Active"
                    >
                      ⚡ ติดให้ Active ({getCardDisplayName(playerActive.card) || 'Active'})
                    </button>
                  )}
                  {(playerBench || []).map((bSlot, bIdx) => {
                    if (!bSlot) return null;
                    const benchId =
                      (bSlot as any).card?.instanceId ||
                      (bSlot as any).instanceId ||
                      (bSlot as any).id;
                    const benchName = getCardDisplayName(bSlot.card) || `Bench #${bIdx + 1}`;
                    return (
                      <button
                        key={bIdx}
                        id={`btn-deck-attach-bench-${bIdx}`}
                        type="button"
                        onClick={() => {
                          handleAction('BENCH', { attachToPokemonId: benchId });
                        }}
                        className="px-2.5 py-1.5 bg-amber-700 hover:bg-amber-600 rounded-lg text-white shadow-md active:scale-95 transition text-[11px] cursor-pointer whitespace-nowrap"
                        title={`ติดให้ Bench #${bIdx + 1}`}
                      >
                        ⚡ ติด Bench #{bIdx + 1} ({benchName})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Secondary Utilities */}
              <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                <button
                  id="btn-deck-discard"
                  onClick={() => handleAction('DISCARD')}
                  className="px-2.5 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-500/40 rounded-xl text-red-200 active:scale-95 transition cursor-pointer text-xs"
                >
                  🪦 ทิ้งลงสุสาน
                </button>

                <button
                  id="btn-deck-lost-zone"
                  onClick={() => handleAction('LOST_ZONE')}
                  className="px-2.5 py-1.5 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 rounded-xl text-purple-200 active:scale-95 transition cursor-pointer text-xs"
                >
                  🌀 Lost Zone
                </button>

                <button
                  id="btn-deck-top"
                  onClick={() => handleAction('DECK', { deckPosition: 'TOP' })}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition text-[11px] cursor-pointer"
                >
                  ⬆️ บนสุด
                </button>

                <button
                  id="btn-deck-bottom"
                  onClick={() => handleAction('DECK', { deckPosition: 'BOTTOM' })}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition text-[11px] cursor-pointer"
                >
                  ⬇️ ใต้สุด
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions: Multiple Cards Selection */}
        {selectedCards.length > 1 && (
          <div
            className="flex-shrink-0 max-h-[34dvh] sm:max-h-none overflow-y-auto overscroll-contain p-2 sm:p-3.5 bg-slate-950/98 border-t border-sky-500/40 flex flex-col gap-2 shadow-2xl animate-in slide-in-from-bottom-2 duration-150 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
            style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
          >
            {/* Top Row: Count & Preview + Primary Bulk Action */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-sky-950 text-sky-300 font-bold border border-sky-400/40 text-xs">
                  เลือกแล้ว {selectedCards.length} ใบ
                </span>
                <div className="flex items-center -space-x-2 max-w-[150px] overflow-hidden">
                  {selectedCards.slice(0, 5).map((c) => (
                    <img
                      key={c.instanceId}
                      src={resolveCardImageUrl(c)}
                      alt=""
                      className="w-7 h-10 object-cover rounded border border-white/40 shadow"
                      onError={(e) => handleCardImageError(e, c)}
                    />
                  ))}
                  {selectedCards.length > 5 && (
                    <span className="w-7 h-10 rounded bg-slate-800 border border-white/30 text-[10px] font-bold flex items-center justify-center text-slate-300">
                      +{selectedCards.length - 5}
                    </span>
                  )}
                </div>
              </div>

              <button
                id="btn-bulk-take-hand"
                data-testid="btn-bulk-take-hand"
                onClick={() => handleAction('HAND')}
                className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 rounded-xl text-white font-black text-xs shadow-md shadow-sky-600/30 active:scale-95 transition cursor-pointer flex-shrink-0 flex items-center gap-1.5"
              >
                <span>✋</span>
                <span>เอาขึ้นมือ ({selectedCards.length} ใบ)</span>
              </button>
            </div>

            {/* Bulk Action Buttons Grid */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-bold">
              {allSelectedArePokemon && emptyBenchCount > 0 && (
                <button
                  id="btn-bulk-put-bench"
                  data-testid="btn-bulk-put-bench"
                  onClick={() => handleAction('BENCH', { facedown: false })}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white shadow-md active:scale-95 transition cursor-pointer flex items-center gap-1"
                >
                  <span>🌱</span>
                  <span>วางลง Bench ({Math.min(selectedCards.length, emptyBenchCount)} ใบ)</span>
                </button>
              )}

              <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                <button
                  id="btn-bulk-discard"
                  data-testid="btn-bulk-discard"
                  onClick={() => handleAction('DISCARD')}
                  className="px-2.5 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-500/40 rounded-xl text-red-200 active:scale-95 transition cursor-pointer text-xs"
                >
                  🪦 ทิ้งสุสาน ({selectedCards.length})
                </button>

                <button
                  id="btn-bulk-lost-zone"
                  data-testid="btn-bulk-lost-zone"
                  onClick={() => handleAction('LOST_ZONE')}
                  className="px-2.5 py-1.5 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 rounded-xl text-purple-200 active:scale-95 transition cursor-pointer text-xs"
                >
                  🌀 Lost Zone ({selectedCards.length})
                </button>

                <button
                  id="btn-deck-top"
                  onClick={() => handleAction('DECK', { deckPosition: 'TOP' })}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition text-[11px] cursor-pointer"
                >
                  ⬆️ บนสุด ({selectedCards.length})
                </button>

                <button
                  id="btn-deck-bottom"
                  onClick={() => handleAction('DECK', { deckPosition: 'BOTTOM' })}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition text-[11px] cursor-pointer"
                >
                  ⬇️ ใต้สุด ({selectedCards.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
