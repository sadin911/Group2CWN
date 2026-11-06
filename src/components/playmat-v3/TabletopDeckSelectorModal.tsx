import React, { useState, useMemo, useEffect } from 'react';
import type { CardInstance } from '../../engine/types';
import {
  LIMITLESS_META_DECKS,
  buildMetaDeck,
  buildUserCustomDeck,
} from '../../engine/data/LimitlessDeckLoader';
import {
  PRESET_DECKS,
} from '../../engine/data/StandardCardCatalog';
import { useDeckStore } from '../../store/deckStore';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { Sound } from '../../engine/pixi/SoundEffects';
import { TurnDecisionModal } from './modals/TurnDecisionModal';
import { auth } from '../../utils/firebase';

interface TabletopDeckSelectorModalProps {
  onClose: () => void;
  onSelectDeck: (side: 'player1' | 'player2', cards: CardInstance[], name: string) => void;
  isNewMatchMode?: boolean;
  p1DeckName?: string;
  p2DeckName?: string;
  targetSideOnly?: 'player1' | 'player2';
  onConfirmStartNewMatch?: (
    p1Cards: CardInstance[],
    p1Name: string,
    p2Cards: CardInstance[],
    p2Name: string,
    firstPlayer: 'player1' | 'player2'
  ) => void;
}

