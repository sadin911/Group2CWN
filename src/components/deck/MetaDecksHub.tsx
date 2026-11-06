import { useState, useMemo, useEffect } from 'react';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { calculateMissingCards } from '../../utils/deckCalculator';
import type { MetaDeck, MetaTier, DeckPlaystyle } from '../../types/metaDeck';
import type { CollectionCardEntry } from '../../types/collection';
import {
  fetchMetaDecksWithOverrides,
  getMergedMetaDecks,
  type MetaDeckWithMeta,
} from '../../services/metaDeckService';
import { useAuthStore } from '../../store/authStore';
import { isCurrentSessionAdmin } from '../../utils/adminAuth';
import { MetaDeckEditModal } from './MetaDeckEditModal';

interface Props {
  cardDataMap: Map<string, any>;
  userCollectionCards: Record<string, CollectionCardEntry>;
  onCloneDeck: (metaDeck: MetaDeck) => void;
  onViewDeck: (metaDeck: MetaDeck) => void;
  onCheckMissing: (metaDeck: MetaDeck) => void;
}

export function MetaDecksHub({
  cardDataMap,
  userCollectionCards,
  onCloneDeck,
  onViewDeck,
  onCheckMissing,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = isCurrentSessionAdmin(user?.email);

  const [selectedTier, setSelectedTier] = useState<MetaTier | 'All'>('All');
  const [selectedPlaystyle, setSelectedPlaystyle] = useState<DeckPlaystyle | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [metaDecks, setMetaDecks] = useState<MetaDeckWithMeta[]>(() => getMergedMetaDecks());
  const [editingDeck, setEditingDeck] = useState<MetaDeck | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchMetaDecksWithOverrides().then(({ decks }) => {
      if (isMounted) {
        setMetaDecks(decks);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered decks
  const filteredDecks = useMemo(() => {
    return metaDecks.filter((deck) => {
      // Tier filter
      if (selectedTier !== 'All' && deck.tier !== selectedTier) return false;

      // Playstyle filter
      if (selectedPlaystyle !== 'All' && deck.playstyle !== selectedPlaystyle) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = deck.name.toLowerCase().includes(q);
        const matchesPlayer = (deck.author || '').toLowerCase().includes(q);
        const matchesEvent = (deck.event || '').toLowerCase().includes(q);
        const matchesPlaystyle = (deck.playstyle || '').toLowerCase().includes(q);
        const matchesKeyPokemon = (deck.keyPokemon || []).some((p) => p.toLowerCase().includes(q));
        return matchesName || matchesPlayer || matchesEvent || matchesPlaystyle || matchesKeyPokemon;
      }
      return true;
    });
  }, [metaDecks, selectedTier, selectedPlaystyle, searchQuery]);

  const handleCopyPTCGL = (deck: MetaDeck, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deck.exportText) return;
    navigator.clipboard.writeText(deck.exportText);
    setCopiedId(deck.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTierBadgeStyle = (tier: MetaTier) => {
    switch (tier) {
      case 'Tier 1':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10';
      case 'Tier 2':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/10';
      case 'Tier 3':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-500/10';
      case 'Rogue':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-pink-500/10';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10';
    }
  };

  const getPlaystyleBadgeStyle = (playstyle?: DeckPlaystyle) => {
    switch (playstyle) {
      case 'Aggro':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'Setup':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'Control':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Toolbox':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'Single Prize':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getPlaystyleIcon = (playstyle?: DeckPlaystyle) => {
    switch (playstyle) {
      case 'Aggro':
        return '⚡';
      case 'Setup':
        return '🔄';
      case 'Control':
        return '🛡️';
      case 'Toolbox':
        return '📦';
      case 'Single Prize':
        return '🃏';
      default:
        return '⚔️';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
              <span>🏆</span>
              <span>Tournament Meta Decks</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/30 text-[10px] text-amber-200">
                Live Data
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <span>เด็คแข่งขันระดับโลก</span>
              <span className="text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                {metaDecks.length} เด็คเมต้า
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              อ้างอิงข้อมูลการแข่งขันจริงล่าสุดจาก{' '}
              <a
                href="https://limitlesstcg.com/decks"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:text-amber-300 font-bold underline inline-flex items-center gap-1"
              >
                Limitless TCG ↗
              </a>{' '}
              จับคู่แปลการ์ดไทย 60 ใบอัตโนมัติ เช็คความพร้อมของคอลเลกชันได้ทันที และโคลนเข้าคลังในคลิกเดียว!
            </p>
          </div>

          {/* Reference Attribution Badge */}
          <div className="shrink-0 bg-slate-950/70 border border-amber-500/20 rounded-2xl p-4 flex flex-col gap-2 text-xs text-slate-300 shadow-inner">
            <div className="flex items-center gap-2 text-amber-300 font-black">
              <span>⚡ Powered by Limitless TCG</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <div>
                รูปแบบ: <span className="text-slate-200 font-medium">Standard 2026</span>
              </div>
              <div>
                ความแม่นยำ: <span className="text-emerald-400 font-bold">100% (60/60 ใบ)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 bg-slate-900/80 p-3 sm:p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        {/* Row 1: Tier Pills & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tier Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {(['All', 'Tier 1', 'Tier 2', 'Tier 3', 'Rogue'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                  selectedTier === tier
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black scale-105'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {tier === 'All' ? 'ทุก Tier' : tier}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              placeholder="ค้นหาชื่อเด็ค, โปเกมอน, ผู้เล่น, สาย..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-amber-500 rounded-xl px-3.5 py-2 pl-9 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
            <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Playstyle Archetype Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-800/80 pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">สายการเล่น:</span>
          {(['All', 'Aggro', 'Setup', 'Control', 'Toolbox', 'Single Prize'] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setSelectedPlaystyle(style)}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedPlaystyle === style
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-md scale-105'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
              }`}
            >
              <span>{style === 'All' ? '🌟' : getPlaystyleIcon(style as DeckPlaystyle)}</span>
              <span>{style === 'All' ? 'ทุกสาย (All)' : style}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Meta Decks Grid */}
      {filteredDecks.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <span className="text-4xl">🔍</span>
          <h3 className="text-base font-bold text-slate-300">ไม่พบเด็คแข่งขันที่ค้นหา</h3>
          <p className="text-xs text-slate-500">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรอง Tier อื่น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDecks.map((deck) => {
            const totalCards = Object.values(deck.cards).reduce((acc, c) => acc + c.count, 0);
            const missingReport = calculateMissingCards(deck, cardDataMap, userCollectionCards);
            const coverImg = deck.coverImageUrl
              ? resolveCardImageUrl(deck.coverImageUrl)
              : null;

            return (
              <div
                key={deck.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-5 shadow-xl transition-all duration-300 flex flex-col justify-between group hover:shadow-2xl hover:shadow-amber-500/10"
              >
                <div className="space-y-4">
                  {/* Top Row: Cover Card + Tier Badge & Archetype Header */}
                  <div className="flex items-start gap-4">
                    {/* Cover Artwork */}
                    <div
                      onClick={() => onViewDeck(deck)}
                      className="w-20 h-28 rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 shadow-md cursor-pointer shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center relative group/cover"
                      title="คลิกเพื่อดูเด็ค"
                    >
                      {coverImg ? (
                        <img
                          src={coverImg}
                          alt={deck.name}
                          className="w-full h-full object-cover"
                          onError={(e) =>
                            handleCardImageError(
                              e,
                              deck.coverCardId ? cardDataMap.get(deck.coverCardId) : undefined
                            )
                          }
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-2xl opacity-40">🃏</span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white font-bold px-1.5 py-0.5 rounded bg-black/70">
                          ดูเด็ค
                        </span>
                      </div>
                    </div>

                    {/* Meta Deck Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wide ${getTierBadgeStyle(
                            deck.tier
                          )}`}
                        >
                          {deck.tier}
                        </span>
                        {deck.playstyle && (
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 ${getPlaystyleBadgeStyle(
                              deck.playstyle
                            )}`}
                          >
                            <span>{getPlaystyleIcon(deck.playstyle)}</span>
                            <span>{deck.playstyle}</span>
                          </span>
                        )}
                        {deck.sharePercent !== undefined && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                            {deck.sharePercent}% Share
                          </span>
                        )}
                        {deck.points !== undefined && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                            {deck.points} pts
                          </span>
                        )}
                        {deck.isOverridden && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold">
                            ✨ แก้ไขแล้ว
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDeck(deck);
                            }}
                            className="px-2 py-0.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/40 text-[10px] font-black transition-all flex items-center gap-1 active:scale-95 ml-auto"
                            title="แก้ไขการ Map การ์ดหรือรายละเอียดเด็ค (เฉพาะ Admin)"
                          >
                            <span>✏️</span>
                            <span>แก้ไข (Admin)</span>
                          </button>
                        )}
                      </div>

                      <h3
                        onClick={() => onViewDeck(deck)}
                        className="text-lg font-black text-white group-hover:text-amber-300 transition-colors truncate cursor-pointer"
                        title={deck.name}
                      >
                        {deck.name}
                      </h3>

                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                        <span>👤 {deck.author || 'Competitor'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="truncate">{deck.event || 'Tournament'}</span>
                      </p>

                      {/* Key Pokemon tags */}
                      {deck.keyPokemon && deck.keyPokemon.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {deck.keyPokemon.map((pkmn) => (
                            <span
                              key={pkmn}
                              className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-[10px] text-slate-300 font-medium"
                            >
                              {pkmn}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pros & Cons Strategic Analysis Box */}
                  {(deck.pros?.length || deck.cons?.length) && (
                    <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3 space-y-2 text-xs">
                      {deck.pros && deck.pros.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                            <span>✅ จุดเด่น (Pros):</span>
                          </div>
                          <ul className="text-[11px] text-slate-300 space-y-0.5 pl-3 list-disc marker:text-emerald-500">
                            {deck.pros.map((pro, idx) => (
                              <li key={idx} className="leading-tight">{pro}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {deck.cons && deck.cons.length > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-slate-800/60">
                          <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                            <span>⚠️ ข้อควรระวัง (Cons):</span>
                          </div>
                          <ul className="text-[11px] text-slate-300 space-y-0.5 pl-3 list-disc marker:text-rose-500">
                            {deck.cons.map((con, idx) => (
                              <li key={idx} className="leading-tight">{con}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Missing Report Mini Banner */}
                  <div
                    onClick={() => onCheckMissing(deck)}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 cursor-pointer group ${
                      missingReport.isComplete
                        ? 'bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-500/60'
                        : 'bg-amber-950/30 border-amber-500/30 hover:border-amber-500/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm shrink-0">
                        {missingReport.isComplete ? '✨' : '🧩'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-white truncate">
                          {missingReport.isComplete
                            ? 'พร้อมเล่น! คุณมีการ์ดครบ 60 ใบ'
                            : `มี ${missingReport.totalCardsOwned}/${totalCards} ใบ (ขาดอีก ${missingReport.totalCardsMissing} ใบ)`}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {missingReport.isComplete
                            ? 'สามารถจัดเด็คแข่งจริงได้ทันที'
                            : 'คลิกเพื่อดูการ์ดที่ขาด และสร้าง Shopping List'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform shrink-0">
                      {missingReport.completionPercentage.toFixed(0)}% ❯
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="mt-4 pt-3.5 border-t border-slate-800/80 space-y-2">
                  {/* Action Group 1: Inspect, Check Missing & Copy PTCGL */}
                  <div className={`grid ${deck.exportText ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
                    <button
                      type="button"
                      onClick={() => onViewDeck(deck)}
                      className="px-2 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-slate-200 border border-slate-700/80 font-bold text-xs transition-all flex items-center justify-center gap-1 hover:border-slate-600 shadow-sm"
                      title="ดูรายละเอียดการ์ด 60 ใบ"
                    >
                      <span className="text-sm shrink-0">👁️</span>
                      <span className="truncate">ดูการ์ด</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onCheckMissing(deck)}
                      className="px-2 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-slate-200 border border-slate-700/80 font-bold text-xs transition-all flex items-center justify-center gap-1 hover:border-slate-600 shadow-sm"
                      title="เช็คการ์ดที่ยังขาดและสร้าง Shopping List"
                    >
                      <span className="text-sm shrink-0">🧮</span>
                      <span className="truncate">การ์ดขาด</span>
                    </button>

                    {deck.exportText && (
                      <button
                        type="button"
                        onClick={(e) => handleCopyPTCGL(deck, e)}
                        className={`px-2 py-2 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1 shadow-sm ${
                          copiedId === deck.id
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-slate-800/90 hover:bg-slate-750 text-slate-300 border-slate-700/80 hover:text-white'
                        }`}
                        title="คัดลอก PTCGL Export Format"
                      >
                        <span className="text-sm shrink-0">{copiedId === deck.id ? '✓' : '📋'}</span>
                        <span className="truncate font-mono text-[11px]">{copiedId === deck.id ? 'ก๊อปแล้ว' : 'PTCGL'}</span>
                      </button>
                    )}
                  </div>

                  {/* Action Group 2: Clone to My Decks (Primary CTA) */}
                  <button
                    type="button"
                    onClick={() => onCloneDeck(deck)}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:from-amber-600 active:to-yellow-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-98"
                    title="โคลนเด็คนี้เข้าไปยังคลังเด็คของฉัน"
                  >
                    <span className="text-sm shrink-0">⚡</span>
                    <span className="whitespace-nowrap">โคลนเด็ค</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Meta Deck Edit Modal */}
      {editingDeck && (
        <MetaDeckEditModal
          deck={editingDeck}
          cardDataMap={cardDataMap}
          onClose={() => setEditingDeck(null)}
          onSave={(updatedDeck) => {
            setMetaDecks((prev) =>
              prev.map((d) =>
                d.id === updatedDeck.id ? { ...updatedDeck, isOverridden: true } : d
              )
            );
            setEditingDeck(null);
          }}
          onReset={() => {
            fetchMetaDecksWithOverrides().then(({ decks }) => setMetaDecks(decks));
            setEditingDeck(null);
          }}
        />
      )}
    </div>
  );
}
