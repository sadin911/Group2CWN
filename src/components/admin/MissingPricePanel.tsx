import { useState, useMemo, useEffect } from 'react';
import pokemonCardData from '../../data/pokemonNames.json';
import cardMap from '../../data/thaiEnglishCardMap.json';
import { usePricingStore } from '../../store/pricingStore';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import {
  computePriceCoverage,
  formatPriceCoverageReport,
  REASON_LABELS,
  type MissingPriceReason,
} from '../../utils/priceCoverage';

const REASON_STYLES: Record<MissingPriceReason, string> = {
  unpaired: 'bg-slate-700 text-slate-200 border-slate-600',
  enUnpriced: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  unexpected: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

const PAGE_SIZE = 30;

export function MissingPricePanel() {
  const marketPrices = usePricingStore((s) => s.marketPrices);
  const marketLoaded = usePricingStore((s) => s.marketLoaded);
  const pricesLoading = usePricingStore((s) => s.loading);
  const initPricing = usePricingStore((s) => s.initPricing);
  const adminUpdateMarketPrice = usePricingStore((s) => s.adminUpdateMarketPrice);

  const [selectedSet, setSelectedSet] = useState<string>('ALL');
  const [selectedReason, setSelectedReason] = useState<'ALL' | MissingPriceReason>('ALL');
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const coverage = useMemo(
    () =>
      computePriceCoverage(
        pokemonCardData as any[],
        marketPrices as Record<string, any>,
        cardMap as Record<string, any>
      ),
    [marketPrices]
  );

  const filtered = useMemo(() => {
    return coverage.cards.filter(
      (c) =>
        (selectedSet === 'ALL' || c.setId === selectedSet) &&
        (selectedReason === 'ALL' || c.reason === selectedReason)
    );
  }, [coverage.cards, selectedSet, selectedReason]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatPriceCoverageReport(coverage));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = async (cardId: string) => {
    const value = parseFloat(draftPrice);
    if (!isFinite(value) || value <= 0) return;
    setSaving(true);
    try {
      // Writes to the shared market_prices collection, which is why this panel
      // lives behind the admin gate rather than in the collection UI.
      await adminUpdateMarketPrice(cardId, { regular: value });
      setEditing(null);
      setDraftPrice('');
    } finally {
      setSaving(false);
    }
  };

  // Until the price data has loaded, every card looks unpriced. Reporting that
  // would tell an admin the catalogue has no prices at all, so wait instead.
  useEffect(() => {
    if (!marketLoaded && !pricesLoading) initPricing();
  }, [marketLoaded, pricesLoading, initPricing]);

  if (!marketLoaded) {
    return (
      <div
        data-testid="missing-price-loading"
        className="py-16 text-center text-sm font-bold text-slate-400"
      >
        <span className="block text-3xl mb-2 animate-pulse">💵</span>
        กำลังโหลดข้อมูลราคา...
      </div>
    );
  }

  return (
    <div data-testid="missing-price-panel" className="space-y-5">
      {/* Headline */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              การ์ดไทยที่มีราคา
            </div>
            <div className="text-3xl font-black text-white mt-1">
              {coverage.coveragePercentage}%
              <span className="text-sm font-bold text-slate-400 ml-2">
                {coverage.priced.toLocaleString()} / {coverage.totalCards.toLocaleString()} ใบ
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
              ยังไม่มีราคา
            </div>
            <div
              data-testid="missing-price-total"
              className="text-3xl font-black text-rose-400 mt-1"
            >
              {coverage.missing.toLocaleString()}
              <span className="text-sm font-bold ml-1">ใบ</span>
            </div>
          </div>
        </div>
        <div className="mt-3 h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500"
            style={{ width: `${coverage.coveragePercentage}%` }}
          />
        </div>
      </div>

      {/* Why. The three causes need different responses, so the split leads. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <div className="text-[11px] font-bold text-amber-400 uppercase">
            EN ไม่มีราคาใน feed
          </div>
          <div
            data-testid="reason-en-unpriced"
            className="text-2xl font-black text-amber-300 mt-0.5"
          >
            {coverage.byReason.enUnpriced.toLocaleString()}
          </div>
          <p className="text-[11px] text-amber-400/80 mt-1 leading-snug">
            จับคู่แล้วแต่ TCGPlayer ยังไม่ลงราคา มักเป็นชุดใหม่ — cron รายวันจะเก็บให้เองเมื่อราคาเข้า
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700">
          <div className="text-[11px] font-bold text-slate-300 uppercase">ยังไม่จับคู่ EN</div>
          <div data-testid="reason-unpaired" className="text-2xl font-black text-slate-100 mt-0.5">
            {coverage.byReason.unpaired.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            ไม่มีคู่ EN จึงไม่มีอะไรให้คำนวณราคา ดูรายละเอียดได้ที่แท็บสรุปใน Mapping Studio
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
          <div className="text-[11px] font-bold text-rose-400 uppercase">ไม่ควรเกิด</div>
          <div data-testid="reason-unexpected" className="text-2xl font-black text-rose-300 mt-0.5">
            {coverage.byReason.unexpected.toLocaleString()}
          </div>
          <p className="text-[11px] text-rose-400/80 mt-1 leading-snug">
            จับคู่แล้วและ EN มีราคา แต่ฝั่งไทยไม่มี — เป็นบั๊กการคำนวณ ไม่ใช่ข้อมูลขาด
          </p>
        </div>
      </div>

      {/* Sets, worst first */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-black text-slate-200">
            แยกตามชุด ({coverage.bySet.length} ชุด)
          </h3>
          <button
            type="button"
            data-testid="missing-price-copy"
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200"
          >
            {copied ? '✅ คัดลอกแล้ว' : '📋 คัดลอกสรุป'}
          </button>
        </div>
        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          {coverage.bySet.slice(0, 12).map((g, i) => (
            <button
              key={g.key}
              type="button"
              data-testid="missing-price-set-row"
              onClick={() => {
                setSelectedSet(g.key);
                setPage(1);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-800/70 transition-colors ${
                i > 0 ? 'border-t border-slate-800' : ''
              } ${selectedSet === g.key ? 'bg-slate-800/60' : ''}`}
            >
              <span className="text-xs font-mono font-black text-slate-500 w-6 shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 min-w-0 text-xs font-bold text-slate-200 truncate">
                {g.label}
              </span>
              <span className="shrink-0 w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden hidden sm:block">
                <span
                  className="block h-full rounded-full bg-rose-500"
                  style={{ width: `${Math.min(100, g.percentage)}%` }}
                />
              </span>
              <span className="shrink-0 text-xs font-black text-rose-400 w-20 text-right">
                {g.missing}/{g.total}
              </span>
              <span className="shrink-0 text-[11px] font-bold text-slate-400 w-10 text-right">
                {g.percentage}%
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Drill-down with manual entry */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 className="text-sm font-black text-slate-200 mr-auto">
            รายการ ({filtered.length.toLocaleString()} ใบ)
          </h3>
          <select
            data-testid="missing-price-set-filter"
            value={selectedSet}
            onChange={(e) => {
              setSelectedSet(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200"
          >
            <option value="ALL">ทุกชุด</option>
            {coverage.bySet.map((g) => (
              <option key={g.key} value={g.key}>
                {g.key} ({g.missing})
              </option>
            ))}
          </select>
          <select
            data-testid="missing-price-reason-filter"
            value={selectedReason}
            onChange={(e) => {
              setSelectedReason(e.target.value as 'ALL' | MissingPriceReason);
              setPage(1);
            }}
            className="h-8 px-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200"
          >
            <option value="ALL">ทุกสาเหตุ</option>
            <option value="enUnpriced">{REASON_LABELS.enUnpriced}</option>
            <option value="unpaired">{REASON_LABELS.unpaired}</option>
            <option value="unexpected">{REASON_LABELS.unexpected}</option>
          </select>
        </div>

        {pageItems.length === 0 ? (
          <p className="text-center py-10 text-sm text-slate-400">
            ไม่มีการ์ดตามเงื่อนไขที่เลือก
          </p>
        ) : (
          <div className="space-y-1.5">
            {pageItems.map((card) => {
              const full = (pokemonCardData as any[]).find((c) => c.id === card.id);
              return (
                <div
                  key={card.id}
                  data-testid="missing-price-row"
                  className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800"
                >
                  <img
                    src={resolveCardImageUrl(full?.imageUrl)}
                    alt={card.name}
                    loading="lazy"
                    onError={(e) => handleCardImageError(e, full?.imageUrl, full?.officialImageUrl)}
                    className="w-8 h-11 rounded object-cover bg-slate-950 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-100 truncate">{card.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {card.setId} #{card.collectorNumber} · {card.rarityCode}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-bold hidden sm:inline ${REASON_STYLES[card.reason]}`}
                  >
                    {REASON_LABELS[card.reason]}
                  </span>

                  {editing === card.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        autoFocus
                        type="number"
                        step="0.01"
                        min="0"
                        value={draftPrice}
                        onChange={(e) => setDraftPrice(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(card.id);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        placeholder="USD"
                        className="w-20 h-7 px-2 rounded-lg bg-slate-950 border border-indigo-500 text-xs text-white"
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSave(card.id)}
                        className="h-7 px-2 rounded-lg bg-emerald-600 text-white text-[11px] font-bold disabled:opacity-50"
                      >
                        บันทึก
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="h-7 px-2 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-testid="missing-price-set-btn"
                      onClick={() => {
                        setEditing(card.id);
                        setDraftPrice('');
                      }}
                      className="shrink-0 h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold"
                    >
                      ตั้งราคา
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-slate-500">
              หน้า {page} / {totalPages}
            </span>
            <div className="flex gap-1.5 font-bold">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 disabled:opacity-40"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
