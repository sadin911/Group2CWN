import { useState, useEffect, useMemo } from 'react';
import {
  fetchAllPairings,
  approveCardPairing,
  rejectCardPairing,
  deleteCardPairing,
  submitCardPairing,
  type CommunityCardPairing,
} from '../../services/communityPairingService';
import {
  setCloudApprovedMappings,
  getCloudApprovedMappings,
  getEnglishMatchForThaiCard,
  type EnCardMapping,
} from '../../utils/thaiEnglishCardMatcher';
import { useAuthStore } from '../../store/authStore';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import pokemonCardData from '../../data/pokemonNames.json';

type SubTab = 'pending' | 'approved' | 'rejected' | 'quick-pair';

export function MappingApprovalPanel() {
  const user = useAuthStore((s) => s.user);
  const [pairings, setPairings] = useState<CommunityCardPairing[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('pending');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick Pair states
  const [quickThaiSearch, setQuickThaiSearch] = useState('');
  const [selectedThaiCard, setSelectedThaiCard] = useState<any | null>(null);
  const [enCatalog, setEnCatalog] = useState<any[] | null>(null);
  const [quickEnSearch, setQuickEnSearch] = useState('');
  const [selectedEnCard, setSelectedEnCard] = useState<any | null>(null);
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  // Load pairings
  const loadData = async () => {
    setLoading(true);
    try {
      const list = await fetchAllPairings();
      setPairings(list);
    } catch (err) {
      console.error('Failed to load community pairings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lazy load English catalog when quick-pair tab is selected
  useEffect(() => {
    if (subTab === 'quick-pair' && !enCatalog) {
      import('../../data/pokemonCardsEn.json').then((m) => {
        setEnCatalog(m.default || m);
      });
    }
  }, [subTab, enCatalog]);

  const pendingList = useMemo(() => pairings.filter((p) => p.status === 'pending'), [pairings]);
  const approvedList = useMemo(() => pairings.filter((p) => p.status === 'approved'), [pairings]);
  const rejectedList = useMemo(() => pairings.filter((p) => p.status === 'rejected'), [pairings]);

  const currentList = useMemo(() => {
    let list: CommunityCardPairing[] = [];
    if (subTab === 'pending') list = pendingList;
    else if (subTab === 'approved') list = approvedList;
    else if (subTab === 'rejected') list = rejectedList;

    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter(
      (p) =>
        p.thaiCardName.toLowerCase().includes(q) ||
        p.thaiCardId.toLowerCase().includes(q) ||
        p.enName.toLowerCase().includes(q) ||
        p.enCardId.toLowerCase().includes(q) ||
        (p.submittedByEmail && p.submittedByEmail.toLowerCase().includes(q))
    );
  }, [subTab, pendingList, approvedList, rejectedList, search]);

  const handleApprove = async (p: CommunityCardPairing) => {
    setActionLoading(p.thaiCardId);
    try {
      const reviewer = user?.email || 'admin';
      await approveCardPairing(p.thaiCardId, reviewer);

      // Immediately register in current browser runtime matcher
      const activeCloud = { ...getCloudApprovedMappings() };
      const newMapping: EnCardMapping = {
        enCardId: p.enCardId,
        enName: p.enName,
        enSetId: p.enSetId,
        enSetName: p.enSetName,
        enNumber: p.enNumber,
        enImageUrl: p.enImageUrl,
        enOfficialImageUrl: p.enOfficialImageUrl,
        confidence: 100,
        matchMethod: 'community_approved',
        verified: true,
        matchedAt: new Date().toISOString(),
        userOverridden: false,
      };
      activeCloud[p.thaiCardId] = newMapping;
      setCloudApprovedMappings(activeCloud);

      setPairings((prev) =>
        prev.map((item) =>
          item.thaiCardId === p.thaiCardId
            ? { ...item, status: 'approved', reviewedAt: Date.now(), reviewedBy: reviewer }
            : item
        )
      );
      setFeedback({ type: 'success', text: `อนุมัติการจับคู่ ${p.thaiCardName} เรียบร้อยแล้ว!` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', text: 'เกิดข้อผิดพลาดในการอนุมัติ' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (p: CommunityCardPairing) => {
    setActionLoading(p.thaiCardId);
    try {
      const reviewer = user?.email || 'admin';
      await rejectCardPairing(p.thaiCardId, reviewer);
      setPairings((prev) =>
        prev.map((item) =>
          item.thaiCardId === p.thaiCardId
            ? { ...item, status: 'rejected', reviewedAt: Date.now(), reviewedBy: reviewer }
            : item
        )
      );
      setFeedback({ type: 'success', text: `ปฏิเสธการจับคู่ ${p.thaiCardName} แล้ว` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', text: 'เกิดข้อผิดพลาดในการปฏิเสธ' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (thaiCardId: string) => {
    if (!confirm('ต้องการลบรายการนี้ออกจากฐานข้อมูลใช่หรือไม่?')) return;
    setActionLoading(thaiCardId);
    try {
      await deleteCardPairing(thaiCardId);
      setPairings((prev) => prev.filter((item) => item.thaiCardId !== thaiCardId));
      setFeedback({ type: 'success', text: 'ลบรายการเรียบร้อยแล้ว' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบ' });
    } finally {
      setActionLoading(null);
    }
  };

  // Quick Pair: Candidates
  const thaiCandidates = useMemo(() => {
    const q = quickThaiSearch.trim().toLowerCase();
    if (!q) {
      // Find cards not yet mapped
      return (pokemonCardData as any[])
        .filter((c) => !getEnglishMatchForThaiCard(c.id))
        .slice(0, 30);
    }
    return (pokemonCardData as any[])
      .filter((c) => {
        const matchName = (c.name || '').toLowerCase().includes(q);
        const matchNum = String(c.collectorNumber || c.localId || '').toLowerCase().includes(q);
        const matchSet = (c.set?.name || c.set?.id || '').toLowerCase().includes(q);
        return matchName || matchNum || matchSet;
      })
      .slice(0, 30);
  }, [quickThaiSearch]);

  const enCandidates = useMemo(() => {
    if (!enCatalog) return [];
    const q = quickEnSearch.trim().toLowerCase();
    if (!q) {
      if (selectedThaiCard) {
        // Guess by collector number or Thai set
        const thNum = String(selectedThaiCard.collectorNumber || selectedThaiCard.localId || '').trim();
        if (thNum) {
          return enCatalog.filter((c) => String(c.localId || '').trim() === thNum).slice(0, 30);
        }
      }
      return enCatalog.slice(0, 30);
    }
    return enCatalog
      .filter((c) => {
        const matchName = (c.name || '').toLowerCase().includes(q);
        const matchNum = String(c.localId || '').toLowerCase() === q;
        const matchSet = (c.set?.name || c.set?.id || '').toLowerCase().includes(q);
        return matchName || matchNum || matchSet;
      })
      .slice(0, 40);
  }, [enCatalog, quickEnSearch, selectedThaiCard]);

  const handleSaveQuickPair = async () => {
    if (!selectedThaiCard || !selectedEnCard) return;
    setQuickSubmitting(true);
    try {
      const reviewer = user?.email || 'admin';
      await submitCardPairing({
        thaiCardId: selectedThaiCard.id,
        thaiCardName: selectedThaiCard.name,
        thaiSetId: selectedThaiCard.set?.id,
        thaiSetName: selectedThaiCard.set?.name,
        thaiNumber: selectedThaiCard.collectorNumber || selectedThaiCard.localId,
        thaiImageUrl: selectedThaiCard.imageUrl || selectedThaiCard.officialImageUrl,
        enCardId: selectedEnCard.id,
        enName: selectedEnCard.name,
        enSetId: selectedEnCard.set?.id || '',
        enSetName: selectedEnCard.set?.name || '',
        enNumber: selectedEnCard.localId || '',
        enImageUrl: selectedEnCard.imageUrl || '',
        status: 'approved',
        submittedByUid: user?.uid || 'admin',
        submittedByEmail: reviewer,
        reviewedAt: Date.now(),
        reviewedBy: reviewer,
      });

      // Update in-memory matcher
      const activeCloud = { ...getCloudApprovedMappings() };
      activeCloud[selectedThaiCard.id] = {
        enCardId: selectedEnCard.id,
        enName: selectedEnCard.name,
        enSetId: selectedEnCard.set?.id || '',
        enSetName: selectedEnCard.set?.name || '',
        enNumber: selectedEnCard.localId || '',
        enImageUrl: selectedEnCard.imageUrl || '',
        confidence: 100,
        matchMethod: 'admin_direct',
        verified: true,
        matchedAt: new Date().toISOString(),
        userOverridden: false,
      };
      setCloudApprovedMappings(activeCloud);

      await loadData();
      setSelectedThaiCard(null);
      setSelectedEnCard(null);
      setQuickThaiSearch('');
      setQuickEnSearch('');
      setFeedback({
        type: 'success',
        text: `จับคู่สำเร็จ! การ์ด ${selectedThaiCard.name} มีผลใช้งานทันทีทั่วระบบ`,
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกการจับคู่' });
    } finally {
      setQuickSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="mapping-approval-panel">
      {/* Header Info */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2.5">
              <span>🔗</span>
              <span>ระบบอนุมัติการจับคู่การ์ด (Card Mapping Approval)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              ตรวจสอบและอนุมัติการจับคู่การ์ดไทย ➔ อังกฤษ เพื่อดึงภาพและราคา TCGPlayer ให้ผู้ใช้ทุกคนในระบบทันที
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto"
          >
            <span>🔄</span>
            <span>{loading ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            <span>{feedback.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
          <button
            type="button"
            data-testid="subtab-pending"
            onClick={() => setSubTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              subTab === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <span>⏳ รอตรวจสอบ</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-current">
              {pendingList.length}
            </span>
          </button>

          <button
            type="button"
            data-testid="subtab-quick-pair"
            onClick={() => setSubTab('quick-pair')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              subTab === 'quick-pair'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <span>⚡ จับคู่ด่วนโดยแอดมิน</span>
          </button>

          <button
            type="button"
            data-testid="subtab-approved"
            onClick={() => setSubTab('approved')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              subTab === 'approved'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <span>✅ อนุมัติแล้ว (Cloud Active)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-current">
              {approvedList.length}
            </span>
          </button>

          <button
            type="button"
            data-testid="subtab-rejected"
            onClick={() => setSubTab('rejected')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              subTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <span>❌ ปฏิเสธแล้ว</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-current">
              {rejectedList.length}
            </span>
          </button>
        </div>
      </div>

      {/* QUICK PAIR MODE */}
      {subTab === 'quick-pair' ? (
        <div data-testid="quick-pair-container" className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚡</span>
              <span>เลือกจับคู่การ์ดไทย ➔ อังกฤษ และอนุมัติทันที</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ค้นหาการ์ดไทยที่ต้องการ แล้วเลือกการ์ดอังกฤษที่ตรงกัน ระบบจะนำเข้าสู่ฐานข้อมูลกลางที่มีผลกับทุกคนทันที
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Pick Thai Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <span>1️⃣</span> เลือกการ์ดภาษาไทย
                </span>
                {selectedThaiCard && (
                  <button
                    type="button"
                    onClick={() => setSelectedThaiCard(null)}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    เปลี่ยน
                  </button>
                )}
              </div>

              {selectedThaiCard ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                  <img
                    src={resolveCardImageUrl(selectedThaiCard.imageUrl)}
                    alt=""
                    className="w-14 h-20 rounded-lg object-contain bg-slate-950 shrink-0"
                    onError={(e) => handleCardImageError(e, selectedThaiCard.imageUrl, selectedThaiCard.officialImageUrl)}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white truncate">{selectedThaiCard.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {selectedThaiCard.set?.name || selectedThaiCard.set?.id} • #{selectedThaiCard.collectorNumber}
                    </p>
                    <span className="text-[10px] font-mono text-amber-300 mt-1 inline-block">
                      ID: {selectedThaiCard.id}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    data-testid="quick-thai-search-input"
                    value={quickThaiSearch}
                    onChange={(e) => setQuickThaiSearch(e.target.value)}
                    placeholder="พิมพ์ชื่อการ์ดไทย หรือเลขการ์ด..."
                    className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                    {thaiCandidates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedThaiCard(c)}
                        className="w-full p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 flex items-center gap-2.5 text-left transition-colors"
                      >
                        <img
                          src={resolveCardImageUrl(c.imageUrl)}
                          alt=""
                          className="w-8 h-11 rounded object-contain bg-slate-900 shrink-0"
                          onError={(e) => handleCardImageError(e, c.imageUrl, c.officialImageUrl)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-200 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {c.set?.name || c.set?.id} #{c.collectorNumber}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Pick English Match */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-400 flex items-center gap-1.5">
                  <span>2️⃣</span> เลือกการ์ดภาษาอังกฤษ (EN Match)
                </span>
                {selectedEnCard && (
                  <button
                    type="button"
                    onClick={() => setSelectedEnCard(null)}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    เปลี่ยน
                  </button>
                )}
              </div>

              {selectedEnCard ? (
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-3">
                  <img
                    src={selectedEnCard.imageUrl}
                    alt=""
                    className="w-14 h-20 rounded-lg object-contain bg-slate-950 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white truncate">{selectedEnCard.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {selectedEnCard.set?.name || selectedEnCard.set?.id} • #{selectedEnCard.localId}
                    </p>
                    <span className="text-[10px] font-mono text-indigo-300 mt-1 inline-block">
                      ID: {selectedEnCard.id}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={quickEnSearch}
                    onChange={(e) => setQuickEnSearch(e.target.value)}
                    placeholder="พิมพ์ชื่อการ์ดอังกฤษ หรือเลขการ์ด..."
                    className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  {!enCatalog ? (
                    <div className="p-6 text-center text-xs text-slate-500">กำลังโหลดแคตตาล็อกภาษาอังกฤษ...</div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                      {enCandidates.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedEnCard(c)}
                          className="w-full p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 flex items-center gap-2.5 text-left transition-colors"
                        >
                          <img
                            src={c.imageUrl}
                            alt=""
                            className="w-8 h-11 rounded object-contain bg-slate-900 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-200 truncate">{c.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {c.set?.name || c.set?.id} #{c.localId}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={!selectedThaiCard || !selectedEnCard || quickSubmitting}
              onClick={handleSaveQuickPair}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
            >
              <span>✅</span>
              <span>{quickSubmitting ? 'กำลังบันทึก...' : 'อนุมัติการจับคู่ทันที (Approve Now)'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* PAIRINGS LIST (Pending, Approved, Rejected) */
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาตามชื่อการ์ด, รหัสชุด, หรืออีเมลผู้เสนอ..."
              className="w-full sm:max-w-md h-9 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <span className="text-xs text-slate-400 font-mono shrink-0">
              พบ {currentList.length} รายการ
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
              กำลังโหลดข้อมูลการจับคู่การ์ดจากคลาวด์...
            </div>
          ) : currentList.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-500 text-xs italic">
              ไม่มีรายการในหมวดนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentList.map((p) => {
                const isWorking = actionLoading === p.thaiCardId;

                return (
                  <div
                    key={p.thaiCardId}
                    className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-4 hover:border-slate-700 transition-colors"
                  >
                    {/* Top row: submitter info & status */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2.5">
                      <span className="flex items-center gap-1.5 truncate">
                        <span>👤</span>
                        <span className="font-medium truncate max-w-[180px]">
                          {p.submittedByEmail || 'ผู้ใช้ไม่ระบุชื่อ'}
                        </span>
                      </span>
                      <span className="font-mono text-[10px] shrink-0">
                        {new Date(p.submittedAt).toLocaleDateString('th-TH')}
                      </span>
                    </div>

                    {/* Side-by-Side Comparison */}
                    <div className="grid grid-cols-2 gap-3 items-center bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                      {/* Left: Thai Card */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.thaiImageUrl ? (
                          <img
                            src={p.thaiImageUrl}
                            alt=""
                            className="w-12 h-16 rounded object-contain bg-slate-900 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-16 rounded bg-slate-800 flex items-center justify-center text-xs shrink-0">
                            🃏
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-[10px] font-black text-amber-400 uppercase">🇹🇭 TH CARD</span>
                          <p className="text-xs font-bold text-white truncate">{p.thaiCardName}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {p.thaiSetId || 'SET'} #{p.thaiNumber || '-'}
                          </p>
                        </div>
                      </div>

                      {/* Right: English Match */}
                      <div className="flex items-center gap-2.5 min-w-0 border-l border-slate-800 pl-3">
                        {p.enImageUrl ? (
                          <img
                            src={p.enImageUrl}
                            alt=""
                            className="w-12 h-16 rounded object-contain bg-slate-900 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-16 rounded bg-slate-800 flex items-center justify-center text-xs shrink-0">
                            🃏
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-[10px] font-black text-indigo-400 uppercase">🇺🇸 EN MATCH</span>
                          <p className="text-xs font-bold text-white truncate">{p.enName}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {p.enSetId} #{p.enNumber}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(p.thaiCardId)}
                        disabled={isWorking}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-[11px] font-bold transition-colors"
                        title="ลบรายการ"
                      >
                        🗑️ ลบ
                      </button>

                      <div className="flex items-center gap-2">
                        {p.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => handleReject(p)}
                            disabled={isWorking}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-bold transition-colors"
                          >
                            ❌ ปฏิเสธ
                          </button>
                        )}

                        {p.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(p)}
                            disabled={isWorking}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                          >
                            <span>✅</span>
                            <span>{isWorking ? 'กำลังบันทึก...' : 'อนุมัติ (Approve)'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
