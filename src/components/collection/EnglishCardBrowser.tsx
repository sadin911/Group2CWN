import { useState, useMemo, useEffect, useRef } from 'react';
import { CardCollectionModal } from './CardCollectionModal';
import { getThaiCardIdForEnglishCard } from '../../utils/thaiEnglishCardMatcher';
import { handleCardImageError, resolveCardImageUrl } from '../../utils/cardImage';
import { getCardRarityClass, isAceSpecCard } from '../../utils/rarity';
import { STANDARD_REGULATION_MARKS } from '../../types/collection';
import type { SetOption } from '../common/SearchableSetSelect';
import setsEnMetadata from '../../data/pokemonSetsEn.json';
import {
  EnglishFilterBar,
  type EnglishCatalogStatusFilter,
  type EnglishCatalogSortBy,
  type SortOrder,
} from './EnglishFilterBar';
import { usePricingStore } from '../../store/pricingStore';
import { CardPriceBadge } from '../pricing/CardPriceBadge';

interface Props {
  onBackToThai: () => void;
}

const ITEMS_PER_PAGE = 60;

const RARITY_WEIGHTS: Record<string, number> = {
  UR: 10,
  HR: 9,
  SAR: 8,
  SR: 7,
  EX: 6,
  VMAX: 5,
  VSTAR: 4,
  V: 3,
  AR: 2,
  PROMO: 1,
  REGULAR: 0,
};

