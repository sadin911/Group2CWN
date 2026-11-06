import { useState, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { useDeckStore } from '../../store/deckStore';
import { useCollectionStore } from '../../store/collectionStore';
import { calculateDeckStats, calculateMissingCards } from '../../utils/deckCalculator';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { OptimizedCardImage, preloadCardImages } from '../common/OptimizedCardImage';
import { MissingCardsModal } from './MissingCardsModal';
import { CardCollectionModal } from '../collection/CardCollectionModal';
import { DeckCoverPickerModal } from './DeckCoverPickerModal';
import { CardSwapModal } from './CardSwapModal';
import { RARITY_CLASSES } from '../collection/CollectionFilterBar';
import { SearchableSetSelect } from '../common/SearchableSetSelect';
import { REGULATION_SERIES_OPTIONS, STANDARD_REGULATION_MARKS, type CollectionCardEntry } from '../../types/collection';
import { getCardRarityClass, isAceSpecCard } from '../../utils/rarity';
import { createCardMatcher } from '../../utils/searchHelpers';
import { sortSetsByThaiRelease } from '../../utils/setOrder';
import pokemonCardData from '../../data/pokemonNames.json';
import { trackEvent } from '../../utils/analytics';
import type { Deck, MissingCardInfo } from '../../types/deck';

interface Props {
  deck: Deck;
  onBackToDecks: () => void;
}

const ENERGY_TYPES = [
  { type: 'Grass', emoji: '🌿' },
  { type: 'Fire', emoji: '🔥' },
  { type: 'Water', emoji: '💧' },
  { type: 'Lightning', emoji: '⚡' },
  { type: 'Psychic', emoji: '🔮' },
  { type: 'Fighting', emoji: '👊' },
  { type: 'Darkness', emoji: '🌑' },
  { type: 'Metal', emoji: '⚙️' },
  { type: 'Dragon', emoji: '🐉' },
  { type: 'Colorless', emoji: '⚪' },
];

const EMPTY_CARDS: Record<string, CollectionCardEntry> = {};

const ITEMS_PER_PAGE = 40;

export function DeckEditor({ deck, onBackToDecks }: Props) {
  const renameDeck = useDeckStore((s) => s.renameDeck);
  const addCardToDeck = useDeckStore((s) => s.addCardToDeck);
  const removeCardFromDeck = useDeckStore((s) => s.removeCardFromDeck);
  const clearDeckCards = useDeckStore((s) => s.clearDeckCards);
  const setDeckCover = useDeckStore((s) => s.setDeckCover);
  const swapCardInDeck = useDeckStore((s) => s.swapCardInDeck);

  const activeProfileId = useCollectionStore((s) => s.activeProfileId);
  const profiles = useCollectionStore((s) => s.profiles);
  const activeProfile = profiles[activeProfileId];
  const userCollectionCards = activeProfile?.cards || EMPTY_CARDS;

  // Card lookup map
  const cardDataMap = useMemo(() => {
    const map = new Map<string, any>();
    (pokemonCardData as any[]).forEach((c) => map.set(c.id, c));
    return map;
  }, []);

  // Deck Stats & Missing Report
  const stats = useMemo(() => calculateDeckStats(deck, cardDataMap), [deck, cardDataMap]);
  const missingReport = useMemo(
    () => calculateMissingCards(deck, cardDataMap, userCollectionCards),
    [deck, cardDataMap, userCollectionCards]
  );
  const missingInfoMap = useMemo(() => {
    const map = new Map<string, MissingCardInfo>();
    [...missingReport.missingItems, ...missingReport.completeItems].forEach((item) => {
      map.set(item.cardId, item);
    });
    return map;
  }, [missingReport]);

  // States
  const [deckName, setDeckName] = useState(deck.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [previewCard, setPreviewCard] = useState<any | null>(null);
  const [swapTargetCard, setSwapTargetCard] = useState<{ cardId: string; count: number; card: any } | null>(null);
  const [deckViewMode, setDeckViewMode] = useState<'list' | 'grid'>('list');
  const [isDeckExpanded, setIsDeckExpanded] = useState(false);
  const [mobileTab, setMobileTab] = useState<'deck' | 'catalog'>('deck');

  // Catalog Filters
  const [search, setSearch] = useState('');
  const [selectedSet, setSelectedSet] = useState('ALL');
  const [selectedRegulation, setSelectedRegulation] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedRarity, setSelectedRarity] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [catalogLimit, setCatalogLimit] = useState(ITEMS_PER_PAGE);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Track scrolling for Back to Top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos =
        window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setShowBackToTop(scrollPos > 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sets dropdown list with Regulation metadata
  const setsList = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        regulationMarks: Set<string>;
      }
    >();

    (pokemonCardData as any[]).forEach((c) => {
      const sId = c.set?.id || 'PROMO';
      const sName = c.set?.name || 'การ์ดโปรโม / อื่น ๆ';
      if (!map.has(sId)) {
        map.set(sId, { id: sId, name: sName, regulationMarks: new Set<string>() });
      }
      if (c.regulationMark) {
        map.get(sId)!.regulationMarks.add(c.regulationMark);
      }
    });

    const unsorted = Array.from(map.values()).map((s) => {
      const marks = Array.from(s.regulationMarks);
      const primaryMark =
        marks.find((m) => ['J', 'I', 'H', 'G', 'F', 'E', 'D'].includes(m)) ||
        marks[0] ||
        '';
      return {
        id: s.id,
        name: s.name,
        regulationMark: primaryMark,
        regulationMarks: marks,
      };
    });

    return sortSetsByThaiRelease(unsorted);
  }, []);

  const deferredSearch = useDeferredValue(search);
  const effectiveSearch = search.trim() === '' ? '' : deferredSearch;
  const cardMatcher = useMemo(() => createCardMatcher(effectiveSearch), [effectiveSearch]);

  // Filter Catalog Cards
  const filteredCatalog = useMemo(() => {
    const hasSearch = effectiveSearch.trim().length > 0;

    return (pokemonCardData as any[]).filter((c) => {
      // Search
      if (hasSearch) {
        if (!cardMatcher(c)) return false;
      }

      // Set
      if (selectedSet !== 'ALL') {
        const cSet = c.set?.id || 'PROMO';
        if (cSet !== selectedSet) return false;
      }

      // Regulation Mark
      if (selectedRegulation !== 'ALL') {
        const mark = c.regulationMark || '';
        if (selectedRegulation === 'STANDARD') {
          if (!STANDARD_REGULATION_MARKS.includes(mark as any)) return false;
        } else if (selectedRegulation === 'EXPANDED') {
          if (!['A', 'B'].includes(mark)) return false;
        } else {
          if (mark !== selectedRegulation) return false;
        }
      }

      // Type
      if (selectedType !== 'ALL') {
        const types = c.types || [];
        if (!types.includes(selectedType)) return false;
      }

      // Rarity
      if (selectedRarity !== 'ALL') {
        if (getCardRarityClass(c) !== selectedRarity) return false;
      }

      // Category
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'ACE_SPEC') {
          if (!isAceSpecCard(c)) return false;
        } else if (c.category !== selectedCategory) {
          return false;
        }
      }

      return true;
    });
  }, [
    effectiveSearch,
    selectedSet,
    selectedRegulation,
    selectedType,
    selectedRarity,
    selectedCategory,
    cardMatcher,
  ]);

  const displayedCatalog = filteredCatalog.slice(0, catalogLimit);
  const hasMoreCatalog = catalogLimit < filteredCatalog.length;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCatalogLimit(ITEMS_PER_PAGE);
  }, [search, selectedSet, selectedRegulation, selectedType, selectedRarity, selectedCategory]);

  // Preload upcoming catalog cards in background during idle time
  useEffect(() => {
    if (!hasMoreCatalog) return;
    const nextCards = filteredCatalog.slice(catalogLimit, catalogLimit + 24);
    const urls = nextCards.map((c) => resolveCardImageUrl(c.imageUrl));
    preloadCardImages(urls);
  }, [catalogLimit, hasMoreCatalog, filteredCatalog]);

  useEffect(() => {
    if (!hasMoreCatalog) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCatalogLimit((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredCatalog.length));
        }
      },
      { threshold: 0.01, rootMargin: '1400px 0px' }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMoreCatalog, filteredCatalog.length]);

  const handleSaveName = () => {
    if (deckName.trim()) {
      renameDeck(deck.id, deckName.trim());
    }
    setIsEditingName(false);
  };

  // Group Deck Cards by Category
  const groupedDeckCards = useMemo(() => {
    const pokemon: { cardId: string; count: number; card: any }[] = [];
    const trainer: { cardId: string; count: number; card: any }[] = [];
    const energy: { cardId: string; count: number; card: any }[] = [];

    for (const [cardId, entry] of Object.entries(deck.cards)) {
      if (entry.count <= 0) continue;
      const card = cardDataMap.get(cardId);
      const item = { cardId, count: entry.count, card };
      if (card?.category === 'Trainer') trainer.push(item);
      else if (card?.category === 'Energy') energy.push(item);
      else pokemon.push(item);
    }

    return { pokemon, trainer, energy };
  }, [deck.cards, cardDataMap]);

  return (
    <div className="flex flex-col lg:flex-row flex-1 w-full min-h-[calc(100vh-70px)] bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Mobile Tab Switcher (Visible only on < lg screens) */}
      <div className="lg:hidden flex items-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 gap-2 sticky top-0 z-20 shadow-sm dark:shadow-md">
        <button
          onClick={() => setMobileTab('deck')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'deck'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <span>🃏</span>
          <span>การ์ดในเด็ค ({stats.totalCards}/60)</span>
        </button>
        <button
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'catalog'
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-black shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <span>🔍</span>
          <span>ค้นหาการ์ดเพิ่ม</span>
        </button>
      </div>

      {/* LEFT COLUMN: Deck 60 Cards & Stats */}
      <div className={`w-full ${isDeckExpanded ? 'flex-1' : 'lg:w-[420px] xl:w-[480px] 2xl:w-[540px]'} bg-white dark:bg-slate-900/90 border-r border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex flex-col justify-between shrink-0 transition-all duration-200 ${mobileTab === 'deck' ? 'flex' : 'hidden lg:flex'}`}>
        <div className="space-y-4">
          {/* Deck Header & Title + Cover preview */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Cover Thumbnail Clickable */}
              <div
                onClick={() => setShowCoverModal(true)}
                className="w-12 h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shadow-md cursor-pointer shrink-0 hover:scale-105 transition-transform flex items-center justify-center relative group/cover"
                title="คลิกเพื่อเปลี่ยนรูปหน้าปกเด็ค"
              >
                {deck.coverImageUrl ? (
                  <img
                    src={resolveCardImageUrl(deck.coverImageUrl)}
                    alt={deck.name}
                    className="w-full h-full object-cover"
                    onError={(e) => handleCardImageError(e, deck.coverImageUrl)}
                  />
                ) : (
                  <span className="text-xl opacity-40">🃏</span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-amber-300 font-bold text-center">
                  เปลี่ยนปก
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={deckName}
                      onChange={(e) => setDeckName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      autoFocus
                      className="w-full px-3 py-1 bg-slate-950 border border-indigo-500 rounded-lg text-sm font-bold text-white focus:outline-none"
                    />
                    <button
                      onClick={handleSaveName}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold text-white"
                    >
                      บันทึก
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">{deck.name}</h2>
                    <span className="text-xs text-slate-400 group-hover:text-indigo-400">✏️</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowCoverModal(true)}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-bold flex items-center gap-1"
                  >
                    <span>🖼️</span>
                    <span>เปลี่ยนรูปปก</span>
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{deck.description || 'เด็คมาตรฐาน'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onBackToDecks}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all shrink-0"
            >
              ← ปิดเด็ค
            </button>
          </div>

          {/* Stats Bar (60 Cards Indicator & Missing Calculator Button) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-black shadow-md ${
                    stats.totalCards === 60
                      ? 'bg-emerald-500 text-slate-950'
                      : stats.totalCards > 60
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {stats.totalCards} / 60 ใบ
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {stats.totalCards === 60 ? 'ครบมาตรฐาน 60 ใบ ✨' : `ต้องการอีก ${60 - stats.totalCards} ใบ`}
                </span>
              </div>

              {/* Missing Cards Trigger */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMissingModal(true)}
                  data-testid="missing-cards-trigger"
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm border ${
                    missingReport.totalCardsMissing > 0
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                  title="คลิกเพื่อคำนวณและดูรายการการ์ดที่ขาดเทียบกับคอลเลกชัน"
                >
                  <span>🧮</span>
                  <span>
                    {missingReport.totalCardsMissing > 0
                      ? `ขาด ${missingReport.totalCardsMissing} ใบ`
                      : 'การ์ดครบ 100%'}
                  </span>
                </button>
              </div>
            </div>

            {/* Category Breakdown Badges */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
              <div className="py-1.5 px-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300">
                👾 โปเกมอน: {stats.pokemonCount}
              </div>
              <div className="py-1.5 px-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300">
                🎒 เทรนเนอร์: {stats.trainerCount}
              </div>
              <div className="py-1.5 px-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                ⚡ พลังงาน: {stats.energyCount}
              </div>
            </div>

            {/* Visual Deck Composition Progress Bar */}
            <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 flex shadow-inner">
              <div
                style={{ width: `${stats.totalCards > 0 ? (stats.pokemonCount / 60) * 100 : 0}%` }}
                className="bg-purple-500 transition-all duration-300"
                title={`โปเกมอน ${stats.pokemonCount} ใบ`}
              />
              <div
                style={{ width: `${stats.totalCards > 0 ? (stats.trainerCount / 60) * 100 : 0}%` }}
                className="bg-cyan-500 transition-all duration-300"
                title={`เทรนเนอร์ ${stats.trainerCount} ใบ`}
              />
              <div
                style={{ width: `${stats.totalCards > 0 ? (stats.energyCount / 60) * 100 : 0}%` }}
                className="bg-amber-400 transition-all duration-300"
                title={`พลังงาน ${stats.energyCount} ใบ`}
              />
            </div>

            {/* Rule Violations Alert if any */}
            {stats.ruleViolations.length > 0 && stats.totalCards > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-semibold space-y-1">
                {stats.ruleViolations.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deck Card View Mode Controls (List vs Grid) & Fullscreen Expand */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-black text-slate-300">
              การ์ดในเด็ค ({stats.totalCards}/60)
            </span>

            <div className="flex items-center gap-2">
              {/* List / Grid Mode Toggle */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setDeckViewMode('list')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    deckViewMode === 'list'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="แสดงการ์ดแบบรายการ (List)"
                >
                  <span>📋</span>
                  <span className="text-[11px]">รายการ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeckViewMode('grid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    deckViewMode === 'grid'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="แสดงการ์ดแบบตารางการ์ด (Grid)"
                >
                  <span>🖼️</span>
                  <span className="text-[11px]">ตาราง</span>
                </button>
              </div>

              {/* Expand Fullscreen Deck Toggle on desktop */}
              <button
                type="button"
                onClick={() => setIsDeckExpanded((prev) => !prev)}
                className={`hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                  isDeckExpanded
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
                title={isDeckExpanded ? 'ยุบกลับเป็น 2 คอลัมน์' : 'ขยายเด็คเต็มหน้าจอ'}
              >
                <span>{isDeckExpanded ? '✕' : '⛶'}</span>
                <span className="text-[11px]">{isDeckExpanded ? 'ย่อคอลัมน์' : 'ขยายเต็ม'}</span>
              </button>
            </div>
          </div>

          {/* Grouped Card List in Deck */}
          <div className="space-y-4 xl:max-h-[calc(100vh-390px)] xl:overflow-y-auto xl:pr-1">
            {stats.totalCards === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-2xl">
                <span className="text-4xl">🃏</span>
                <p className="text-xs font-bold text-slate-400">เด็คนี้ยังไม่มีการ์ด</p>
                <p className="text-[11px] text-slate-500">เลือกการ์ดจากคลังด้านขวา แล้วกด + เพื่อใส่เข้าเด็ค</p>
              </div>
            ) : deckViewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="space-y-5">
                {/* Pokémon Section */}
                {groupedDeckCards.pokemon.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-purple-400 uppercase mb-2 flex items-center justify-between">
                      <span>👾 โปเกมอน ({stats.pokemonCount} ใบ)</span>
                    </h4>
                    <div className={`grid ${isDeckExpanded ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 sm:gap-4' : 'grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5'}`}>
                      {groupedDeckCards.pokemon.map(({ cardId, count, card }) => (
                        <DeckCardGridItem
                          key={cardId}
                          cardId={cardId}
                          count={count}
                          card={card}
                          missingInfo={missingInfoMap.get(cardId)}
                          isCover={deck.coverCardId === cardId}
                          onAdd={() => addCardToDeck(deck.id, cardId, 1)}
                          onRemove={() => removeCardFromDeck(deck.id, cardId)}
                          onSwap={() => setSwapTargetCard({ cardId, count, card })}
                          onSetCover={(img) => setDeckCover(deck.id, cardId, img)}
                          onPreview={() => setPreviewCard(card || { id: cardId, name: cardId })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Trainer Section */}
                {groupedDeckCards.trainer.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-cyan-400 uppercase mb-2 flex items-center justify-between">
                      <span>🎒 เทรนเนอร์ ({stats.trainerCount} ใบ)</span>
                    </h4>
                    <div className={`grid ${isDeckExpanded ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 sm:gap-4' : 'grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5'}`}>
                      {groupedDeckCards.trainer.map(({ cardId, count, card }) => (
                        <DeckCardGridItem
                          key={cardId}
                          cardId={cardId}
                          count={count}
                          card={card}
                          missingInfo={missingInfoMap.get(cardId)}
                          isCover={deck.coverCardId === cardId}
                          onAdd={() => addCardToDeck(deck.id, cardId, 1)}
                          onRemove={() => removeCardFromDeck(deck.id, cardId)}
                          onSwap={() => setSwapTargetCard({ cardId, count, card })}
                          onSetCover={(img) => setDeckCover(deck.id, cardId, img)}
                          onPreview={() => setPreviewCard(card || { id: cardId, name: cardId })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Energy Section */}
                {groupedDeckCards.energy.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-amber-400 uppercase mb-2 flex items-center justify-between">
                      <span>⚡ พลังงาน ({stats.energyCount} ใบ)</span>
                    </h4>
                    <div className={`grid ${isDeckExpanded ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 sm:gap-4' : 'grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5'}`}>
                      {groupedDeckCards.energy.map(({ cardId, count, card }) => (
                        <DeckCardGridItem
                          key={cardId}
                          cardId={cardId}
                          count={count}
                          card={card}
                          missingInfo={missingInfoMap.get(cardId)}
                          isCover={deck.coverCardId === cardId}
                          onAdd={() => addCardToDeck(deck.id, cardId, 1)}
                          onRemove={() => removeCardFromDeck(deck.id, cardId)}
                          onSwap={() => setSwapTargetCard({ cardId, count, card })}
                          onSetCover={(img) => setDeckCover(deck.id, cardId, img)}
                          onPreview={() => setPreviewCard(card || { id: cardId, name: cardId })}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* LIST VIEW */
              <>
                {/* Pokémon Section */}
                {groupedDeckCards.pokemon.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-purple-400 uppercase mb-1.5 flex items-center justify-between">
                      <span>👾 โปเกมอน ({stats.pokemonCount} ใบ)</span>
                    </h4>
                    <div className="space-y-1.5">
                      {groupedDeckCards.pokemon.map(({ cardId, count, card }) => (
                        <DeckCardRow
                          key={cardId}
                          cardId={cardId}
                          count={count}
                          card={card}
                          missingInfo={missingInfoMap.get(cardId)}
                          isCover={deck.coverCardId === cardId}
                          onAdd={() => addCardToDeck(deck.id, cardId, 1)}
                          onRemove={() => removeCardFromDeck(deck.id, cardId)}
                          onSwap={() => setSwapTargetCard({ cardId, count, card })}
                          onSetCover={(img) => setDeckCover(deck.id, cardId, img)}
                          onPreview={() => setPreviewCard(card || { id: cardId, name: cardId })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Trainer Section */}
                {groupedDeckCards.trainer.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-cyan-400 uppercase mb-1.5 flex items-center justify-between">
                      <span>🎒 เทรนเนอร์ ({stats.trainerCount} ใบ)</span>
                    </h4>
                    <div className="space-y-1.5">
                      {groupedDeckCards.trainer.map(({ cardId, count, card }) => (
                        <DeckCardRow
                          key={cardId}
                          cardId={cardId}
                          count={count}
                          card={card}
                          missingInfo={missingInfoMap.get(cardId)}
                          isCover={deck.coverCardId === cardId}
                          onAdd={() => addCardToDeck(deck.id, cardId, 1)}
                          onRemove={() => removeCardFromDeck(deck.id, cardId)}
                          onSwap={() => setSwapTargetCard({ cardId, count, card })}
                          onSetCover={(img) => setDeckCover(deck.id, cardId, img)}
                          onPreview={() => setPreviewCard(card || { id: cardId, name: cardId })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Energy Section */}
                {groupedDeckCards.energy.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-amber-400 uppercase mb-1.5 flex items-center justify-between">
                      <span>⚡ พลังงาน ({stats.energyCount} ใบ)</span>
                    </h4>
                    <div className="space-y-1.5">
                      {groupedDeckCards.energy.map(({ cardId, count, card }) => (
                        <DeckCardRow
                          key={cardId}
                          cardId={cardId}
                          count={count}
                          card={card}
                          missingInfo={missingInfoMap.get(cardId)}
                          isCover={deck.coverCardId === cardId}
                          onAdd={() => addCardToDeck(deck.id, cardId, 1)}
                          onRemove={() => removeCardFromDeck(deck.id, cardId)}
                          onSwap={() => setSwapTargetCard({ cardId, count, card })}
                          onSetCover={(img) => setDeckCover(deck.id, cardId, img)}
                          onPreview={() => setPreviewCard(card || { id: cardId, name: cardId })}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Clear All Deck Cards Button */}
        {stats.totalCards > 0 && (
          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => {
                if (window.confirm('คุณต้องการล้างการ์ดทั้งหมดในเด็คนี้ใช่หรือไม่?')) {
                  clearDeckCards(deck.id);
                }
              }}
              className="w-full py-2 rounded-xl bg-slate-950 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-xs font-bold transition-all"
            >
              🗑️ ล้างการ์ดทั้งหมดในเด็ค
            </button>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Card Catalog Search & Add */}
      <div className={`flex-1 p-3 sm:p-6 lg:p-8 flex flex-col space-y-4 overflow-y-auto ${isDeckExpanded ? 'hidden' : mobileTab === 'catalog' ? 'flex' : 'hidden lg:flex'}`}>
        {/* Search & Filter Bar for Catalog */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm dark:shadow-xl space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="ค้นหาชื่อการ์ด หรือเลขการ์ด..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-bold p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  title="ล้างข้อความค้นหา"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Searchable Set Dropdown */}
            <SearchableSetSelect
              sets={setsList}
              selectedSet={selectedSet}
              onSelectSet={setSelectedSet}
              accentColor="indigo"
              showProgress={false}
              className="w-full md:w-64"
            />

            {/* Regulation Series Dropdown */}
            <div className="relative w-full md:w-56">
              <select
                value={selectedRegulation}
                onChange={(e) => setSelectedRegulation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-400 shadow-inner"
              >
                {REGULATION_SERIES_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rarity Dropdown */}
            <div className="relative w-full md:w-52">
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-amber-400 font-bold focus:outline-none focus:border-indigo-500 truncate shadow-inner"
              >
                {RARITY_CLASSES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Dropdown */}
            <div className="relative w-full md:w-40">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 font-bold focus:outline-none focus:border-indigo-500 shadow-inner"
              >
                <option value="ALL">ทุกหมวดหมู่</option>
                <option value="Pokemon">👾 โปเกมอน</option>
                <option value="Trainer">🎒 เทรนเนอร์</option>
                <option value="Energy">⚡ พลังงาน</option>
                <option value="ACE_SPEC">🔮 ACE SPEC</option>
              </select>
            </div>
          </div>

          {/* Regulation Quick Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap shrink-0">
              Regulation:
            </span>
            {REGULATION_SERIES_OPTIONS.map((reg) => {
              const isSelected = selectedRegulation === reg.id;
              const isStd = reg.id === 'STANDARD';
              return (
                <button
                  key={reg.id}
                  onClick={() => setSelectedRegulation(reg.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                    isSelected
                      ? isStd
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black shadow-md'
                        : 'bg-indigo-500 text-white font-black shadow-md'
                      : isStd
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900/60'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  }`}
                  title={reg.label}
                >
                  {reg.shortLabel}
                </button>
              );
            })}
          </div>

          {/* Category Quick Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap shrink-0">
              หมวดหมู่:
            </span>
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'Pokemon', label: '👾 โปเกมอน' },
              { id: 'Trainer', label: '🎒 เทรนเนอร์' },
              { id: 'Energy', label: '⚡ พลังงาน' },
              { id: 'ACE_SPEC', label: '🔮 ACE SPEC' },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Energy Types Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => setSelectedType('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all ${
                selectedType === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
              }`}
            >
              ทุกธาตุ
            </button>
            {ENERGY_TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => setSelectedType(t.type === selectedType ? 'ALL' : t.type)}
                className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all ${
                  selectedType === t.type
                    ? 'ring-2 ring-indigo-400 bg-slate-700 scale-110 shadow-md'
                    : 'bg-slate-800/90 hover:bg-slate-700 opacity-75 hover:opacity-100'
                }`}
                title={t.type}
              >
                {t.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Catalog Grid */}
        <div className="flex-1">
          {filteredCatalog.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-2 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
              <span className="text-4xl">🔍</span>
              <p className="text-sm font-bold text-slate-300">ไม่พบการ์ดที่ตรงกับคำค้นหา</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
              {displayedCatalog.map((card, idx) => {
                const countInDeck = deck.cards[card.id]?.count || 0;
                const imgUrl = resolveCardImageUrl(card.imageUrl);

                return (
                  <div
                    key={card.id}
                    className={`group relative rounded-xl p-2 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 border transition-all duration-200 flex flex-col justify-between select-none ${
                      countInDeck > 0 ? 'border-indigo-500/60 ring-1 ring-indigo-500/30' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      onClick={() => setPreviewCard(card)}
                      className="relative w-full aspect-[2.5/3.5] rounded-lg overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-950 shadow-inner group-hover:scale-[1.03] transition-transform duration-200"
                    >
                      <OptimizedCardImage
                        src={imgUrl}
                        alt={card.name}
                        priority={idx < 12}
                        className="w-full h-full object-cover"
                        onError={(e) => handleCardImageError(e, card.imageUrl, card.officialImageUrl)}
                      />

                      {/* Zoom Icon Overlay on Top-Left */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewCard(card);
                        }}
                        className="absolute top-1.5 left-1.5 w-6 h-6 rounded-md bg-black/70 hover:bg-indigo-600 text-white text-[11px] flex items-center justify-center opacity-80 group-hover:opacity-100 transition-all shadow-md"
                        title="ดูรูปขยายใหญ่ (Zoom)"
                      >
                        🔍
                      </button>

                      {/* Count in Deck Badge */}
                      {countInDeck > 0 && (
                        <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-indigo-600 text-white font-black text-xs shadow-md flex items-center gap-0.5">
                          <span>×</span>
                          <span>{countInDeck}</span>
                        </div>
                      )}

                      {/* Quick Add Overlay */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addCardToDeck(deck.id, card.id, 1);
                          trackEvent('deck', 'add_card', card.name || card.id, {
                            cardId: card.id,
                            category: card.category,
                          });
                        }}
                        className="absolute bottom-1.5 right-1.5 px-2 py-1 sm:px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-[11px] sm:text-xs shadow-lg flex items-center gap-1 opacity-90 sm:opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-all"
                        title="เพิ่มการ์ดเข้าเด็ค (+1)"
                      >
                        <span>+ ใส่เด็ค</span>
                      </button>
                    </div>

                    <div className="mt-1.5 cursor-pointer" onClick={() => setPreviewCard(card)}>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="truncate">{card.set?.id || 'PROMO'}</span>
                          {card.regulationMark && (
                            <span
                              className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-slate-800 text-slate-300 border border-slate-700 shrink-0"
                              title={`Regulation Mark ${card.regulationMark}`}
                            >
                              {card.regulationMark}
                            </span>
                          )}
                        </div>
                        <span>{card.collectorNumber || card.localId}</span>
                      </div>
                      <h4 className="text-xs font-bold truncate text-slate-900 dark:text-slate-200 mt-0.5 hover:text-indigo-600 dark:hover:text-indigo-300" title={card.name}>
                        {card.name}
                      </h4>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Catalog Infinite Scroll Sentinel */}
          {hasMoreCatalog && (
            <div ref={sentinelRef} className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
              กำลังโหลดการ์ดเพิ่มเติม... ({displayedCatalog.length} / {filteredCatalog.length} ใบ)
            </div>
          )}
        </div>
      </div>

      {/* Missing Cards Modal */}
      {showMissingModal && (
        <MissingCardsModal
          deck={deck}
          cardDataMap={cardDataMap}
          onClose={() => setShowMissingModal(false)}
        />
      )}

      {/* Deck Cover Picker Modal */}
      {showCoverModal && (
        <DeckCoverPickerModal
          deck={deck}
          onSelectCover={(cardId, imageUrl) => setDeckCover(deck.id, cardId, imageUrl)}
          onClose={() => setShowCoverModal(false)}
        />
      )}

      {/* Card Collection & Deck Details Modal */}
      {previewCard && (
        <CardCollectionModal
          card={previewCard}
          deckId={deck.id}
          onClose={() => setPreviewCard(null)}
        />
      )}

      {/* Card Swap Modal */}
      {swapTargetCard && (
        <CardSwapModal
          oldCardId={swapTargetCard.cardId}
          currentCard={swapTargetCard.card}
          cardCount={swapTargetCard.count}
          onSelectNewCard={(newCard) => {
            swapCardInDeck(deck.id, swapTargetCard.cardId, newCard.id, newCard.imageUrl);
            setSwapTargetCard(null);
          }}
          onClose={() => setSwapTargetCard(null)}
        />
      )}

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 sm:right-6 z-50 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-full bg-slate-900/95 hover:bg-indigo-600 text-indigo-300 hover:text-white font-black text-xs sm:text-sm border border-indigo-500/50 shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 flex items-center gap-1.5 sm:gap-2 group ring-1 ring-indigo-400/30"
          title="เลื่อนกลับขึ้นบนสุด (Back to Top)"
        >
          <span className="text-base group-hover:-translate-y-0.5 transition-transform font-black">↑</span>
          <span className="font-extrabold text-xs sm:text-sm">Back to Top</span>
        </button>
      )}

    </div>
  );
}

// Single Card Row in Deck Column (List Mode)
function DeckCardRow({
  cardId,
  count,
  card,
  missingInfo,
  isCover,
  onAdd,
  onRemove,
  onSwap,
  onSetCover,
  onPreview,
}: {
  cardId: string;
  count: number;
  card: any;
  missingInfo?: MissingCardInfo;
  isCover: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onSwap: () => void;
  onSetCover: (img: string) => void;
  onPreview: () => void;
}) {
  const exactOwned = missingInfo?.exactOwned ?? 0;
  const totalEquivalentOwned = missingInfo?.totalEquivalentOwned ?? exactOwned;
  const missingCount = missingInfo ? missingInfo.missingCount : Math.max(0, count - exactOwned);
  const isMissing = missingCount > 0;
  const hasEquivalentAlternative = !isMissing && exactOwned < count;
  const imgUrl = resolveCardImageUrl(card?.imageUrl);

  return (
    <div
      className={`group p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
        isMissing
          ? 'bg-rose-50/60 dark:bg-slate-950/80 border-rose-300 dark:border-rose-500/30 hover:border-rose-400 dark:hover:border-rose-500/50'
          : hasEquivalentAlternative
          ? 'bg-teal-50/60 dark:bg-slate-950/60 border-teal-300 dark:border-teal-500/30 hover:border-teal-400 dark:hover:border-teal-500/50'
          : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer" onClick={onPreview}>
        <div className="w-9 h-12 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0 shadow-sm relative group-hover:ring-1 group-hover:ring-indigo-400 transition-all">
          <OptimizedCardImage
            src={imgUrl}
            alt={card?.name || cardId}
            priority={true}
            className="w-full h-full object-cover"
            onError={(e) => handleCardImageError(e, card?.imageUrl)}
          />
          {isCover && (
            <div className="absolute top-0 left-0 bg-amber-500 text-slate-950 text-[8px] font-black px-1 rounded-br">
              ★ Cover
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 dark:text-slate-400 font-mono">
            <span className="text-amber-600 dark:text-amber-400 font-bold">{card?.set?.id || 'PROMO'}</span>
            <span>{card?.collectorNumber || card?.localId}</span>
          </div>
          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate leading-snug hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors" title={card?.name}>
            {card?.name || cardId}
          </h5>
          <div className="flex items-center gap-2 text-[10px] mt-0.5">
            {isMissing ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-0.5">
                <span>⚠️ ขาด {missingCount}</span>
                {totalEquivalentOwned > 0 && (
                  <span className="text-slate-500 font-normal">(มีรวม {totalEquivalentOwned})</span>
                )}
              </span>
            ) : hasEquivalentAlternative ? (
              <span className="text-teal-700 dark:text-teal-300 font-bold flex items-center gap-0.5" title={`มีในสมุดรวม ${totalEquivalentOwned} ใบจากชุดอื่น`}>
                <span>✨ มีชุดอื่น {totalEquivalentOwned} ใบ</span>
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">✅ มี {exactOwned} ใบ</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions: Swap / Cover / + / - */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onSwap}
          className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-300 dark:border-slate-800 hover:border-amber-400 text-[10px] flex items-center justify-center transition-all"
          title="สลับการ์ดนี้กับใบอื่น (Swap Card)"
        >
          🔄
        </button>

        <button
          type="button"
          onClick={() => onSetCover(imgUrl || '')}
          className={`w-6 h-6 rounded-lg text-[10px] flex items-center justify-center transition-all ${
            isCover
              ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800'
          }`}
          title={isCover ? 'การ์ดนี้เป็นรูปหน้าปกเด็ค' : 'ตั้งเป็นการ์ดหน้าปกเด็ค'}
        >
          ★
        </button>

        <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0.5">
          <button
            type="button"
            onClick={onRemove}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-black text-xs"
          >
            -
          </button>
          <span className="w-6 text-center text-xs font-black text-slate-900 dark:text-white">{count}</span>
          <button
            type="button"
            onClick={onAdd}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-black text-xs"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

// Single Card Grid Item in Deck Column (Grid Mode)
function DeckCardGridItem({
  cardId,
  count,
  card,
  missingInfo,
  isCover,
  onAdd,
  onRemove,
  onSwap,
  onSetCover,
  onPreview,
}: {
  cardId: string;
  count: number;
  card: any;
  missingInfo?: MissingCardInfo;
  isCover: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onSwap: () => void;
  onSetCover: (img: string) => void;
  onPreview: () => void;
}) {
  const exactOwned = missingInfo?.exactOwned ?? 0;
  const missingCount = missingInfo ? missingInfo.missingCount : Math.max(0, count - exactOwned);
  const isMissing = missingCount > 0;
  const imgUrl = resolveCardImageUrl(card?.imageUrl);

  return (
    <div className="group relative flex flex-col justify-between rounded-xl bg-white dark:bg-slate-950/70 hover:bg-slate-50 dark:hover:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 p-2 transition-all duration-200 shadow-sm dark:shadow-md hover:shadow-xl select-none">
      <div
        onClick={onPreview}
        className="relative w-full aspect-[2.5/3.5] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-inner cursor-pointer"
      >
        <OptimizedCardImage
          src={imgUrl}
          alt={card?.name || cardId}
          priority={true}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          onError={(e) => handleCardImageError(e, card?.imageUrl)}
        />

        {/* Count Badge (Top Right) */}
        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[11px] shadow-md shadow-black/70 flex items-center gap-0.5">
          <span>×</span>
          <span>{count}</span>
        </div>

        {/* Cover Star (Top Left) */}
        {isCover && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[8px] font-black shadow-md">
            ★ ปก
          </div>
        )}

        {/* Missing Alert Badge (Bottom Left) */}
        {isMissing && (
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-rose-600/90 text-white font-bold text-[8px] shadow-md">
            ขาด {missingCount}
          </div>
        )}

        {/* Quick Zoom Preview Icon Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="text-white text-xs bg-black/60 w-7 h-7 rounded-full flex items-center justify-center shadow-md">
            🔍
          </span>
        </div>
      </div>

      <div className="mt-1 min-w-0">
        <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono">
          <span className="text-amber-400 font-bold truncate">{card?.set?.id || 'PROMO'}</span>
          <span>{card?.collectorNumber || card?.localId}</span>
        </div>
        <h5
          onClick={onPreview}
          className="text-[10px] sm:text-[11px] font-bold text-slate-200 truncate mt-0.5 hover:text-indigo-300 cursor-pointer"
          title={card?.name}
        >
          {card?.name || cardId}
        </h5>
      </div>

      {/* Grid Item Action Bar */}
      <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
        {/* Swap Card Button */}
        <button
          type="button"
          onClick={onSwap}
          className="p-1 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 text-[10px] transition-colors flex items-center justify-center border border-slate-800 hover:border-amber-500/40"
          title="สลับการ์ดนี้กับใบอื่น (Swap Card)"
        >
          🔄
        </button>

        {/* Cover Star Button */}
        <button
          type="button"
          onClick={() => onSetCover(imgUrl || '')}
          className={`p-1 rounded-lg text-[10px] transition-colors flex items-center justify-center ${
            isCover
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800'
          }`}
          title={isCover ? 'การ์ดนี้เป็นรูปหน้าปกเด็ค' : 'ตั้งเป็นการ์ดหน้าปกเด็ค'}
        >
          ★
        </button>

        {/* Plus / Minus Buttons */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={onRemove}
            className="w-4 h-4 rounded flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white font-bold text-[10px]"
            title="ลด 1 ใบ"
          >
            -
          </button>
          <span className="w-4 text-center text-[10px] font-black text-white">{count}</span>
          <button
            type="button"
            onClick={onAdd}
            className="w-4 h-4 rounded flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white font-bold text-[10px]"
            title="เพิ่ม 1 ใบ"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

