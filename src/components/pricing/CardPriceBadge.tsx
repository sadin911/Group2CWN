import React from 'react';
import { usePricingStore } from '../../store/pricingStore';

interface Props {
  cardId: string;
  enName?: string;
  isFoil?: boolean;
  showDualCurrency?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  forceEnglishPrice?: boolean;
}

export const CardPriceBadge: React.FC<Props> = ({
  cardId,
  enName,
  isFoil = false,
  showDualCurrency = true,
  size = 'md',
  className = '',
  onClick,
  forceEnglishPrice,
}) => {
  const getCardMarketPrice = usePricingStore((s) => s.getCardMarketPrice);
  const getCardUserPrice = usePricingStore((s) => s.getCardUserPrice);
  const currency = usePricingStore((s) => s.currency);
  const formatPrice = usePricingStore((s) => s.formatPrice);
  const formatRawCurrency = usePricingStore((s) => s.formatRawCurrency);

  const isEn = forceEnglishPrice || cardId.startsWith('EN-') || !cardId.startsWith('TH-');
  const market = getCardMarketPrice(cardId, enName, { forceEnglishPrice: isEn });
  const user = getCardUserPrice(cardId);

  const priceUSD = isFoil ? (market?.foil ?? market?.regular) : (market?.regular ?? market?.foil);

  if (!priceUSD && !user?.sellPrice && !user?.costPrice) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded',
    md: 'text-xs px-2 py-0.5 rounded-md',
    lg: 'text-sm px-2.5 py-1 rounded-lg font-semibold',
  }[size];

  // User valuation takes precedence if set
  if (user?.sellPrice) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 font-medium bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 shadow-sm backdrop-blur-xs transition-colors hover:bg-emerald-900/80 ${sizeClasses} ${className}`}
        title={`User Custom Price: ${formatRawCurrency(user.sellPrice, user.currency)}`}
      >
        <span className="text-[9px] uppercase tracking-wider opacity-70">VAL</span>
        <span>{formatRawCurrency(user.sellPrice, user.currency)}</span>
      </button>
    );
  }

  const sourceChip =
    market?.source === 'cardmarket'
      ? 'CM'
      : market?.source === 'tcgdex'
      ? 'DEX'
      : market?.source === 'ebay_sold'
      ? 'EBAY'
      : 'TCG';

  const sourceTitle = `${
    market?.sourceLabel || (market?.source === 'cardmarket' ? 'Cardmarket' : market?.source === 'tcgdex' ? 'TCGdex' : 'TCGplayer')
  } (${isFoil ? 'Foil' : 'Regular'})${market?.isThaiEstimated ? ' • ประเมินการ์ดไทย (1/3 ของราคา EN)' : isEn ? ' • Market Price (EN Market)' : ' • Market Price'}`;

  return (
    <button
      type="button"
      data-testid="card-price-badge"
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-medium bg-slate-900/80 border border-amber-500/30 text-amber-300 shadow-sm backdrop-blur-xs transition-colors hover:bg-slate-800/90 ${sizeClasses} ${className}`}
      title={sourceTitle}
    >
      <span className="text-[9px] uppercase tracking-wider opacity-70">{sourceChip}</span>
      <span>{formatPrice(priceUSD, currency)}</span>
      {showDualCurrency && currency !== 'USD' && priceUSD !== null && priceUSD !== undefined && (
        <span className="text-[10px] text-slate-400 font-normal">
          ({formatPrice(priceUSD, 'USD')})
        </span>
      )}
    </button>
  );
};
