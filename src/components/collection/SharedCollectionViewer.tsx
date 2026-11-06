import React, { useState, useEffect, useMemo } from 'react';
import { getSharedCollection } from '../../services/sharedCollectionService';
import type { SharedCollectionSnapshot, SharedCardEntry } from '../../types/share';
import pokemonCardData from '../../data/pokemonNames.json';
import { usePricingStore } from '../../store/pricingStore';
import { CardPriceBadge } from '../pricing/CardPriceBadge';
import { CardCollectionModal } from './CardCollectionModal';
import { isCardFoil, foilPulseDelay } from '../../utils/cardFoil';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { CollectionFilterBar } from './CollectionFilterBar';
import { ThemeToggle } from '../common/ThemeToggle';
import type { SetOption } from '../common/SearchableSetSelect';
import { isAceSpecCard, matchesRarityFilter } from '../../utils/rarity';
import {
  STANDARD_REGULATION_MARKS,
  type CollectionStatusFilter,
  type CollectionSortBy,
  type SortOrder,
} from '../../types/collection';

interface Props {
  shareId: string;
  onNavigateHome: () => void;
}

export const SharedCollectionViewer: React.FC<Props> = ({ shareId, onNavigateHome }) => {
  const [snapshot, setSnapshot] = useState<SharedCollectionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState('ALL');
  const [selectedRegulation, setSelectedRegulation] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showFullColor, setShowFullColor] = useState(true);
  const [selectedRarity, setSelectedRarity] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<CollectionStatusFilter>('all');
  const [sortBy, setSortBy] = useState<CollectionSortBy>('number');

  // Modal & Interactions
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const getCardMarketPrice = usePricingStore((s) => s.getCardMarketPrice);
  const currency = usePricingStore((s) => s.currency);
  const setCurrency = usePricingStore((s) => s.setCurrency);

  // Load snapshot
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getSharedCollection(shareId)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setSnapshot(data);
        } else {
          setError('ไม่พบสมุดสะสมที่ระบุ หรือลิงก์อาจถูกยกเลิกแล้ว');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [shareId]);

  // Available Sets within this shared collection
  // Only sets present in the shared snapshot, so the picker never offers a set
  // the showcase has nothing for.
  const availableSets = useMemo<SetOption[]>(() => {
    if (!snapshot) return [];
    const cardMap = new Map((pokemonCardData as any[]).map((c) => [c.id, c]));
    const map = new Map<
      string,
      { id: string; name: string; count: number; owned: number; marks: Set<string> }
    >();

    for (const [cardId, entry] of Object.entries(snapshot.cards || {})) {
      const card = cardMap.get(cardId);
      const id = card?.set?.id || 'PROMO';
      const name = card?.set?.name || 'การ์ดโปรโม / อื่น ๆ';
      if (!map.has(id)) {
        map.set(id, { id, name, count: 0, owned: 0, marks: new Set<string>() });
      }
      const item = map.get(id)!;
      item.count++;
      const v = entry.variants || {};
      if ((v.normal || 0) + (v.holo || 0) + (v.reverse || 0) + (v.promo || 0) > 0) item.owned++;
      if (card?.regulationMark) item.marks.add(card.regulationMark);
    }

    return Array.from(map.values())
      .map((s) => ({
        id: s.id,
        name: s.name,
        count: s.count,
        owned: s.owned,
        regulationMarks: Array.from(s.marks),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [snapshot]);

  // Filtered Cards List
  const filteredCards = useMemo(() => {
    if (!snapshot) return [];

    const cardMap = new Map((pokemonCardData as any[]).map((c) => [c.id, c]));
    const list: Array<{ card: any; entry: SharedCardEntry; count: number }> = [];

    for (const [cardId, entry] of Object.entries(snapshot.cards || {})) {
      const card = cardMap.get(cardId) || (entry as any).card || {
        id: cardId,
        name: (entry as any).name || cardId,
        imageUrl: (entry as any).imageUrl || '',
        set: { name: (entry as any).set || 'Set' },
        collectorNumber: (entry as any).number || cardId,
        rarityCode: (entry as any).rarity || 'REGULAR',
      };

      const variants = entry.variants || { normal: 0, holo: 0, reverse: 0, promo: 0 };
      const count = variants.normal + variants.holo + variants.reverse + variants.promo;
      const isWishlist = !!entry.isWishlist;

      // Status filter. 'missing' is deliberately absent from this view — see
      // hiddenStatuses below.
      if (statusFilter === 'owned' && count === 0) continue;
      if (statusFilter === 'wishlist' && !isWishlist) continue;
      if (statusFilter === 'duplicates' && count <= 1) continue;

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (card.name || '').toLowerCase().includes(q);
        const matchEn = (card.nameEn || '').toLowerCase().includes(q);
        const matchNo = String(card.collectorNumber || card.localId || '').toLowerCase().includes(q);
        const matchSetId = (card.set?.id || '').toLowerCase().includes(q);
        const matchSet = (card.set?.name || '').toLowerCase().includes(q);
        if (!matchName && !matchEn && !matchNo && !matchSetId && !matchSet) continue;
      }

      // Set filter
      if (selectedSet !== 'ALL' && (card.set?.id || 'PROMO') !== selectedSet) continue;

      // Regulation mark filter
      if (selectedRegulation !== 'ALL') {
        const mark = card.regulationMark || '';
        if (selectedRegulation === 'STANDARD') {
          if (!(STANDARD_REGULATION_MARKS as readonly string[]).includes(mark)) continue;
        } else if (selectedRegulation === 'EXPANDED') {
          if (!['A', 'B'].includes(mark)) continue;
        } else if (mark !== selectedRegulation) {
          continue;
        }
      }

      // Category / Stage / Type
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'ACE_SPEC') {
          if (!isAceSpecCard(card)) continue;
        } else if (card.category !== selectedCategory) {
          continue;
        }
      }
      if (selectedStage !== 'ALL' && card.stage !== selectedStage) continue;
      if (selectedType !== 'ALL' && !(card.types || []).includes(selectedType)) continue;

      // Rarity class filter, using the same classifier as the collection page
      if (!matchesRarityFilter(card, selectedRarity)) continue;

      list.push({ card, entry, count });
    }

    // Sort — same comparators as the collection page, including sort direction
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = (a.card.name || '').localeCompare(b.card.name || '', 'th');
      } else if (sortBy === 'hp') {
        comparison = (a.card.hp || 0) - (b.card.hp || 0);
      } else if (sortBy === 'quantity') {
        comparison = a.count - b.count;
      } else if (sortBy === 'price') {
        const pA = getCardMarketPrice(a.card.id);
        const pB = getCardMarketPrice(b.card.id);
        comparison = (pA?.regular ?? pA?.foil ?? 0) - (pB?.regular ?? pB?.foil ?? 0);
      } else {
        const getCardNum = (c: any) => {
          if (c.collectorNumber) {
            const num = parseInt(String(c.collectorNumber).split(/[-/,]/)[0], 10);
            if (!isNaN(num)) return num;
          }
          const localNum = parseInt(String(c.localId ?? '').replace(/\D/g, ''), 10);
          return isNaN(localNum) ? 999999 : localNum;
        };
        const numA = getCardNum(a.card);
        const numB = getCardNum(b.card);
        if (numA !== numB) {
          comparison = numA - numB;
        } else {
          const aLocal = parseInt(String(a.card.localId ?? '0').replace(/\D/g, ''), 10) || 0;
          const bLocal = parseInt(String(b.card.localId ?? '0').replace(/\D/g, ''), 10) || 0;
          comparison = aLocal - bLocal;
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [
    snapshot,
    searchQuery,
    selectedSet,
    selectedRegulation,
    selectedCategory,
    selectedStage,
    selectedType,
    selectedRarity,
    statusFilter,
    sortBy,
    sortOrder,
    getCardMarketPrice,
  ]);

  // 'missing' is never offered here, and 'wishlist' only when the owner shared it.
  const hiddenStatuses = useMemo<CollectionStatusFilter[]>(
    () => (snapshot?.settings.showWishlist ? ['missing'] : ['missing', 'wishlist']),
    [snapshot?.settings.showWishlist]
  );

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedSet !== 'ALL' ||
    selectedRegulation !== 'ALL' ||
    selectedType !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedStage !== 'ALL' ||
    selectedRarity !== 'ALL' ||
    statusFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSet('ALL');
    setSelectedRegulation('ALL');
    setSelectedType('ALL');
    setSelectedCategory('ALL');
    setSelectedStage('ALL');
    setSelectedRarity('ALL');
    setStatusFilter('all');
    setSortBy('number');
    setSortOrder('asc');
  };

  // Clone action
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore clipboard error
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl animate-bounce mb-4">
          ✨
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">กำลังเปิดสมุดสะสมการ์ด...</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">กำลังโหลดชุดการ์ดและราคาตลาด</p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-3xl mb-4">
          🔍
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">ไม่พบสมุดสะสมที่แชร์</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
          {error || 'สมุดสะสมนี้อาจถูกลบหรือยกเลิกการแชร์โดยเจ้าของแล้ว'}
        </p>
        <button
          type="button"
          onClick={onNavigateHome}
          className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20"
        >
          ไปยังหน้าหลัก PokéCount Tracker
        </button>
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div data-testid="shared-collection-page" className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      {/* Top Sticky Navigation Strip */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <span>←</span>
            <div className="w-5 h-5 rounded-md overflow-hidden bg-slate-900 border border-slate-700 shadow-sm shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}pwa-192x192.png?v=3`}
                alt="PokeCount Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span>กลับหน้าหลัก PokeCount</span>
          </button>

          <div className="flex items-center gap-2">
            {/* A visitor arrives without ever having opened the app, so the
                theme control has to live here too — otherwise the page is stuck
                on whatever the shared filter bar and this page disagree about. */}
            <ThemeToggle variant="dropdown" />

            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
              title="แสดง QR Code"
            >
              <span>📱</span>
              <span className="hidden sm:inline">QR Code</span>
            </button>

            <button
              type="button"
              data-testid="share-copy-btn"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>{copiedLink ? '✅' : '📋'}</span>
              <span>{copiedLink ? 'คัดลอกแล้ว' : 'แชร์ลิงก์'}</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 pt-6 sm:pt-8 space-y-6">
        {/* Showcase Banner Header */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-200 dark:from-slate-900 via-slate-100 dark:via-slate-900 to-indigo-950/60 border border-slate-200 dark:border-slate-800 p-5 sm:p-8 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Owner & Binder info */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black">
                <span>✨</span>
                <span>สมุดสะสมการ์ด (Showcase Binder)</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {snapshot.binderName}
              </h1>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <span className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                  <span>👤</span>
                  <span>{snapshot.ownerName}</span>
                </span>
                <span>•</span>
                <span>อัปเดตล่าสุด {new Date(snapshot.updatedAt).toLocaleDateString('th-TH')}</span>
              </div>

              {snapshot.description && (
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 pt-1 max-w-xl">
                  {snapshot.description}
                </p>
              )}
            </div>

            {/* Stats Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              <div className="p-3.5 rounded-2xl bg-slate-200/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">การ์ดทั้งหมด</span>
                <span className="text-xl sm:text-2xl font-black text-amber-400">{snapshot.stats.totalCards} ใบ</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-200/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">แบบไม่ซ้ำ</span>
                <span className="text-xl sm:text-2xl font-black text-sky-400">{snapshot.stats.uniqueCards} ใบ</span>
              </div>

              {snapshot.settings.showPrices && (
                <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">มูลค่าประเมิน</span>
                    <button
                      type="button"
                      onClick={() => setCurrency(currency === 'THB' ? 'USD' : 'THB')}
                      className="text-[9px] text-emerald-300 font-bold opacity-75 hover:opacity-100"
                    >
                      ({currency})
                    </button>
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-emerald-300">
                    {currency === 'THB'
                      ? `฿${(snapshot.stats.estimatedValueTHB || 0).toLocaleString()}`
                      : `$${(snapshot.stats.estimatedValueUSD || 0).toLocaleString()}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Filters — the same bar the collection page uses, so a visitor gets the
            same searching, sorting and narrowing. Two things are withheld:

            'missing' would let a visitor read off every card the owner lacks,
            which is the owner's want-list by another name and would sidestep the
            wishlist opt-in they control. Price sorting is dropped when prices are
            not shared, because the ordering alone reveals the ranking of value
            that hiding the numbers was meant to keep private.

            'duplicates' is kept: per-variant counts are already in the snapshot,
            so it only saves the visitor from counting by hand. */}
        <section className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800/80 shadow-md">
          <CollectionFilterBar
            sets={availableSets}
            selectedSet={selectedSet}
            onSelectSet={setSelectedSet}
            selectedRegulation={selectedRegulation}
            onRegulationChange={setSelectedRegulation}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            search={searchQuery}
            onSearchChange={setSearchQuery}
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
            onSortChange={(by, order) => {
              setSortBy(by);
              setSortOrder(order);
            }}
            showFullColor={showFullColor}
            onToggleFullColor={() => setShowFullColor((v) => !v)}
            onResetFilters={handleResetFilters}
            isFiltered={isFiltered}
            totalFiltered={filteredCards.length}
            hiddenStatuses={hiddenStatuses}
            hiddenSorts={snapshot.settings.showPrices ? undefined : ['price']}
            hideFullColorToggle={!snapshot.settings.showWishlist}
          />
        </section>

        {/* Card Showcase Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {filteredCards.map(({ card, entry, count }) => {
            const isFoil = isCardFoil(card, entry.variants);

            return (
              <div
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className="group relative rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 transition-all duration-200 overflow-hidden shadow-md hover:shadow-xl hover:shadow-black/60 cursor-pointer flex flex-col"
              >
                {/* Image Container with 3D Foil support */}
                <div className="relative aspect-[63/88] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                  <img
                    src={resolveCardImageUrl(card.imageUrlHigh || card.imageUrl, true)}
                    alt={card.name}
                    loading="lazy"
                    onError={(e) => handleCardImageError(e, card.imageUrl, card.officialImageUrl)}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${
                      count > 0 || showFullColor
                        ? ''
                        : 'grayscale-[85%] opacity-40 group-hover:opacity-85 group-hover:grayscale-[20%]'
                    }`}
                  />

                  {/* 3D Holographic Foil sheen on hover/special */}
                  {isFoil && (
                    <div
                      className="foil-holo opacity-30 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      aria-hidden="true"
                      style={{ animationDelay: `${foilPulseDelay(card.id)}s` }}
                    />
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
                    {/* Quantity Badge */}
                    {count > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[11px] shadow-md">
                        {count} ใบ
                      </span>
                    ) : entry.isWishlist ? (
                      <span className="px-2 py-0.5 rounded-md bg-purple-600/90 text-slate-900 dark:text-white font-bold text-[10px] shadow-md">
                        ⭐ Wishlist
                      </span>
                    ) : null}

                    {/* Price Badge */}
                    {snapshot.settings.showPrices && (
                      <div className="pointer-events-auto ml-auto">
                        <CardPriceBadge cardId={card.id} size="sm" isFoil={isFoil} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Info Footer */}
                <div className="p-2.5 flex flex-col flex-1 justify-between bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800/80">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-400 transition-colors">
                      {card.name}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{card.set?.name || 'Set'}</span>
                      <span className="font-mono font-bold text-amber-500">
                        {card.collectorNumber || card.localId}
                      </span>
                    </div>
                  </div>

                  {/* Variant breakdown pills if multiple */}
                  {count > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                      {entry.variants.normal > 0 && <span className="px-1 py-0.2 bg-slate-200 dark:bg-slate-800 rounded">N:{entry.variants.normal}</span>}
                      {entry.variants.holo > 0 && <span className="px-1 py-0.2 bg-amber-950/80 text-amber-300 rounded">H:{entry.variants.holo}</span>}
                      {entry.variants.reverse > 0 && <span className="px-1 py-0.2 bg-cyan-950/80 text-cyan-300 rounded">R:{entry.variants.reverse}</span>}
                      {entry.variants.promo > 0 && <span className="px-1 py-0.2 bg-purple-950/80 text-purple-300 rounded">P:{entry.variants.promo}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* Card Detail Modal in Read-Only Mode */}
      {selectedCard && (
        <CardCollectionModal
          card={selectedCard}
          readOnly={true}
          sharedCardEntry={snapshot.cards[selectedCard.id]}
          onClose={() => setSelectedCard(null)}
        />
      )}

      {/* QR Code Modal */}
      {showQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setShowQr(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-center max-w-sm space-y-4 shadow-2xl"
          >
            <h4 className="text-base font-black text-slate-900 dark:text-white">QR Code สมุดสะสม</h4>
            <p className="text-xs text-amber-400 font-bold truncate">{snapshot.binderName}</p>
            <div className="p-3 bg-white rounded-2xl inline-block shadow-lg mx-auto">
              <img src={qrUrl} alt="QR Code" className="w-56 h-56" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">สแกนเพื่อเปิดดูสมุดสะสมนี้บนสมาร์ตโฟนของคุณ</p>
            <button
              type="button"
              onClick={() => setShowQr(false)}
              className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-900 dark:text-white transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
