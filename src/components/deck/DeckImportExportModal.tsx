import { useState, useEffect, useMemo } from 'react';
import { useDeckStore } from '../../store/deckStore';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { useCustomMappingStore } from '../../store/customMappingStore';
import pokemonCardData from '../../data/pokemonNames.json';
import { parsePTCGLDeck, type UnmatchedDeckCardItem } from '../../utils/ptcglDeckParser';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { CardMappingPickerModal } from './CardMappingPickerModal';
import { trackEvent } from '../../utils/analytics';

interface Props {
  onClose: () => void;
  activeDeckId?: string | null;
}

export function DeckImportExportModal({ onClose, activeDeckId }: Props) {
  const setGameMode = useGameStore((s) => s.setGameMode);
  const user = useAuthStore((s) => s.user);
  const decks = useDeckStore((s) => s.decks);
  const importDeckJSON = useDeckStore((s) => s.importDeckJSON);
  const importParsedDeck = useDeckStore((s) => s.importParsedDeck);

  const mappings = useCustomMappingStore((s) => s.mappings);
  const setMapping = useCustomMappingStore((s) => s.setMapping);
  const removeMapping = useCustomMappingStore((s) => s.removeMapping);
  const loadUserMappingsFromCloud = useCustomMappingStore((s) => s.loadUserMappingsFromCloud);

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [selectedExportDeckId, setSelectedExportDeckId] = useState<string>(
    activeDeckId || Object.keys(decks)[0] || ''
  );
  const [importJsonText, setImportJsonText] = useState('');
  const [importPTCGLText, setImportPTCGLText] = useState('');
  const [customDeckName, setCustomDeckName] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected card to map or re-map
  const [mappingTarget, setMappingTarget] = useState<{
    item: UnmatchedDeckCardItem;
    currentCardNameTh?: string;
  } | null>(null);
  const [selectedCustomKeys, setSelectedCustomKeys] = useState<Set<string>>(new Set());
  const [showMappingsList, setShowMappingsList] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadUserMappingsFromCloud(user.uid);
    }
  }, [user?.uid, loadUserMappingsFromCloud]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !mappingTarget) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, mappingTarget]);

  const currentExportDeck = decks[selectedExportDeckId];

  // Generate PTCGL format text for the selected export deck
  const ptcglExportText = useMemo(() => {
    if (!currentExportDeck) return '';
    const lines = [`// Pokémon TCG Deck: ${currentExportDeck.name}`];

    const cardsMap = new Map<string, any>();
    (pokemonCardData as any[]).forEach((c) => cardsMap.set(c.id, c));

    const pokemon: string[] = [];
    const trainer: string[] = [];
    const energy: string[] = [];

    for (const [cardId, entry] of Object.entries(currentExportDeck.cards)) {
      if (entry.count <= 0) continue;
      const c = cardsMap.get(cardId);
      const name = c?.name || cardId;
      const setCode = c?.set?.id || 'PROMO';
      const colNum = c?.collectorNumber || c?.localId || '';
      const category = c?.category || 'Pokemon';

      const line = `${entry.count} ${name} ${setCode} ${colNum}`;
      if (category === 'Pokemon') pokemon.push(line);
      else if (category === 'Trainer') trainer.push(line);
      else energy.push(line);
    }

    if (pokemon.length > 0) {
      lines.push(`\nPokémon: ${pokemon.reduce((acc, l) => acc + parseInt(l, 10), 0)}`);
      lines.push(...pokemon);
    }
    if (trainer.length > 0) {
      lines.push(`\nTrainer: ${trainer.reduce((acc, l) => acc + parseInt(l, 10), 0)}`);
      lines.push(...trainer);
    }
    if (energy.length > 0) {
      lines.push(`\nEnergy: ${energy.reduce((acc, l) => acc + parseInt(l, 10), 0)}`);
      lines.push(...energy);
    }

    return lines.join('\n');
  }, [currentExportDeck]);

  const jsonExportText = currentExportDeck ? JSON.stringify(currentExportDeck, null, 2) : '';

  // Current custom mappings dictionary (enName -> cardId)
  const customMappingsDict = useMemo(() => {
    const dict: Record<string, string> = {};
    for (const [k, v] of Object.entries(mappings)) {
      dict[k] = v.cardId;
    }
    return dict;
  }, [mappings]);

  // Parse PTCGL / Limitless text with live feedback & custom user mappings
  const parsedPTCGL = useMemo(() => {
    if (!importPTCGLText.trim()) return null;
    return parsePTCGLDeck(importPTCGLText, pokemonCardData as any[], customMappingsDict);
  }, [importPTCGLText, customMappingsDict]);

  useEffect(() => {
    if (parsedPTCGL?.deckName) {
      setCustomDeckName(parsedPTCGL.deckName);
    }
  }, [parsedPTCGL?.deckName]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    if (activeTab === 'export') {
      trackEvent('deck', 'export', currentExportDeck?.name || 'Deck');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    if (!currentExportDeck) return;
    trackEvent('deck', 'export', currentExportDeck.name);
    const blob = new Blob([jsonExportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck-${currentExportDeck.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    setStatusMsg(null);
    if (!importJsonText.trim()) {
      setStatusMsg({ type: 'error', text: 'กรุณาวางโค้ด JSON ของเด็คก่อน' });
      return;
    }

    const res = importDeckJSON(importJsonText);
    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message });
      setTimeout(onClose, 1200);
    } else {
      setStatusMsg({ type: 'error', text: res.message });
    }
  };

  // Active custom-mapped cards that the user explicitly chose to include in the deck
  const activeCustomEntries = useMemo(() => {
    if (!parsedPTCGL) return [];
    return parsedPTCGL.customMappedEntries.filter((e) =>
      selectedCustomKeys.has(e.rawItem.rawCardName.toLowerCase().trim())
    );
  }, [parsedPTCGL, selectedCustomKeys]);

  const activeTotalCards = useMemo(() => {
    if (!parsedPTCGL) return 0;
    const autoSum = parsedPTCGL.autoMatchedEntries.reduce((sum, e) => sum + e.count, 0);
    const customSum = activeCustomEntries.reduce((sum, e) => sum + e.count, 0);
    return autoSum + customSum;
  }, [parsedPTCGL, activeCustomEntries]);

  const activeCardsRecord = useMemo(() => {
    if (!parsedPTCGL) return {};
    const record: Record<string, { cardId: string; count: number }> = {};
    for (const e of parsedPTCGL.autoMatchedEntries) {
      if (record[e.cardId]) record[e.cardId].count += e.count;
      else record[e.cardId] = { cardId: e.cardId, count: e.count };
    }
    for (const e of activeCustomEntries) {
      if (record[e.cardId]) record[e.cardId].count += e.count;
      else record[e.cardId] = { cardId: e.cardId, count: e.count };
    }
    return record;
  }, [parsedPTCGL, activeCustomEntries]);

  const handleImportPTCGL = () => {
    setStatusMsg(null);
    if (!parsedPTCGL || activeTotalCards === 0) {
      setStatusMsg({
        type: 'error',
        text: 'ไม่พบรายการการ์ดที่สามารถนำเข้าได้ (หากมีรายการที่จับคู่เอง กรุณาเลือกติ๊กถูกก่อนนำเข้า)',
      });
      return;
    }

    try {
      const finalName = customDeckName.trim() || parsedPTCGL.deckName || 'Imported Deck';
      importParsedDeck({
        name: finalName,
        description: 'นำเข้าจาก Limitless / PTCGL Text',
        cards: activeCardsRecord,
        coverCardId: parsedPTCGL.coverCardId,
        coverImageUrl: parsedPTCGL.coverImageUrl,
      });

      setStatusMsg({
        type: 'success',
        text: `นำเข้าเด็ค "${finalName}" สำเร็จ (${activeTotalCards} ใบ)!`,
      });
      setTimeout(onClose, 1200);
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `เกิดข้อผิดพลาด: ${e.message}` });
    }
  };

  const handleSelectCardMapping = async (chosenCard: any) => {
    if (!mappingTarget) return;
    const enName = mappingTarget.item.rawCardName;
    await setMapping(enName, chosenCard, user?.uid);
    // Auto-select this newly chosen card in the deck
    const normKey = enName.toLowerCase().trim();
    setSelectedCustomKeys((prev) => new Set(prev).add(normKey));
    setMappingTarget(null);
    setStatusMsg({
      type: 'success',
      text: `จับคู่ "${enName}" เป็น "${chosenCard.name}" เรียบร้อยแล้ว!`,
    });
  };

  // Card categories breakdown for live preview
  const breakdown = useMemo(() => {
    if (!parsedPTCGL) return { pokemon: 0, trainer: 0, energy: 0 };
    let pokemon = 0;
    let trainer = 0;
    let energy = 0;
    const allActive = [...parsedPTCGL.autoMatchedEntries, ...activeCustomEntries];
    for (const e of allActive) {
      if (e.category === 'Pokemon') pokemon += e.count;
      else if (e.category === 'Trainer') trainer += e.count;
      else energy += e.count;
    }
    return { pokemon, trainer, energy };
  }, [parsedPTCGL, activeCustomEntries]);

  const customMappingsList = Object.values(mappings);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold shadow-md">
                📥
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  นำเข้าและส่งออกเด็ค (Import / Export)
                </h3>
                <p className="text-xs text-slate-400">
                  รองรับ Limitless / PTCGL Text ภาษาอังกฤษ พร้อมระบบจับคู่การ์ดอัจฉริยะ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-black border border-slate-700 hover:border-rose-400 shadow-md transition-all active:scale-95 group"
              title="ปิดหน้าต่าง (ESC)"
            >
              <span className="text-sm font-black group-hover:rotate-90 transition-transform">✕</span>
              <span>ปิด</span>
            </button>
          </div>

          {/* Tab Selector */}
          <div className="px-6 pt-4 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 text-xs font-black rounded-t-xl border-b-2 transition-all ${
                activeTab === 'export'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              📤 ส่งออกเด็ค (Export)
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2 text-xs font-black rounded-t-xl border-b-2 transition-all ${
                activeTab === 'import'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              📥 นำเข้าเด็ค (Import)
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {statusMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                <span>{statusMsg.text}</span>
                <button
                  type="button"
                  onClick={() => setStatusMsg(null)}
                  className="text-xs px-1 hover:opacity-70"
                >
                  ✕
                </button>
              </div>
            )}

            {activeTab === 'export' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    เลือกเด็คที่ต้องการส่งออก:
                  </label>
                  <select
                    value={selectedExportDeckId}
                    onChange={(e) => setSelectedExportDeckId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-amber-300 font-bold focus:outline-none focus:border-indigo-500 shadow-inner"
                  >
                    {Object.values(decks).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({Object.values(d.cards).reduce((acc, c) => acc + c.count, 0)} ใบ)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Text Format Box */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Decklist Text Format:
                    </label>
                    <button
                      onClick={() => handleCopy(ptcglExportText)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                    >
                      {copied ? '✅ คัดลอกแล้ว' : '📋 คัดลอก Text'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={ptcglExportText}
                    rows={8}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none"
                  />
                </div>

                {/* JSON Download Button */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleDownloadJSON}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg transition-all flex items-center gap-2"
                  >
                    <span>💾</span>
                    <span>ดาวน์โหลดไฟล์ JSON</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      วางข้อความ Decklist (Limitless / PTCGL format ภาษาอังกฤษหรือไทย):
                    </label>
                    <span className="text-[11px] text-indigo-400 font-medium">
                      เช่น 4 Dreepy TWM 128
                    </span>
                  </div>
                  <textarea
                    value={importPTCGLText}
                    onChange={(e) => setImportPTCGLText(e.target.value)}
                    placeholder="ตัวอย่างจาก Limitless:&#10;Pokémon: 19&#10;4 Dreepy TWM 128&#10;4 Drakloak TWM 129&#10;3 Dragapult ex TWM 130&#10;Trainer: 32&#10;4 Buddy-Buddy Poffin TEF 144&#10;Energy: 9&#10;3 Fire Energy MEE 2"
                    rows={6}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />

                  {/* Live Parse Preview */}
                  {parsedPTCGL && (
                    <div className="mt-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {parsedPTCGL.coverImageUrl ? (
                            <img
                              src={resolveCardImageUrl(parsedPTCGL.coverImageUrl)}
                              alt="Cover"
                              loading="lazy"
                              onError={(e) => handleCardImageError(e, parsedPTCGL.coverImageUrl)}
                              className="w-10 h-14 object-cover rounded-lg shadow-md border border-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-14 rounded-lg bg-slate-800 flex items-center justify-center text-xl">
                              🃏
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${
                                  activeTotalCards === 60
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                {activeTotalCards === 60
                                  ? '✅ ครบ 60 ใบ'
                                  : `${activeTotalCards} / 60 ใบ`}
                              </span>
                              <span className="text-xs text-slate-400">
                                (อัตโนมัติ {parsedPTCGL.autoMatchedEntries.length} ชนิด
                                {parsedPTCGL.customMappedEntries.length > 0 &&
                                  `, จับคู่เอง ${activeCustomEntries.length}/${parsedPTCGL.customMappedEntries.length} ชนิด`}
                                )
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                              <span>🃏 โปเกมอน {breakdown.pokemon}</span>
                              <span>•</span>
                              <span>🎒 เทรนเนอร์ {breakdown.trainer}</span>
                              <span>•</span>
                              <span>⚡ พลังงาน {breakdown.energy}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 sm:max-w-xs">
                          <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                            ชื่อเด็ค:
                          </label>
                          <input
                            type="text"
                            value={customDeckName}
                            onChange={(e) => setCustomDeckName(e.target.value)}
                            placeholder="ชื่อเด็ค..."
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* 1. Unmatched Cards Interactive Warning & Mapping */}
                      {parsedPTCGL.unmatchedDetails.length > 0 && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-bold flex items-center gap-1.5">
                              <span>⚠️</span>
                              <span>ยังไม่พบการ์ดในระบบ {parsedPTCGL.unmatchedDetails.length} รายการ:</span>
                            </div>
                            <span className="text-[10px] text-rose-400">
                              คลิก "จับคู่การ์ด" เพื่อเลือกการ์ดไทย
                            </span>
                          </div>

                          <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin">
                            {parsedPTCGL.unmatchedDetails.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/80 border border-rose-500/20 gap-2"
                              >
                                <div className="min-w-0 flex items-center gap-2">
                                  <span className="font-mono font-bold text-indigo-400 shrink-0 text-xs">
                                    {item.count}x
                                  </span>
                                  <span className="font-semibold text-slate-200 truncate">
                                    {item.rawCardName}
                                  </span>
                                  {item.setCode && (
                                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                      ({item.setCode} {item.collectorNumber || ''})
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setMappingTarget({ item })}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-bold shadow-sm transition-all shrink-0 flex items-center gap-1"
                                >
                                  <span>🔍</span>
                                  <span>จับคู่การ์ด</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. Custom Mapped Cards Section (Shown Separately & Not Auto-Selected) */}
                      {parsedPTCGL.customMappedEntries.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2.5 animate-fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base">🔗</span>
                              <span className="font-bold text-amber-300">
                                การ์ดที่มาจากการจับคู่ (Custom Mapped) ({parsedPTCGL.customMappedEntries.length} รายการ)
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const allKeys = new Set(
                                    parsedPTCGL.customMappedEntries.map((e) =>
                                      e.rawItem.rawCardName.toLowerCase().trim()
                                    )
                                  );
                                  setSelectedCustomKeys(allKeys);
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors"
                              >
                                ✓ เลือกทั้งหมด
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedCustomKeys(new Set())}
                                className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                              >
                                ✕ ไม่เลือกทั้งหมด
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-amber-300/80">
                            * การ์ดด้านล่างมาจากการจับคู่เอง (ไม่ได้เลือกให้อัตโนมัติ) ติ๊กถูกเพื่อรวมในเด็ค หรือกด <strong>"Map ใหม่"</strong> หากต้องการแก้ไข
                          </p>

                          <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin">
                            {parsedPTCGL.customMappedEntries.map((e, idx) => {
                              const normKey = e.rawItem.rawCardName.toLowerCase().trim();
                              const isChecked = selectedCustomKeys.has(normKey);
                              return (
                                <div
                                  key={`custom-${e.cardId}-${idx}`}
                                  className={`flex items-center justify-between p-2 rounded-xl border transition-all gap-2 ${
                                    isChecked
                                      ? 'bg-amber-950/40 border-amber-500/50 shadow-sm'
                                      : 'bg-slate-900/60 border-slate-800 opacity-75'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(ev) => {
                                        const next = new Set(selectedCustomKeys);
                                        if (ev.target.checked) next.add(normKey);
                                        else next.delete(normKey);
                                        setSelectedCustomKeys(next);
                                      }}
                                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700 cursor-pointer shrink-0"
                                      title={isChecked ? 'ติ๊กออกเพื่อไม่รวมในเด็ค' : 'ติ๊กถูกเพื่อรวมในเด็ค'}
                                    />
                                    <span className="w-5 font-mono font-bold text-amber-400 text-right shrink-0">
                                      {e.count}x
                                    </span>
                                    {e.cardImage && (
                                      <img
                                        src={resolveCardImageUrl(e.cardImage)}
                                        alt={e.cardNameTh}
                                        loading="lazy"
                                        onError={(err) => handleCardImageError(err, e.cardImage)}
                                        className="w-6 h-8 object-cover rounded shadow-sm shrink-0 border border-slate-700"
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-amber-300 font-mono truncate">
                                          {e.cardNameEn}
                                        </span>
                                        <span className="text-[10px] text-slate-500">➜</span>
                                        <span className="font-semibold text-slate-100 truncate">
                                          {e.cardNameTh}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] border border-amber-500/30">
                                          จับคู่เอง
                                        </span>
                                        {e.setCode && (
                                          <span className="font-mono text-slate-400">
                                            [{e.setCode} {e.collectorNumber || ''}]
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setMappingTarget({
                                          item: e.rawItem,
                                          currentCardNameTh: e.cardNameTh,
                                        })
                                      }
                                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-bold shadow-sm transition-all flex items-center gap-1"
                                      title="เลือกการ์ดใหม่หากจับคู่ผิด"
                                    >
                                      <span>🔄</span>
                                      <span>Map ใหม่</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await removeMapping(e.rawItem.rawCardName, user?.uid);
                                        const next = new Set(selectedCustomKeys);
                                        next.delete(normKey);
                                        setSelectedCustomKeys(next);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 active:scale-95 text-[11px] font-bold border border-slate-700 transition-all"
                                      title="ยกเลิกการจับคู่ใบนี้"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 3. Auto-Matched Cards Preview List */}
                      {parsedPTCGL.autoMatchedEntries.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-slate-400 px-1 py-0.5">
                            <span className="font-bold flex items-center gap-1.5 text-slate-300">
                              <span>✓</span>
                              <span>การ์ดที่พบในระบบอัตโนมัติ ({parsedPTCGL.autoMatchedEntries.length} รายการ)</span>
                            </span>
                            <span className="text-[10px] text-slate-500">
                              กด 🔄 หากต้องการเปลี่ยนเป็นใบอื่น
                            </span>
                          </div>

                          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-900/50 p-2 space-y-1 scrollbar-thin">
                            {parsedPTCGL.autoMatchedEntries.map((e, idx) => (
                              <div
                                key={`auto-${e.cardId}-${idx}`}
                                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-800/60 text-xs transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-6 font-mono font-bold text-indigo-400 text-right shrink-0">
                                    {e.count}x
                                  </span>
                                  {e.cardImage && (
                                    <img
                                      src={resolveCardImageUrl(e.cardImage)}
                                      alt={e.cardNameTh}
                                      loading="lazy"
                                      onError={(err) => handleCardImageError(err, e.cardImage)}
                                      className="w-5 h-7 object-cover rounded shadow-sm shrink-0"
                                    />
                                  )}
                                  <span className="font-semibold text-slate-200 truncate">
                                    {e.cardNameTh}
                                  </span>
                                  {e.cardNameEn !== e.cardNameTh && (
                                    <span className="text-[10px] text-slate-500 truncate hidden sm:inline">
                                      ({e.cardNameEn})
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {e.setCode || ''} {e.collectorNumber || ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setMappingTarget({
                                        item: e.rawItem,
                                        currentCardNameTh: e.cardNameTh,
                                      })
                                    }
                                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-400 border border-slate-700 transition-colors"
                                    title="เปลี่ยนเป็นการ์ดใบอื่น"
                                  >
                                    🔄 เปลี่ยน
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        onClick={handleImportPTCGL}
                        disabled={activeTotalCards === 0}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <span>📥</span>
                        <span>
                          นำเข้าเด็ค "{customDeckName.trim() || parsedPTCGL.deckName}" (
                          {activeTotalCards} ใบ)
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Custom Mappings Drawer / Section */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMappingsList(!showMappingsList)}
                    className="text-xs text-slate-400 hover:text-indigo-400 font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span>{showMappingsList ? '▼' : '▶'}</span>
                    <span>การจับคู่ที่บันทึกไว้ของฉัน (My Mappings) ({customMappingsList.length} รายการ)</span>
                  </button>

                  {showMappingsList && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 animate-fade-in text-xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="text-[11px] text-slate-400 font-bold">รายการที่บันทึกไว้ในเครื่อง</span>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            setGameMode('mapping');
                          }}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-black flex items-center gap-1 hover:underline"
                        >
                          <span>เปิดหน้า Studio เต็ม</span>
                          <span>➜</span>
                        </button>
                      </div>
                      {customMappingsList.length === 0 ? (
                        <p className="text-slate-500 text-[11px] text-center py-2">
                          ยังไม่มีรายการที่จับคู่เอง เมื่อคุณกด "จับคู่การ์ด" รายการจะถูกบันทึกไว้ที่นี่
                        </p>
                      ) : (
                        <div className="max-h-36 overflow-y-auto space-y-1 scrollbar-thin">
                          {customMappingsList.map((m) => (
                            <div
                              key={m.enName}
                              className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800"
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                {m.cardImage && (
                                  <img
                                    src={resolveCardImageUrl(m.cardImage)}
                                    alt={m.cardNameTh}
                                    loading="lazy"
                                    onError={(err) => handleCardImageError(err, m.cardImage)}
                                    className="w-5 h-7 object-cover rounded shadow-sm shrink-0"
                                  />
                                )}
                                <span className="font-bold text-amber-300 font-mono truncate">
                                  {m.enName}
                                </span>
                                <span className="text-slate-500 text-[10px]">➜</span>
                                <span className="text-slate-200 truncate">{m.cardNameTh}</span>
                                {m.setCode && (
                                  <span className="text-[10px] text-indigo-400 font-mono">
                                    [{m.setCode}]
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <button
                                  type="button"
                                  onClick={() => setMappingTarget({
                                    item: { rawLine: m.enName, count: 1, rawCardName: m.enName, setCode: m.setCode },
                                    currentCardNameTh: m.cardNameTh,
                                  })}
                                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold px-1.5 py-0.5 rounded hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center gap-1"
                                  title="แก้ไขการจับคู่การ์ดนี้"
                                >
                                  <span>🔄</span>
                                  <span>Map ใหม่</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeMapping(m.enName, user?.uid)}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold px-1.5 py-0.5 rounded hover:bg-rose-500/20 transition-all"
                                >
                                  ลบ
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    หรือวางโค้ด JSON สำรองของเด็ค:
                  </label>
                  <textarea
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder="วาง JSON ของเด็คที่นี่..."
                    rows={4}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleImportJSON}
                    className="mt-2 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-lg transition-all"
                  >
                    นำเข้าจาก JSON
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white text-xs sm:text-sm font-black border border-slate-600 shadow-lg transition-all flex items-center gap-1.5"
            >
              <span>✕</span>
              <span>ปิดหน้าต่าง</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Card Mapping Picker Modal */}
      {mappingTarget && (
        <CardMappingPickerModal
          unmatchedItem={mappingTarget.item}
          currentCardNameTh={mappingTarget.currentCardNameTh}
          cardDatabase={pokemonCardData as any[]}
          onSelect={handleSelectCardMapping}
          onClose={() => setMappingTarget(null)}
        />
      )}
    </>
  );
}
