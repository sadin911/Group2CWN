import { useState, useEffect, useRef } from 'react';
import { CollectionCardItem } from './CollectionCardItem';
import { CardCollectionModal } from './CardCollectionModal';
import { BoosterPackPreviewModal } from './BoosterPackPreviewModal';
import { useCollectionStore } from '../../store/collectionStore';
import { getSetBoosterImage, handleBoosterImageError } from '../../utils/boosterImages';
import { resolveCardImageUrl } from '../../utils/cardImage';
import { preloadCardImages } from '../common/OptimizedCardImage';
import type { CardVariantCount, SetProgress } from '../../types/collection';

interface Props {
  cards: any[];
  currentSetProgress?: SetProgress | null;
  showFullColor?: boolean;
  filterKey?: string;
}

const ITEMS_PER_PAGE = 60;

export function CollectionGridView({ cards, currentSetProgress, showFullColor, filterKey }: Props) {
  const activeProfileId = useCollectionStore((s) => s.activeProfileId);
  const profile = useCollectionStore((s) => s.profiles[activeProfileId]);
  const incrementVariant = useCollectionStore((s) => s.incrementVariant);
  const toggleWishlist = useCollectionStore((s) => s.toggleWishlist);

  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [isBoosterModalOpen, setIsBoosterModalOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const boosterImg = currentSetProgress ? getSetBoosterImage(currentSetProgress.setId) : null;

  // Reset pagination ONLY when search/filter/sort criteria change, NOT on card count or wishlist mutations
  useEffect(() => {
    setDisplayLimit(ITEMS_PER_PAGE);
  }, [filterKey]);

  const displayedCards = cards.slice(0, displayLimit);
  const hasMore = displayLimit < cards.length;

  // Preload next upcoming cards in background during idle time
  useEffect(() => {
    if (!hasMore) return;
    const nextCards = cards.slice(displayLimit, displayLimit + 30);
    const urls = nextCards.map((c) => resolveCardImageUrl(c.imageUrl));
    preloadCardImages(urls);
  }, [displayLimit, hasMore, cards]);

  // Auto Infinite Scroll with IntersectionObserver (trigger 1,400px in advance)
  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setDisplayLimit((prev) => Math.min(prev + ITEMS_PER_PAGE, cards.length));
        }
      },
      {
        root: null,
        rootMargin: '1400px 0px', // Trigger 1,400px before reaching the absolute bottom
        threshold: 0.01,
      }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, cards.length]);

  const handleQuickAdd = (card: any) => {
    const name = (card.name || '').toLowerCase();
    const setId = (card.set?.id || '').toUpperCase();
    const colNum = (card.collectorNumber || card.localId || '').toUpperCase();

    if (setId === 'PROMO' || colNum.includes('PROMO') || colNum.startsWith('P-')) {
      incrementVariant(card.id, 'promo');
    } else if (
      name.includes(' ex') ||
      name.includes('ex') ||
      name.includes('vmax') ||
      name.includes('vstar') ||
      name.includes(' v') ||
      name.includes('radiant') ||
      colNum.includes('MUR') ||
      colNum.includes('SAR') ||
      colNum.includes('UR') ||
      colNum.includes('HR') ||
      colNum.includes('SR') ||
      colNum.includes('AR')
    ) {
      incrementVariant(card.id, 'holo');
    } else {
      incrementVariant(card.id, 'normal');
    }
  };

  return (
    <div className="relative z-0 flex-1 p-4 sm:p-6 lg:p-8 w-full space-y-4">
      {/* Set Progress Header (If specific set is selected) */}
      {currentSetProgress && (
        <div className="bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-800/95 dark:to-slate-900 border border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-yellow-500/40 rounded-2xl p-4 sm:p-5 shadow-md dark:shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3.5 sm:gap-4 w-full md:w-auto">
            {boosterImg && (
              <div 
                onClick={() => setIsBoosterModalOpen(true)}
                className="relative group cursor-pointer shrink-0 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all active:scale-95 bg-slate-50 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-700/80 min-w-[3.5rem] sm:min-w-[4.5rem] flex items-center justify-center"
                title="คลิกเพื่อดูรูปปกซองการ์ดแบบขยาย"
              >
                <img
                  src={boosterImg}
                  alt={`ซอง ${currentSetProgress.setName}`}
                  className="h-16 sm:h-20 w-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                  onError={(e) => handleBoosterImageError(e, currentSetProgress.setId)}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                  <span className="text-white text-xs font-black bg-black/60 px-1.5 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                    🔍 <span className="hidden sm:inline text-[10px]">ขยาย</span>
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-yellow-400/25 ring-1 ring-yellow-300/50 shrink-0">
                  {currentSetProgress.setId}
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  {currentSetProgress.setName}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                สะสมได้แล้ว <span className="text-purple-700 dark:text-yellow-300 font-extrabold">{currentSetProgress.uniqueOwned}</span> จากทั้งหมด{' '}
                <span className="text-slate-900 dark:text-slate-100 font-extrabold">{currentSetProgress.totalCards}</span> แบบ (รวม{' '}
                <span className="text-blue-600 dark:text-blue-300 font-bold">{currentSetProgress.totalCount}</span> ใบ)
              </p>
            </div>
          </div>

          {/* Progress Bar & Percentage Pill */}
          <div className="w-full md:w-80 flex items-center gap-3.5">
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 rounded-full h-4 p-0.5 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
              <div
                className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(255,203,5,0.5)]"
                style={{ width: `${currentSetProgress.percentage}%` }}
              />
            </div>
            <span className="text-sm font-black text-purple-700 dark:text-yellow-300 min-w-[50px] text-right">
              {currentSetProgress.percentage}%
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {cards.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white/60 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
          <span className="text-5xl">🔍</span>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">ไม่พบการ์ดที่ตรงกับเงื่อนไขการค้นหา</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            ลองเปลี่ยนคำค้นหา หรือเลือกชุดการ์ด / ธาตุ / สถานะอื่นเพื่อดูการ์ด
          </p>
        </div>
      ) : (
        <>
          {/* Card Grid - Full Screen Multi-Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 sm:gap-4">
            {displayedCards.map((card, idx) => {
              const entry = profile?.cards[card.id];
              const variants: CardVariantCount = entry?.variants || {
                normal: 0,
                holo: 0,
                reverse: 0,
                promo: 0,
              };

              return (
                <CollectionCardItem
                  key={card.id}
                  card={card}
                  variants={variants}
                  isWishlist={entry?.isWishlist}
                  showFullColor={showFullColor}
                  priority={idx < 18}
                  onSelect={(c) => setSelectedCard(c)}
                  onQuickAdd={handleQuickAdd}
                  onToggleWishlist={toggleWishlist}
                />
              );
            })}
          </div>

          {/* Auto Load Sentinel & Indicator */}
          {hasMore ? (
            <div
              ref={sentinelRef}
              className="py-10 text-center flex flex-col items-center justify-center gap-2 text-slate-400"
            >
              <div className="w-7 h-7 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-400">
                กำลังโหลดการ์ดเพิ่มเติม... ({displayedCards.length} / {cards.length} ใบ)
              </p>
            </div>
          ) : (
            <div className="py-10 text-center text-slate-500 text-xs font-semibold">
              ✨ แสดงการ์ดครบทั้งหมด {cards.length.toLocaleString()} ใบแล้ว
            </div>
          )}
        </>
      )}

      {/* Card Detail / Variant Edit Modal */}
      {selectedCard && (
        <CardCollectionModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}

      {/* Booster Pack Cover Zoom Modal */}
      {isBoosterModalOpen && boosterImg && currentSetProgress && (
        <BoosterPackPreviewModal
          setId={currentSetProgress.setId}
          setName={currentSetProgress.setName}
          boosterImageUrl={boosterImg}
          totalCards={currentSetProgress.totalCards}
          uniqueOwned={currentSetProgress.uniqueOwned}
          totalCount={currentSetProgress.totalCount}
          percentage={currentSetProgress.percentage}
          onClose={() => setIsBoosterModalOpen(false)}
        />
      )}
    </div>
  );
}
