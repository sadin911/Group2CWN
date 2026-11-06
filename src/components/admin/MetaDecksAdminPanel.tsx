import { useState, useEffect, useMemo } from 'react';
import type { MetaDeck, MetaTier } from '../../types/metaDeck';
import {
  fetchMetaDecksWithOverrides,
  resetMetaDeckOverride,
  exportMetaDecksJson,
  type MetaDeckWithMeta,
} from '../../services/metaDeckService';
import { MetaDeckEditModal } from '../deck/MetaDeckEditModal';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import pokemonCardData from '../../data/pokemonNames.json';

export function MetaDecksAdminPanel() {
  const [decks, setDecks] = useState<MetaDeckWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<MetaTier | 'ALL'>('ALL');
  const [overrideOnly, setOverrideOnly] = useState(false);
  const [editingDeck, setEditingDeck] = useState<MetaDeck | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Card data lookup map
  const cardDataMap = useMemo(() => {
    const map = new Map<string, any>();
    (pokemonCardData as any[]).forEach((c) => map.set(c.id, c));
    return map;
  }, []);

  const loadDecks = async () => {
    setLoading(true);
    try {
      const result = await fetchMetaDecksWithOverrides();
      setDecks(result.decks);
    } catch (_err: any) {
      setFeedback({ type: 'error', text: 'โหลดข้อมูลเด็คเมต้าไม่สำเร็จ' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecks();
  }, []);

  // Filtered decks
  const filteredDecks = useMemo(() => {
    return decks.filter((deck) => {
      if (tierFilter !== 'ALL' && deck.tier !== tierFilter) return false;
      if (overrideOnly && !deck.isOverridden) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = deck.name.toLowerCase().includes(q);
        const matchesPlayer = (deck.author || '').toLowerCase().includes(q);
        const matchesEvent = (deck.event || '').toLowerCase().includes(q);
        return matchesName || matchesPlayer || matchesEvent;
      }
      return true;
    });
  }, [decks, tierFilter, overrideOnly, searchQuery]);

  // Export JSON download
  const handleExportJson = () => {
    try {
      const jsonStr = exportMetaDecksJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'metaDecks.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFeedback({ type: 'success', text: 'ดาวน์โหลดไฟล์ metaDecks.json เรียบร้อยแล้ว!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (_err: any) {
      setFeedback({ type: 'error', text: 'เกิดข้อผิดพลาดในการ Export JSON' });
    }
  };

  // Copy JSON to clipboard
  const handleCopyJson = () => {
    try {
      const jsonStr = exportMetaDecksJson();
      navigator.clipboard.writeText(jsonStr);
      setFeedback({ type: 'success', text: 'คัดลอก JSON ข้อมูลเด็คเมต้าทั้งหมดลง Clipboard แล้ว!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback({ type: 'error', text: 'ไม่สามารถคัดลอกลง Clipboard ได้' });
    }
  };

  // Reset single deck
  const handleResetDeck = async (deck: MetaDeck) => {
    if (!window.confirm(`คุณต้องการรีเซ็ตเด็ค "${deck.name}" กลับเป็นค่าเริ่มต้นใช่หรือไม่?`)) return;

    try {
      await resetMetaDeckOverride(deck.id);
      await loadDecks();
      setFeedback({ type: 'success', text: `รีเซ็ตเด็ค "${deck.name}" สำเร็จ` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (_err: any) {
      setFeedback({ type: 'error', text: 'เกิดข้อผิดพลาดในการรีเซ็ตเด็ค' });
    }
  };

  const overriddenCount = decks.filter((d) => d.isOverridden).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h2 className="text-lg font-black text-white">จัดการเด็คเมต้าแข่งขัน (Meta Decks Manager)</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            ตรวจสอบ แก้ไขการ์ดที่ Map ผิดพลาด ปรับแต่งเด็ค และซิงค์ขึ้น Cloud ทันที หรือ Export เป็นไฟล์ JSON สำหรับ commit เข้า Repository
          </p>
        </div>

        {/* Action buttons: Refresh, Copy, Download */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadDecks}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            title="รีเฟรชข้อมูลจาก Cloud"
          >
            <span>🔄</span>
            <span>{loading ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyJson}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            title="คัดลอก JSON ทั้งหมด"
          >
            <span>📋</span>
            <span>ก๊อปปี้ JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95"
            title="ดาวน์โหลด metaDecks.json ฉบับอัปเดต"
          >
            <span>📥</span>
            <span>Export metaDecks.json</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tier filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">ทุก Tier ({decks.length} เด็ค)</option>
            <option value="Tier 1">Tier 1</option>
            <option value="Tier 2">Tier 2</option>
            <option value="Tier 3">Tier 3</option>
            <option value="Rogue">Rogue</option>
          </select>

          {/* Overridden toggle */}
          <button
            type="button"
            onClick={() => setOverrideOnly(!overrideOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              overrideOnly
                ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                : 'bg-slate-950 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <span>✨</span>
            <span>เฉพาะที่แก้ไขบน Cloud ({overriddenCount})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            placeholder="ค้นหาชื่อเด็ค, ผู้เล่น, งานแข่ง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 pl-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <span className="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Decks Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          ⏳ กำลังโหลดข้อมูลเด็คแข่งขัน...
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400 text-sm">
          ไม่พบเด็คที่ค้นหา
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDecks.map((deck) => {
            const totalCards = Object.values(deck.cards).reduce((acc, c) => acc + c.count, 0);
            const coverCard = deck.coverCardId ? cardDataMap.get(deck.coverCardId) : undefined;
            const coverImg = deck.coverImageUrl
              ? resolveCardImageUrl(deck.coverImageUrl)
              : coverCard?.imageUrl
              ? resolveCardImageUrl(coverCard.imageUrl)
              : null;

            return (
              <div
                key={deck.id}
                className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                  deck.isOverridden
                    ? 'bg-slate-900/95 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    {/* Cover card thumbnail */}
                    <div className="w-14 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0 flex items-center justify-center">
                      {coverImg ? (
                        <img
                          src={coverImg}
                          alt={deck.name}
                          className="w-full h-full object-cover"
                          onError={(e) => handleCardImageError(e, coverCard)}
                        />
                      ) : (
                        <span className="text-xl">🃏</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {deck.tier}
                        </span>
                        {deck.playstyle && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {deck.playstyle}
                          </span>
                        )}
                        {deck.isOverridden && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 border border-amber-500/40">
                            ✨ Cloud
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-black text-white truncate" title={deck.name}>
                        {deck.name}
                      </h3>

                      <p className="text-[11px] text-slate-400 truncate">
                        {deck.author || 'ไม่ระบุผู้เล่น'} {deck.event ? `• ${deck.event}` : ''}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                        <span>{totalCards} ใบ</span>
                        {deck.sharePercent && <span>• {deck.sharePercent}% Share</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    data-testid="btn-edit-meta-deck"
                    onClick={() => setEditingDeck(deck)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>✏️</span>
                    <span>แก้ไข / Remap</span>
                  </button>

                  {deck.isOverridden && (
                    <button
                      type="button"
                      onClick={() => handleResetDeck(deck)}
                      className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-bold transition-all"
                      title="คืนค่าเป็นข้อมูลเริ่มต้นจากโค้ด"
                    >
                      🔄 รีเซ็ต
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingDeck && (
        <MetaDeckEditModal
          deck={editingDeck}
          cardDataMap={cardDataMap}
          onClose={() => setEditingDeck(null)}
          onSave={() => {
            loadDecks();
          }}
          onReset={() => {
            loadDecks();
          }}
        />
      )}
    </div>
  );
}
