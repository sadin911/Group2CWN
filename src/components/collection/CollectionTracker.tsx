import { useState, useMemo, useEffect, useDeferredValue } from 'react';
import pokemonCardData from '../../data/pokemonNames.json';
import { useCollectionStore } from '../../store/collectionStore';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore, subscribeToCommunityStats } from '../../store/communityStore';
import { usePricingStore } from '../../store/pricingStore';
import { CollectionHeader } from './CollectionHeader';
import { CollectionFilterBar } from './CollectionFilterBar';
import { CollectionGridView } from './CollectionGridView';
import { EnglishCardBrowser } from './EnglishCardBrowser';
import { Virtual3DBinderView } from './binder/Virtual3DBinderView';
import { useCustomBinderStore } from '../../store/customBinderStore';
import {
  type CollectionStats,
  type SetProgress,
  STANDARD_REGULATION_MARKS,
} from '../../types/collection';

import { PullToRefresh } from '../common/PullToRefresh';
import { matchesRarityFilter, parseSelectedRarities, isAceSpecCard } from '../../utils/rarity';
import { createCardMatcher } from '../../utils/searchHelpers';
import { sortSetsByThaiRelease } from '../../utils/setOrder';
import { trackEvent } from '../../utils/analytics';

export function CollectionTracker() {
  const activeProfileId = useCollectionStore((s) => s.activeProfileId);
  const profiles = useCollectionStore((s) => s.profiles);
  const loadUserFromCloud = useCollectionStore((s) => s.loadUserFromCloud);
  const activeProfile = profiles[activeProfileId];

  const viewMode = useCustomBinderStore((s) => s.viewMode);

  const user = useAuthStore((s) => s.user);
  const fetchCommunityStats = useCommunityStore((s) => s.fetchCommunityStats);

  // Automatically sync/load user binders when logged in
  useEffect(() => {
    if (user?.uid) {
      loadUserFromCloud(user.uid);
    }
  }, [user?.uid]);

  // Fetch community ownership stats & ensure card market prices are loaded
  useEffect(() => {
    fetchCommunityStats();
    const unsub = subscribeToCommunityStats();
    if (!usePricingStore.getState().marketLoaded) {
      usePricingStore.getState().loadMarketPrices();
    }
    return () => unsub();
  }, [fetchCommunityStats]);

  // Filters state from store (persisted across tab switches and page navigations)
  const filters = useCollectionStore((s) => s.filters);
  const setFilters = useCollectionStore((s) => s.setFilters);

  const {
    selectedSet,
    selectedRegulation = 'ALL',
    statusFilter,
    search,
    selectedType,
    selectedCategory,
    selectedStage,
    selectedRarity,
    sortBy,
    sortOrder,
    showFullColor,
  } = filters;

  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
  const [catalogMode, setCatalogMode] = useState<'TH' | 'EN'>('TH');
  const marketPrices = usePricingStore((s) => s.marketPrices);
  const getCardMarketPrice = usePricingStore((s) => s.getCardMarketPrice);

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

  // 1. Build Sets List with Completion Counts & Regulation Marks
  const setsList = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        count: number;
        owned: number;
        regulationMarks: Set<string>;
      }
    >();

    for (const card of pokemonCardData as any[]) {
      const setId = card.set?.id || 'PROMO';
      const setName = card.set?.name || 'การ์ดโปรโม / อื่น ๆ';

      if (!map.has(setId)) {
        map.set(setId, {
          id: setId,
          name: setName,
          count: 0,
          owned: 0,
          regulationMarks: new Set<string>(),
        });
      }

      const item = map.get(setId)!;
      item.count++;
      if (card.regulationMark) {
        item.regulationMarks.add(card.regulationMark);
      }

      const entry = activeProfile?.cards[card.id];
      if (entry && Object.values(entry.variants || {}).some((v) => v > 0)) {
        item.owned++;
      }
    }

    const unsorted = Array.from(map.values()).map((s) => {
      const marks = Array.from(s.regulationMarks);
      const primaryMark =
        marks.find((m) => ['J', 'I', 'H', 'G', 'F', 'E', 'D'].includes(m)) ||
        marks[0] ||
        '';
      return {
        id: s.id,
        name: s.name,
        count: s.count,
        owned: s.owned,
        regulationMark: primaryMark,
        regulationMarks: marks,
      };
    });

    return sortSetsByThaiRelease(unsorted);
  }, [activeProfile]);

  // 2. Compute Overall Collection Stats
  const overallStats: CollectionStats = useMemo(() => {
    const cards = activeProfile?.cards || {};
    let totalUniqueOwned = 0;
    let totalCardsCount = 0;
    let wishlistCount = 0;
    let duplicatesCount = 0;

    for (const entry of Object.values(cards)) {
      const variants = entry.variants || { normal: 0, holo: 0, reverse: 0, promo: 0 };
      const sum = variants.normal + variants.holo + variants.reverse + variants.promo;
      if (sum > 0) {
        totalUniqueOwned++;
        totalCardsCount += sum;
        if (sum > 1) {
          duplicatesCount += sum - 1;
        }
      }
      if (entry.isWishlist) {
        wishlistCount++;
      }
    }

    const totalDatasetCards = (pokemonCardData as any[]).length;
    const overallPercentage =
      totalDatasetCards > 0 ? Math.round((totalUniqueOwned / totalDatasetCards) * 100) : 0;

    return {
      totalProfiles: Object.keys(profiles).length,
      activeProfileName: activeProfile?.name || 'My Collection',
      totalUniqueOwned,
      totalCardsCount,
      wishlistCount,
      duplicatesCount,
      overallPercentage,
    };
  }, [activeProfile, profiles]);

  // 3. Current Set Progress (if a specific set is chosen)
  const currentSetProgress: SetProgress | null = useMemo(() => {
    if (selectedSet === 'ALL') return null;
    const s = setsList.find((x) => x.id === selectedSet);
    if (!s) return null;

    let totalCountInSet = 0;
    for (const card of pokemonCardData as any[]) {
      if ((card.set?.id || 'PROMO') === selectedSet) {
        const entry = activeProfile?.cards[card.id];
        if (entry) {
          totalCountInSet += Object.values(entry.variants || {}).reduce((a, b) => a + b, 0);
        }
      }
    }

    return {
      setId: s.id,
      setName: s.name,
      totalCards: s.count,
      uniqueOwned: s.owned,
      totalCount: totalCountInSet,
      percentage: s.count > 0 ? Math.round((s.owned / s.count) * 100) : 0,
    };
  }, [selectedSet, setsList, activeProfile]);

  const deferredSearch = useDeferredValue(search);
  // When search is cleared to empty string, reset instantly without defer lag
  const effectiveSearch = search.trim() === '' ? '' : deferredSearch;
  const cardMatcher = useMemo(() => createCardMatcher(effectiveSearch), [effectiveSearch]);

  // 4. Filter and Sort Cards
  const filteredCards = useMemo(() => {
    const rawList = pokemonCardData as any[];
    const cardsState = activeProfile?.cards || {};
    const hasSearch = effectiveSearch.trim().length > 0;

    const filtered = rawList.filter((card) => {
      const entry = cardsState[card.id];
      const variants = entry?.variants || { normal: 0, holo: 0, reverse: 0, promo: 0 };
      const totalOwned = variants.normal + variants.holo + variants.reverse + variants.promo;
      const isOwned = totalOwned > 0;
      const isWishlist = !!entry?.isWishlist;

      // Status Filter
      if (statusFilter === 'owned' && !isOwned) return false;
      if (statusFilter === 'missing' && isOwned) return false;
      if (statusFilter === 'wishlist' && !isWishlist) return false;
      if (statusFilter === 'duplicates' && totalOwned <= 1) return false;

      // Set Filter
      const cardSetId = card.set?.id || 'PROMO';
      if (selectedSet !== 'ALL' && cardSetId !== selectedSet) return false;

      // Regulation Mark Filter
      if (selectedRegulation !== 'ALL') {
        const mark = card.regulationMark || '';
        if (selectedRegulation === 'STANDARD') {
          if (!STANDARD_REGULATION_MARKS.includes(mark as any)) return false;
        } else if (selectedRegulation === 'EXPANDED') {
          if (!['A', 'B'].includes(mark)) return false;
        } else {
          if (mark !== selectedRegulation) return false;
        }
      }

      // Category Filter
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'ACE_SPEC') {
          if (!isAceSpecCard(card)) return false;
        } else if (card.category !== selectedCategory) {
          return false;
        }
      }

      // Stage Filter
      if (selectedStage !== 'ALL' && card.stage !== selectedStage) return false;

      // Rarity Class Filter (Multi-select)
      if (!matchesRarityFilter(card, selectedRarity)) {
        return false;
      }

      // Type Filter
      if (selectedType !== 'ALL') {
        const types = card.types || [];
        if (!types.includes(selectedType)) return false;
      }

      // Search Query (Card Name EN/TH, Collector Number, Set ID, Set Name)
      if (hasSearch) {
        if (!cardMatcher(card)) return false;
      }

      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '', 'th');
      } else if (sortBy === 'hp') {
        comparison = (a.hp || 0) - (b.hp || 0);
      } else if (sortBy === 'quantity') {
        const aCount = Object.values(cardsState[a.id]?.variants || {}).reduce((s, v) => s + v, 0);
        const bCount = Object.values(cardsState[b.id]?.variants || {}).reduce((s, v) => s + v, 0);
        comparison = aCount - bCount;
      } else if (sortBy === 'price') {
        const pA = getCardMarketPrice(a.id);
        const pB = getCardMarketPrice(b.id);
        const priceA = pA?.regular ?? pA?.foil ?? 0;
        const priceB = pB?.regular ?? pB?.foil ?? 0;
        comparison = priceA - priceB;
      } else {
        // Number / Default
        const getCardNum = (c: any) => {
          if (c.collectorNumber) {
            const num = parseInt(String(c.collectorNumber).split(/[-/,]/)[0], 10);
            if (!isNaN(num)) return num;
          }
          const localNum = parseInt(String(c.localId).replace(/\D/g, ''), 10);
          return isNaN(localNum) ? 999999 : localNum;
        };
        const aNum = getCardNum(a);
        const bNum = getCardNum(b);
        if (aNum !== bNum) {
          comparison = aNum - bNum;
        } else {
          const aLocal = parseInt(String(a.localId).replace(/\D/g, ''), 10) || 0;
          const bLocal = parseInt(String(b.localId).replace(/\D/g, ''), 10) || 0;
          comparison = aLocal - bLocal;
        }
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [
    activeProfile,
    statusFilter,
    selectedSet,
    selectedRegulation,
    selectedCategory,
    selectedStage,
    selectedRarity,
    selectedType,
    effectiveSearch,
    cardMatcher,
    sortBy,
    sortOrder,
    marketPrices,
  ]);

  const resetFilters = useCollectionStore((s) => s.resetFilters);
  const activeRarities = parseSelectedRarities(selectedRarity);
  const isRarityFiltered = !activeRarities.includes('ALL');

  const isFiltered =
    selectedSet !== 'ALL' ||
    selectedRegulation !== 'ALL' ||
    statusFilter !== 'all' ||
    search.trim() !== '' ||
    selectedType !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedStage !== 'ALL' ||
    isRarityFiltered;

  // Stable key identifying current filter/search/sort criteria
  const filterKey = `${selectedSet}_${selectedRegulation}_${statusFilter}_${selectedType}_${selectedCategory}_${selectedStage}_${selectedRarity}_${sortBy}_${sortOrder}_${effectiveSearch.trim()}_${activeProfileId}`;

  // Log search telemetry with debounce
  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) return;

    const timer = setTimeout(() => {
      trackEvent('search', 'query', trimmed, {
        resultsCount: filteredCards.length,
        regulation: selectedRegulation,
        category: selectedCategory,
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [search, filteredCards.length, selectedRegulation, selectedCategory]);

  // Log filter changes telemetry
  useEffect(() => {
    if (selectedRegulation !== 'ALL') {
      trackEvent('filter', 'regulation', selectedRegulation);
    }
  }, [selectedRegulation]);

  useEffect(() => {
    if (selectedCategory !== 'ALL') {
      trackEvent('filter', 'category', selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedType !== 'ALL') {
      trackEvent('filter', 'type', selectedType);
    }
  }, [selectedType]);

  useEffect(() => {
    if (selectedSet !== 'ALL') {
      trackEvent('filter', 'set', selectedSet);
    }
  }, [selectedSet]);

  const handleRefresh = async () => {
    // 1. Reset all active filters
    resetFilters();
    trackEvent('filter', 'pull_to_refresh_reset');

    // 2. Reload user data from cloud if logged in
    if (user?.uid) {
      await loadUserFromCloud(user.uid);
    }

    // 3. Fetch latest community stats
    await fetchCommunityStats();

    // 4. Smooth scroll to top
    scrollToTop();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white transition-colors duration-200">
        {/* Top Header */}
        <CollectionHeader
          stats={overallStats}
          catalogMode={catalogMode}
          onToggleCatalogMode={setCatalogMode}
        />

        {catalogMode === 'EN' ? (
          <EnglishCardBrowser onBackToThai={() => setCatalogMode('TH')} />
        ) : viewMode === 'binder' ? (
          <Virtual3DBinderView />
        ) : (
          <>
            {/* Filter and Search Bar */}
            <CollectionFilterBar
              sets={setsList}
              selectedSet={selectedSet}
              onSelectSet={(val) => setFilters({ selectedSet: val })}
              selectedRegulation={selectedRegulation}
              onRegulationChange={(val) => setFilters({ selectedRegulation: val })}
              statusFilter={statusFilter}
              onStatusFilterChange={(val) => setFilters({ statusFilter: val })}
              search={search}
              onSearchChange={(val) => setFilters({ search: val })}
              selectedType={selectedType}
              onTypeChange={(val) => setFilters({ selectedType: val })}
              selectedCategory={selectedCategory}
              onCategoryChange={(val) => setFilters({ selectedCategory: val })}
              selectedStage={selectedStage}
              onStageChange={(val) => setFilters({ selectedStage: val })}
              selectedRarity={selectedRarity}
              onRarityChange={(val) => setFilters({ selectedRarity: val })}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={(sb, so) => setFilters({ sortBy: sb, sortOrder: so })}
              showFullColor={showFullColor}
              onToggleFullColor={() => setFilters({ showFullColor: !showFullColor })}
              onResetFilters={resetFilters}
              isFiltered={isFiltered}
              totalFiltered={filteredCards.length}
            />

            {/* Main Binder Grid */}
            <CollectionGridView
              cards={filteredCards}
              currentSetProgress={currentSetProgress}
              showFullColor={showFullColor}
              filterKey={filterKey}
            />
          </>
        )}

        {/* Floating Back to Top Button */}
        {showBackToTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 sm:right-6 z-50 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-full bg-slate-900/95 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-black text-xs sm:text-sm border border-amber-500/50 shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 flex items-center gap-1.5 sm:gap-2 group ring-1 ring-amber-400/30"
            title="เลื่อนกลับขึ้นบนสุด (Back to Top)"
          >
            <span className="text-base group-hover:-translate-y-0.5 transition-transform font-black">↑</span>
            <span className="font-extrabold text-xs sm:text-sm">Back to Top</span>
          </button>
        )}
      </div>
    </PullToRefresh>
  );
}
