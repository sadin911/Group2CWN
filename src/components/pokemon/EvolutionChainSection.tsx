import { useState, useMemo } from 'react';
import { getEvolutionChain, type EvolutionStep } from '../../utils/evolutionHelpers';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { getCardRarityClass } from '../../utils/rarity';

interface Props {
  currentCard: any;
  onSelectCard?: (card: any) => void;
}

const RARITY_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  UR: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/60', label: '👑 UR' },
  HR: { bg: 'bg-gradient-to-r from-pink-500/25 via-purple-500/25 to-cyan-500/25', text: 'text-pink-200', border: 'border-purple-400/60', label: '🌈 HR' },
  SAR: { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-300', border: 'border-fuchsia-500/60', label: '🌟 SAR' },
  AR: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/60', label: '🎨 AR' },
  SR: { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/60', label: '💎 SR' },
  EX: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/60', label: '⚡ ex' },
  VMAX: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/60', label: '🔥 VMAX' },
  VSTAR: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/60', label: '⭐ VSTAR' },
  V: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/60', label: '⚡ V' },
  PROMO: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/60', label: '🎁 Promo' },
  REGULAR: { bg: 'bg-slate-800/80', text: 'text-slate-400', border: 'border-slate-700', label: '⚪ C/R' },
};

export function EvolutionChainSection({ currentCard, onSelectCard }: Props) {
  const [selectedStageName, setSelectedStageName] = useState<string | 'ALL'>('ALL');
  const [showAllRarities, setShowAllRarities] = useState(true);

  const chain: EvolutionStep[] = useMemo(() => {
    return getEvolutionChain(currentCard);
  }, [currentCard]);

  // Aggregate all card prints in the chain
  const allEvolutionCards = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    for (const step of chain) {
      if (selectedStageName !== 'ALL' && step.name !== selectedStageName) {
        continue;
      }
      for (const card of step.allCards) {
        if (!seen.has(card.id)) {
          seen.add(card.id);
          list.push(card);
        }
      }
    }

    // Sort cards by High Rarity first (UR, HR, SAR, AR, SR, EX, Promo, Regular)
    const RARITY_PRIORITY: Record<string, number> = {
      UR: 10,
      HR: 9,
      SAR: 8,
      AR: 7,
      SR: 6,
      VMAX: 5,
      VSTAR: 5,
      EX: 4,
      V: 3,
      PROMO: 2,
      REGULAR: 1,
    };

    return list.sort((a, b) => {
      const rarA = getCardRarityClass(a);
      const rarB = getCardRarityClass(b);
      const pA = RARITY_PRIORITY[rarA] || 0;
      const pB = RARITY_PRIORITY[rarB] || 0;
      if (pA !== pB) return pB - pA;
      return (b.collectorNumber || '').localeCompare(a.collectorNumber || '');
    });
  }, [chain, selectedStageName]);

  if (!chain || chain.length <= 1) {
    return null;
  }

  const totalCardsInLine = chain.reduce((acc, s) => acc + s.cardsCount, 0);

  return (
    <div className="space-y-3 pt-3 border-t border-slate-800/90">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">🧬</span>
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
            สายวิวัฒนาการ & ทุก Rarity (Evolution & Rarities)
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-semibold">
            {chain.length} ร่าง ({totalCardsInLine} แบบการ์ด)
          </span>
          <button
            type="button"
            onClick={() => setShowAllRarities(!showAllRarities)}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            {showAllRarities ? 'ย่อลง ▲' : 'ดูทุก Rarity ▼'}
          </button>
        </div>
      </div>

      {/* Main Stage Flow Navigation */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
        {chain.map((step, idx) => {
          const imgUrl = resolveCardImageUrl(
            step.representativeCard.imageUrl || step.representativeCard.imageUrlHigh
          );
          const isCurrent = step.isCurrent;
          const isTabActive = selectedStageName === step.name;

          return (
            <div key={`${step.name}-${idx}`} className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-[130px] sm:min-w-0 shrink-0">
              {idx > 0 && (
                <span className="text-slate-600 font-bold text-xs sm:text-sm select-none shrink-0 hidden sm:inline">
                  →
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  if (onSelectCard && !isCurrent) {
                    onSelectCard(step.representativeCard);
                  }
                  setSelectedStageName(step.name);
                }}
                className={`group/evo relative w-full flex items-center gap-2 p-2 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                  isCurrent
                    ? 'bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-slate-900 border-amber-500 shadow-lg shadow-amber-500/15 ring-2 ring-amber-500/50'
                    : isTabActive
                    ? 'bg-slate-800/90 border-slate-600'
                    : 'bg-slate-950/80 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 active:scale-95'
                }`}
                title={`ดูการ์ด ${step.name} (${step.cardsCount} แบบ)`}
              >
                {/* Thumbnail */}
                <div className="relative w-8 h-11 rounded-lg overflow-hidden bg-slate-900 shrink-0 shadow-md">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={step.name}
                      loading="lazy"
                      onError={(e) =>
                        handleCardImageError(
                          e,
                          step.representativeCard.imageUrl,
                          step.representativeCard.officialImageUrl
                        )
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-500">
                      TCG
                    </div>
                  )}
                </div>

                {/* Text Details */}
                <div className="flex flex-col min-w-0 flex-1 pr-0.5">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span
                      className={`text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none ${
                        step.stage === 'พื้นฐาน'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                          : step.stage === 'ร่าง 1'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                          : step.stage === 'ร่าง 2'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/50'
                      }`}
                    >
                      {step.stage}
                    </span>
                  </div>

                  <span className={`text-xs font-black truncate mt-1 transition-colors ${isCurrent ? 'text-amber-300' : 'text-white group-hover/evo:text-amber-300'}`}>
                    {step.name}
                  </span>

                  <span className="text-[10px] text-slate-400 truncate">
                    {step.cardsCount} แบบการ์ด
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Rarity Filter Tabs & Card Gallery */}
      {showAllRarities && (
        <div className="space-y-2.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 shadow-inner">
          {/* Stage Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedStageName('ALL')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all whitespace-nowrap border ${
                selectedStageName === 'ALL'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              ทั้งหมดทุกร่าง ({totalCardsInLine})
            </button>

            {chain.map((step) => (
              <button
                key={step.name}
                type="button"
                onClick={() => setSelectedStageName(step.name)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all whitespace-nowrap border flex items-center gap-1 ${
                  selectedStageName === step.name
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                <span>{step.name}</span>
                <span className="text-[9px] opacity-75 font-normal">({step.cardsCount})</span>
              </button>
            ))}
          </div>

          {/* Cards Grid Showing All Rarities */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-56 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-700">
            {allEvolutionCards.map((card) => {
              const cardRarity = getCardRarityClass(card);
              const badge = RARITY_COLORS[cardRarity] || RARITY_COLORS.REGULAR;
              const isSelected = card.id === currentCard.id;
              const cardImg = resolveCardImageUrl(card.imageUrlHigh || card.imageUrl);

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onSelectCard?.(card)}
                  className={`group/card relative flex flex-col p-1.5 rounded-xl border transition-all duration-200 text-left ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20 scale-[1.03]'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-600 hover:bg-slate-800/90 hover:scale-[1.03] active:scale-95'
                  }`}
                  title={`${card.name} · ${card.set?.id || 'PROMO'} #${card.collectorNumber || card.localId} (${badge.label})`}
                >
                  {/* Card Thumbnail */}
                  <div className="relative w-full aspect-[2.5/3.5] rounded-lg overflow-hidden bg-slate-950 shadow-md">
                    <img
                      src={cardImg}
                      alt={card.name}
                      loading="lazy"
                      onError={(e) => handleCardImageError(e, card.imageUrl, card.officialImageUrl)}
                      className="w-full h-full object-cover"
                    />

                    {/* Active Checkmark Pill */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-md">
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Rarity & Set Tag */}
                  <div className="mt-1 flex items-center justify-between gap-1 w-full text-[9px] font-bold">
                    <span className={`px-1 py-0.2 rounded font-black border ${badge.bg} ${badge.text} ${badge.border} truncate`}>
                      {badge.label}
                    </span>
                    <span className="text-slate-400 font-mono truncate">
                      {card.set?.id || 'P'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
