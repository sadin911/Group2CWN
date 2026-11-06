import { useState, useMemo, useEffect } from 'react';
import { resolveCardImageUrl, handleCardImageError } from '../../../utils/cardImage';
import { sounds } from '../../../engine/audio/WebAudioSounds';
import { sortSetsByThaiRelease } from '../../../utils/setOrder';
import {
  parseSelectedRarities,
  isRaritySelected,
  toggleRarityInSelection,
  matchesRarityFilter,
} from '../../../utils/rarity';
import type { CardVariantKey, CollectionCardEntry } from '../../../types/collection';

export interface BinderCardPickerDrawerProps {
  isOpen: boolean;
  pageIndex: number;
  slotIndex: number;
  allCards: any[];
  profileCards: Record<string, CollectionCardEntry>;
  onClose: () => void;
  onSelectCard: (pageIndex: number, slotIndex: number, cardId: string, variant: CardVariantKey) => void;
  onSelectCardsBatch?: (
    startPageIndex: number,
    startSlotIndex: number,
    cards: Array<{ cardId: string; variant: CardVariantKey }>
  ) => void;
  initialMode?: 'single' | 'batch';
}

const DRAWER_RARITIES = [
  { id: 'ALL', label: 'ทั้งหมด', icon: '⭐' },
  { id: 'SAR', label: 'SAR', icon: '🌟' },
  { id: 'AR', label: 'AR', icon: '🎨' },
  { id: 'SR', label: 'SR', icon: '💎' },
  { id: 'HR', label: 'HR', icon: '🌈' },
  { id: 'UR', label: 'UR', icon: '👑' },
  { id: 'ACE_SPEC', label: 'ACE SPEC', icon: '🔮' },
  { id: 'EX', label: 'ex', icon: '⚡' },
  { id: 'VMAX', label: 'VMAX', icon: '🔥' },
  { id: 'VSTAR', label: 'VSTAR', icon: '⭐' },
  { id: 'V', label: 'V', icon: '⚡' },
  { id: 'PROMO', label: 'Promo', icon: '🎁' },
  { id: 'REGULAR', label: 'ปกติ', icon: '⚪' },
];

