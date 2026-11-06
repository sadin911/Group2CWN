import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePricingStore } from '../../store/pricingStore';
import { useAuthStore } from '../../store/authStore';
import { SUPPORTED_CURRENCIES, type CardSaleTransaction } from '../../types/pricing';
import {
  getPriceSourceLabel,
  getPriceSourceIcon,
} from '../../services/pokemonPricingService';

interface Props {
  card: any;
  isFoil?: boolean;
  enName?: string;
  enSetId?: string;
  enNumber?: string;
  viewingLang?: 'TH' | 'EN';
  collectionCardId?: string;
}

export const CardPricingDetailSection: React.FC<Props> = ({
  card,
  isFoil = false,
  enName,
  enSetId,
  enNumber,
  viewingLang,
  collectionCardId,
}) => {
  const user = useAuthStore((s) => s.user);

  const currency = usePricingStore((s) => s.currency);
  const setCurrency = usePricingStore((s) => s.setCurrency);
  const exchangeRates = usePricingStore((s) => s.exchangeRates);
  const getCardMarketPrice = usePricingStore((s) => s.getCardMarketPrice);
  const getCardUserPrice = usePricingStore((s) => s.getCardUserPrice);
  const setUserPrice = usePricingStore((s) => s.setUserPrice);
  const deleteUserPrice = usePricingStore((s) => s.deleteUserPrice);
  const logCardSaleTransaction = usePricingStore((s) => s.logCardSaleTransaction);
  const fetchCardLivePrice = usePricingStore((s) => s.fetchCardLivePrice);
  const formatPrice = usePricingStore((s) => s.formatPrice);
  const formatRawCurrency = usePricingStore((s) => s.formatRawCurrency);

  const isEnView =
    viewingLang === 'EN' ||
    (card?.id || '').startsWith('EN-') ||
    !(card?.id || '').startsWith('TH-');

  const market = getCardMarketPrice(card.id, enName, { forceEnglishPrice: isEnView });
  const userPriceTargetId = collectionCardId || card.id;
  const userPrice = getCardUserPrice(userPriceTargetId);

  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceNotice, setPriceNotice] = useState<string | null>(null);

  // Collapsible panels
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [showLogSaleForm, setShowLogSaleForm] = useState(false);
  const [showCustomPricingForm, setShowCustomPricingForm] = useState(false);

  // Inline Log Sale Form state
  const [saleDate, setSaleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [salePriceInput, setSalePriceInput] = useState<string>('');
  const [saleCondition, setSaleCondition] = useState<CardSaleTransaction['condition']>('NM');
  const [saleSource, setSaleSource] = useState<CardSaleTransaction['source']>('eBay');
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [isSavingSale, setIsSavingSale] = useState(false);

  // Custom Pricing Form state
  const [costPriceInput, setCostPriceInput] = useState<string>(
    userPrice?.costPrice ? String(userPrice.costPrice) : ''
  );
  const [sellPriceInput, setSellPriceInput] = useState<string>(
    userPrice?.sellPrice ? String(userPrice.sellPrice) : ''
  );
  const [isGraded, setIsGraded] = useState<boolean>(userPrice?.isGraded ?? false);
  const [gradingCompany, setGradingCompany] = useState<any>(userPrice?.gradingCompany || 'PSA');
  const [gradeNumber, setGradeNumber] = useState<string>(userPrice?.grade || '10');
  const [customNotes, setCustomNotes] = useState<string>(userPrice?.notes || '');
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  // Effective English Search Name for External Portals
  const cleanEnName = (enName || card.name || '').replace(/\s*\([^)]*\)/g, '').trim();
  const cleanCardNumber = enNumber || card.collectorNumber || card.localId || '';

  // 1-Click Verification URLs
  const ebaySearchTerms = ['pokemon', cleanEnName];
  if (enSetId) ebaySearchTerms.push(enSetId);
  if (cleanCardNumber) ebaySearchTerms.push(cleanCardNumber);
  const ebaySoldUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
    ebaySearchTerms.join(' ')
  )}&LH_Sold=1&LH_Complete=1&_sop=12`;

  const tcgplayerUrl = `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(
    cleanEnName
  )}`;
  const pricechartingUrl = `https://www.pricecharting.com/search-products?type=prices&q=${encodeURIComponent(
    `pokemon ${cleanEnName}`
  )}`;
  const cardmarketUrl = `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(
    cleanEnName
  )}`;

  // Calculation of values
  const regularUSD = market?.regular ?? null;
  const foilUSD = market?.foil ?? null;

  // PSA 10 Price: if recorded, use it; otherwise estimate if high rarity or value > 0
  const recordedPsa10USD = market?.psa10 ?? null;
  const estimatedPsa10USD =
    recordedPsa10USD !== null
      ? recordedPsa10USD
      : foilUSD
      ? Math.round(foilUSD * 3.2 * 100) / 100
      : regularUSD
      ? Math.round(regularUSD * 2.8 * 100) / 100
      : null;

  // Last Sold Price: from market.lastSold or first recentSale
  const recentSalesList: CardSaleTransaction[] = Array.isArray(market?.recentSales)
    ? market!.recentSales
    : [];
  const latestSaleFromList = recentSalesList.length > 0 ? recentSalesList[0] : null;
  const lastSoldUSD = market?.lastSold ?? latestSaleFromList?.price ?? null;
  const lastSoldDateStr = market?.lastSoldDate ?? latestSaleFromList?.date ?? null;

  // Live price fetch action
  const handleFetchLivePrice = async () => {
    setIsFetchingPrice(true);
    setPriceNotice(null);

    const query = {
      cardId: card.id,
      enName: cleanEnName,
      number: cleanCardNumber,
      setCode: enSetId || card.set?.id,
    };

    try {
      const res = await fetchCardLivePrice(query);
      if (res) {
        const sourceName = res.sourceLabel || getPriceSourceLabel(res.source);
        const sourceIcon = getPriceSourceIcon(res.source, res.sourceLabel);
        const isFallback = res.source === 'cardmarket' || res.source === 'tcgdex';
        setPriceNotice(
          isFallback
            ? `✓ ไม่มีใน TCGplayer • ดึงราคาสำเร็จจาก ${sourceIcon} ${sourceName} (${formatPrice(res.regular ?? res.foil, currency)})`
            : `✓ อัปเดตราคาสำเร็จจาก ${sourceIcon} ${sourceName} (${formatPrice(res.regular ?? res.foil, currency)})`
        );
      } else {
        setPriceNotice('⚠️ ไม่พบข้อมูลราคาแบบเจาะจง กรุณาดูจากลิงก์ eBay ด้านล่าง');
      }
    } catch {
      setPriceNotice('❌ ดึงราคาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsFetchingPrice(false);
      setTimeout(() => setPriceNotice(null), 4500);
    }
  };

  // Log Sale submit
  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(salePriceInput);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('กรุณากรอกราคาที่ถูกต้อง');
      return;
    }

    setIsSavingSale(true);
    try {
      const rate = exchangeRates[currency] || 1.0;
      const priceUSD = priceNum / rate;

      await logCardSaleTransaction(userPriceTargetId, {
        date: saleDate || new Date().toISOString().split('T')[0],
        price: priceUSD,
        condition: saleCondition,
        source: saleSource,
        notes: saleNotes.trim(),
      });

      setSalePriceInput('');
      setSaleNotes('');
      setShowLogSaleForm(false);
      setShowSalesHistory(true);
    } catch (err) {
      console.error('Save sale failed:', err);
      alert('บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setIsSavingSale(false);
    }
  };

  // Custom Price submit
  const handleSaveCustomPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCustom(true);
    try {
      const costNum = costPriceInput.trim() ? parseFloat(costPriceInput) : null;
      const sellNum = sellPriceInput.trim() ? parseFloat(sellPriceInput) : null;

      await setUserPrice(
        userPriceTargetId,
        {
          costPrice: costNum,
          sellPrice: sellNum,
          currency,
          isGraded,
          gradingCompany: isGraded ? gradingCompany : 'RAW',
          grade: isGraded ? gradeNumber : undefined,
          notes: customNotes.trim(),
        },
        user?.uid
      );
      setShowCustomPricingForm(false);
    } catch (err) {
      console.error('Save custom price failed:', err);
      alert('บันทึกราคาของคุณไม่สำเร็จ');
    } finally {
      setIsSavingCustom(false);
    }
  };

  // Clear Custom Price
  const handleDeleteCustomPrice = async () => {
    if (!confirm('ต้องการล้างข้อมูลราคาและต้นทุนของคุณสำหรับการ์ดนี้ใช่หรือไม่?')) return;
    try {
      await deleteUserPrice(userPriceTargetId, user?.uid);
      setCostPriceInput('');
      setSellPriceInput('');
      setIsGraded(false);
      setCustomNotes('');
      setShowCustomPricingForm(false);
    } catch (err) {
      console.error('Delete custom price failed:', err);
    }
  };

  // Compute human-readable source label & icon
  const sourceLabel = getPriceSourceLabel(market?.source, market?.sourceLabel);
  const sourceIcon = getPriceSourceIcon(market?.source, market?.sourceLabel);
  const isFallbackSource = market?.source === 'cardmarket' || market?.source === 'tcgdex';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-3 sm:p-4 space-y-3.5 shadow-sm">
      {/* Header: Title + Currency Switcher + Refresh Button */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-lg">💵</span>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>ราคาตลาดและการประเมิน (Market Valuation)</span>
            </h3>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span>แหล่งราคา:</span>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isFallbackSource
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                }`}
                title={`ข้อมูลราคาอ้างอิงจาก ${sourceLabel}`}
              >
                <span>{sourceIcon}</span>
                <span>{sourceLabel}</span>
              </span>
              {isFallbackSource && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  (ไม่มีใน TCGplayer • ดึงจาก {sourceLabel})
                </span>
              )}
              {isEnView ? (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30"
                  title="ราคาตลาดการ์ดภาษาอังกฤษ (EN Market Price)"
                >
                  <span>🇺🇸</span>
                  <span>ราคาการ์ดภาษาอังกฤษ (EN Market)</span>
                </span>
              ) : market?.isThaiEstimated ? (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                  title="ประเมินราคาการ์ดไทยที่ 1/3 ของราคา EN อ้างอิงตามผลสำรวจตลาดจริง"
                >
                  <span>🇹🇭</span>
                  <span>ประเมินการ์ดไทย (1/3 ของราคา EN)</span>
                </span>
              ) : null}
              {market?.updatedAt && (
                <span className="opacity-75">
                  • {new Date(market.updatedAt).toLocaleDateString('th-TH')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Currency Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-[11px] font-bold">
            {SUPPORTED_CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setCurrency(c.code)}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  currency === c.code
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {c.symbol}
              </button>
            ))}
          </div>

          {/* Live Fetch Refresh Button */}
          <button
            type="button"
            disabled={isFetchingPrice}
            onClick={handleFetchLivePrice}
            className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 active:scale-95 text-sky-600 dark:text-sky-300 border border-sky-500/30 text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50"
            title="ดึงราคาตลาดสดจากฐานข้อมูลกลาง"
          >
            {isFetchingPrice ? (
              <>
                <span className="inline-block animate-spin text-[11px]">⏳</span>
                <span className="hidden sm:inline">กำลังดึง...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span className="hidden sm:inline">รีเฟรช</span>
              </>
            )}
          </button>
        </div>
      </div>

      {priceNotice && (
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold">
          {priceNotice}
        </div>
      )}

      {/* 4 Stat Boxes (2x2 Grid Layout for perfect responsive width and zero overflow) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Box 1: Regular Market Price */}
        <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/70 flex flex-col justify-between overflow-hidden min-w-0 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold truncate gap-1">
            <span className="truncate">ปกติ (Regular)</span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                {sourceLabel}
              </span>
              <span className="text-xs">📄</span>
            </div>
          </div>
          <div className="my-1.5 overflow-hidden min-w-0">
            <div
              className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight truncate tabular-nums"
              title={formatPrice(regularUSD, currency)}
            >
              {formatPrice(regularUSD, currency)}
            </div>
            {currency !== 'USD' && regularUSD !== null && (
              <div className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                {formatPrice(regularUSD, 'USD')}
              </div>
            )}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
            {regularUSD ? `ราคาการ์ดใบปกติ (${sourceLabel})` : 'ไม่มีข้อมูล'}
          </div>
        </div>

        {/* Box 2: Foil / Holo Market Price */}
        <div
          className={`p-3 rounded-2xl border flex flex-col justify-between overflow-hidden min-w-0 transition-all ${
            isFoil
              ? 'border-amber-400/80 dark:border-amber-500/70 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-cyan-500/10 shadow-sm ring-1 ring-amber-400/30'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/70 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold truncate gap-1">
            <span className="truncate">✨ ฟอยล์ (Foil)</span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-normal">
                {sourceLabel}
              </span>
              {isFoil && (
                <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-500 text-slate-950">
                  ACTIVE
                </span>
              )}
            </div>
          </div>
          <div className="my-1.5 overflow-hidden min-w-0">
            <div
              className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-300 font-mono tracking-tight truncate tabular-nums"
              title={formatPrice(foilUSD ?? (regularUSD ? regularUSD * 1.5 : null), currency)}
            >
              {formatPrice(foilUSD ?? (regularUSD ? regularUSD * 1.5 : null), currency)}
            </div>
            {currency !== 'USD' && (foilUSD || regularUSD) && (
              <div className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                {formatPrice(foilUSD ?? regularUSD! * 1.5, 'USD')}
              </div>
            )}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
            {foilUSD ? `ราคาฟอยล์ (${sourceLabel})` : regularUSD ? 'ประเมินฟอยล์' : 'ไม่มีข้อมูล'}
          </div>
        </div>

        {/* Box 3: PSA 10 (Graded) */}
        <div className="p-3 rounded-2xl border border-amber-300/80 dark:border-amber-500/60 bg-gradient-to-br from-amber-500/15 via-yellow-500/5 to-transparent dark:bg-slate-950/80 flex flex-col justify-between overflow-hidden min-w-0 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 font-black truncate">
            <span>🏆 เกรด PSA 10</span>
            <span className="text-xs shrink-0">💎</span>
          </div>
          <div className="my-1.5 overflow-hidden min-w-0">
            <div
              className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight truncate tabular-nums"
              title={formatPrice(estimatedPsa10USD, currency)}
            >
              {formatPrice(estimatedPsa10USD, currency)}
            </div>
            {currency !== 'USD' && estimatedPsa10USD !== null && (
              <div className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                {formatPrice(estimatedPsa10USD, 'USD')}
              </div>
            )}
          </div>
          <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 truncate">
            {recordedPsa10USD ? 'ราคาเกรด PSA 10 จริง' : estimatedPsa10USD ? 'ราคาประเมิน Gem Mint' : 'ไม่มีข้อมูล'}
          </div>
        </div>

        {/* Box 4: Last Sold (eBay / Market Confirmed) */}
        <div className="p-3 rounded-2xl border border-emerald-400/80 dark:border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col justify-between overflow-hidden min-w-0 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-black truncate">
            <span>📉 ขายล่าสุด (Last Sold)</span>
            <span className="text-xs shrink-0">🏷️</span>
          </div>
          <div className="my-1.5 overflow-hidden min-w-0">
            <div
              className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono tracking-tight truncate tabular-nums"
              title={formatPrice(lastSoldUSD, currency)}
            >
              {formatPrice(lastSoldUSD, currency)}
            </div>
            {currency !== 'USD' && lastSoldUSD !== null && (
              <div className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                {formatPrice(lastSoldUSD, 'USD')}
              </div>
            )}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400/90 truncate">
            {lastSoldDateStr ? `ปิดการขาย: ${lastSoldDateStr}` : 'คลิกดูราคา eBay'}
          </div>
        </div>
      </div>

      {/* Thai Card 1/3 Market Ratio Reference Info (When viewing Thai card) */}
      {!isEnView && market?.isThaiEstimated && market.enReference && (
        <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 flex-wrap">
            <span>💡</span>
            <span>
              <strong>ราคาอ้างอิงการ์ดภาษาอังกฤษ (EN Ref):</strong> ปกติ {formatPrice(market.enReference.regular, currency)} • ฟอยล์ {formatPrice(market.enReference.foil, currency)}
            </span>
          </span>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-black">
            (ราคาการ์ดไทยประเมินที่ = ราคา EN ÷ 3)
          </span>
        </div>
      )}

      {/* English Card Thai Equivalent Estimate Info (When viewing English card) */}
      {isEnView && (market?.regular != null || market?.foil != null) && (
        <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 flex-wrap">
            <span>🇹🇭</span>
            <span>
              <strong>ราคาประเมินเวอร์ชันการ์ดไทยเทียบเคียง (Thai Ref):</strong> ปกติ {formatPrice(market.regular != null ? Math.round((market.regular / 3) * 100) / 100 : null, currency)}
              {market.foil != null && (
                <span> • ฟอยล์ {formatPrice(Math.round((market.foil / 3) * 100) / 100, currency)}</span>
              )}
            </span>
          </span>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-black">
            (สูตรสำรวจตลาด: EN ÷ 3)
          </span>
        </div>
      )}

      {/* 1-Click Verification External Links (Clean 2x2 Grid with zero overflow) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span>🔗</span>
            <span>ตรวจสอบราคาตลาดจริง (1-Click Verification):</span>
          </span>
          <span className="text-[10px] text-slate-400">เปิดแท็บใหม่</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {/* eBay Sold Link (Special focus requested by user) */}
          <a
            href={ebaySoldUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 border border-blue-400/40 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-xs min-w-0 overflow-hidden"
            title="ดูประวัติการขายที่จบประมูลและขายจริงบน eBay (LH_Sold=1)"
          >
            <span className="shrink-0">🛒</span>
            <span className="truncate">eBay Sold</span>
            <span className="text-[10px] font-normal opacity-75 shrink-0">↗</span>
          </a>

          {/* TCGplayer Link */}
          <a
            href={tcgplayerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-xs min-w-0 overflow-hidden"
          >
            <span className="shrink-0">⚡</span>
            <span className="truncate">TCGplayer</span>
            <span className="text-[10px] font-normal opacity-75 shrink-0">↗</span>
          </a>

          {/* PriceCharting Link */}
          <a
            href={pricechartingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-xs min-w-0 overflow-hidden"
          >
            <span className="shrink-0">📈</span>
            <span className="truncate">PriceCharting</span>
            <span className="text-[10px] font-normal opacity-75 shrink-0">↗</span>
          </a>

          {/* Cardmarket Link */}
          <a
            href={cardmarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-xs min-w-0 overflow-hidden"
          >
            <span className="shrink-0">🇪🇺</span>
            <span className="truncate">Cardmarket</span>
            <span className="text-[10px] font-normal opacity-75 shrink-0">↗</span>
          </a>
        </div>
      </div>

      {/* Action Toggles: Log Sale & Custom User Pricing */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2.5 border-t border-slate-200 dark:border-slate-800/80">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <button
            type="button"
            onClick={() => setShowSalesHistory(!showSalesHistory)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border active:scale-95 min-w-0 ${
              showSalesHistory
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
          >
            <span className="shrink-0">📜</span>
            <span className="truncate">ประวัติการขาย</span>
            {recentSalesList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black shrink-0">
                {recentSalesList.length}
              </span>
            )}
            <span className="text-[10px] shrink-0">{showSalesHistory ? '▲' : '▼'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLogSaleForm(!showLogSaleForm)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95 min-w-0"
          >
            <span className="shrink-0">+</span>
            <span className="truncate">บันทึกราคาขาย</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowCustomPricingForm(!showCustomPricingForm)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border active:scale-95 min-w-0 ${
            showCustomPricingForm || userPrice?.sellPrice || userPrice?.costPrice
              ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/50 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
          }`}
        >
          <span className="shrink-0">🏷️</span>
          <span className="truncate">ราคาของฉัน</span>
          {(userPrice?.costPrice || userPrice?.sellPrice) && (
            <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-mono font-black shrink-0">
              {formatRawCurrency(userPrice.sellPrice ?? userPrice.costPrice, userPrice.currency)}
            </span>
          )}
          <span className="text-[10px] shrink-0">{showCustomPricingForm ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Sales History Panel */}
      <AnimatePresence>
        {showSalesHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 pt-2 overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 text-xs">
              <div className="font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                <span>รายการซื้อ-ขายล่าสุด (Recent Transactions)</span>
                <span className="text-[10px] text-slate-400">เรียงตามวันที่</span>
              </div>

              {recentSalesList.length === 0 ? (
                <div className="py-4 text-center text-slate-400">
                  <p>ยังไม่มีรายการบันทึกซื้อ-ขายสำหรับการ์ดนี้</p>
                  <p className="text-[11px] mt-1 text-slate-500">
                    คลิก "+ บันทึกราคาขาย" เพื่อบันทึกราคาที่คุณพบหรือขายได้
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {recentSalesList.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {sale.source}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          {sale.condition}
                        </span>
                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-400">{sale.date}</span>
                          {sale.notes && (
                            <span className="text-[11px] text-slate-500 ml-1.5 truncate">
                              ({sale.notes})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm shrink-0">
                        {formatPrice(sale.price, currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log Sale Form */}
      <AnimatePresence>
        {showLogSaleForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSaveSale}
            className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-500/40 space-y-2.5 overflow-hidden"
          >
            <div className="font-black text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <span>+ บันทึกราคาซื้อ-ขายจริง (Log New Transaction)</span>
              <button
                type="button"
                onClick={() => setShowLogSaleForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  ราคาขาย ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="เช่น 150"
                  value={salePriceInput}
                  onChange={(e) => setSalePriceInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  สภาพการ์ด
                </label>
                <select
                  value={saleCondition}
                  onChange={(e) => setSaleCondition(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="NM">NM (สมบูรณ์)</option>
                  <option value="Foil">Foil / Holo</option>
                  <option value="PSA 10">PSA 10 Gem Mint</option>
                  <option value="PSA 9">PSA 9 Mint</option>
                  <option value="BGS 9.5">BGS 9.5</option>
                  <option value="LP">LP (มีรอยเล็กน้อย)</option>
                  <option value="MP">MP (มีตำหนิ)</option>
                  <option value="HP">HP (เสียหาย)</option>
                  <option value="Raw">Raw Card</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  แหล่งที่มา
                </label>
                <select
                  value={saleSource}
                  onChange={(e) => setSaleSource(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="eBay">eBay</option>
                  <option value="TCGplayer">TCGplayer</option>
                  <option value="Cardmarket">Cardmarket</option>
                  <option value="Local Market">ตลาดในไทย (Facebook / กลุ่ม)</option>
                  <option value="Other">อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  วันที่ขาย
                </label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="หมายเหตุเพิ่มเติม เช่น จบประมูล, พร้อมกรอบแม่เหล็ก..."
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={isSavingSale}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-xs shrink-0"
              >
                {isSavingSale ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* My Custom Pricing Form */}
      <AnimatePresence>
        {showCustomPricingForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSaveCustomPrice}
            className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-300 dark:border-purple-500/40 space-y-2.5 overflow-hidden"
          >
            <div className="font-black text-xs text-purple-800 dark:text-purple-300 flex items-center justify-between">
              <span>🏷️ กำหนดราคาและต้นทุนของฉัน (My Custom Valuation)</span>
              <button
                type="button"
                onClick={() => setShowCustomPricingForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  ต้นทุนซื้อมาต่อใบ ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="เช่น 100"
                  value={costPriceInput}
                  onChange={(e) => setCostPriceInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  ราคาประเมิน / ตั้งขาย ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="เช่น 250"
                  value={sellPriceInput}
                  onChange={(e) => setSellPriceInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  การ์ดส่งเกรดหรือไม่
                </label>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsGraded(!isGraded)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                      isGraded
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isGraded ? '🏆 มีเกรด' : '📄 การ์ดดิบ (Raw)'}
                  </button>
                  {isGraded && (
                    <select
                      value={gradingCompany}
                      onChange={(e) => setGradingCompany(e.target.value as any)}
                      className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                    >
                      <option value="PSA">PSA</option>
                      <option value="BGS">BGS</option>
                      <option value="CGC">CGC</option>
                      <option value="OTHER">Other</option>
                    </select>
                  )}
                  {isGraded && (
                    <input
                      type="text"
                      placeholder="10"
                      value={gradeNumber}
                      onChange={(e) => setGradeNumber(e.target.value)}
                      className="w-12 text-center px-1 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold font-mono"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="บันทึกส่วนตัว เช่น ซื้อจากงานการ์ด, มีตำหนิด้านหลัง..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />

              {userPrice && (
                <button
                  type="button"
                  onClick={handleDeleteCustomPrice}
                  className="px-3 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 text-xs font-bold border border-rose-400/30 shrink-0"
                >
                  ล้างราคา
                </button>
              )}

              <button
                type="submit"
                disabled={isSavingCustom}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-all shadow-xs shrink-0"
              >
                {isSavingCustom ? 'กำลังบันทึก...' : 'บันทึกราคา'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};
