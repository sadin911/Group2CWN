import { useState, useMemo, useEffect } from 'react';
import { useDeckStore } from '../../store/deckStore';
import { useCollectionStore } from '../../store/collectionStore';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { DeckHeader } from './DeckHeader';
import { DeckEditor } from './DeckEditor';
import { MissingCardsModal } from './MissingCardsModal';
import { DeckImportExportModal } from './DeckImportExportModal';
import { DeckCoverPickerModal } from './DeckCoverPickerModal';
import { DeckViewModal } from './DeckViewModal';
import { MetaDecksHub } from './MetaDecksHub';
import { calculateMissingCards } from '../../utils/deckCalculator';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { PullToRefresh } from '../common/PullToRefresh';
import pokemonCardData from '../../data/pokemonNames.json';
import type { MetaDeck } from '../../types/metaDeck';

export function DeckManager() {
  const setGameMode = useGameStore((s) => s.setGameMode);
  const decks = useDeckStore((s) => s.decks);
  const activeDeckId = useDeckStore((s) => s.activeDeckId);
  const createDeck = useDeckStore((s) => s.createDeck);
  const deleteDeck = useDeckStore((s) => s.deleteDeck);
  const duplicateDeck = useDeckStore((s) => s.duplicateDeck);
  const setDeckCover = useDeckStore((s) => s.setDeckCover);
  const loadUserDecksFromCloud = useDeckStore((s) => s.loadUserDecksFromCloud);
  const importParsedDeck = useDeckStore((s) => s.importParsedDeck);

  const activeProfileId = useCollectionStore((s) => s.activeProfileId);
  const profile = useCollectionStore((s) => s.profiles[activeProfileId]);
  const userCollectionCards = profile?.cards || {};

  const user = useAuthStore((s) => s.user);

  // Sync / load cloud decks on mount if logged in
  useEffect(() => {
    if (user?.uid) {
      loadUserDecksFromCloud(user.uid);
    }
  }, [user?.uid, loadUserDecksFromCloud]);

  const [activeTab, setActiveTab] = useState<'my-decks' | 'meta-hub'>('my-decks');
  const [cloneNotification, setCloneNotification] = useState<string | null>(null);

  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [selectedViewDeckId, setSelectedViewDeckId] = useState<string | null>(null);
  const [selectedMissingDeckId, setSelectedMissingDeckId] = useState<string | null>(null);
  const [selectedCoverDeckId, setSelectedCoverDeckId] = useState<string | null>(null);
  const [selectedMetaDeckForView, setSelectedMetaDeckForView] = useState<MetaDeck | null>(null);
  const [selectedMetaDeckForMissing, setSelectedMetaDeckForMissing] = useState<MetaDeck | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');

  // Card lookup map
  const cardDataMap = useMemo(() => {
    const map = new Map<string, any>();
    (pokemonCardData as any[]).forEach((c) => map.set(c.id, c));
    return map;
  }, []);

  const deckList = useMemo(() => {
    return Object.values(decks).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [decks]);

  const handleCreateNewDeck = () => {
    const name = newDeckName.trim() || `Deck #${deckList.length + 1}`;
    const id = createDeck(name);
    setNewDeckName('');
    setShowNewDeckModal(false);
    setEditingDeckId(id);
  };

  const editingDeck = editingDeckId ? decks[editingDeckId] : null;
  const viewDeck = selectedViewDeckId ? decks[selectedViewDeckId] : null;
  const missingDeck = selectedMissingDeckId ? decks[selectedMissingDeckId] : null;
  const coverDeck = selectedCoverDeckId ? decks[selectedCoverDeckId] : null;

  const handleRefresh = async () => {
    if (user?.uid) {
      await loadUserDecksFromCloud(user.uid);
    }
  };

  const handleCloneMetaDeck = (metaDeck: MetaDeck) => {
    importParsedDeck({
      name: `${metaDeck.name} (Meta Copy)`,
      description: `โคลนมาจากเด็คเมต้าระดับโลก: ${metaDeck.name} (${metaDeck.author || 'Limitless TCG'})`,
      cards: metaDeck.cards,
      coverCardId: metaDeck.coverCardId,
      coverImageUrl: metaDeck.coverImageUrl,
    });
    setCloneNotification(`คัดลอกเด็ค "${metaDeck.name}" เข้าคลังเด็คของคุณเรียบร้อยแล้ว!`);
    setActiveTab('my-decks');
    setTimeout(() => setCloneNotification(null), 4000);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={!!editingDeck}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
        {/* Top Header */}
        <DeckHeader
          isEditing={!!editingDeck}
          onBackToDecks={() => setEditingDeckId(null)}
          onOpenImportExport={() => setShowImportExport(true)}
        />

      {/* Main Content: If editing, show Editor; otherwise show Deck List */}
      {editingDeck ? (
        <DeckEditor
          deck={editingDeck}
          onBackToDecks={() => setEditingDeckId(null)}
        />
      ) : (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Success Toast Notification */}
          {cloneNotification && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold flex items-center justify-between shadow-xl animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎉</span>
                <span>{cloneNotification}</span>
              </div>
              <button
                type="button"
                onClick={() => setCloneNotification(null)}
                className="text-emerald-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-emerald-500/30"
              >
                ✕ ปิด
              </button>
            </div>
          )}

          {/* Navigation Tabs: My Decks vs Meta Decks Hub */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-slate-200/80 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('my-decks')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
                  activeTab === 'my-decks'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-purple-500/20 scale-105'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span>🃏</span>
                <span>คลังเด็คของฉัน</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/60 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 text-[10px] font-bold">
                  {deckList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('meta-hub')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
                  activeTab === 'meta-hub'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-105'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span>🏆</span>
                <span>เด็คเมต้าแข่งขัน</span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                  Limitless TCG
                </span>
              </button>
            </div>
          </div>

          {activeTab === 'meta-hub' ? (
            <MetaDecksHub
              cardDataMap={cardDataMap}
              userCollectionCards={userCollectionCards}
              onCloneDeck={handleCloneMetaDeck}
              onViewDeck={(metaDeck) => setSelectedMetaDeckForView(metaDeck)}
              onCheckMissing={(metaDeck) => setSelectedMetaDeckForMissing(metaDeck)}
            />
          ) : (
            <>
              {/* Hero Banner & Stats */}
              <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-black uppercase tracking-wider">
                    <span>🃏</span>
                    <span>Deck Manager</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    คลังเด็คการ์ดของคุณ ({deckList.length} เด็ค)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                    สร้าง จัดการ และตรวจสอบความพร้อมของการ์ดในเด็คเทียบกับสมุดสะสมของคุณได้ทันที
                  </p>
                </div>

                {/* Actions: Create, Import & Card Mapping */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveTab('meta-hub')}
                    className="flex-1 sm:flex-none px-3.5 py-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 hover:scale-105 active:scale-95"
                    title="เปิดดูเด็คแข่งขันเมต้าระดับโลก"
                  >
                    <span>🏆</span>
                    <span>เด็คเมต้าแข่งขัน</span>
                  </button>


                  <button
                    type="button"
                    onClick={() => setGameMode('mapping')}
                    className="flex-1 sm:flex-none px-3.5 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 hover:scale-105 active:scale-95"
                    title="จัดการและจับคู่ชื่อการ์ดภาษาอังกฤษเป็นภาษาไทย"
                  >
                    <span>🔗</span>
                    <span>จัดการ Map การ์ด</span>
                  </button>

                  <button
                    onClick={() => setShowImportExport(true)}
                    className="flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                  >
                    <span>📥</span>
                    <span>นำเข้าเด็ค</span>
                  </button>

                  <button
                    onClick={() => setShowNewDeckModal(true)}
                    className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                  >
                    <span>➕</span>
                    <span>สร้างเด็คใหม่</span>
                  </button>
                </div>
              </div>

          {/* Deck Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {deckList.map((deck) => {
              const totalCards = Object.values(deck.cards).reduce((acc, c) => acc + c.count, 0);
              const missingReport = calculateMissingCards(deck, cardDataMap, userCollectionCards);
              const coverImg = deck.coverImageUrl
                ? resolveCardImageUrl(deck.coverImageUrl)
                : null;

              return (
                <div
                  key={deck.id}
                  data-testid="deck-card"
                  className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 rounded-3xl p-5 shadow-md dark:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:shadow-2xl hover:shadow-indigo-500/10"
                >
                  <div>
                    {/* Top Row: Cover Thumbnail + Info */}
                    <div className="flex items-start gap-4">
                      <div
                        onClick={() => setSelectedCoverDeckId(deck.id)}
                        className="w-20 h-28 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 shadow-md cursor-pointer shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center relative group/cover"
                        title="คลิกเพื่อเปลี่ยนรูปหน้าปกเด็ค"
                      >
                        {coverImg ? (
                          <img
                            src={coverImg}
                            alt={deck.name}
                            className="w-full h-full object-cover"
                            onError={(e) => handleCardImageError(e, deck.coverImageUrl)}
                          />
                        ) : (
                          <span className="text-3xl opacity-40">🃏</span>
                        )}
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/90 text-slate-200 font-mono text-[9px] font-bold">
                          {totalCards}/60
                        </div>

                        {/* Hover Overlay to Change Cover */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/cover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] text-amber-300 font-bold p-1 text-center">
                          <span>🖼️</span>
                          <span>เปลี่ยนรูปปก</span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {new Date(deck.updatedAt).toLocaleDateString('th-TH')}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedCoverDeckId(deck.id)}
                            className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 font-semibold transition-colors flex items-center gap-1"
                            title="เลือกรูปการ์ดหน้าปกเด็ค"
                          >
                            <span>🖼️</span>
                            <span>เปลี่ยนรูปปก</span>
                          </button>
                        </div>
                        <h3
                          onClick={() => setSelectedViewDeckId(deck.id)}
                          className="text-base font-black text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer truncate mt-1"
                          title="คลิกเพื่อดูเด็ค"
                        >
                          {deck.name}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                          {deck.description || 'ไม่มีคำอธิบาย'}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar & Missing Status */}
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">ความพร้อมของการ์ด:</span>
                        <span
                          className={`font-black ${
                            missingReport.isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {missingReport.completionPercentage}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800/80">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300"
                          style={{ width: `${missingReport.completionPercentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span
                          className={`font-bold ${
                            totalCards === 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {totalCards === 60 ? '✅ ครบ 60 ใบ' : `${totalCards} / 60 ใบ`}
                        </span>

                        {missingReport.totalCardsMissing > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                            <span>⚠️ ขาด {missingReport.totalCardsMissing} ใบ</span>
                          </span>
                        ) : totalCards > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">✨ มีการ์ดครบ 100%</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">เด็คว่าง</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-1.5 sm:gap-2">
                    {/* ดูเด็ค */}
                    <button
                      type="button"
                      onClick={() => setSelectedViewDeckId(deck.id)}
                      className="h-9 px-2.5 sm:px-3 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white font-bold text-xs border border-slate-300 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 shadow-sm"
                      title="ดูเด็คแบบตารางการ์ด (Grid View) หรือรายการ"
                    >
                      <span className="text-sm">👁️</span>
                      <span>ดูเด็ค</span>
                    </button>

                    {/* จัดเด็ค */}
                    <button
                      type="button"
                      onClick={() => setEditingDeckId(deck.id)}
                      className="h-9 flex-1 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 min-w-0 whitespace-nowrap active:scale-95"
                      title="เปิดแก้ไขและจัดเด็คนี้"
                    >
                      <span className="text-sm">✏️</span>
                      <span className="truncate">จัดเด็ค</span>
                    </button>

                    {/* การ์ดที่ขาด */}
                    <button
                      type="button"
                      onClick={() => setSelectedMissingDeckId(deck.id)}
                      className="h-9 px-2 sm:px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 font-bold text-xs border border-slate-300 dark:border-slate-700/80 transition-all flex items-center justify-center gap-1 shrink-0 whitespace-nowrap active:scale-95 shadow-sm"
                      title="คำนวณการ์ดที่ขาดและสร้าง Shopping List"
                    >
                      <span className="text-sm">🧮</span>
                      <span className="hidden sm:inline">การ์ดที่ขาด</span>
                    </button>

                  {/* คัดลอก (Duplicate) */}
                    <button
                      type="button"
                      onClick={() => duplicateDeck(deck.id)}
                      className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700/80 transition-all flex items-center justify-center text-xs shrink-0 active:scale-95 shadow-sm"
                      title="คัดลอกเด็คนี้"
                    >
                      <span>📑</span>
                    </button>

                    {/* ลบ (Delete) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`คุณต้องการลบเด็ค "${deck.name}" ใช่หรือไม่?`)) {
                          deleteDeck(deck.id);
                        }
                      }}
                      className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-300 dark:border-slate-700/80 transition-all flex items-center justify-center text-xs shrink-0 active:scale-95 shadow-sm"
                      title="ลบเด็คนี้"
                    >
                      <span>🗑️</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  )}

      {/* New Deck Modal */}
      {showNewDeckModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setShowNewDeckModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>➕ สร้างเด็คใหม่</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewDeckModal(false)}
                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 text-slate-700 dark:text-slate-300 hover:text-white flex items-center gap-1 text-xs font-black border border-slate-300 dark:border-slate-700 hover:border-rose-400 shadow-md transition-all active:scale-95 group"
                title="ปิดหน้าต่าง (ESC)"
              >
                <span className="text-sm font-black group-hover:rotate-90 transition-transform">✕</span>
                <span>ปิด</span>
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">ชื่อเด็ค:</label>
              <input
                type="text"
                placeholder="เช่น Charizard ex Tera, Gardevoir ex..."
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNewDeck();
                  if (e.key === 'Escape') setShowNewDeckModal(false);
                }}
                autoFocus
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewDeckModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCreateNewDeck}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-black text-xs shadow-lg"
              >
                สร้างเด็ค
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deck View Modal (Grid & List modes) for User Decks */}
      {viewDeck && (
        <DeckViewModal
          deck={viewDeck}
          cardDataMap={cardDataMap}
          onEditDeck={() => {
            const dId = viewDeck.id;
            setSelectedViewDeckId(null);
            setEditingDeckId(dId);
          }}
          onClose={() => setSelectedViewDeckId(null)}
        />
      )}

      {/* Deck View Modal for Meta Decks */}
      {selectedMetaDeckForView && (
        <DeckViewModal
          deck={selectedMetaDeckForView}
          cardDataMap={cardDataMap}
          onClose={() => setSelectedMetaDeckForView(null)}
        />
      )}

      {/* Missing Cards Modal for User Decks */}
      {missingDeck && (
        <MissingCardsModal
          deck={missingDeck}
          cardDataMap={cardDataMap}
          onClose={() => setSelectedMissingDeckId(null)}
        />
      )}

      {/* Missing Cards Modal for Meta Decks */}
      {selectedMetaDeckForMissing && (
        <MissingCardsModal
          deck={selectedMetaDeckForMissing}
          cardDataMap={cardDataMap}
          onClose={() => setSelectedMetaDeckForMissing(null)}
        />
      )}

      {/* Deck Cover Picker Modal */}
      {coverDeck && (
        <DeckCoverPickerModal
          deck={coverDeck}
          onSelectCover={(cardId, imageUrl) => setDeckCover(coverDeck.id, cardId, imageUrl)}
          onClose={() => setSelectedCoverDeckId(null)}
        />
      )}

      {/* Import / Export Modal */}
      {showImportExport && (
        <DeckImportExportModal
          onClose={() => setShowImportExport(false)}
          activeDeckId={activeDeckId}
        />
      )}
      </div>
    </PullToRefresh>
  );
}