export const TabletopDeckSelectorModal: React.FC<TabletopDeckSelectorModalProps> = ({
  onClose,
  onSelectDeck,
  isNewMatchMode = false,
  p1DeckName,
  p2DeckName,
  targetSideOnly,
  onConfirmStartNewMatch,
}) => {
  const [activeTab, setActiveTab] = useState<'META' | 'CUSTOM' | 'PRESET'>('META');

  const [searchQuery, setSearchQuery] = useState('');
  const [firstPlayer, setFirstPlayer] = useState<'player1' | 'player2'>('player1');
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);

  // Selected deck staged for new match
  const [selectedP1, setSelectedP1] = useState<{ cards: CardInstance[]; name: string } | null>(null);
  const [selectedP2, setSelectedP2] = useState<{ cards: CardInstance[]; name: string } | null>(null);

  // User custom decks from deckStore
  const userDecks = useDeckStore((s) => s.decks);
  const loadUserDecksFromCloud = useDeckStore((s) => s.loadUserDecksFromCloud);

  // Hydrate user decks from cloud if authenticated
  useEffect(() => {
    const user = auth.currentUser;
    if (user?.uid) {
      loadUserDecksFromCloud(user.uid).catch(console.warn);
    }
  }, [loadUserDecksFromCloud]);

  const customDecksList = useMemo(() => Object.values(userDecks || {}), [userDecks]);

  // Filtered custom decks
  const filteredCustomDecks = useMemo(() => {
    return customDecksList.filter((d) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (d.name || '').toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q);
    });
  }, [customDecksList, searchQuery]);

  // Filtered meta decks
  const filteredMetaDecks = useMemo(() => {
    return LIMITLESS_META_DECKS.filter((d) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = d.name.toLowerCase().includes(q);
      const matchPlayer = (d.author || '').toLowerCase().includes(q);
      const matchEvent = (d.event || '').toLowerCase().includes(q);
      const matchArchetype = (d.playstyle || '').toLowerCase().includes(q);
      const matchKeyPokemon = (d.keyPokemon || []).some((p) => p.toLowerCase().includes(q));
      return matchName || matchPlayer || matchEvent || matchArchetype || matchKeyPokemon;
    });
  }, [searchQuery]);

  const handleApplyDeck = (
    side: 'player1' | 'player2',
    cards: CardInstance[],
    name: string
  ) => {
    Sound.playCardFlip();
    if (isNewMatchMode) {
      if (side === 'player1') {
        setSelectedP1({ cards, name });
      } else {
        setSelectedP2({ cards, name });
      }
    } else {
      Sound.playShuffle();
      onSelectDeck(side, cards, name);
      onClose();
    }
  };

  const handleConfirmStartMatch = () => {
    if (!onConfirmStartNewMatch) return;
    Sound.playShuffle();
    const defaultP1 = buildMetaDeck(LIMITLESS_META_DECKS[0].id);
    const defaultP2 = buildMetaDeck(LIMITLESS_META_DECKS[1]?.id || LIMITLESS_META_DECKS[0].id);

    const finalP1Cards = selectedP1 ? selectedP1.cards : defaultP1;
    const finalP1Name = selectedP1 ? selectedP1.name : (p1DeckName || LIMITLESS_META_DECKS[0].name);

    const finalP2Cards = selectedP2 ? selectedP2.cards : defaultP2;
    const finalP2Name = selectedP2 ? selectedP2.name : (p2DeckName || LIMITLESS_META_DECKS[1]?.name || 'Opponent Deck');

    onConfirmStartNewMatch(finalP1Cards, finalP1Name, finalP2Cards, finalP2Name, firstPlayer);
    onClose();
  };

  const currentP1Display = targetSideOnly === 'player2'
    ? '🔒 ฝั่งตรงข้าม (เลือกเอง)'
    : (selectedP1 ? selectedP1.name : (p1DeckName || 'ยังไม่ได้เลือก'));

  const currentP2Display = targetSideOnly === 'player1'
    ? '🔒 ฝั่งตรงข้าม (เลือกเอง)'
    : (selectedP2 ? selectedP2.name : (p2DeckName || 'ยังไม่ได้เลือก'));

  const renderAssignButtons = (
    deckId: string,
    buildCards: () => CardInstance[],
    deckName: string,
    isP1: boolean,
    isP2: boolean,
    prefix = ''
  ) => {
    if (targetSideOnly === 'player1') {
      return (
        <div className="flex items-center flex-shrink-0">
          <button
            id={`btn-${prefix}assign-p1-${deckId}`}
            onClick={() => handleApplyDeck('player1', buildCards(), deckName)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow active:scale-95 transition ${
              isP1 ? 'bg-blue-500 ring-2 ring-blue-300' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {isP1 ? '✓ เด็คปัจจุบันของคุณ' : '🔵 เลือกเด็คนี้ให้คุณ'}
          </button>
        </div>
      );
    }
    if (targetSideOnly === 'player2') {
      return (
        <div className="flex items-center flex-shrink-0">
          <button
            id={`btn-${prefix}assign-p2-${deckId}`}
            onClick={() => handleApplyDeck('player2', buildCards(), deckName)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow active:scale-95 transition ${
              isP2 ? 'bg-red-500 ring-2 ring-red-300' : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {isP2 ? '✓ เด็คปัจจุบันของคุณ' : '🔴 เลือกเด็คนี้ให้คุณ'}
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          id={`btn-${prefix}assign-p1-${deckId}`}
          onClick={() => handleApplyDeck('player1', buildCards(), deckName)}
          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow active:scale-95 transition ${
            isP1 ? 'bg-blue-500 ring-2 ring-blue-300' : 'bg-blue-600 hover:bg-blue-500'
          }`}
        >
          {isP1 ? '✓ เด็ค P1' : '🔵 ใส่ให้ Player 1'}
        </button>
        <button
          id={`btn-${prefix}assign-p2-${deckId}`}
          onClick={() => handleApplyDeck('player2', buildCards(), deckName)}
          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow active:scale-95 transition ${
            isP2 ? 'bg-red-500 ring-2 ring-red-300' : 'bg-red-600 hover:bg-red-500'
          }`}
        >
          {isP2 ? '✓ เด็ค P2' : '🔴 ใส่ให้ Player 2'}
        </button>
      </div>
    );
  };

  return (
    <div
      id="deck-selector-modal"
      className="fixed inset-0 z-[55] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
      style={{ touchAction: 'auto' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900/98 border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-5 text-white flex flex-col gap-2.5 max-h-[88dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">🎮</span>
            <div className="min-w-0">
              <h2 id="tabletop-deck-selector-heading" className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                {targetSideOnly
                  ? `เลือกเด็คของคุณ (${targetSideOnly === 'player1' ? 'Player 1' : 'Player 2'})`
                  : isNewMatchMode
                  ? 'เริ่มเกมใหม่: เลือกเด็ค'
                  : 'เลือกเด็คสำหรับการประลอง (Select Deck)'}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                {targetSideOnly
                  ? 'เลือกเด็คสำหรับฝั่งของคุณเท่านั้น เพื่อความโปร่งใสในโหมดออนไลน์'
                  : isNewMatchMode
                  ? 'เลือกเด็คทั้งสองฝั่ง แล้วกดยืนยัน'
                  : 'เลือกระหว่าง 24 เด็ค Meta ระดับโลก, เด็คจัดเอง หรือ Standard Presets'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-deck-selector"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Selected Matchup Summary Bar */}
        <div className="grid grid-cols-11 items-center p-2.5 rounded-2xl bg-slate-950/80 border border-white/10 text-xs">
          <div className="col-span-5 flex flex-col min-w-0 pr-2">
            <span className="text-[10px] font-bold text-blue-400 uppercase">
              {targetSideOnly === 'player2' ? '🔒 Player 1' : '🔵 Player 1 (คุณ)'}
            </span>
            <span className={`text-xs font-black truncate ${targetSideOnly === 'player2' ? 'text-slate-500 italic' : 'text-white'}`}>
              {currentP1Display}
            </span>
          </div>

          <div className="col-span-1 text-center font-mono font-black text-slate-500 text-xs">
            VS
          </div>

          <div className="col-span-5 flex flex-col min-w-0 pl-2 text-right">
            <span className="text-[10px] font-bold text-rose-400 uppercase">
              {targetSideOnly === 'player1'
                ? '🔒 Player 2'
                : targetSideOnly === 'player2'
                ? '🔴 Player 2 (คุณ)'
                : '🔴 Player 2 (คู่ต่อสู้)'}
            </span>
            <span className={`text-xs font-black truncate ${targetSideOnly === 'player1' ? 'text-slate-500 italic' : 'text-white'}`}>
              {currentP2Display}
            </span>
          </div>

        </div>


        {/* Who Goes First Selector (New Match Mode) */}
        {isNewMatchMode && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-950/90 border border-amber-500/30 text-xs shadow-inner">
            <div className="flex items-center gap-1.5 font-bold text-amber-300 flex-shrink-0">
              <span className="text-base">🎯</span>
              <span>ฝ่ายที่ได้เริ่มก่อน (Turn 1):</span>
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                id="btn-select-first-p1"
                type="button"
                onClick={() => {
                  Sound.playCardFlip();
                  setFirstPlayer('player1');
                }}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  firstPlayer === 'player1'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50 ring-2 ring-blue-400'
                    : 'bg-slate-800/90 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                🔵 Player 1 เริ่มก่อน
              </button>
              <button
                id="btn-select-first-p2"
                type="button"
                onClick={() => {
                  Sound.playCardFlip();
                  setFirstPlayer('player2');
                }}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  firstPlayer === 'player2'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-900/50 ring-2 ring-rose-400'
                    : 'bg-slate-800/90 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                🔴 Player 2 เริ่มก่อน
              </button>
              <button
                id="btn-coin-flip-first-player"
                type="button"
                onClick={() => {
                  Sound.playCardFlip();
                  setIsCoinModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-400/40 text-amber-200 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                title="ทอยเหรียญหาผู้ชนะ เพื่อให้ผู้ชนะเลือกว่าจะเล่นก่อนหรือหลัง"
              >
                <span>🪙</span>
                <span>ทอยเหรียญ</span>
              </button>
              <button
                id="btn-random-first-player"
                type="button"
                onClick={() => {
                  Sound.playShuffle();
                  const chosen = Math.random() < 0.5 ? 'player1' : 'player2';
                  setFirstPlayer(chosen);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-400/40 text-purple-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                title="สุ่มทอยเหรียญเพื่อเลือกฝ่ายเริ่มก่อน"
              >
                🎲 สุ่ม
              </button>
            </div>
          </div>
        )}

        {/* Tab Switch & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 border-b border-white/10 pb-2">
          {/* Tabs */}
          <div className="flex gap-1.5 w-full sm:w-auto">
            <button
              id="tab-meta-decks"
              onClick={() => setActiveTab('META')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'META'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              🏆 Meta Decks ({LIMITLESS_META_DECKS.length})
            </button>
            <button
              id="tab-custom-decks"
              onClick={() => setActiveTab('CUSTOM')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'CUSTOM'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              📦 เด็คจัดเอง ({customDecksList.length})
            </button>
            <button
              id="tab-preset-decks"
              onClick={() => setActiveTab('PRESET')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'PRESET'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              ⭐ Presets
            </button>
          </div>

          {/* Search Input (For Meta & Custom Decks) */}
          {(activeTab === 'META' || activeTab === 'CUSTOM') && (
            <input
              id="input-search-deck"
              type="text"
              placeholder={activeTab === 'META' ? 'ค้นหาชื่อเด็ค, โปเกมอน, ผู้เล่น...' : 'ค้นหาชื่อเด็คที่คุณจัดเอง...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          )}
        </div>

        {/* Deck List Area */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain min-h-[180px] flex flex-col gap-2 pr-1 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          {/* TAB 1: LIMITLESS TOURNAMENT META DECKS */}
          {activeTab === 'META' && (
            <>
              {filteredMetaDecks.map((deck) => {
                const totalCards = Object.values(deck.cards || {}).reduce((a, b) => a + b.count, 0);
                const isP1 = selectedP1?.name === deck.name;
                const isP2 = selectedP2?.name === deck.name;

                return (
                  <div
                    key={deck.id}
                    id={`meta-deck-${deck.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-amber-400/40 hover:bg-slate-950 transition gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={resolveCardImageUrl(deck.coverImageUrl)}
                        alt={deck.name}
                        className="w-11 h-15 object-cover rounded-xl border border-white/20 shadow flex-shrink-0"
                        onError={(e) => handleCardImageError(e, deck.coverImageUrl)}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {deck.tier}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {deck.playstyle}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {totalCards} ใบ
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white truncate mt-0.5">{deck.name}</h4>
                        <p className="text-xs text-slate-400 truncate">
                          {deck.author ? `${deck.author} • ` : ''}{deck.event || 'Tournament Meta'}
                        </p>
                      </div>
                    </div>

                    {/* Dual Side Assignment Buttons */}
                    {renderAssignButtons(deck.id, () => buildMetaDeck(deck.id), deck.name, isP1, isP2)}
                  </div>
                );
              })}
            </>
          )}

          {/* TAB 2: USER CUSTOM DECKS */}
          {activeTab === 'CUSTOM' && (
            <>
              {customDecksList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs">
                  <span className="text-3xl mb-2">📦</span>
                  <p>ยังไม่มีเด็คที่คุณจัดเองในระบบ</p>
                  <p className="text-[10px] mt-1 text-slate-600">สามารถสร้างเด็คได้ที่เมนู "จัดการเด็ค (Deck Manager)"</p>
                </div>
              ) : filteredCustomDecks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs">
                  <span className="text-3xl mb-2">🔍</span>
                  <p>ไม่พบเด็คที่ตรงกับ "{searchQuery}"</p>
                </div>
              ) : (
                filteredCustomDecks.map((deck) => {
                  const cardCount = Object.values(deck.cards || {}).reduce((a, b) => a + b.count, 0);
                  const cards = buildUserCustomDeck(deck);
                  const isP1 = selectedP1?.name === deck.name;
                  const isP2 = selectedP2?.name === deck.name;

                  return (
                    <div
                      key={deck.id}
                      id={`custom-deck-${deck.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-indigo-400/40 hover:bg-slate-950 transition gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {deck.coverImageUrl ? (
                          <img
                            src={resolveCardImageUrl(deck.coverImageUrl)}
                            alt={deck.name}
                            className="w-11 h-15 object-cover rounded-xl border border-white/20 shadow flex-shrink-0"
                            onError={(e) => handleCardImageError(e, deck.coverImageUrl)}
                          />
                        ) : (
                          <div className="w-11 h-15 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-xl flex-shrink-0">
                            🃏
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-white truncate">{deck.name}</h4>
                          <p className="text-xs text-slate-400 truncate">{deck.description || 'เด็คจัดเอง'}</p>
                          <span className="text-[10px] text-indigo-300 font-mono">{cardCount} ใบ</span>
                        </div>
                      </div>

                      {renderAssignButtons(deck.id, () => cards, deck.name, isP1, isP2, 'custom-')}
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* TAB 3: CANONICAL PRESETS */}
          {activeTab === 'PRESET' && (
            <>
              {PRESET_DECKS.map((preset) => {
                const isP1 = selectedP1?.name === preset.nameEn;
                const isP2 = selectedP2?.name === preset.nameEn;

                return (
                  <div
                    key={preset.key}
                    id={`preset-deck-${preset.key}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-emerald-400/40 hover:bg-slate-950 transition gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={resolveCardImageUrl(preset.coverImageUrl)}
                        alt={preset.nameEn}
                        className="w-11 h-15 object-cover rounded-xl border border-white/20 shadow flex-shrink-0"
                        onError={(e) => handleCardImageError(e, preset.coverImageUrl)}
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-white truncate">{preset.nameEn}</h4>
                        <p className="text-xs text-slate-400 truncate">{preset.nameTh}</p>
                        <span className="text-[10px] text-emerald-300 font-mono">{preset.archetype}</span>
                      </div>
                    </div>

                    {renderAssignButtons(preset.key, () => preset.buildDeck(), preset.nameEn, isP1, isP2)}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Bottom CTA for New Match Setup Mode */}
        {isNewMatchMode && (
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              💡 การ์ดทั้งหมด 60 ใบจะเรียงในเด็ค ไม่มี Auto-draw คุณเริ่มเล่นเองได้ทันที
            </div>
            <button
              id="btn-confirm-start-match"
              onClick={handleConfirmStartMatch}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-950/60 active:scale-95 transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <span>🚀</span>
              <span>จัดโต๊ะ & เริ่มเกมใหม่ (Start Match)</span>
            </button>
          </div>
        )}

        {/* Turn Decision Coin Flip Modal */}
        {isCoinModalOpen && (
          <TurnDecisionModal
            onClose={() => setIsCoinModalOpen(false)}
            p1Name={selectedP1 ? selectedP1.name : (p1DeckName || 'Player 1')}
            p2Name={selectedP2 ? selectedP2.name : (p2DeckName || 'Player 2')}
            myRole="both"
            roomMode="local"
            currentTurn={firstPlayer}
            onApplyDecision={(decision) => {
              if (decision.startingPlayer) {
                setFirstPlayer(decision.startingPlayer);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