export function EnglishCardBrowser({ onBackToThai }: Props) {
  const [cardsEn, setCardsEn] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedSet, setSelectedSet] = useState<string>('ALL');
  const [selectedRegulation, setSelectedRegulation] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<EnglishCatalogStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');

  // Sort & Display States
  const [sortBy, setSortBy] = useState<EnglishCatalogSortBy>('number');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showFullColor, setShowFullColor] = useState(false);
  const marketPrices = usePricingStore((s) => s.marketPrices);

  // Pagination & Modal
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Load English dataset dynamically
  useEffect(() => {
    import('../../data/pokemonCardsEn.json')
      .then((m) => {
        setCardsEn(m.default || m);
      })
      .catch((err) => {
        console.error('Failed to load English cards:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Compute Sets list with accurate card counts and regulation marks
  const enSetOptions: SetOption[] = useMemo(() => {
    const setStats: Record<string, { count: number; marks: Set<string> }> = {};
    for (const c of cardsEn) {
      const sid = c.set?.id;
      if (!sid) continue;
      if (!setStats[sid]) {
        setStats[sid] = { count: 0, marks: new Set() };
      }
      setStats[sid].count++;
      if (c.regulationMark) {
        setStats[sid].marks.add(c.regulationMark);
      }
    }

    return (setsEnMetadata as any[]).map((s) => {
      const stat = setStats[s.id];
      const marks = stat ? Array.from(stat.marks) : [];

      let fallbackMark: string | undefined = undefined;
      if (s.series === 'Mega Evolution') fallbackMark = 'J';
      else if (s.series === 'Scarlet & Violet') fallbackMark = 'H';
      else if (s.series === 'Sword & Shield') fallbackMark = 'F';

      return {
        id: s.id,
        name: s.name,
        count: stat ? stat.count : s.total || s.printedTotal,
        regulationMarks: marks.length > 0 ? marks : fallbackMark ? [fallbackMark] : undefined,
        regulationMark: marks.length > 0 ? marks[0] : fallbackMark,
      };
    });
  }, [cardsEn]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedSet('ALL');
    setSelectedRegulation('ALL');
    setStatusFilter('all');
    setSearch('');
    setSelectedType('ALL');
    setSelectedCategory('ALL');
    setSelectedStage('ALL');
    setSelectedRarity('ALL');
    setSortBy('number');
    setSortOrder('asc');
  };

  const isFiltered =
    selectedSet !== 'ALL' ||
    selectedRegulation !== 'ALL' ||
    statusFilter !== 'all' ||
    search.trim() !== '' ||
    selectedType !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedStage !== 'ALL' ||
    selectedRarity !== 'ALL';

  // Filter and Sort Cards
  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = cardsEn.filter((card) => {
      // Set filter
      if (selectedSet !== 'ALL' && card.set?.id !== selectedSet) return false;

      // Regulation filter
      if (selectedRegulation !== 'ALL') {
        if (selectedRegulation === 'STANDARD') {
          if (
            !card.regulationMark ||
            !(STANDARD_REGULATION_MARKS as readonly string[]).includes(card.regulationMark)
          ) {
            return false;
          }
        } else if (selectedRegulation !== 'EXPANDED') {
          if (card.regulationMark !== selectedRegulation) return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'ACE_SPEC') {
          if (!isAceSpecCard(card)) return false;
        } else if (card.category !== selectedCategory) {
          return false;
        }
      }

      // Stage filter
      if (selectedStage !== 'ALL') {
        const targetStage =
          selectedStage === 'พื้นฐาน'
            ? 'Basic'
            : selectedStage === 'ร่าง 1'
            ? 'Stage 1'
            : selectedStage === 'ร่าง 2'
            ? 'Stage 2'
            : selectedStage;
        if (card.stage !== targetStage) return false;
      }

      // Rarity filter
      if (selectedRarity !== 'ALL') {
        const cardRarity = getCardRarityClass(card);
        if (cardRarity !== selectedRarity) return false;
      }

      // Type filter
      if (selectedType !== 'ALL' && !(card.types || []).includes(selectedType)) return false;

      // Match status filter
      if (statusFilter !== 'all') {
        const hasMatch = !!getThaiCardIdForEnglishCard(card.id);
        if (statusFilter === 'matched' && !hasMatch) return false;
        if (statusFilter === 'unmatched' && hasMatch) return false;
      }

      // Search query (Card name EN, set name, set id, collector number, artist)
      if (q) {
        const nameMatch = (card.name || '').toLowerCase().includes(q);
        const setMatch =
          (card.set?.name || '').toLowerCase().includes(q) ||
          (card.set?.id || '').toLowerCase().includes(q);
        const numMatch =
          (card.localId || '').toLowerCase() === q ||
          String(card.localId || '').toLowerCase().includes(q);
        const artistMatch = (card.artist || '').toLowerCase().includes(q);

        if (!nameMatch && !setMatch && !numMatch && !artistMatch) return false;
      }

      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '', 'en');
      } else if (sortBy === 'hp') {
        const hpA = parseInt(a.hp, 10) || 0;
        const hpB = parseInt(b.hp, 10) || 0;
        comparison = hpA - hpB;
      } else if (sortBy === 'rarity') {
        const rA = RARITY_WEIGHTS[getCardRarityClass(a)] ?? 0;
        const rB = RARITY_WEIGHTS[getCardRarityClass(b)] ?? 0;
        comparison = rA - rB;
      } else if (sortBy === 'price') {
        const pA = marketPrices[a.id] || (a.name ? marketPrices[a.name] : undefined);
        const pB = marketPrices[b.id] || (b.name ? marketPrices[b.name] : undefined);
        const priceA = pA?.regular ?? pA?.foil ?? 0;
        const priceB = pB?.regular ?? pB?.foil ?? 0;
        comparison = priceA - priceB;
      } else {
        // Number / Default
        const aNum = parseInt(String(a.localId || '').replace(/\D/g, ''), 10) || 0;
        const bNum = parseInt(String(b.localId || '').replace(/\D/g, ''), 10) || 0;
        if (aNum !== bNum) {
          comparison = aNum - bNum;
        } else {
          comparison = String(a.localId || '').localeCompare(String(b.localId || ''), undefined, {
            numeric: true,
          });
        }
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [
    cardsEn,
    selectedSet,
    selectedRegulation,
    selectedCategory,
    selectedStage,
    selectedRarity,
    selectedType,
    statusFilter,
    search,
    sortBy,
    sortOrder,
    marketPrices,
  ]);

  // Reset pagination on filter or sort change
  useEffect(() => {
    setDisplayLimit(ITEMS_PER_PAGE);
  }, [
    selectedSet,
    selectedRegulation,
    selectedCategory,
    selectedStage,
    selectedRarity,
    selectedType,
    statusFilter,
    search,
    sortBy,
    sortOrder,
  ]);

  const displayedCards = filteredCards.slice(0, displayLimit);
  const hasMore = displayLimit < filteredCards.length;

  // Infinite scroll
  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setDisplayLimit((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredCards.length));
        }
      },
      { rootMargin: '1200px 0px', threshold: 0.01 }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, filteredCards.length]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Banner: Switch Back to Thai */}
      <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🇺🇸</span>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight">
              English Pokémon TCG Catalog (คลังการ์ดภาษาอังกฤษ)
            </h2>
            <p className="text-[11px] text-sky-100 font-medium">
              ฐานข้อมูลการ์ดภาษาอังกฤษฉบับสมบูรณ์ (Sword & Shield จนถึงปัจจุบัน) เพื่อดูสถิติและจับคู่กับการ์ดไทย
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToThai}
          className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <span>🇹🇭</span>
          <span className="hidden sm:inline">สลับกลับไป</span>
          <span>การ์ดไทย</span>
        </button>
      </div>

      {/* FILTER & SORT BAR */}
      <EnglishFilterBar
        sets={enSetOptions}
        selectedSet={selectedSet}
        onSelectSet={setSelectedSet}
        selectedRegulation={selectedRegulation}
        onRegulationChange={setSelectedRegulation}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        search={search}
        onSearchChange={setSearch}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedStage={selectedStage}
        onStageChange={setSelectedStage}
        selectedRarity={selectedRarity}
        onRarityChange={setSelectedRarity}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(s, o) => {
          setSortBy(s);
          setSortOrder(o);
        }}
        showFullColor={showFullColor}
        onToggleFullColor={() => setShowFullColor(!showFullColor)}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
        totalFiltered={filteredCards.length}
      />

      {/* CARD GRID */}
      <div className="p-3 sm:p-6 flex-1">
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="font-bold text-sm">กำลังโหลดคลังการ์ดภาษาอังกฤษ 11,303 ใบ...</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="py-24 text-center text-slate-400">
            <span className="text-4xl block mb-2">🔍</span>
            <p className="font-bold">ไม่พบการ์ดภาษาอังกฤษตามเงื่อนไขที่เลือก</p>
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all shadow-md"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {displayedCards.map((card) => {
              const thCardId = getThaiCardIdForEnglishCard(card.id);

              return (
                <div
                  key={card.id}
                  data-testid="en-card-item"
                  data-en-id={card.id}
                  onClick={() => setSelectedCard(card)}
                  className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-500/60 transition-all cursor-pointer flex flex-col"
                >
                  {/* Card Image */}
                  <div className="aspect-[2.5/3.5] bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                    <img
                      src={resolveCardImageUrl(card.imageUrl)}
                      alt={card.name}
                      loading="lazy"
                      onError={(e) => handleCardImageError(e, card.imageUrl, card.officialImageUrl)}
                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                        showFullColor ? 'contrast-[1.06] saturate-[1.12]' : ''
                      }`}
                    />

                    {/* Matched Thai Indicator Badge */}
                    <div className="absolute top-2 right-2">
                      {thCardId ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-white text-[9px] font-black shadow-sm backdrop-blur-sm">
                          🇹🇭 มีคู่ไทย
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-900/80 text-slate-400 text-[9px] font-bold shadow-sm backdrop-blur-sm">
                          ยังไม่พบคู่
                        </span>
                      )}
                    </div>

                    {/* Live Market Price Badge */}
                    <div className="absolute bottom-2 left-2 pointer-events-none">
                      <CardPriceBadge
                        cardId={card.id}
                        enName={card.name}
                        size="sm"
                        showDualCurrency={false}
                        className="!px-1.5 !py-0.5 !text-[9px] font-bold shadow-md bg-slate-950/80 backdrop-blur-xs"
                      />
                    </div>
                  </div>

                  {/* Card Meta */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-indigo-500 dark:text-indigo-400 font-black uppercase tracking-wider">
                        <span>{card.set?.id}</span>
                        <span>#{card.localId}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5 group-hover:text-indigo-500 transition-colors">
                        {card.name}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>{card.hp ? `${card.hp} HP` : card.category}</span>
                      {card.regulationMark && (
                        <span className="font-mono font-bold">[{card.regulationMark}]</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Indicator */}
        {hasMore && (
          <div ref={sentinelRef} className="py-8 text-center text-slate-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-xs font-bold">กำลังโหลดการ์ดเพิ่มเติม...</span>
          </div>
        )}
      </div>

      {/* Card Collection / Detail Modal */}
      {selectedCard && (
        <CardCollectionModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  );
}

