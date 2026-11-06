export type Currency = 'THB' | 'USD' | 'EUR' | 'GBP' | 'JPY';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  label: string;
  defaultRate: number; // Against 1.0 USD
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'THB', symbol: '฿', label: 'THB (฿)', defaultRate: 35.5 },
  { code: 'USD', symbol: '$', label: 'USD ($)', defaultRate: 1.0 },
  { code: 'EUR', symbol: '€', label: 'EUR (€)', defaultRate: 0.92 },
  { code: 'GBP', symbol: '£', label: 'GBP (£)', defaultRate: 0.78 },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)', defaultRate: 155.0 },
];

export const DEFAULT_EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1.0,
  THB: 35.5,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 155.0,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  THB: '฿',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
};

export interface CardSaleTransaction {
  id: string;
  date: string; // ISO date string e.g. "2026-09-08"
  price: number; // in USD base
  condition: 'NM' | 'LP' | 'MP' | 'HP' | 'Foil' | 'PSA 10' | 'PSA 9' | 'BGS 9.5' | 'Raw';
  source: 'TCGplayer' | 'eBay' | 'Cardmarket' | 'Local Market' | 'Other';
  notes?: string;
}

export interface MarketPrice {
  cardId: string; // e.g. Thai card ID "SV8a-025" or EN card ID "sv8-25"
  enName?: string;
  regular: number | null; // USD base (normal print / market price)
  foil: number | null; // USD base (holofoil or reverse holofoil market price)
  psa10?: number | null; // PSA 10 estimated or last recorded price
  lastSold?: number | null;
  lastSoldDate?: string | null;
  recentSales?: CardSaleTransaction[];
  updatedAt: string; // ISO string
  source?: 'pokemontcg_io' | 'tcgplayer' | 'cardmarket' | 'tcgdex' | 'ebay_sold' | 'pricecharting' | 'admin_manual' | string;
  sourceLabel?: string;
  url?: string;
  isThaiEstimated?: boolean;
  enReference?: {
    regular: number | null;
    foil: number | null;
  };
}

export interface UserCardPrice {
  cardId: string;
  costPrice: number | null; // Purchase/Cost price per copy in user's currency
  sellPrice: number | null; // Target selling/valuation price per copy in user's currency
  currency: Currency;
  isGraded?: boolean;
  gradingCompany?: 'PSA' | 'BGS' | 'CGC' | 'OTHER' | 'RAW';
  grade?: string; // e.g. '10', '9.5', '9'
  notes?: string;
  updatedAt: string;
}

export interface CardPricingSummary {
  marketValueUSD: number;
  marketValueConverted: number;
  userCostConverted: number;
  userValuationConverted: number;
  currency: Currency;
}
