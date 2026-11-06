import { useState, useMemo, useEffect } from 'react';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { OptimizedCardImage } from '../common/OptimizedCardImage';
import { useCollectionStore } from '../../store/collectionStore';
import { getCardRarityClass } from '../../utils/rarity';
import pokemonCardData from '../../data/pokemonNames.json';
import type { CollectionCardEntry } from '../../types/collection';

interface Props {
  oldCardId: string;
  currentCard: any;
  cardCount: number;
  onSelectNewCard: (newCard: any) => void;
  onClose: () => void;
}

const EMPTY_CARDS: Record<string, CollectionCardEntry> = {};

export function CardSwapModal({
  oldCardId,
  currentCard,
  cardCount,
  onSelectNewCard,
  onClose,
}: Props) {
  const activeProfileId = useCollectionStore((s) => s.activeProfileId);
  const profiles = useCollectionStore((s) => s.profiles);
  const activeProfile = profiles[activeProfileId];
  const userCollectionCards = activeProfile?.cards || EMPTY_CARDS;

  const [activeTab, setActiveTab] = useState<'sameName' | 'search'>('sameName');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Pokemon' | 'Trainer' | 'Energy'>('ALL');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Helper to calculate owned count for any card
  const getCardOwnedTotal = useMemo(() => {
    return (cardId: string) => {
      const entry = userCollectionCards[cardId];
      if (!entry || !entry.variants) return 0;
      const v = entry.variants;
      return (v.normal || 0) + (v.holo || 0) + (v.reverse || 0) + (v.promo || 0);
    };
  }, [userCollectionCards]);

  const currentCardOwned = getCardOwnedTotal(oldCardId);

  // Tab 1: Other versions of the same card name
  const sameNameAlternatives = useMemo(() => {
    const currentName = (currentCard?.name || '').trim().toLowerCase();
    if (!currentName) return [];

    const results: any[] = [];
    (pokemonCardData as any[]).forEach((c) => {
      if (c.id === oldCardId) return;
      const otherName = (c.name || '').trim().toLowerCase();
      if (otherName === currentName) {
        results.push(c);
      }
    });

    // Sort by owned first, then by set release / id
    return results.sort((a, b) => {
      const ownedA = getCardOwnedTotal(a.id);
      const ownedB = getCardOwnedTotal(b.id);
      if (ownedA !== ownedB) return ownedB - ownedA;
      return (a.set?.id || '').localeCompare(b.set?.id || '');
    });
  }, [currentCard, oldCardId, getCardOwnedTotal]);

  // Auto switch to search tab if no same-name alternatives exist
  useEffect(() => {
    if (sameNameAlternatives.length === 0) {
      setActiveTab('search');
    }
  }, [sameNameAlternatives.length]);

  // Tab 2: Filtered catalog search
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      // If query is empty, show cards of same category or popular cards
      return (pokemonCardData as any[])
        .filter((c) => {
          if (c.id === oldCardId) return false;
          if (categoryFilter === 'ALL') {
            return currentCard?.category ? c.category === currentCard.category : true;
          }
          return c.category === categoryFilter;
        })
        .slice(0, 60);
    }

    const matches: any[] = [];
    for (const c of pokemonCardData as any[]) {
      if (c.id === oldCardId) continue;
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) continue;

      const name = (c.name || '').toLowerCase();
      const id = (c.id || '').toLowerCase();
      const set = (c.set?.id || '').toLowerCase();
      const colNum = (c.collectorNumber || c.localId || '').toLowerCase();

      if (name.includes(q) || id.includes(q) || set.includes(q) || colNum.includes(q)) {
        matches.push(c);
        if (matches.length >= 80) break;
      }
    }
    return matches;
  }, [searchQuery, categoryFilter, oldCardId, currentCard]);

  const currentImgUrl = resolveCardImageUrl(currentCard?.imageUrl);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center text-lg font-bold shadow-md shrink-0">
              🔄
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                สลับการ์ดในเด็ค (Swap Card)
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                เลือกการ์ดใบใหม่มาแทนที่ใบนี้ โดยระบบจะคงจำนวน {cardCount} ใบเดิมไว้ให้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold transition-all shrink-0 ml-2"
            title="ปิด (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Current Card Banner */}
        <div className="p-3.5 sm:p-4 bg-slate-950/60 border-b border-slate-800/90 flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-15 sm:w-14 sm:h-19 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0 shadow-md">
            <OptimizedCardImage
              src={currentImgUrl}
              alt={currentCard?.name || oldCardId}
              priority={true}
              className="w-full h-full object-cover"
              onError={(e) => handleCardImageError(e, currentCard?.imageUrl)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                การ์ดปัจจุบัน
              </span>
              <span className="text-[11px] font-mono text-amber-400 font-bold">
                {currentCard?.set?.id || 'PROMO'} {currentCard?.collectorNumber || currentCard?.localId}
              </span>
              {currentCard && (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-800 text-slate-300">
                  {getCardRarityClass(currentCard)}
                </span>
              )}
            </div>
            <h4 className="text-sm sm:text-base font-black text-white truncate mt-1">
              {currentCard?.name || oldCardId}
            </h4>
            <div className="flex items-center gap-3 text-xs mt-0.5 text-slate-400">
              <span>จำนวนในเด็ค: <strong className="text-amber-400 font-black">{cardCount} ใบ</strong></span>
              <span>•</span>
              <span>
                ในคอลเลกชัน:{' '}
                {currentCardOwned > 0 ? (
                  <strong className="text-emerald-400 font-bold">มี {currentCardOwned} ใบ</strong>
                ) : (
                  <strong className="text-rose-400 font-bold">ไม่มีการ์ด</strong>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 pt-3 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('sameName')}
            className={`px-3 sm:px-4 py-2 text-xs font-black rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'sameName'
                ? 'border-amber-400 text-amber-300 bg-slate-800/80 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>✨</span>
            <span>ชื่อเดียวกัน ({sameNameAlternatives.length} แบบ)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`px-3 sm:px-4 py-2 text-xs font-black rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'search'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/80 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🔍</span>
            <span>ค้นหาการ์ดทั้งหมด</span>
          </button>
        </div>

        {/* Search bar & Category filter (Visible in 'search' tab) */}
        {activeTab === 'search' && (
          <div className="p-3 sm:p-4 bg-slate-950/40 border-b border-slate-800 space-y-2.5">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อการ์ดภาษาไทย, รหัสชุด, หรือเลขการ์ด..."
                autoFocus
                className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
              <span className="text-[11px] text-slate-400 font-semibold shrink-0 mr-1">หมวดหมู่:</span>
              {[
                { id: 'ALL', label: 'ทั้งหมด' },
                { id: 'Pokemon', label: '👾 โปเกมอน' },
                { id: 'Trainer', label: '🎒 เทรนเนอร์' },
                { id: 'Energy', label: '⚡ พลังงาน' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    categoryFilter === cat.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content List */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2">
          {activeTab === 'sameName' ? (
            sameNameAlternatives.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <span className="text-3xl">🃏</span>
                <p className="text-xs font-bold text-slate-400">
                  ไม่พบการ์ดเวอร์ชันอื่นที่มีชื่อตรงกันในระบบ
                </p>
                <p className="text-[11px] text-slate-500">
                  คุณสามารถใช้แท็บ "ค้นหาการ์ดทั้งหมด" เพื่อเลือกการ์ดใบอื่นมาสลับแทนได้
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-amber-300/90 px-1 flex items-center justify-between">
                  <span>เลือกเวอร์ชัน/ลายการ์ดที่ต้องการ (กดเพื่อสลับทันที):</span>
                  <span className="text-slate-400 font-normal">พบ {sameNameAlternatives.length} เวอร์ชัน</span>
                </div>
                {sameNameAlternatives.map((card, idx) => {
                  const owned = getCardOwnedTotal(card.id);
                  const isOwned = owned >= cardCount;
                  const hasSome = owned > 0 && owned < cardCount;
                  const img = resolveCardImageUrl(card.imageUrl);
                  const rarity = getCardRarityClass(card);

                  return (
                    <div
                      key={card.id}
                      onClick={() => onSelectNewCard(card)}
                      className="group p-2.5 rounded-2xl bg-slate-950/70 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/70 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-indigo-500/10"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-700/80 shrink-0 shadow relative group-hover:ring-2 group-hover:ring-indigo-400 transition-all">
                          <OptimizedCardImage
                            src={img}
                            alt={card.name}
                            priority={idx < 8}
                            className="w-full h-full object-cover"
                            onError={(e) => handleCardImageError(e, card.imageUrl)}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                              {card.set?.id || 'PROMO'} {card.collectorNumber || card.localId}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold text-[9px]">
                              {rarity}
                            </span>
                            {card.regulationMark && (
                              <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-bold text-[9px]">
                                {card.regulationMark}
                              </span>
                            )}
                          </div>
                          <h5 className="text-xs sm:text-sm font-bold text-white truncate mt-1 group-hover:text-indigo-300 transition-colors">
                            {card.name}
                          </h5>
                          <div className="text-[11px] mt-0.5">
                            {isOwned ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <span>✅</span>
                                <span>มีในคอลเลกชัน {owned} ใบ (ครบ)</span>
                              </span>
                            ) : hasSome ? (
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <span>⚡</span>
                                <span>มีในคอลเลกชัน {owned} ใบ (ขาดอีก {cardCount - owned})</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 flex items-center gap-1">
                                <span>○</span>
                                <span>ยังไม่มีในคอลเลกชัน</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNewCard(card);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md transition-all shrink-0 flex items-center gap-1 group-hover:scale-105 active:scale-95"
                      >
                        <span>สลับใบนี้</span>
                        <span>→</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 px-1 flex items-center justify-between">
                <span>เลือกการ์ดที่ต้องการสลับแทน:</span>
                <span>แสดง {searchResults.length} ใบ</span>
              </div>
              {searchResults.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <span className="text-3xl">🔍</span>
                  <p className="text-xs font-bold text-slate-400">ไม่พบการ์ดตามคำค้นหา</p>
                  <p className="text-[11px] text-slate-500">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</p>
                </div>
              ) : (
                searchResults.map((card, idx) => {
                  const owned = getCardOwnedTotal(card.id);
                  const isOwned = owned >= cardCount;
                  const hasSome = owned > 0 && owned < cardCount;
                  const img = resolveCardImageUrl(card.imageUrl);
                  const rarity = getCardRarityClass(card);

                  return (
                    <div
                      key={card.id}
                      onClick={() => onSelectNewCard(card)}
                      className="group p-2.5 rounded-2xl bg-slate-950/70 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/70 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-indigo-500/10"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-700/80 shrink-0 shadow relative group-hover:ring-2 group-hover:ring-indigo-400 transition-all">
                          <OptimizedCardImage
                            src={img}
                            alt={card.name}
                            priority={idx < 8}
                            className="w-full h-full object-cover"
                            onError={(e) => handleCardImageError(e, card.imageUrl)}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                              {card.set?.id || 'PROMO'} {card.collectorNumber || card.localId}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold text-[9px]">
                              {rarity}
                            </span>
                            {card.category && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px]">
                                {card.category}
                              </span>
                            )}
                          </div>
                          <h5 className="text-xs sm:text-sm font-bold text-white truncate mt-1 group-hover:text-indigo-300 transition-colors">
                            {card.name}
                          </h5>
                          <div className="text-[11px] mt-0.5">
                            {isOwned ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <span>✅</span>
                                <span>มีในคอลเลกชัน {owned} ใบ</span>
                              </span>
                            ) : hasSome ? (
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <span>⚡</span>
                                <span>มีในคอลเลกชัน {owned} ใบ</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 flex items-center gap-1">
                                <span>○</span>
                                <span>ยังไม่มีในคอลเลกชัน</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNewCard(card);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md transition-all shrink-0 flex items-center gap-1 group-hover:scale-105 active:scale-95"
                      >
                        <span>สลับใบนี้</span>
                        <span>→</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            แตะหรือกด "สลับใบนี้" เพื่อเปลี่ยนการ์ดทันที
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
