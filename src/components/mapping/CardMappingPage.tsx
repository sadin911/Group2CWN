import { useState, useMemo, useEffect } from 'react';
import { useCustomMappingStore, type CustomCardMapping } from '../../store/customMappingStore';
import { useAuthStore } from '../../store/authStore';
import { CardMappingPickerModal } from '../deck/CardMappingPickerModal';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import pokemonCardData from '../../data/pokemonNames.json';
import translationsData from '../../data/pokemonNameTranslations.json';

interface Props {
  onBack: () => void;
}

type TabType = 'my-mappings' | 'built-in' | 'community';

export function CardMappingPage({ onBack }: Props) {
  const user = useAuthStore((s) => s.user);
  const mappings = useCustomMappingStore((s) => s.mappings);
  const setMapping = useCustomMappingStore((s) => s.setMapping);
  const removeMapping = useCustomMappingStore((s) => s.removeMapping);
  const importMappings = useCustomMappingStore((s) => s.importMappings);
  const clearAllMappings = useCustomMappingStore((s) => s.clearAllMappings);
  const loadUserMappingsFromCloud = useCustomMappingStore((s) => s.loadUserMappingsFromCloud);
  const fetchCommunitySuggestions = useCustomMappingStore((s) => s.fetchCommunitySuggestions);

  const [activeTab, setActiveTab] = useState<TabType>('my-mappings');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEnName, setNewEnName] = useState('');
  const [mappingTarget, setMappingTarget] = useState<{
    item: { rawLine: string; count: number; rawCardName: string; setCode?: string };
    currentCardNameTh?: string;
  } | null>(null);

  const [showImportJsonModal, setShowImportJsonModal] = useState(false);
  const [importJsonInput, setImportJsonInput] = useState('');
  const [copiedEn, setCopiedEn] = useState<string | null>(null);

  // Community suggestions
  const [communityList, setCommunityList] = useState<CustomCardMapping[]>([]);
  const [isCommunityLoading, setIsCommunityLoading] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadUserMappingsFromCloud(user.uid);
    }
  }, [user?.uid, loadUserMappingsFromCloud]);

  useEffect(() => {
    if (activeTab === 'community') {
      setIsCommunityLoading(true);
      fetchCommunitySuggestions()
        .then((list) => setCommunityList(list))
        .finally(() => setIsCommunityLoading(false));
    }
  }, [activeTab, fetchCommunitySuggestions]);

  // ESC key to dismiss active modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddModal) setShowAddModal(false);
        else if (showImportJsonModal) setShowImportJsonModal(false);
        else if (mappingTarget) setMappingTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, showImportJsonModal, mappingTarget]);

  // Convert user mappings object to array
  const mappingsArray = useMemo(() => {
    return Object.values(mappings).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [mappings]);

  // Filtered user mappings
  const filteredMyMappings = useMemo(() => {
    if (!searchFilter.trim()) return mappingsArray;
    const q = searchFilter.toLowerCase();
    return mappingsArray.filter(
      (m) =>
        m.enName.toLowerCase().includes(q) ||
        m.cardNameTh.toLowerCase().includes(q) ||
        (m.setCode && m.setCode.toLowerCase().includes(q))
    );
  }, [mappingsArray, searchFilter]);

  // Built-in translations list
  const builtInList = useMemo(() => {
    const trainers = (translationsData.trainers || {}) as Record<string, string>;
    const pokemon = (translationsData.pokemon || {}) as Record<string, string>;
    const list: Array<{ en: string; th: string; type: 'Trainer' | 'Pokémon' }> = [];

    for (const [en, th] of Object.entries(trainers)) {
      list.push({ en, th, type: 'Trainer' });
    }
    for (const [en, th] of Object.entries(pokemon)) {
      list.push({ en, th, type: 'Pokémon' });
    }

    return list.sort((a, b) => a.en.localeCompare(b.en));
  }, []);

  const filteredBuiltIn = useMemo(() => {
    if (!searchFilter.trim()) return builtInList;
    const q = searchFilter.toLowerCase();
    return builtInList.filter((item) => item.en.includes(q) || item.th.includes(q));
  }, [builtInList, searchFilter]);

  const filteredCommunity = useMemo(() => {
    if (!searchFilter.trim()) return communityList;
    const q = searchFilter.toLowerCase();
    return communityList.filter(
      (item) => item.enName.toLowerCase().includes(q) || item.cardNameTh.toLowerCase().includes(q)
    );
  }, [communityList, searchFilter]);

  // Handle adding a brand new mapping
  const handleStartAddMapping = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newEnName.trim();
    if (!cleanName) return;
    setShowAddModal(false);
    setNewEnName('');
    setMappingTarget({
      item: { rawLine: cleanName, count: 1, rawCardName: cleanName },
    });
  };

  // Handle saving chosen card mapping
  const handleSelectCard = (card: any) => {
    if (!mappingTarget) return;
    const enName = mappingTarget.item.rawCardName;
    setMapping(enName, card, user?.uid);
    setMappingTarget(null);
    setStatusMsg({
      type: 'success',
      text: `จับคู่ "${enName}" ➜ "${card.name}" สำเร็จแล้ว!`,
    });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(mappings, null, 2);
    navigator.clipboard.writeText(dataStr);
    setStatusMsg({ type: 'success', text: 'คัดลอก JSON ของการจับคู่การ์ดลงคลิปบอร์ดแล้ว!' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Import JSON
  const handleImportJSON = async () => {
    try {
      const parsed = JSON.parse(importJsonInput);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('รูปแบบ JSON ไม่ถูกต้อง');
      }
      const count = await importMappings(parsed, user?.uid);
      setShowImportJsonModal(false);
      setImportJsonInput('');
      setStatusMsg({ type: 'success', text: `นำเข้าการจับคู่สำเร็จ ${count} รายการ!` });
      setTimeout(() => setStatusMsg(null), 3500);
    } catch {
      setStatusMsg({ type: 'error', text: 'เกิดข้อผิดพลาด: โปรดตรวจสอบรูปแบบ JSON' });
      setTimeout(() => setStatusMsg(null), 3500);
    }
  };

  // Clear all mappings
  const handleClearAll = async () => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างการจับคู่การ์ดทั้งหมดของคุณ?')) {
      await clearAllMappings(user?.uid);
      setStatusMsg({ type: 'success', text: 'ล้างรายการจับคู่ทั้งหมดเรียบร้อยแล้ว' });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  // Copy helper
  const handleCopyEn = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEn(text);
    setTimeout(() => setCopiedEn(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-24 md:pb-12 transition-colors">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3.5 flex items-center justify-between shadow-sm dark:shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-black flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shrink-0"
            title="กลับไปหน้าจัดเด็ค"
          >
            <span>←</span>
            <span className="hidden sm:inline">กลับไปหน้าจัดเด็ค</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 dark:from-amber-400 dark:via-orange-400 dark:to-yellow-300 bg-clip-text text-transparent truncate flex items-center gap-2">
              <div className="w-6 h-6 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                <img
                  src={`${import.meta.env.BASE_URL}pwa-192x192.png?v=3`}
                  alt="PokeCount Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span>PokéMapping Studio</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
              จัดการและจับคู่ชื่อการ์ดภาษาอังกฤษ (PTCGL / Limitless) ➜ ภาษาไทยในระบบ
            </p>
          </div>
        </div>

        {/* Sync & Stats badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">
            {mappingsArray.length} คู่การ์ด
          </span>
          {user ? (
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1"
              title={`ซิงค์กับบัญชี ${user.email}`}
            >
              <span>☁️</span>
              <span className="hidden md:inline">ซิงค์คลาวด์แล้ว</span>
            </span>
          ) : (
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
              title="บันทึกในเบราว์เซอร์นี้ (เข้าสู่ระบบเพื่อซิงค์ข้ามเครื่อง)"
            >
              <span>💾</span>
              <span className="hidden md:inline">เก็บในเครื่อง</span>
            </span>
          )}
        </div>
      </header>

      {/* Notification Toast */}
      {statusMsg && (
        <div
          className={`fixed top-16 right-4 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold border transition-all animate-bounce ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
              : 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Hero Actions Bar */}
        <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm dark:shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🎯</span>
              <span>เพิ่มและจัดการการจับคู่การ์ด</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              เพิ่มชื่อภาษาอังกฤษที่คุณพบบ่อย เพื่อให้ระบบแปลงเป็นภาษาไทยให้อัตโนมัติเมื่อนำเข้าเด็ค
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <span>➕</span>
              <span>เพิ่มการจับคู่ใหม่</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              disabled={mappingsArray.length === 0}
              className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-40 flex items-center gap-1.5"
              title="คัดลอก JSON ของการ์ดที่จับคู่ไว้"
            >
              <span>📤</span>
              <span className="hidden sm:inline">ส่งออก JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setShowImportJsonModal(true)}
              className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
              title="นำเข้าการจับคู่จาก JSON"
            >
              <span>📥</span>
              <span className="hidden sm:inline">นำเข้า JSON</span>
            </button>

            {mappingsArray.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-500/30 transition-all"
                title="ล้างการจับคู่ทั้งหมด"
              >
                <span>🗑️</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setActiveTab('my-mappings');
              setSearchFilter('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'my-mappings'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <span>👤 การจับคู่ของฉัน</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                activeTab === 'my-mappings' ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
              }`}
            >
              {mappingsArray.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('built-in');
              setSearchFilter('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'built-in'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <span>📚 คลังแปลอัตโนมัติในระบบ</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                activeTab === 'built-in' ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
              }`}
            >
              {builtInList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('community');
              setSearchFilter('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'community'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <span>🌐 ข้อเสนอแนะจากชุมชน</span>
          </button>
        </div>

        {/* Filter / Search Input */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={
              activeTab === 'my-mappings'
                ? 'ค้นหาชื่อการ์ดอังกฤษ หรือไทย ในการจับคู่ของคุณ...'
                : activeTab === 'built-in'
                ? 'ค้นหาในคลังแปลอัตโนมัติ (เช่น Boss, Poffin, Charizard)...'
                : 'ค้นหาข้อเสนอแนะจากผู้เล่นคนอื่น...'
            }
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors shadow-sm"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* TAB 1: My Mappings */}
        {activeTab === 'my-mappings' && (
          <div>
            {filteredMyMappings.length === 0 ? (
              <div className="p-12 text-center bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl flex flex-col items-center justify-center shadow-sm">
                <span className="text-4xl mb-3">🔗</span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-300 mb-1">
                  {mappingsArray.length === 0
                    ? 'ยังไม่มีการจับคู่การ์ดที่บันทึกไว้'
                    : 'ไม่พบการจับคู่ที่ตรงกับคำค้นหา'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  {mappingsArray.length === 0
                    ? 'คุณสามารถกดปุ่ม "เพิ่มการจับคู่ใหม่" ด้านบน เพื่อระบุชื่อการ์ดภาษาอังกฤษและเลือกการ์ดไทยที่ต้องการ'
                    : 'ลองค้นหาด้วยคำอื่น หรือกดล้างคำค้นหา'}
                </p>
                {mappingsArray.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/20"
                  >
                    ➕ เพิ่มการจับคู่ใบแรกของคุณ
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMyMappings.map((m) => (
                  <div
                    key={m.enName}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 shadow-sm transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {m.cardImage ? (
                        <img
                          src={resolveCardImageUrl(m.cardImage)}
                          alt={m.cardNameTh}
                          loading="lazy"
                          onError={(e) => handleCardImageError(e, m.cardImage)}
                          className="w-11 h-15 object-cover rounded-lg shadow-md border border-slate-200 dark:border-slate-700 shrink-0 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-11 h-15 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-lg shrink-0">
                          🃏
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-amber-600 dark:text-amber-300 font-mono truncate">
                            {m.enName}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyEn(m.enName)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            title="คัดลอกชื่ออังกฤษ"
                          >
                            {copiedEn === m.enName ? '✓' : '📋'}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <span className="text-slate-400 dark:text-slate-600">➜</span>
                          <span className="text-slate-900 dark:text-slate-200 font-bold truncate">{m.cardNameTh}</span>
                        </div>
                        {m.setCode && (
                          <span className="inline-block mt-1 text-[9px] font-mono font-black text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                            [{m.setCode}]
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setMappingTarget({
                            item: { rawLine: m.enName, count: 1, rawCardName: m.enName, setCode: m.setCode },
                            currentCardNameTh: m.cardNameTh,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-[11px] font-black transition-all flex items-center gap-1"
                        title="เปลี่ยนการ์ดไทยที่ผูกไว้"
                      >
                        <span>🔄</span>
                        <span>Map ใหม่</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeMapping(m.enName, user?.uid)}
                        className="px-2 py-1 rounded-lg hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 text-[11px] font-bold transition-all"
                        title="ลบการจับคู่นี้"
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

        {/* TAB 2: Built-in Dictionary */}
        {activeTab === 'built-in' && (
          <div>
            <div className="mb-3 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <span>ℹ️</span>
              <span>
                รายการเหล่านี้ได้รับการแปลและจับคู่ให้อัตโนมัติโดยระบบแล้ว ไม่จำเป็นต้อง Map เอง
                เว้นแต่คุณต้องการ <strong>Override</strong> เพื่อเลือกภาพการ์ดเฉพาะรุ่น
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredBuiltIn.slice(0, 150).map((item) => {
                const isOverridden = !!mappings[item.en.toLowerCase()];
                return (
                  <div
                    key={`${item.type}-${item.en}`}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 capitalize font-mono truncate">
                          {item.en}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {item.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="text-slate-400 dark:text-slate-600">➜</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate">{item.th}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setMappingTarget({
                          item: { rawLine: item.en, count: 1, rawCardName: item.en },
                          currentCardNameTh: item.th,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all shrink-0 ${
                        isOverridden
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                      title="กำหนดการ์ดรุ่นเฉพาะเพื่อแทนที่ค่าเริ่มต้น"
                    >
                      {isOverridden ? '🔄 แก้ไข' : '✏️ Override'}
                    </button>
                  </div>
                );
              })}
            </div>
            {filteredBuiltIn.length > 150 && (
              <p className="text-center text-xs text-slate-500 mt-4">
                แสดง 150 รายการแรกจาก {filteredBuiltIn.length} รายการ (พิมพ์ค้นหาเพื่อดูใบอื่น)
              </p>
            )}
          </div>
        )}

        {/* TAB 3: Community Suggestions */}
        {activeTab === 'community' && (
          <div>
            <div className="mb-3 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <span>🌐</span>
              <span>
                ข้อเสนอแนะที่ผู้เล่นท่านอื่นได้ช่วยกันจับคู่ไว้ในระบบ คุณสามารถกด <strong>"+ นำไปใช้"</strong>{' '}
                เพื่อบันทึกเข้าในเครื่องของคุณได้ทันที
              </span>
            </div>

            {isCommunityLoading ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                <span className="animate-spin inline-block mr-2">🔄</span>
                กำลังโหลดข้อเสนอแนะจากระบบคลาวด์...
              </div>
            ) : filteredCommunity.length === 0 ? (
              <div className="p-12 text-center bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-sm">
                <span className="text-4xl mb-2 block">🤝</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">ยังไม่มีข้อเสนอแนะจากชุมชน</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCommunity.map((item) => {
                  const alreadyHave = !!mappings[item.enName.toLowerCase()];
                  return (
                    <div
                      key={item.enName}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-black text-amber-600 dark:text-amber-300 font-mono truncate block">
                          {item.enName}
                        </span>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                          <span className="text-slate-400 dark:text-slate-500">➜</span>
                          <span className="text-slate-900 dark:text-slate-100 font-bold truncate">{item.cardNameTh}</span>
                        </div>
                        {item.setCode && (
                          <span className="inline-block mt-1 text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-black">
                            [{item.setCode}]
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const matchingCard = (pokemonCardData as any[]).find((c) => c.id === item.cardId);
                          if (matchingCard) {
                            setMapping(item.enName, matchingCard, user?.uid);
                            setStatusMsg({
                              type: 'success',
                              text: `นำเข้า "${item.enName}" ➜ "${item.cardNameTh}" สำเร็จ!`,
                            });
                            setTimeout(() => setStatusMsg(null), 3000);
                          }
                        }}
                        disabled={alreadyHave}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                          alreadyHave
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-default'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md'
                        }`}
                      >
                        {alreadyHave ? '✓ มีแล้ว' : '+ นำไปใช้'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: Add New Mapping by typing English name */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-2">
              <span>➕</span>
              <span>ระบุชื่อการ์ดภาษาอังกฤษ</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              กรอกชื่อการ์ดภาษาอังกฤษที่ต้องการ Map เช่น <code>Buddy-Buddy Poffin</code>, <code>Iono</code>
            </p>

            <form onSubmit={handleStartAddMapping} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  ชื่อการ์ดภาษาอังกฤษ (English Name):
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newEnName}
                  onChange={(e) => setNewEnName(e.target.value)}
                  placeholder="เช่น Dragapult ex, Ultra Ball, Arven..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!newEnName.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  <span>ถัดไป: เลือกการ์ดไทย</span>
                  <span>➜</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Import JSON */}
      {showImportJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-2">
              <span>📥</span>
              <span>นำเข้าการจับคู่การ์ดจาก JSON</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              วางโค้ด JSON ของการจับคู่การ์ดที่เคยส่งออกไว้ เพื่อผสานข้อมูลเข้าสู่เครื่องนี้
            </p>

            <textarea
              rows={6}
              value={importJsonInput}
              onChange={(e) => setImportJsonInput(e.target.value)}
              placeholder='วาง JSON ที่นี่ เช่น { "arven": { "enName": "Arven", "cardId": "...", "cardNameTh": "เปปเปอร์" } }'
              className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportJsonModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleImportJSON}
                disabled={!importJsonInput.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-black shadow-lg disabled:opacity-40 transition-all"
              >
                นำเข้าข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Card Picker Modal */}
      {mappingTarget && (
        <CardMappingPickerModal
          unmatchedItem={mappingTarget.item}
          currentCardNameTh={mappingTarget.currentCardNameTh}
          cardDatabase={pokemonCardData as any[]}
          onSelect={handleSelectCard}
          onClose={() => setMappingTarget(null)}
        />
      )}
    </div>
  );
}
