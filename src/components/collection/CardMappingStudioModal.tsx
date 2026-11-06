import { useState, useMemo, useEffect } from 'react';
import pokemonCardData from '../../data/pokemonNames.json';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import {
  getEnglishMatchForThaiCard,
  saveCardMapping,
  resetCardMapping,
  toggleMappingVerification,
  getCustomOverrides,
  type EnCardMapping,
} from '../../utils/thaiEnglishCardMatcher';
import { computePairingCoverage, formatCoverageReport } from '../../utils/pairingCoverage';
import { useAuthStore } from '../../store/authStore';
import { isAdminEmail } from '../../utils/adminAuth';
import { submitCardPairing } from '../../services/communityPairingService';

interface Props {
  onClose: () => void;
}

export function CardMappingStudioModal({ onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  // Filters & State
  const [filterTab, setFilterTab] = useState<
    'all' | 'review' | 'unmatched' | 'verified' | 'custom' | 'summary'
  >('all');
  const [reportCopied, setReportCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;

  // Custom overrides trigger state for re-rendering
  const [overridesVersion, setOverridesVersion] = useState(0);

  // Lazy loaded English catalog for re-matching
  const [enCatalog, setEnCatalog] = useState<any[] | null>(null);
  const [loadingEn, setLoadingEn] = useState(false);

  // Re-match modal state
  const [editingThaiCard, setEditingThaiCard] = useState<any | null>(null);
  const [enSearchQuery, setEnSearchQuery] = useState('');

  // Load English catalog on demand when modal opens or re-match starts
  useEffect(() => {
    if (!enCatalog && !loadingEn) {
      setLoadingEn(true);
      import('../../data/pokemonCardsEn.json')
        .then((m) => {
          setEnCatalog(m.default || m);
        })
        .catch((err) => {
          console.error('Failed to load English catalog:', err);
        })
        .finally(() => {
          setLoadingEn(false);
        });
    }
  }, [enCatalog, loadingEn]);

  // Extract unique sets from Thai cards
  const thaiSets = useMemo(() => {
    const sets = new Map<string, string>();
    (pokemonCardData as any[]).forEach((c) => {
      if (c.set?.id) sets.set(c.set.id, c.set.name || c.set.id);
    });
    return Array.from(sets.entries());
  }, []);

  // Filtered Thai Cards with their mappings
  const items = useMemo(() => {
    void overridesVersion; // trigger re-computation
    const overrides = getCustomOverrides();

    return (pokemonCardData as any[]).map((c) => {
      const mapping = overrides[c.id] || getEnglishMatchForThaiCard(c.id);
      return {
        thaiCard: c,
        mapping,
        isCustom: !!overrides[c.id]?.userOverridden,
      };
    });
  }, [overridesVersion]);

  // Apply Search, Set & Tab Filters
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return items.filter(({ thaiCard, mapping, isCustom }) => {
      // Set filter
      if (selectedSet !== 'ALL' && thaiCard.set?.id !== selectedSet) {
        return false;
      }

      // Tab filter
      if (filterTab === 'review') {
        if (!mapping || mapping.confidence >= 85 || mapping.verified) return false;
      } else if (filterTab === 'unmatched') {
        if (mapping) return false;
      } else if (filterTab === 'verified') {
        if (!mapping?.verified) return false;
      } else if (filterTab === 'custom') {
        if (!isCustom) return false;
      }

      // Search filter
      if (q) {
        const matchThName = (thaiCard.name || '').toLowerCase().includes(q);
        const matchThNum = (thaiCard.collectorNumber || '').toLowerCase().includes(q);
        const matchThId = (thaiCard.id || '').toLowerCase().includes(q);
        const matchEnName = (mapping?.enName || '').toLowerCase().includes(q);
        const matchEnSet = (mapping?.enSetName || '').toLowerCase().includes(q);

        if (!matchThName && !matchThNum && !matchThId && !matchEnName && !matchEnSet) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedSet, filterTab, searchQuery]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE) || 1;

  // Stats
  const stats = useMemo(() => {
    let matched = 0;
    let highConf = 0;
    let reviewNeeded = 0;
    let customCount = 0;

    items.forEach(({ mapping, isCustom }) => {
      if (mapping) {
        matched++;
        if (mapping.confidence >= 85 || mapping.verified) {
          highConf++;
        } else {
          reviewNeeded++;
        }
      }
      if (isCustom) customCount++;
    });

    return {
      total: items.length,
      matched,
      unmatched: items.length - matched,
      highConf,
      reviewNeeded,
      customCount,
      percentage: Math.round((matched / items.length) * 100),
    };
  }, [items]);

  // Coverage summary. Built from the same overrides the list uses, so the
  // numbers here and the "ยังไม่พบคู่" tab can never disagree.
  const coverage = useMemo(() => {
    void overridesVersion;
    const overrides = getCustomOverrides();
    const mappedIds = new Set<string>();
    for (const card of pokemonCardData as any[]) {
      if (overrides[card.id] || getEnglishMatchForThaiCard(card.id)) mappedIds.add(card.id);
    }
    return computePairingCoverage(pokemonCardData as any[], mappedIds);
  }, [overridesVersion]);

  const handleCopyReport = () => {
    navigator.clipboard.writeText(formatCoverageReport(coverage));
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 2500);
  };

  // Re-match Candidates
  const enCandidates = useMemo(() => {
    if (!enCatalog || !editingThaiCard) return [];
    const q = enSearchQuery.trim().toLowerCase();
    if (!q) {
      // Default to search by translated or related name
      return enCatalog.slice(0, 30);
    }
    return enCatalog
      .filter((c) => {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const setMatch = (c.set?.name || '').toLowerCase().includes(q) || (c.set?.id || '').toLowerCase().includes(q);
        const numMatch = (c.localId || '').toLowerCase() === q;
        return nameMatch || setMatch || numMatch;
      })
      .slice(0, 50);
  }, [enCatalog, editingThaiCard, enSearchQuery]);

  const handleSelectEnCard = (enCard: any) => {
    if (!editingThaiCard) return;

    const newMapping: EnCardMapping = {
      enCardId: enCard.id,
      enName: enCard.name,
      enSetId: enCard.set.id,
      enSetName: enCard.set.name,
      enNumber: enCard.localId,
      enImageUrl: enCard.imageUrl,
      confidence: 100,
      matchMethod: 'manual_override',
      verified: true,
      matchedAt: new Date().toISOString(),
      userOverridden: true,
    };

    saveCardMapping(editingThaiCard.id, newMapping);

    // Also submit to community card pairings if signed in
    if (user?.uid) {
      const isAdmin = isAdminEmail(user.email);
      submitCardPairing({
        thaiCardId: editingThaiCard.id,
        thaiCardName: editingThaiCard.name || '',
        thaiSetId: editingThaiCard.set?.id || '',
        thaiSetName: editingThaiCard.set?.name || '',
        thaiNumber: editingThaiCard.collectorNumber || editingThaiCard.localId || '',
        thaiImageUrl: editingThaiCard.imageUrlHigh || editingThaiCard.imageUrl || '',
        enCardId: enCard.id,
        enName: enCard.name || '',
        enSetId: enCard.set?.id || '',
        enSetName: enCard.set?.name || '',
        enNumber: enCard.localId || '',
        enImageUrl: enCard.imageUrl || '',
        enOfficialImageUrl: enCard.officialImageUrl || '',
        submittedByUid: user.uid,
        submittedByEmail: user.email || '',
        status: isAdmin ? 'approved' : 'pending',
        notes: isAdmin ? 'Admin Instant Match from Studio' : 'User Suggested Pairing from Studio',
      }).catch((err) => {
        console.warn('Failed to submit pairing suggestion to cloud:', err);
      });
    }

    setEditingThaiCard(null);
    setOverridesVersion((v) => v + 1);
  };

  const handleResetMapping = (thaiCardId: string) => {
    resetCardMapping(thaiCardId);
    setOverridesVersion((v) => v + 1);
  };

  const handleToggleVerify = (thaiCardId: string, current: boolean) => {
    toggleMappingVerification(thaiCardId, current);
    setOverridesVersion((v) => v + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xl shadow-md shadow-indigo-500/20">
              🔄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Thai ⇄ English Card Mapping Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  v3.0 Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                ระบบเชื่อมโยงฐานข้อมูลการ์ดไทยและการ์ดอังกฤษสำหรับวิเคราะห์ Meta Decks ระดับสากล
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="mapping-studio-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* METRICS & SUMMARY BANNER */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-5 sm:px-8 py-3 bg-slate-100/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-xs shrink-0">
          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] font-bold block uppercase">จับคู่แล้ว (Matched)</span>
            <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
              {stats.matched.toLocaleString()}{' '}
              <span className="text-xs font-medium text-slate-400">({stats.percentage}%)</span>
            </span>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] font-bold block uppercase">แม่นยำสูง (High Conf)</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
              {stats.highConf.toLocaleString()}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] font-bold block uppercase">รอตรวจสอบ (Review)</span>
            <span className="text-base font-black text-amber-500">
              {stats.reviewNeeded.toLocaleString()}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] font-bold block uppercase">ยังไม่พบคู่ (Unmatched)</span>
            <span className="text-base font-black text-slate-500">
              {stats.unmatched.toLocaleString()}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] font-bold block uppercase">แก้ไขเอง (Custom)</span>
            <span className="text-base font-black text-purple-500">
              {stats.customCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* CONTROLS & FILTERS */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-bold">
            <button
              type="button"
              data-testid="pairing-summary-tab"
              onClick={() => setFilterTab('summary')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterTab === 'summary'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              📊 สรุป
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterTab('all');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด ({stats.total.toLocaleString()})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterTab('review');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterTab === 'review'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              ⚠️ รอตรวจสอบ ({stats.reviewNeeded})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterTab('unmatched');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterTab === 'unmatched'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              ❓ ยังไม่พบคู่ ({stats.unmatched})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterTab('custom');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterTab === 'custom'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              ✏️ แก้ไขเอง ({stats.customCount})
            </button>
          </div>

          {/* Search & Set Filter. Hidden on the summary, which is always over the
              whole catalogue — leaving them would imply it was filtered. */}
          <div
            className={`items-center gap-2 w-full sm:w-auto ${
              filterTab === 'summary' ? 'hidden' : 'flex'
            }`}
          >
            <select
              value={selectedSet}
              onChange={(e) => {
                setSelectedSet(e.target.value);
                setPage(1);
              }}
              className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none shrink-0"
            >
              <option value="ALL">ทุกชุดการ์ดไทย ({thaiSets.length} ชุด)</option>
              {thaiSets.map(([id, name]) => (
                <option key={id} value={id}>
                  {id} - {name}
                </option>
              ))}
            </select>

            <div className="relative flex-1 sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="ค้นหาชื่อการ์ด / เลข..."
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-indigo-500"
              />
              <span className="absolute left-2.5 top-2.5 text-xs text-slate-400">🔍</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CARD MAPPING GRID */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filterTab === 'summary' ? (
            <div data-testid="pairing-summary-panel" className="space-y-5 max-w-3xl mx-auto">
              {/* Headline */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                <div className="flex items-end justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      จับคู่ไทย–อังกฤษแล้ว
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {coverage.coveragePercentage}%
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400 ml-2">
                        {coverage.matched.toLocaleString()} / {coverage.totalCards.toLocaleString()} ใบ
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">
                      ยังจับคู่ไม่ได้
                    </div>
                    <div
                      data-testid="pairing-unmatched-total"
                      className="text-3xl font-black text-rose-500 dark:text-rose-400 mt-1"
                    >
                      {coverage.unmatched.toLocaleString()}
                      <span className="text-sm font-bold ml-1">ใบ</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                    style={{ width: `${coverage.coveragePercentage}%` }}
                  />
                </div>
              </div>

              {/* What the remainder actually is. Without this split the number
                  reads as a backlog, when most of it cannot be paired at all. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">
                    อาร์ตพิเศษ (AR / SR / UR / HR)
                  </div>
                  <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
                    {coverage.altArtUnmatched.toLocaleString()} <span className="text-xs font-bold">ใบ</span>
                  </div>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1 leading-snug">
                    การจับคู่ใช้การเทียบภาพ การ์ดอาร์ตพิเศษของไทยมักไม่มีภาพเดียวกันในฝั่ง EN
                    จึงคาดว่าจะจับคู่ไม่ได้ ไม่ใช่งานค้าง
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                  <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase">
                    พิมพ์ปกติ — ควรตามจับคู่
                  </div>
                  <div
                    data-testid="pairing-actionable-total"
                    className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-0.5"
                  >
                    {coverage.actionableUnmatched.toLocaleString()} <span className="text-xs font-bold">ใบ</span>
                  </div>
                  <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1 leading-snug">
                    เป็นการ์ดพิมพ์ปกติที่ควรมีคู่ EN อยู่ — คือรายการที่คุ้มค่าจะไล่จับคู่จริง
                  </p>
                </div>
              </div>

              {/* By set, worst first, with each set's own share so a small set
                  that is mostly unpaired is not hidden behind a large one. */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                    แยกตามชุด ({coverage.bySet.length} ชุดที่ยังมีช่องว่าง)
                  </h4>
                  <button
                    type="button"
                    data-testid="pairing-copy-report"
                    onClick={handleCopyReport}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200"
                  >
                    {reportCopied ? '✅ คัดลอกแล้ว' : '📋 คัดลอกสรุป'}
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {coverage.bySet.slice(0, 15).map((group, i) => (
                    <button
                      key={group.key}
                      type="button"
                      data-testid="pairing-set-row"
                      onClick={() => {
                        // Jump straight into the unmatched list for that set.
                        setSelectedSet(group.key);
                        setFilterTab('unmatched');
                        setPage(1);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors ${
                        i > 0 ? 'border-t border-slate-200 dark:border-slate-800' : ''
                      }`}
                      title={`ดูการ์ดที่ยังจับคู่ไม่ได้ในชุด ${group.key}`}
                    >
                      <span className="text-xs font-mono font-black text-slate-500 dark:text-slate-400 w-6 shrink-0">
                        {i + 1}
                      </span>
                      <span className="flex-1 min-w-0 text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {group.label}
                      </span>
                      <span className="shrink-0 w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden hidden sm:block">
                        <span
                          className="block h-full rounded-full bg-rose-500"
                          style={{ width: `${Math.min(100, group.percentage)}%` }}
                        />
                      </span>
                      <span className="shrink-0 text-xs font-black text-rose-500 dark:text-rose-400 w-20 text-right">
                        {group.unmatched}/{group.total}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold text-slate-500 dark:text-slate-400 w-10 text-right">
                        {group.percentage}%
                      </span>
                    </button>
                  ))}
                </div>
                {coverage.bySet.length > 15 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    แสดง 15 ชุดที่มีช่องว่างมากที่สุด จากทั้งหมด {coverage.bySet.length} ชุด · กดปุ่มคัดลอกสรุปเพื่อดูครบ
                  </p>
                )}
              </div>

              {/* Rarity and category, as compact chip rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { title: 'แยกตามระดับความหายาก', groups: coverage.byRarity },
                  { title: 'แยกตามหมวดหมู่', groups: coverage.byCategory },
                ] as const).map(({ title, groups }) => (
                  <div key={title}>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-2">{title}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {groups.slice(0, 10).map((g) => (
                        <span
                          key={g.key}
                          className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200"
                          title={`${g.unmatched} จาก ${g.total} ใบ (${g.percentage}%)`}
                        >
                          {g.label} <span className="text-rose-500 dark:text-rose-400">{g.unmatched}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <span className="text-4xl block mb-2">🔍</span>
              <p className="font-bold">ไม่พบการ์ดตามเงื่อนไขที่เลือก</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedItems.map(({ thaiCard, mapping, isCustom }) => {
                const thaiImg = resolveCardImageUrl(thaiCard.imageUrlHigh || thaiCard.imageUrl);
                const enImg = mapping?.enImageUrl;
                const conf = mapping?.confidence || 0;

                return (
                  <div
                    key={thaiCard.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isCustom
                        ? 'border-purple-500/40 bg-purple-500/5'
                        : mapping
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60'
                        : 'border-rose-500/30 bg-rose-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Thai Side */}
                      <div className="w-1/2 flex items-center gap-2.5">
                        <div className="w-12 h-16 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700">
                          <img
                            src={thaiImg}
                            alt={thaiCard.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              // If Thai card image fails, fallback to officialImageUrl, or mapped counterpart image if available
                              const fallbackUrl = thaiCard.officialImageUrl || mapping?.enImageUrl;
                              handleCardImageError(e, thaiCard.imageUrl, fallbackUrl);
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 block truncate">
                            {thaiCard.set?.id || 'TH'} · {thaiCard.collectorNumber}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {thaiCard.name}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {thaiCard.hp ? `${thaiCard.hp} HP` : thaiCard.category}
                            {thaiCard.regulationMark && ` · Mark ${thaiCard.regulationMark}`}
                          </span>
                        </div>
                      </div>

                      {/* Center Indicator */}
                      <div className="flex flex-col items-center justify-center shrink-0 px-1">
                        <span className="text-xs">⇄</span>
                        {mapping ? (
                          <span
                            className={`text-[9px] font-black px-1 rounded ${
                              conf >= 90
                                ? 'text-emerald-500 bg-emerald-500/10'
                                : conf >= 70
                                ? 'text-amber-500 bg-amber-500/10'
                                : 'text-rose-500 bg-rose-500/10'
                            }`}
                          >
                            {conf}%
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-rose-500">None</span>
                        )}
                      </div>

                      {/* English Side */}
                      <div className="w-1/2 flex items-center gap-2.5">
                        {mapping ? (
                          <>
                            <div className="w-12 h-16 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700">
                              <img
                                src={enImg}
                                alt={mapping.enName}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => handleCardImageError(e, enImg, mapping.enOfficialImageUrl)}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-sky-500 block truncate">
                                {mapping.enSetId.toUpperCase()} · #{mapping.enNumber}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {mapping.enName}
                              </h4>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {mapping.enSetName}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex-1 text-center py-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                            <span className="text-[11px] text-slate-400 block">ยังไม่พบคู่</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1">
                        {isCustom && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[9px] font-bold">
                            User Edit
                          </span>
                        )}
                        {mapping?.verified && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                            ✓ Verified
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => handleResetMapping(thaiCard.id)}
                            title="รีเซ็ตกลับไปใช้ผลลัพธ์ของ AI"
                            className="px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-rose-500"
                          >
                            ↺ รีเซ็ต
                          </button>
                        )}
                        {mapping && (
                          <button
                            type="button"
                            onClick={() => handleToggleVerify(thaiCard.id, !!mapping.verified)}
                            className="px-2 py-0.5 rounded text-[10px] text-slate-500 hover:text-emerald-600"
                          >
                            {mapping.verified ? 'ปลดตรวจ' : '✓ ตรวจแล้ว'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingThaiCard(thaiCard);
                            setEnSearchQuery(mapping?.enName || '');
                          }}
                          className="px-2.5 py-0.8 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] transition-colors"
                        >
                          ✏️ แก้ไขคู่
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PAGINATION — the summary is a single view, so paging it makes no sense */}
        <div
          className={`px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs shrink-0 ${
            filterTab === 'summary' ? 'hidden' : ''
          }`}
        >
          <span className="text-slate-500">
            แสดง {((page - 1) * PAGE_SIZE + 1).toLocaleString()} -{' '}
            {Math.min(page * PAGE_SIZE, filteredItems.length).toLocaleString()} จาก{' '}
            {filteredItems.length.toLocaleString()} รายการ
          </span>

          <div className="flex items-center gap-1.5 font-bold">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
            >
              ย้อนกลับ
            </button>
            <span className="px-2 font-black text-slate-700 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
            >
              ถัดไป
            </button>
          </div>
        </div>

        {/* RE-MATCH PICKER MODAL (SUB-MODAL) */}
        {editingThaiCard && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    เลือกการ์ดภาษาอังกฤษเพื่อจับคู่กับ:
                  </h3>
                  <span className="text-xs font-bold text-indigo-500">
                    {editingThaiCard.name} ({editingThaiCard.set?.id} #{editingThaiCard.collectorNumber})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingThaiCard(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <input
                  type="text"
                  value={enSearchQuery}
                  onChange={(e) => setEnSearchQuery(e.target.value)}
                  placeholder="พิมพ์ค้นหาชื่อการ์ดภาษาอังกฤษ เช่น Charizard, Iono, Boss..."
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {enCandidates.map((enCard) => (
                  <button
                    key={enCard.id}
                    type="button"
                    onClick={() => handleSelectEnCard(enCard)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-white dark:bg-slate-800/60 text-left flex items-center gap-3 transition-all hover:shadow-md group"
                  >
                    <div className="w-12 h-16 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                      <img
                        src={enCard.imageUrl}
                        alt={enCard.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => handleCardImageError(e, enCard.imageUrl, enCard.officialImageUrl)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase text-sky-500 block truncate">
                        {enCard.set?.name} · #{enCard.localId}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-500">
                        {enCard.name}
                      </h5>
                      <span className="text-[10px] text-slate-400">
                        {enCard.hp ? `${enCard.hp} HP` : enCard.category}
                        {enCard.regulationMark && ` · Mark ${enCard.regulationMark}`}
                      </span>
                    </div>
                    <span className="text-xs text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      เลือก ➔
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
