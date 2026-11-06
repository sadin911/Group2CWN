import { useState, useMemo, useEffect } from 'react';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { OptimizedCardImage } from '../common/OptimizedCardImage';
import { calculateDeckStats, calculateMissingCards } from '../../utils/deckCalculator';
import { useCollectionStore } from '../../store/collectionStore';
import { CardCollectionModal } from '../collection/CardCollectionModal';
import { MissingCardsModal } from './MissingCardsModal';
import type { Deck, MissingCardInfo } from '../../types/deck';
import type { CollectionCardEntry } from '../../types/collection';

interface Props {
  deck: Deck;
  cardDataMap: Map<string, any>;
  onEditDeck?: () => void;
  onClose: () => void;
}

const EMPTY_CARDS: Record<string, CollectionCardEntry> = {};

export function DeckViewModal({ deck, cardDataMap, onEditDeck, onClose }: Props) {
  const activeProfileId = useCollectionStore((s) => s.activeProfileId);
  const profiles = useCollectionStore((s) => s.profiles);
  const activeProfile = profiles[activeProfileId];
  const userCollectionCards = activeProfile?.cards || EMPTY_CARDS;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewCard, setPreviewCard] = useState<any | null>(null);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !previewCard && !showMissingModal) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, previewCard, showMissingModal]);

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

  // Copy deck text to clipboard
  const handleCopyDeckList = () => {
    const lines: string[] = [`// PokéDeck: ${deck.name} (${stats.totalCards}/60)`];

    if (groupedDeckCards.pokemon.length > 0) {
      lines.push(`\nPokémon: ${stats.pokemonCount}`);
      groupedDeckCards.pokemon.forEach(({ count, card, cardId }) => {
        lines.push(`${count} ${card?.name || cardId} ${card?.set?.id || 'PROMO'} ${card?.collectorNumber || card?.localId || ''}`);
      });
    }

    if (groupedDeckCards.trainer.length > 0) {
      lines.push(`\nTrainer: ${stats.trainerCount}`);
      groupedDeckCards.trainer.forEach(({ count, card, cardId }) => {
        lines.push(`${count} ${card?.name || cardId} ${card?.set?.id || 'PROMO'} ${card?.collectorNumber || card?.localId || ''}`);
      });
    }

    if (groupedDeckCards.energy.length > 0) {
      lines.push(`\nEnergy: ${stats.energyCount}`);
      groupedDeckCards.energy.forEach(({ count, card, cardId }) => {
        lines.push(`${count} ${card?.name || cardId} ${card?.set?.id || 'PROMO'} ${card?.collectorNumber || card?.localId || ''}`);
      });
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const coverImg = deck.coverImageUrl ? resolveCardImageUrl(deck.coverImageUrl) : null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-15 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 shadow-md shrink-0 flex items-center justify-center">
                {coverImg ? (
                  <img
                    src={coverImg}
                    alt={deck.name}
                    className="w-full h-full object-cover"
                    onError={(e) => handleCardImageError(e, deck.coverImageUrl)}
                  />
                ) : (
                  <span className="text-xl opacity-40">🃏</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase">
                    Deck View
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {new Date(deck.updatedAt).toLocaleDateString('th-TH')}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate mt-0.5">
                  {deck.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {deck.description || 'เด็คมาตรฐาน 60 ใบ'}
                </p>
              </div>
            </div>

            {/* View Mode Toggle & Close */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'grid'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="แสดงการ์ดแบบตาราง (Grid)"
                >
                  <span>🖼️</span>
                  <span className="hidden sm:inline">ตารางการ์ด</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'list'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="แสดงการ์ดแบบรายการ (List)"
                >
                  <span>📋</span>
                  <span className="hidden sm:inline">รายการ</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 text-slate-600 dark:text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all ml-1"
                title="ปิด (ESC)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2.5 py-1 rounded-xl font-black shadow-sm ${
                  stats.totalCards === 60
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-amber-500 text-slate-950'
                }`}
              >
                {stats.totalCards} / 60 ใบ
              </span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="px-2 py-1 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                  👾 โปเกมอน: {stats.pokemonCount}
                </span>
                <span className="px-2 py-1 rounded-lg bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  🎒 เทรนเนอร์: {stats.trainerCount}
                </span>
                <span className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  ⚡ พลังงาน: {stats.energyCount}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMissingModal(true)}
                className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border ${
                  missingReport.totalCardsMissing > 0
                    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                }`}
              >
                <span>🧮</span>
                <span>
                  {missingReport.totalCardsMissing > 0
                    ? `ขาด ${missingReport.totalCardsMissing} ใบ (${missingReport.completionPercentage}%)`
                    : 'การ์ดครบ 100%'}
                </span>
              </button>
            </div>
          </div>

          {/* Cards Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
            {stats.totalCards === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <span className="text-4xl">🃏</span>
                <p className="text-sm font-bold text-slate-400">เด็คนี้ยังไม่มีการ์ด</p>
                <p className="text-xs text-slate-500">กดปุ่ม "จัดเด็คนี้" ด้านล่างเพื่อเพิ่มการ์ดเข้าเด็ค</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="space-y-6">
                {/* Pokemon Section */}
                {groupedDeckCards.pokemon.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-purple-400 uppercase mb-3 flex items-center gap-2">
                      <span>👾 โปเกมอน ({stats.pokemonCount} ใบ)</span>
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                      {groupedDeckCards.pokemon.map(({ cardId, count, card }) => (
                        <DeckGridCardItem
                          key={cardId}
                          cardId={cardId}
                          count={count}
                          card={card}
                          missingInfo={missingInfoMap.get(cardId)}
                          isCover={deck.coverCardId === cardId}
                          onSelect={() => setPreviewCard(card || { id: cardId, name: cardId })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Trainer Section */}
                {groupedDeckCards.trainer.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-cyan-400 uppercase mb-3 flex items-center gap-2">
                      <span>🎒 เทรนเนอร์ ({stats.trainerCount} ใบ)</span>
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                      {groupedDeckCards.trainer.map(({ cardId, count, card }) => (
                        <DeckGridCardItem
                          key={cardId}
                          cardId={cardId}
                          count={count}
                          card={card}
                          missingInfo={missingInfoMap.get(cardId)}
                          isCover={deck.coverCardId === cardId}
                          onSelect={() => setPreviewCard(card || { id: cardId, name: cardId })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Energy Section */}
                {groupedDeckCards.energy.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-amber-400 uppercase mb-3 flex items-center gap-2">
                      <span>⚡ พลังงาน ({stats.energyCount} ใบ)</span>
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                      {groupedDeckCards.energy.map(({ cardId, count, card }) => (
                        <DeckGridCardItem
                          key={cardId}
                          cardId={cardId}
                          count={count}
                          card={card}
                          missingInfo={missingInfoMap.get(cardId)}
                          isCover={deck.coverCardId === cardId}
                          onSelect={() => setPreviewCard(card || { id: cardId, name: cardId })}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="space-y-6">
                {/* Pokemon List */}
                {groupedDeckCards.pokemon.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase mb-2">
                      👾 โปเกมอน ({stats.pokemonCount} ใบ)
                    </h4>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
                      {groupedDeckCards.pokemon.map(({ cardId, count, card }) => (
                        <DeckListRow
                          key={cardId}
                          cardId={cardId}
                          count={count}
                          card={card}
                          missingInfo={missingInfoMap.get(cardId)}
                          onSelect={() => setPreviewCard(card || { id: cardId, name: cardId })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Trainer List */}
                {groupedDeckCards.trainer.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase mb-2">
                      🎒 เทรนเนอร์ ({stats.trainerCount} ใบ)
                    </h4>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
                      {groupedDeckCards.trainer.map(({ cardId, count, card }) => (
                        <DeckListRow
                          key={cardId}
                          cardId={cardId}
                          count={count}
                          card={card}
                          missingInfo={missingInfoMap.get(cardId)}
                          onSelect={() => setPreviewCard(card || { id: cardId, name: cardId })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Energy List */}
                {groupedDeckCards.energy.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase mb-2">
                      ⚡ พลังงาน ({stats.energyCount} ใบ)
                    </h4>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
                      {groupedDeckCards.energy.map(({ cardId, count, card }) => (
                        <DeckListRow
                          key={cardId}
                          cardId={cardId}
                          count={count}
                          card={card}
                          missingInfo={missingInfoMap.get(cardId)}
                          onSelect={() => setPreviewCard(card || { id: cardId, name: cardId })}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyDeckList}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
              >
                <span>{copied ? '✅' : '📋'}</span>
                <span>{copied ? 'คัดลอกสำเร็จ!' : 'คัดลอก Deck List'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {onEditDeck && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditDeck();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <span>✏️</span>
                  <span>จัดเด็คนี้</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
              >
                ปิด
              </button>
            </div>
          </div>
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

      {/* High-res Card Zoom */}
      {previewCard && (
        <CardCollectionModal
          card={previewCard}
          deckId={deck.id}
          onClose={() => setPreviewCard(null)}
        />
      )}
    </>
  );
}

// Visual Card in Grid Mode
function DeckGridCardItem({
  cardId,
  count,
  card,
  missingInfo,
  isCover,
  onSelect,
}: {
  cardId: string;
  count: number;
  card: any;
  missingInfo?: MissingCardInfo;
  isCover: boolean;
  onSelect: () => void;
}) {
  const exactOwned = missingInfo?.exactOwned ?? 0;
  const missingCount = missingInfo ? missingInfo.missingCount : Math.max(0, count - exactOwned);
  const isMissing = missingCount > 0;
  const imgUrl = resolveCardImageUrl(card?.imageUrl);

  return (
    <div
      onClick={onSelect}
      className="group relative flex flex-col justify-between rounded-xl bg-slate-50 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/70 p-2 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:scale-105 select-none"
    >
      <div className="relative w-full aspect-[2.5/3.5] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-inner">
        <OptimizedCardImage
          src={imgUrl}
          alt={card?.name || cardId}
          priority={true}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          onError={(e) => handleCardImageError(e, card?.imageUrl)}
        />

        {/* Count Badge (Top Right) */}
        <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-xs shadow-md shadow-black/40 flex items-center gap-0.5">
          <span>×</span>
          <span>{count}</span>
        </div>

        {/* Cover Star */}
        {isCover && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-black shadow-md flex items-center gap-0.5">
            ★ ปก
          </div>
        )}

        {/* Missing Alert Badge (Bottom Left) */}
        {isMissing && (
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-rose-600/90 text-white font-bold text-[9px] shadow-md">
            ขาด {missingCount}
          </div>
        )}
      </div>

      <div className="mt-1.5 min-w-0">
        <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 font-mono">
          <span className="text-amber-600 dark:text-amber-400 font-bold truncate">{card?.set?.id || 'PROMO'}</span>
          <span>{card?.collectorNumber || card?.localId}</span>
        </div>
        <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
          {card?.name || cardId}
        </h5>
      </div>
    </div>
  );
}

// Row in List Mode
function DeckListRow({
  cardId,
  count,
  card,
  missingInfo,
  onSelect,
}: {
  cardId: string;
  count: number;
  card: any;
  missingInfo?: MissingCardInfo;
  onSelect: () => void;
}) {
  const exactOwned = missingInfo?.exactOwned ?? 0;
  const missingCount = missingInfo ? missingInfo.missingCount : Math.max(0, count - exactOwned);
  const isMissing = missingCount > 0;
  const imgUrl = resolveCardImageUrl(card?.imageUrl);

  return (
    <div
      onClick={onSelect}
      className="p-2.5 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-slate-900/80 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-11 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
          <OptimizedCardImage
            src={imgUrl}
            alt={card?.name || cardId}
            priority={true}
            className="w-full h-full object-cover"
            onError={(e) => handleCardImageError(e, card?.imageUrl)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <span className="text-amber-600 dark:text-amber-400 font-bold">{card?.set?.id || 'PROMO'}</span>
            <span>{card?.collectorNumber || card?.localId}</span>
          </div>
          <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-300">
            {card?.name || cardId}
          </h5>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 text-xs">
        {isMissing ? (
          <span className="text-rose-400 font-bold text-[11px]">
            ⚠️ ขาด {missingCount}
          </span>
        ) : (
          <span className="text-emerald-400 font-bold text-[11px]">
            ✅ มีครบ
          </span>
        )}
        <div className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 font-black">
          ×{count}
        </div>
      </div>
    </div>
  );
}
