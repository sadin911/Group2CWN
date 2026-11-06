import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { isCardFoil, foilPulseDelay } from '../../utils/cardFoil';
import { OptimizedCardImage } from '../common/OptimizedCardImage';
import { CardPriceBadge } from '../pricing/CardPriceBadge';
import { getEnglishCardName } from '../../utils/searchHelpers';
import { isAceSpecCard } from '../../utils/rarity';
import type { CardVariantCount } from '../../types/collection';

interface Props {
  card: any;
  variants: CardVariantCount;
  isWishlist?: boolean;
  showFullColor?: boolean;
  priority?: boolean;
  onSelect: (card: any) => void;
  onQuickAdd: (card: any) => void;
  onToggleWishlist: (cardId: string) => void;
}

export function CollectionCardItem({
  card,
  variants,
  isWishlist,
  showFullColor,
  priority = false,
  onSelect,
  onQuickAdd,
  onToggleWishlist,
}: Props) {
  const totalCount = variants.normal + variants.holo + variants.reverse + variants.promo;
  const isOwned = totalCount > 0;
  const isFoil = isCardFoil(card, variants);
  const pulseDelay = foilPulseDelay(card.id || '');
  const isAceSpec = isAceSpecCard(card);

  const imgUrl = resolveCardImageUrl(card.imageUrl);

  return (
    <div
      data-testid="collection-card-item"
      data-card-id={card.id}
      className={`group relative rounded-xl p-2 sm:p-2.5 transition-all duration-300 ease-out transform-gpu flex flex-col justify-between select-none hover:scale-[1.06] hover:-translate-y-1.5 hover:z-30 hover:shadow-2xl hover:shadow-black/80 ${
        isOwned
          ? 'bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-amber-400 dark:border-amber-500/50 shadow-md dark:shadow-lg dark:shadow-black/40 ring-1 ring-amber-400/40 hover:border-amber-500 hover:ring-2 hover:ring-amber-400/50'
          : showFullColor
          ? 'bg-white dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-amber-500/50 shadow-sm'
          : 'bg-white/80 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
      }`}
    >
      {/* Card Image Box */}
      <div
        onClick={() => onSelect(card)}
        className="relative w-full aspect-[2.5/3.5] rounded-lg overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-950 shadow-inner group-hover:scale-[1.02] transition-transform duration-300 ease-out"
      >
        <OptimizedCardImage
          src={imgUrl}
          alt={card.name}
          priority={priority}
          className={`w-full h-full object-cover transition-all duration-300 ${
            isOwned || showFullColor
              ? 'brightness-100 contrast-[105%]'
              : 'grayscale-[85%] opacity-40 group-hover:opacity-85 group-hover:grayscale-[20%]'
          }`}
          onError={(e) => handleCardImageError(e, card.imageUrl, card.officialImageUrl, card.enImageUrl || card.enOfficialImageUrl)}
        />

        {/* Subtle Foil Shimmer Overlay for Foil Cards */}
        {isFoil && (
          <div
            className="foil-holo opacity-30 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            aria-hidden="true"
            style={{ animationDelay: `${pulseDelay}s` }}
          />
        )}

        {/* Owned Badge */}
        {isOwned && (
          <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[11px] shadow-md shadow-amber-500/30 flex items-center gap-0.5">
            <span>×</span>
            <span>{totalCount}</span>
          </div>
        )}

        {/* Wishlist Star (Touch friendly with expanded hit area) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(card.id);
          }}
          className={`absolute top-1.5 left-1.5 w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all shadow-md after:absolute after:-inset-2 after:content-[''] ${
            isWishlist
              ? 'bg-amber-400 text-slate-950 scale-110 shadow-amber-500/50'
              : 'bg-black/60 text-slate-400 hover:text-amber-300 hover:bg-black/80'
          }`}
          title={isWishlist ? 'อยู่ใน Wishlist (คลิกเพื่อยกเลิก)' : 'เพิ่มใน Wishlist'}
        >
          ★
        </button>

        {/* Live Market Price Chip */}
        <div className="absolute bottom-1.5 left-1.5 pointer-events-none">
          <CardPriceBadge
            cardId={card.id}
            enName={card.nameEn || getEnglishCardName(card) || undefined}
            isFoil={isFoil}
            size="sm"
            showDualCurrency={false}
            className="!px-1.5 !py-0.5 !text-[9px] font-bold shadow-md bg-slate-950/80 backdrop-blur-xs"
          />
        </div>

        {/* Quick +1 Add Overlay Button (Enhanced 36-44px touch target) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd(card);
          }}
          className="absolute bottom-1.5 right-1.5 w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-600/95 hover:bg-indigo-500 active:scale-90 text-white font-black text-sm sm:text-base shadow-lg shadow-black/60 flex items-center justify-center transition-all opacity-90 sm:opacity-100 xl:opacity-0 xl:group-hover:opacity-100 hover:scale-110 after:absolute after:-inset-1.5 after:content-['']"
          title="แตะเพื่อเพิ่มจำนวน (+1 Normal)"
        >
          +
        </button>
      </div>

      {/* Card Info & Badges */}
      <div className="mt-2 flex flex-col justify-between flex-1">
        <div onClick={() => onSelect(card)} className="cursor-pointer">
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <div className="flex items-center gap-1 min-w-0">
              <span className="truncate">{card.set?.id || 'PROMO'}</span>
              {card.regulationMark && (
                <span
                  className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shrink-0"
                  title={`Regulation Mark ${card.regulationMark}`}
                >
                  {card.regulationMark}
                </span>
              )}
              {isAceSpec && (
                <span
                  className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 text-white shadow-xs shrink-0"
                  title="การ์ด ACE SPEC"
                >
                  ACE
                </span>
              )}
            </div>
            <span>{card.collectorNumber || card.localId}</span>
          </div>
          <h4
            className={`text-xs font-bold truncate leading-snug mt-0.5 ${
              isOwned ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
            }`}
            title={card.name}
          >
            {card.name}
          </h4>
        </div>

        {/* Variant Breakdown Badges */}
        <div className="mt-1.5 flex items-center gap-1 flex-wrap text-[9px] font-bold">
          {variants.normal > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
              N:{variants.normal}
            </span>
          )}
          {variants.holo > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
              H:{variants.holo}
            </span>
          )}
          {variants.reverse > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30">
              R:{variants.reverse}
            </span>
          )}
          {variants.promo > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30">
              P:{variants.promo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