export function BinderCardPickerDrawer({
  isOpen,
  pageIndex,
  slotIndex,
  allCards,
  profileCards,
  onClose,
  onSelectCard,
  onSelectCardsBatch,
  initialMode = 'single',
}: BinderCardPickerDrawerProps) {
  const [pickerMode, setPickerMode] = useState<'single' | 'batch'>(initialMode);
  const [query, setQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState('ALL');
  const [selectedRarity, setSelectedRarity] = useState('ALL');
  const [filterOwnedOnly, setFilterOwnedOnly] = useState(false);

  // Single card mode state
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<CardVariantKey>('normal');

  // Batch mode state
  const [batchSelectedCards, setBatchSelectedCards] = useState<Array<{ cardId: string; variant: CardVariantKey }>>([]);
  const [batchGlobalVariant, setBatchGlobalVariant] = useState<CardVariantKey>('normal');

  useEffect(() => {
    if (isOpen) {
      setPickerMode(initialMode);
      setSelectedCardId(null);
      setBatchSelectedCards([]);
    }
  }, [isOpen, initialMode, pageIndex, slotIndex]);

  // Compute unique sets from available cards
  const availableSets = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const card of allCards) {
      const id = card.set?.id || card.setId || 'PROMO';
      const name = card.set?.name || (id === 'PROMO' ? 'การ์ดโปรโม / อื่น ๆ' : id);
      if (!map.has(id)) {
        map.set(id, { id, name });
      }
    }
    const unsorted = Array.from(map.values()).map((s) => ({
      id: s.id,
      name: s.name,
    }));
    return sortSetsByThaiRelease(unsorted);
  }, [allCards]);

  // Filter cards based on search query, set, multi-select rarity, and ownership filter
  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();

    return allCards.filter((card) => {
      // Ownership filter
      if (filterOwnedOnly) {
        const entry = profileCards[card.id];
        const count =
          (entry?.variants?.normal || 0) +
          (entry?.variants?.holo || 0) +
          (entry?.variants?.reverse || 0) +
          (entry?.variants?.promo || 0);
        if (count <= 0) return false;
      }

      // Set filter
      if (selectedSet !== 'ALL') {
        const cardSetId = (card.set?.id || card.setId || 'PROMO').toUpperCase();
        if (cardSetId !== selectedSet.toUpperCase()) return false;
      }

      // Multi-select Rarity filter
      if (!matchesRarityFilter(card, selectedRarity)) {
        return false;
      }

      // Search match
      if (!q) return true;

      const nameTh = (card.nameTh || card.name || '').toLowerCase();
      const nameEn = (card.nameEn || '').toLowerCase();
      const num = (card.collectorNumber || card.localId || '').toLowerCase();
      const setId = (card.set?.id || card.setId || '').toLowerCase();

      return (
        nameTh.includes(q) ||
        nameEn.includes(q) ||
        num.includes(q) ||
        setId.includes(q)
      );
    }).slice(0, 100); // Display top 100 for snappy performance
  }, [allCards, profileCards, query, filterOwnedOnly, selectedSet, selectedRarity]);

  const isRarityFiltered = !parseSelectedRarities(selectedRarity).includes('ALL');
  const isFilterActive = selectedSet !== 'ALL' || isRarityFiltered || filterOwnedOnly || query.trim() !== '';

  const handleResetFilters = () => {
    setQuery('');
    setSelectedSet('ALL');
    setSelectedRarity('ALL');
    setFilterOwnedOnly(false);
  };

  if (!isOpen) return null;

  const selectedCard = selectedCardId ? allCards.find((c) => c.id === selectedCardId) : null;

  const handleConfirmSingle = () => {
    if (!selectedCardId) return;
    try {
      sounds.playCardSnap();
    } catch {}
    onSelectCard(pageIndex, slotIndex, selectedCardId, selectedVariant);
    onClose();
  };

  const handleConfirmBatch = () => {
    if (batchSelectedCards.length === 0) return;
    try {
      sounds.playCardSnap();
    } catch {}
    onSelectCardsBatch?.(pageIndex, slotIndex, batchSelectedCards);
    onClose();
  };

  const handleSelectFirst9 = () => {
    const first9 = filteredCards.slice(0, 9).map((c) => ({
      cardId: c.id,
      variant: batchGlobalVariant,
    }));
    setBatchSelectedCards(first9);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-neutral-900 border border-white/10 shadow-2xl p-4 sm:p-6 text-white flex flex-col gap-3.5 overflow-hidden"
        role="dialog"
        aria-labelledby="card-picker-title"
      >
        {/* Header with Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 id="card-picker-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>🃏</span> {pickerMode === 'batch' ? 'เลือกการ์ดใส่สมุดสะสม (หลายใบ)' : 'เลือกการ์ดใส่ช่องสมุดสะสม'}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {pickerMode === 'batch'
                ? `เริ่มใส่ตั้งแต่ หน้า ${pageIndex + 1} ช่องที่ ${slotIndex + 1} เป็นต้นไป (ใส่ต่อหน้าถัดไปอัตโนมัติ)`
                : `หน้า ${pageIndex + 1} ช่องที่ ${slotIndex + 1}`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Mode Switcher */}
            <div className="flex items-center gap-0.5 p-0.5 bg-neutral-950 rounded-xl border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setPickerMode('single')}
                data-testid="mode-single-btn"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pickerMode === 'single'
                    ? 'bg-amber-400 text-neutral-950 shadow-sm font-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                👆 ช่องเดียว
              </button>
              <button
                type="button"
                onClick={() => setPickerMode('batch')}
                data-testid="picker-mode-batch"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pickerMode === 'batch'
                    ? 'bg-amber-400 text-neutral-950 shadow-sm font-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                📚 หลายใบ
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search & Filters Toolbar */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {/* Row 1: Search & Owned-Only Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อการ์ด, เลขคอลเลกเตอร์ เช่น ลิซาร์ดอน, 001..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-neutral-950 border border-white/15 focus:border-amber-400 focus:outline-none text-xs sm:text-sm text-white placeholder-neutral-500"
              />
              <span className="absolute left-3 top-2.5 text-neutral-500 text-xs">🔍</span>
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-white text-xs cursor-pointer"
                  title="ล้างคำค้นหา"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setFilterOwnedOnly(!filterOwnedOnly)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                filterOwnedOnly
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : 'border-white/10 bg-neutral-950 text-neutral-400 hover:text-white'
              }`}
            >
              <span>{filterOwnedOnly ? '✓' : '○'}</span> การ์ดที่ฉันมีเท่านั้น
            </button>
          </div>

          {/* Row 2: Set Selector Dropdown & Filter Summary */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <select
                value={selectedSet}
                onChange={(e) => setSelectedSet(e.target.value)}
                aria-label="กรองตามชุดการ์ด"
                data-testid="picker-set-select"
                className={`w-full px-3 py-1.5 rounded-xl border text-xs font-bold transition-all focus:outline-none cursor-pointer truncate ${
                  selectedSet !== 'ALL'
                    ? 'bg-amber-400 text-neutral-950 border-amber-300 ring-1 ring-amber-400/40 shadow-sm'
                    : 'bg-neutral-950 border-white/15 text-white focus:border-amber-400'
                }`}
              >
                <option value="ALL" className="bg-neutral-900 text-white">
                  📦 ทุกชุดการ์ด (All Sets)
                </option>
                {availableSets.map((s) => (
                  <option key={s.id} value={s.id} className="bg-neutral-900 text-white">
                    [{s.id}] {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-neutral-400 shrink-0 font-medium px-1">
              พบ <span className="text-amber-400 font-bold">{filteredCards.length}</span> ใบ
            </div>

            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-rose-400 hover:text-rose-300 underline shrink-0 cursor-pointer transition-colors font-medium"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

          {/* Row 3: Multi-Select Rarity Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] text-neutral-400 font-bold shrink-0">
              ความหายาก:
            </span>
            {DRAWER_RARITIES.map((r) => {
              const isSelected = isRaritySelected(selectedRarity, r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRarity(toggleRarityInSelection(selectedRarity, r.id))}
                  data-testid={`picker-rarity-${r.id}`}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1 active:scale-95 border cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-neutral-950 border-amber-300 font-black shadow-md shadow-amber-500/20'
                      : 'bg-neutral-950/80 text-neutral-400 hover:text-white border-white/10 hover:border-white/20'
                  }`}
                >
                  <span>{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>

          {/* Row 4: Batch Selection Helper Toolbar (When in Batch Mode) */}
          {pickerMode === 'batch' && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300">
                  เลือกแล้ว <span className="text-white font-black">{batchSelectedCards.length}</span> ใบ
                </span>
                {batchSelectedCards.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBatchSelectedCards([])}
                    className="text-[11px] text-neutral-400 hover:text-rose-400 underline cursor-pointer"
                  >
                    ล้างที่เลือก
                  </button>
                )}
              </div>

              <button
                type="button"
                data-testid="btn-select-first-9"
                onClick={handleSelectFirst9}
                className="px-2.5 py-0.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/30 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
              >
                ⚡ เลือก 9 ใบแรกที่พบ
              </button>
            </div>
          )}
        </div>

        {/* Card Grid Selection */}
        <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[360px] pr-1">
          {filteredCards.length === 0 ? (
            <div className="w-full h-40 flex flex-col items-center justify-center text-neutral-500 text-xs">
              <span>ไม่พบการ์ดที่ตรงกับเงื่อนไขการค้นหา</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {filteredCards.map((card) => {
                const entry = profileCards[card.id];
                const isOwned = entry && ((entry.variants?.normal || 0) + (entry.variants?.holo || 0) + (entry.variants?.reverse || 0) + (entry.variants?.promo || 0)) > 0;
                const batchIndex = batchSelectedCards.findIndex((c) => c.cardId === card.id);
                const isBatchSelected = batchIndex !== -1;
                const isSelected = pickerMode === 'batch' ? isBatchSelected : selectedCardId === card.id;

                return (
                  <button
                    key={card.id}
                    type="button"
                    data-testid={`picker-card-${card.id}`}
                    onClick={() => {
                      if (pickerMode === 'batch') {
                        if (isBatchSelected) {
                          setBatchSelectedCards(batchSelectedCards.filter((c) => c.cardId !== card.id));
                        } else {
                          setBatchSelectedCards([...batchSelectedCards, { cardId: card.id, variant: batchGlobalVariant }]);
                        }
                      } else {
                        setSelectedCardId(card.id);
                        if (entry?.variants?.holo) setSelectedVariant('holo');
                        else if (entry?.variants?.reverse) setSelectedVariant('reverse');
                        else setSelectedVariant('normal');
                      }
                    }}
                    className={`relative aspect-[63/88] rounded-lg overflow-hidden border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400 scale-[1.03] shadow-lg z-10'
                        : 'border-white/10 hover:border-white/30 opacity-90 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={resolveCardImageUrl(card, false)}
                      alt={card.nameTh || card.name}
                      className="w-full h-full object-cover pointer-events-none"
                      loading="lazy"
                      onError={(e) => handleCardImageError(e, card)}
                    />
                    {isOwned && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
                    )}

                    {/* Batch Mode Order Badge */}
                    {pickerMode === 'batch' && isBatchSelected && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-amber-400 text-neutral-950 font-black text-[10px] shadow-md z-20 flex items-center gap-0.5">
                        <span>✓</span>
                        <span>#{batchIndex + 1}</span>
                      </div>
                    )}

                    <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
                      <div className="text-[9px] font-bold text-white truncate text-left">
                        {card.nameTh || card.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Card Variant Configuration (Single Mode Only) */}
        {pickerMode === 'single' && selectedCard && (
          <div className="p-3 rounded-xl bg-neutral-950 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <img
                src={resolveCardImageUrl(selectedCard, false)}
                alt={selectedCard.nameTh || selectedCard.name}
                className="w-9 h-12 object-cover rounded shadow-md border border-white/10"
              />
              <div>
                <div className="text-xs font-bold text-white">
                  {selectedCard.nameTh || selectedCard.name}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {selectedCard.set?.id || selectedCard.setId} • #{selectedCard.collectorNumber || selectedCard.localId}
                </div>
              </div>
            </div>

            {/* Variant Selector */}
            <div className="flex items-center gap-1.5">
              {(['normal', 'holo', 'reverse', 'promo'] as CardVariantKey[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSelectedVariant(v)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize border transition-all cursor-pointer ${
                    selectedVariant === v
                      ? 'bg-amber-400 text-neutral-950 border-amber-400 shadow-sm font-bold'
                      : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 flex-shrink-0">
          {pickerMode === 'batch' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 font-bold">ฟอยล์/แบบการ์ด:</span>
              <div className="flex items-center gap-1">
                {(['normal', 'holo', 'reverse', 'promo'] as CardVariantKey[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setBatchGlobalVariant(v);
                      setBatchSelectedCards(batchSelectedCards.map((c) => ({ ...c, variant: v })));
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold capitalize border transition-all cursor-pointer ${
                      batchGlobalVariant === v
                        ? 'bg-amber-400 text-neutral-950 border-amber-400 shadow-sm font-bold'
                        : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-neutral-400 truncate">
              {selectedCard ? `เลือก: ${selectedCard.nameTh || selectedCard.name}` : 'กรุณาคลิกเลือกการ์ดที่ต้องการ'}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            {pickerMode === 'batch' ? (
              <button
                type="button"
                data-testid="btn-confirm-batch-insert"
                disabled={batchSelectedCards.length === 0}
                onClick={handleConfirmBatch}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:pointer-events-none text-neutral-950 text-xs font-bold shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                📥 ใส่การ์ด {batchSelectedCards.length > 0 ? `${batchSelectedCards.length} ใบ` : ''} ลงในสมุด
              </button>
            ) : (
              <button
                type="button"
                data-testid="btn-confirm-single-insert"
                disabled={!selectedCardId}
                onClick={handleConfirmSingle}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:pointer-events-none text-neutral-950 text-xs font-bold shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                ใส่การ์ดลงในช่อง
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
