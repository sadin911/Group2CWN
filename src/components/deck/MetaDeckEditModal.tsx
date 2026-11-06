import { useState, useMemo, useEffect } from 'react';
import type { MetaDeck, MetaTier, DeckPlaystyle } from '../../types/metaDeck';
import type { DeckCardEntry } from '../../types/deck';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { saveMetaDeckOverride, resetMetaDeckOverride } from '../../services/metaDeckService';
import { useAuthStore } from '../../store/authStore';
import pokemonCardData from '../../data/pokemonNames.json';

interface Props {
  deck: MetaDeck;
  cardDataMap: Map<string, any>;
  onClose: () => void;
  onSave: (updatedDeck: MetaDeck) => void;
  onReset?: (deckId: string) => void;
}

export function MetaDeckEditModal({
  deck,
  cardDataMap,
  onClose,
  onSave,
  onReset,
}: Props) {
  const user = useAuthStore((s) => s.user);

  // Deck form state
  const [deckName, setDeckName] = useState(deck.name);
  const [tier, setTier] = useState<MetaTier>(deck.tier);
  const [playstyle, setPlaystyle] = useState<DeckPlaystyle>(deck.playstyle || 'Setup');
  const [cards, setCards] = useState<Record<string, DeckCardEntry>>({ ...deck.cards });
  const [coverCardId, setCoverCardId] = useState<string | undefined>(deck.coverCardId);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Remap / Add Card Picker State
  const [pickerMode, setPickerMode] = useState<'remap' | 'add' | null>(null);
  const [targetOldCardId, setTargetOldCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Pokemon' | 'Trainer' | 'Energy'>('ALL');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pickerMode) {
          setPickerMode(null);
          setTargetOldCardId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pickerMode, onClose]);

  // Group cards into Pokemon, Trainer, Energy
  const cardEntries = useMemo(() => {
    return Object.values(cards).map((entry) => {
      const card = cardDataMap.get(entry.cardId);
      return {
        ...entry,
        card,
      };
    });
  }, [cards, cardDataMap]);

  const pokemonList = useMemo(
    () => cardEntries.filter((c) => c.card?.category === 'Pokemon'),
    [cardEntries]
  );
  const trainerList = useMemo(
    () => cardEntries.filter((c) => c.card?.category === 'Trainer'),
    [cardEntries]
  );
  const energyList = useMemo(
    () => cardEntries.filter((c) => c.card?.category === 'Energy' || (!c.card?.category && c.card?.name?.includes('พลังงาน'))),
    [cardEntries]
  );
  const otherList = useMemo(
    () =>
      cardEntries.filter(
        (c) =>
          c.card?.category !== 'Pokemon' &&
          c.card?.category !== 'Trainer' &&
          c.card?.category !== 'Energy' &&
          !c.card?.name?.includes('พลังงาน')
      ),
    [cardEntries]
  );

  const totalCardCount = useMemo(() => {
    return Object.values(cards).reduce((acc, c) => acc + c.count, 0);
  }, [cards]);

  // Handle Card Remap (Replace old card with new card, preserve count)
  const handleSelectRemap = (newCard: any) => {
    if (!targetOldCardId) return;
    const oldCount = cards[targetOldCardId]?.count || 1;

    setCards((prev) => {
      const next = { ...prev };
      delete next[targetOldCardId];

      if (next[newCard.id]) {
        next[newCard.id] = {
          cardId: newCard.id,
          count: next[newCard.id].count + oldCount,
        };
      } else {
        next[newCard.id] = {
          cardId: newCard.id,
          count: oldCount,
        };
      }
      return next;
    });

    if (coverCardId === targetOldCardId) {
      setCoverCardId(newCard.id);
    }

    setFeedback({
      type: 'success',
      text: `เปลี่ยนการ์ดเป็น "${newCard.name || newCard.id}" สำเร็จ`,
    });
    setPickerMode(null);
    setTargetOldCardId(null);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Handle Add New Card
  const handleSelectAdd = (newCard: any) => {
    setCards((prev) => {
      const next = { ...prev };
      if (next[newCard.id]) {
        next[newCard.id] = {
          cardId: newCard.id,
          count: next[newCard.id].count + 1,
        };
      } else {
        next[newCard.id] = {
          cardId: newCard.id,
          count: 1,
        };
      }
      return next;
    });

    setFeedback({
      type: 'success',
      text: `เพิ่ม "${newCard.name || newCard.id}" เข้าเด็คแล้ว (+1)`,
    });
    setPickerMode(null);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Quantity adjustments
  const handleUpdateCount = (cardId: string, delta: number) => {
    setCards((prev) => {
      const next = { ...prev };
      const current = next[cardId]?.count || 0;
      const updated = current + delta;
      if (updated <= 0) {
        delete next[cardId];
        if (coverCardId === cardId) {
          const firstRemaining = Object.keys(next)[0];
          setCoverCardId(firstRemaining);
        }
      } else {
        next[cardId] = { cardId, count: updated };
      }
      return next;
    });
  };

  // Remove card
  const handleRemoveCard = (cardId: string) => {
    setCards((prev) => {
      const next = { ...prev };
      delete next[cardId];
      if (coverCardId === cardId) {
        const firstRemaining = Object.keys(next)[0];
        setCoverCardId(firstRemaining);
      }
      return next;
    });
  };

  // Save changes to Firestore
  const handleSaveDeck = async () => {
    setIsSaving(true);
    setFeedback(null);

    const updatedCoverCard = coverCardId ? cardDataMap.get(coverCardId) : undefined;
    const resolvedCoverImg = updatedCoverCard?.imageUrl || deck.coverImageUrl;

    const updatedDeck: MetaDeck = {
      ...deck,
      name: deckName.trim() || deck.name,
      tier,
      playstyle,
      cards,
      coverCardId: coverCardId || Object.keys(cards)[0],
      coverImageUrl: resolvedCoverImg,
      updatedAt: Date.now(),
    };

    try {
      await saveMetaDeckOverride(updatedDeck, user?.email || undefined);
      setFeedback({ type: 'success', text: 'บันทึกการแก้ไขขึ้น Cloud สำเร็จแล้ว!' });
      onSave(updatedDeck);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'เกิดข้อผิดพลาดในการบันทึกขึ้น Cloud',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleResetToDefault = async () => {
    if (!window.confirm(`คุณต้องการคืนค่าเด็ค "${deck.name}" กลับเป็นค่าเริ่มต้นจากโค้ดใช่หรือไม่?`)) {
      return;
    }

    setIsSaving(true);
    try {
      await resetMetaDeckOverride(deck.id, user?.email || undefined);
      if (onReset) onReset(deck.id);
      setFeedback({ type: 'success', text: 'รีเซ็ตเด็คกลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว' });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'เกิดข้อผิดพลาดในการรีเซ็ตเด็ค',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Search filter for card picker
  const filteredSearchCards = useMemo(() => {
    if (!pickerMode) return [];
    const q = searchQuery.trim().toLowerCase();

    return (pokemonCardData as any[])
      .filter((c) => {
        if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
        if (!q) return true;

        const nameTh = (c.name || '').toLowerCase();
        const nameEn = (c.nameEn || '').toLowerCase();
        const cardId = (c.id || '').toLowerCase();
        const localId = (String(c.localId || '')).toLowerCase();
        const setId = (c.set?.id || '').toLowerCase();

        return (
          nameTh.includes(q) ||
          nameEn.includes(q) ||
          cardId.includes(q) ||
          localId.includes(q) ||
          setId.includes(q)
        );
      })
      .slice(0, 60);
  }, [pickerMode, searchQuery, categoryFilter]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xl shrink-0">
              ⚡
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Admin Deck Editor
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    totalCardCount === 60
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {totalCardCount} / 60 ใบ
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate">
                แก้ไขเด็คเมต้า: {deck.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all disabled:opacity-50"
              title="รีเซ็ตกลับเป็นค่าเริ่มต้นตามไฟล์โค้ด"
            >
              🔄 รีเซ็ต
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold border border-slate-700 transition-all active:scale-95"
              title="ปิดหน้าต่าง"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-b border-rose-500/30'
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Deck Metadata Settings */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">ชื่อเด็คแข่งขัน:</label>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">ระดับ Tier:</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as MetaTier)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Tier 1">Tier 1</option>
                <option value="Tier 2">Tier 2</option>
                <option value="Tier 3">Tier 3</option>
                <option value="Rogue">Rogue</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">สายการเล่น (Playstyle):</label>
              <select
                value={playstyle}
                onChange={(e) => setPlaystyle(e.target.value as DeckPlaystyle)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Aggro">⚡ Aggro</option>
                <option value="Setup">🔄 Setup</option>
                <option value="Control">🛡️ Control</option>
                <option value="Toolbox">📦 Toolbox</option>
                <option value="Single Prize">🃏 Single Prize</option>
              </select>
            </div>
          </div>

          {/* Action to Add Card */}
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>📋 รายการการ์ดในเด็ค</span>
              <span className="text-xs text-slate-400 font-normal">
                (กดปุ่ม 🔁 เพื่อเปลี่ยนการ์ดที่ Map ผิด)
              </span>
            </h3>

            <button
              type="button"
              onClick={() => {
                setPickerMode('add');
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <span>➕</span>
              <span>เพิ่มการ์ดเข้าเด็ค</span>
            </button>
          </div>

          {/* Card Group Sections */}
          <div className="space-y-4">
            {/* Pokemon Section */}
            {pokemonList.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-black text-amber-400 flex items-center gap-2">
                  <span>👾 โปเกมอน ({pokemonList.reduce((acc, c) => acc + c.count, 0)} ใบ)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {pokemonList.map((entry) => renderCardRow(entry))}
                </div>
              </div>
            )}

            {/* Trainer Section */}
            {trainerList.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-black text-cyan-400 flex items-center gap-2">
                  <span>🎓 เทรนเนอร์ ({trainerList.reduce((acc, c) => acc + c.count, 0)} ใบ)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {trainerList.map((entry) => renderCardRow(entry))}
                </div>
              </div>
            )}

            {/* Energy Section */}
            {energyList.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-black text-emerald-400 flex items-center gap-2">
                  <span>⚡ พลังงาน ({energyList.reduce((acc, c) => acc + c.count, 0)} ใบ)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {energyList.map((entry) => renderCardRow(entry))}
                </div>
              </div>
            )}

            {/* Other / Uncategorized Section */}
            {otherList.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-black text-purple-400 flex items-center gap-2">
                  <span>📦 การ์ดอื่นๆ ({otherList.reduce((acc, c) => acc + c.count, 0)} ใบ)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {otherList.map((entry) => renderCardRow(entry))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                totalCardCount === 60 ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>
              {totalCardCount === 60
                ? 'เด็คครบ 60 ใบตามมาตรฐาน'
                : `เด็คมี ${totalCardCount} ใบ (ยังไม่ครบ 60 ใบ)`}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              data-testid="btn-save-cloud"
              onClick={handleSaveDeck}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <span>{isSaving ? '⏳ กำลังบันทึก...' : '💾 บันทึกขึ้น Cloud'}</span>
            </button>
          </div>
        </div>

        {/* Card Remap / Add Search Picker Sub-Modal */}
        {pickerMode && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
            onClick={() => {
              setPickerMode(null);
              setTargetOldCardId(null);
            }}
          >
            <div
              className="w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>{pickerMode === 'remap' ? '🔁 เลือกการ์ดที่ถูกต้อง (Remap)' : '➕ เลือกการ์ดเพื่อเพิ่มเข้าเด็ค'}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    ค้นหาชื่อไทย, ชื่ออังกฤษ, หรือรหัสการ์ด (เช่น SV6, MA3, TH-xxxxx)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPickerMode(null);
                    setTargetOldCardId(null);
                  }}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Search input & filters */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อการ์ด (เช่น โดราพัลท์, Dragapult, พลังงาน...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">ทุกหมวดหมู่</option>
                  <option value="Pokemon">โปเกมอน</option>
                  <option value="Trainer">เทรนเนอร์</option>
                  <option value="Energy">พลังงาน</option>
                </select>
              </div>

              {/* Search Results List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[50vh]">
                {filteredSearchCards.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    ไม่พบการ์ดที่ตรงกับคำค้นหา
                  </div>
                ) : (
                  filteredSearchCards.map((c) => {
                    const cardImg = c.imageUrl ? resolveCardImageUrl(c.imageUrl) : null;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          if (pickerMode === 'remap') {
                            handleSelectRemap(c);
                          } else {
                            handleSelectAdd(c);
                          }
                        }}
                        className="p-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0 flex items-center justify-center">
                            {cardImg ? (
                              <img
                                src={cardImg}
                                alt={c.name}
                                className="w-full h-full object-cover"
                                onError={(e) => handleCardImageError(e, c)}
                              />
                            ) : (
                              <span className="text-base">🃏</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate">
                              {c.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {c.nameEn && <span className="mr-1">{c.nameEn} •</span>}
                              <span>{c.id}</span>
                              {c.localId && <span> • #{c.localId}</span>}
                              {c.set?.id && <span> ({c.set.id})</span>}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                {c.category || 'Pokemon'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 text-xs font-bold transition-all shrink-0"
                        >
                          {pickerMode === 'remap' ? 'เลือกการ์ดนี้' : '+ เพิ่ม'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Helper renderer for each card row
  function renderCardRow(entry: { cardId: string; count: number; card: any }) {
    const cardImg = entry.card?.imageUrl ? resolveCardImageUrl(entry.card.imageUrl) : null;
    const isCover = coverCardId === entry.cardId;

    return (
      <div
        key={entry.cardId}
        className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
          isCover
            ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Card Image Thumbnail */}
          <div className="w-9 h-12 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0 flex items-center justify-center relative">
            {cardImg ? (
              <img
                src={cardImg}
                alt={entry.card?.name || entry.cardId}
                className="w-full h-full object-cover"
                onError={(e) => handleCardImageError(e, entry.card)}
              />
            ) : (
              <span className="text-sm">🃏</span>
            )}
            {isCover && (
              <span className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[8px] font-black px-1 rounded-bl">
                ปก
              </span>
            )}
          </div>

          {/* Card Details */}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-white truncate">
              {entry.card?.name || entry.cardId}
            </div>
            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
              <span className="font-mono text-[9px] text-slate-500">{entry.cardId}</span>
              {entry.card?.localId && <span>• #{entry.card.localId}</span>}
              {entry.card?.set?.id && <span>({entry.card.set.id})</span>}
            </div>
          </div>
        </div>

        {/* Action Buttons: Remap, Adjust Quantity, Delete, Set Cover */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Remap button */}
          <button
            type="button"
            data-testid="btn-remap-card"
            onClick={() => {
              setTargetOldCardId(entry.cardId);
              setPickerMode('remap');
              setSearchQuery(entry.card?.name || '');
            }}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-white border border-slate-700 text-[11px] font-bold transition-all flex items-center gap-1"
            title="เปลี่ยนการ์ดใบนี้จากการจับคู่ที่ผิดพลาด (Remap)"
          >
            <span>🔁</span>
            <span className="hidden sm:inline">Remap</span>
          </button>

          {/* Quantity Controls */}
          <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => handleUpdateCount(entry.cardId, -1)}
              className="w-5 h-5 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-bold flex items-center justify-center transition-colors"
            >
              -
            </button>
            <span className="text-xs font-black text-amber-300 w-4 text-center">
              {entry.count}
            </span>
            <button
              type="button"
              onClick={() => handleUpdateCount(entry.cardId, 1)}
              className="w-5 h-5 rounded bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 text-xs font-bold flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>

          {/* Set Cover Button */}
          <button
            type="button"
            onClick={() => setCoverCardId(entry.cardId)}
            className={`w-7 h-7 rounded-lg border text-xs flex items-center justify-center transition-colors ${
              isCover
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800/80 text-slate-500 hover:text-amber-300 border-slate-700'
            }`}
            title={isCover ? 'การ์ดนี้เป็นการ์ดปก' : 'ตั้งเป็นการ์ดปก'}
          >
            ★
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => handleRemoveCard(entry.cardId)}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 border border-slate-700 text-xs flex items-center justify-center transition-colors"
            title="ลบการ์ดนี้ออกจากเด็ค"
          >
            🗑️
          </button>
        </div>
      </div>
    );
  }
}
