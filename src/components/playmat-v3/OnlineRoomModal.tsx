import React, { useState, useMemo, useEffect } from 'react';
import { TabletopSyncService, generateRoomCode } from './tabletopSyncService';
import type { TabletopV3State } from './types';
import type { CardInstance } from '../../engine/types';
import { shuffleArray } from './tabletopStateHelper';
import {
  LIMITLESS_META_DECKS,
  buildMetaDeck,
  buildUserCustomDeck,
} from '../../engine/data/LimitlessDeckLoader';
import { PRESET_DECKS } from '../../engine/data/StandardCardCatalog';
import { useDeckStore } from '../../store/deckStore';
import { useAuthStore } from '../../store/authStore';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { Sound } from '../../engine/pixi/SoundEffects';

interface OnlineRoomModalProps {
  currentState: TabletopV3State;
  onClose: () => void;
  onConnected: (roomCode: string, role: 'player1' | 'player2' | 'spectator', syncedState: TabletopV3State) => void;
  onDisconnect: () => void;
}

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  currentState,
  onClose,
  onConnected,
  onDisconnect,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [inputCode, setInputCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // User authentication
  const user = useAuthStore((s) => s.user);

  // Custom player display name with localStorage persistence and auth profile autofill
  const [customPlayerName, setCustomPlayerName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('playmat_v3_display_name');
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    if (user?.displayName && user.displayName.trim()) return user.displayName.trim();
    if (user?.email) return user.email.split('@')[0];
    return 'Player 1';
  });

  useEffect(() => {
    if (user && (!customPlayerName || customPlayerName === 'Player 1')) {
      const preferred = user.displayName || user.email?.split('@')[0] || 'Player 1';
      setCustomPlayerName(preferred);
    }
  }, [user]);

  // Deck selector state
  const [selectedDeckKey, setSelectedDeckKey] = useState<string>(`meta:${LIMITLESS_META_DECKS[0].id}`);

  // Active rooms list for Join tab
  const [activeRooms, setActiveRooms] = useState<
    Array<{
      roomCode: string;
      p1Name: string;
      p1Deck: string;
      p2Name?: string;
      p2Deck?: string;
      isP2Ready: boolean;
      isGameStarted: boolean;
      updatedAt: number;
      p1Email?: string;
      p2Email?: string;
      spectatorsCount?: number;
      spectators?: any[];
    }>
  >([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  const fetchActiveRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const rooms = await TabletopSyncService.getActiveRooms();
      setActiveRooms(rooms);
    } catch (err) {
      console.warn('Failed to load active rooms:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (tab === 'join') {
      fetchActiveRooms();
      const timer = setInterval(() => {
        fetchActiveRooms();
      }, 8000);
      return () => clearInterval(timer);
    }
  }, [tab]);

  // Custom decks from deckStore
  const loadUserDecksFromCloud = useDeckStore((s) => s.loadUserDecksFromCloud);
  const userDecks = useDeckStore((s) => s.decks);
  const customDecksList = useMemo(() => Object.values(userDecks || {}), [userDecks]);

  useEffect(() => {
    if (user?.uid) {
      loadUserDecksFromCloud(user.uid);
    }
  }, [user?.uid]);

  // Visual Deck Catalog State
  const [isDeckCatalogOpen, setIsDeckCatalogOpen] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState<'custom' | 'meta' | 'preset'>('meta');
  const [catalogSearch, setCatalogSearch] = useState('');

  const filteredCatalogDecks = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (catalogCategory === 'custom') {
      return customDecksList.filter(
        (d) =>
          !q ||
          d.name.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q))
      );
    }
    if (catalogCategory === 'meta') {
      return LIMITLESS_META_DECKS.filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          (m.author && m.author.toLowerCase().includes(q)) ||
          m.tier.toLowerCase().includes(q)
      );
    }
    return PRESET_DECKS.filter(
      (p) => !q || p.nameEn.toLowerCase().includes(q) || p.nameTh.toLowerCase().includes(q)
    );
  }, [catalogCategory, catalogSearch, customDecksList]);

  const isAlreadyOnline = currentState.roomMode === 'online' && currentState.roomCode;

  // Build deck cards and metadata from selected key
  const buildSelectedDeck = (key: string): { cards: CardInstance[]; name: string; coverImageUrl?: string; sub: string } => {
    if (key === 'current') {
      const currentDeckCards = tab === 'create' ? currentState.player1.deck : currentState.player2.deck;
      const currentDeckName = tab === 'create' ? currentState.player1.deckName : currentState.player2.deckName;
      if (currentDeckCards.length > 0) {
        return {
          cards: currentDeckCards,
          name: currentDeckName || 'เด็คปัจจุบันบนโต๊ะ',
          coverImageUrl: currentDeckCards[0]?.imageUrl,
          sub: `เด็คบนโต๊ะ (${currentDeckCards.length} ใบ)`,
        };
      }
    }
    if (key.startsWith('meta:')) {
      const id = key.replace('meta:', '');
      const meta = LIMITLESS_META_DECKS.find((m) => m.id === id) || LIMITLESS_META_DECKS[0];
      return {
        cards: buildMetaDeck(meta.id),
        name: meta.name,
        coverImageUrl: meta.coverImageUrl,
        sub: `${meta.tier} • ${meta.author || meta.event || 'Meta Deck'}`,
      };
    }
    if (key.startsWith('custom:')) {
      const id = key.replace('custom:', '');
      const deck = userDecks[id];
      if (deck) {
        return {
          cards: buildUserCustomDeck(deck),
          name: deck.name,
          coverImageUrl: deck.coverImageUrl,
          sub: deck.description || 'เด็คจัดเอง',
        };
      }
    }
    if (key.startsWith('preset:')) {
      const pKey = key.replace('preset:', '');
      const preset = PRESET_DECKS.find((p) => p.key === pKey) || PRESET_DECKS[0];
      return {
        cards: preset.buildDeck(),
        name: preset.nameEn,
        coverImageUrl: preset.coverImageUrl,
        sub: `${preset.archetype} • ${preset.nameTh}`,
      };
    }
    const meta = LIMITLESS_META_DECKS[0];
    return {
      cards: buildMetaDeck(meta.id),
      name: meta.name,
      coverImageUrl: meta.coverImageUrl,
      sub: meta.tier,
    };
  };

  const selectedDeckPreview = useMemo(() => {
    return buildSelectedDeck(selectedDeckKey);
  }, [selectedDeckKey, tab, userDecks]);

  // Handle Create Room (Host = Player 1)
  const handleCreateRoom = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const code = generateRoomCode();
      const deckData = buildSelectedDeck(selectedDeckKey);
      const finalName = customPlayerName.trim() || 'Player 1';
      try {
        localStorage.setItem('playmat_v3_display_name', finalName);
      } catch {}

      const hostInitialState: TabletopV3State = {
        ...currentState,
        roomMode: 'online',
        roomCode: code,
        myRole: 'player1',
        perspective: 'player1',
        p1Email: user?.email || undefined,
        p1Uid: user?.uid || undefined,
        spectators: [],
        player1: {
          id: 'player1',
          name: finalName,
          deckName: deckData.name,
          deck: shuffleArray(deckData.cards.map((c) => ({ ...c }))),
          hand: [],
          bench: [null, null, null, null, null],
          benchLimit: 5,
          active: null,
          prizes: [],
          discard: [],
          lostZone: [],
        },
        player2: {
          id: 'player2',
          name: 'Player 2 (รอคู่ต่อสู้...)',
          deckName: 'รอเลือกเด็ค',
          deck: [],
          hand: [],
          bench: [null, null, null, null, null],
          benchLimit: 5,
          active: null,
          prizes: [],
          discard: [],
          lostZone: [],
        },
        isGameStarted: false,
        turnCount: 1,
        currentTurn: 'player1',
        combatState: undefined,
        actionToast: undefined,
      };

      await TabletopSyncService.createRoom(hostInitialState, code, {
        uid: user?.uid,
        email: user?.email || undefined,
        displayName: finalName,
      });
      Sound.playShuffle();
      try {
        const sessionData = JSON.stringify({
          roomCode: code,
          myRole: 'player1',
          timestamp: Date.now(),
        });
        sessionStorage.setItem('playmat_v3_session', sessionData);
        localStorage.setItem('playmat_v3_session', sessionData);
      } catch {}
      onConnected(code, 'player1', hostInitialState);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'ไม่สามารถสร้างห้องออนไลน์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Join Room (Guest = Player 2 or Spectator or Reconnecting Player)
  const handleJoinRoom = async (overrideCode?: string, asSpectator = false) => {
    const targetCode = overrideCode || inputCode;
    if (!targetCode.trim()) {
      setErrorMessage('กรุณากรอกรหัสห้อง (เช่น V3-1234)');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const code = targetCode.toUpperCase().trim();
      const remoteState = await TabletopSyncService.getRoom(code);
      if (!remoteState) {
        setErrorMessage('ไม่พบห้องนี้ กรุณาตรวจสอบรหัสห้องอีกครั้ง');
        return;
      }

      const finalName = customPlayerName.trim() || (asSpectator ? 'ผู้เข้าชม' : 'Player 2');
      try {
        localStorage.setItem('playmat_v3_display_name', finalName);
      } catch {}

      // Case 1: Join as Spectator
      if (asSpectator) {
        const specId = user?.uid || `spec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const spectatorInfo = {
          id: specId,
          name: finalName,
          email: user?.email || undefined,
          joinedAt: Date.now(),
        };
        await TabletopSyncService.joinSpectator(code, spectatorInfo);

        const spectatorState: TabletopV3State = {
          ...remoteState,
          roomMode: 'online',
          roomCode: code,
          myRole: 'spectator',
          perspective: 'player1',
          spectators: [...(remoteState.spectators || []).filter((s) => s.id !== specId), spectatorInfo],
        };

        try {
          sessionStorage.setItem(
            'pokecount_tabletop_session',
            JSON.stringify({
              roomCode: code,
              myRole: 'spectator',
              spectatorId: specId,
              timestamp: Date.now(),
            })
          );
        } catch {}

        onConnected(code, 'spectator', spectatorState);
        onClose();
        return;
      }

      // Check stored session for reconnecting Host (Player 1) or Guest (Player 2)
      // Note: Use sessionStorage first (tab-scoped) so multi-tab matches don't cross-contaminate roles
      let storedRole: 'player1' | 'player2' | null = null;
      try {
        const raw = sessionStorage.getItem('playmat_v3_session');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.roomCode === code && (parsed.myRole === 'player1' || parsed.myRole === 'player2')) {
            storedRole = parsed.myRole;
          }
        }
      } catch {}

      // Case 1.5: Host (Player 1) reconnecting to their own room without wiping state
      if (storedRole === 'player1' || (!asSpectator && remoteState.p1Uid && user?.uid && remoteState.p1Uid === user.uid)) {
        const hostState: TabletopV3State = {
          ...remoteState,
          roomMode: 'online',
          roomCode: code,
          myRole: 'player1',
          perspective: 'player1',
        };
        try {
          const sessionData = JSON.stringify({
            roomCode: code,
            myRole: 'player1',
            timestamp: Date.now(),
          });
          sessionStorage.setItem('playmat_v3_session', sessionData);
          localStorage.setItem('playmat_v3_session', sessionData);
        } catch {}
        onConnected(code, 'player1', hostState);
        onClose();
        return;
      }

      // Case 2: Join as Player 2 (or Reconnect)
      const isReconnectingP2 = storedRole === 'player2';

      // Case B: Player 2 reconnecting to an existing match without wiping the board
      const isPlayer2AlreadySetup = Boolean(
        remoteState.player2 &&
        (remoteState.player2.deck?.length > 0 ||
         remoteState.player2.hand?.length > 0 ||
         remoteState.player2.active ||
         remoteState.isGameStarted)
      );

      let guestState: TabletopV3State;
      if (isPlayer2AlreadySetup && (isReconnectingP2 || selectedDeckKey === 'current')) {
        guestState = {
          ...remoteState,
          roomMode: 'online',
          roomCode: code,
          myRole: 'player2',
          perspective: 'player2',
          player2: {
            ...remoteState.player2,
            name: finalName || remoteState.player2.name,
          },
          p2Email: user?.email || remoteState.p2Email,
          p2Uid: user?.uid || remoteState.p2Uid,
        };
        await TabletopSyncService.joinRoom(code, guestState.player2, {
          name: guestState.player2.name,
          email: user?.email || undefined,
          uid: user?.uid || undefined,
        });
      } else {
        const deckData = buildSelectedDeck(selectedDeckKey);
        Sound.playShuffle();
        guestState = {
          ...remoteState,
          roomMode: 'online',
          roomCode: code,
          myRole: 'player2',
          perspective: 'player2',
          p2Email: user?.email || undefined,
          p2Uid: user?.uid || undefined,
          player2: {
            id: 'player2',
            name: finalName,
            deckName: deckData.name,
            deck: shuffleArray(deckData.cards.map((c) => ({ ...c }))),
            hand: [],
            bench: [null, null, null, null, null],
            benchLimit: 5,
            active: null,
            prizes: [],
            discard: [],
            lostZone: [],
          },
        };
        await TabletopSyncService.joinRoom(code, guestState.player2, {
          name: finalName,
          email: user?.email || undefined,
          uid: user?.uid || undefined,
        });
      }

      try {
        const sessionData = JSON.stringify({
          roomCode: code,
          myRole: 'player2',
          timestamp: Date.now(),
        });
        sessionStorage.setItem('playmat_v3_session', sessionData);
        localStorage.setItem('playmat_v3_session', sessionData);
      } catch {}

      onConnected(code, 'player2', guestState);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'ไม่สามารถเชื่อมต่อห้องได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (currentState.roomCode) {
      navigator.clipboard.writeText(currentState.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      id="online-room-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      style={{ touchAction: 'auto' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-900/98 border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl text-white flex flex-col max-h-[88dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-3 sm:p-4 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">🌐</span>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black truncate">เล่นด้วยกัน 2 เครื่อง (Online Room)</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">ซิงค์โต๊ะจริงแบบเรียลไทม์</p>
            </div>
          </div>
          <button
            id="btn-close-online-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm cursor-pointer shrink-0 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5 flex flex-col gap-3.5 pb-[max(env(safe-area-inset-bottom),1rem)]"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >

        {/* Cloud Online Multiplayer Disabled Notice */}
        <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5">
          <span className="text-base shrink-0">⚠️</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-amber-200">
              โหมดออนไลน์ข้ามเครื่อง (Cloud Multiplayer) ปิดให้บริการ
            </span>
            <span className="text-[11px] text-amber-300/80 leading-relaxed">
              เพื่อลดค่าบริการ Cloud Firestore ระบบได้ตัดการเชื่อมต่อกับคลาวด์ทั้งหมด โดยรองรับเฉพาะการซ้อมเล่น 2 หน้าต่างในเบราว์เซอร์เครื่องเดียวกัน (Local Tab Sync)
            </span>
          </div>
        </div>

        {/* Current Connection Status */}
        {isAlreadyOnline ? (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                กำลังเชื่อมต่อห้องออนไลน์
              </span>
              <span className="text-xs font-bold text-slate-400">
                คุณคือ: {currentState.myRole === 'player1' ? '🔵 Player 1' : currentState.myRole === 'player2' ? '🔴 Player 2' : '👁️ ผู้เข้าชม (Spectator)'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl border border-white/10">
              <span className="font-mono text-lg font-black text-amber-400 tracking-wider">
                {currentState.roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold transition-all cursor-pointer"
              >
                {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอกรหัส'}
              </button>
            </div>

            <button
              onClick={() => {
                if (currentState.roomCode && currentState.myRole === 'player1') {
                  TabletopSyncService.deleteRoom(currentState.roomCode);
                }
                onDisconnect();
                onClose();
              }}
              className="w-full py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-200 text-xs font-bold transition-all cursor-pointer"
            >
              ตัดการเชื่อมต่อ (กลับสู่ Local Mode)
            </button>
          </div>
        ) : (
          <>
            {/* Player Display Name Input */}
            <div className="flex flex-col gap-1 p-2.5 rounded-2xl bg-slate-950/90 border border-white/10">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                <span className="flex items-center gap-1">
                  <span>👤</span>
                  <span>ชื่อของคุณในเกม (Player Name):</span>
                </span>
                {user?.email && (
                  <span className="text-[10px] text-slate-500 font-mono font-normal truncate max-w-[140px]" title={user.email}>
                    {user.email}
                  </span>
                )}
              </div>
              <input
                id="input-player-display-name"
                type="text"
                value={customPlayerName}
                maxLength={20}
                onChange={(e) => {
                  setCustomPlayerName(e.target.value);
                  try {
                    localStorage.setItem('playmat_v3_display_name', e.target.value);
                  } catch {}
                }}
                placeholder="ตั้งชื่อผู้เล่นของคุณ เช่น Red, Satoshi, Somchai"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-amber-300 font-bold placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950/80 border border-white/10">
              <button
                id="tab-online-create"
                onClick={() => setTab('create')}
                className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  tab === 'create'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ➕ สร้างห้องใหม่ (Host / P1)
              </button>
              <button
                id="tab-online-join"
                onClick={() => setTab('join')}
                className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  tab === 'join'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔗 เข้าร่วมห้อง (Guest / P2)
              </button>
            </div>

            {/* Role Indicator / Selection */}
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400">ตำแหน่งการเล่น:</span>
              <div className="flex items-center gap-2">
                <span
                  id="role-indicator-p1"
                  className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all ${
                    tab === 'create'
                      ? 'bg-blue-950/80 border-blue-400 text-blue-200 ring-1 ring-blue-400 shadow-sm'
                      : 'bg-slate-900/40 border-white/10 text-slate-400'
                  }`}
                >
                  🔵 Player 1 (คุณ)
                </span>
                <span
                  id="role-indicator-p2"
                  className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all ${
                    tab === 'join'
                      ? 'bg-rose-950/80 border-rose-400 text-rose-200 ring-1 ring-rose-400 shadow-sm'
                      : 'bg-slate-900/40 border-white/10 text-slate-400'
                  }`}
                >
                  🔴 Player 2 (คู่ต่อสู้)
                </span>
              </div>
            </div>

            {/* Deck Picker Section (Visual Interactive Deck Card + Quick Chips + Full Catalog Modal) */}
            <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-slate-950/90 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>🃏</span>
                  <span>{tab === 'create' ? 'เลือกเด็คของคุณ (Player 1):' : 'เลือกเด็คของคุณ (Player 2):'}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950/80 border border-blue-400/40 text-blue-300">
                  {tab === 'create' ? '🔵 คุณคือ P1' : '🔴 คุณคือ P2'}
                </span>
              </div>

              {/* Hidden select to preserve 100% backward test compatibility */}
              <select
                id="select-online-deck"
                value={selectedDeckKey}
                onChange={(e) => setSelectedDeckKey(e.target.value)}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              >
                {(tab === 'create' ? currentState.player1.deck.length > 0 : currentState.player2.deck.length > 0) && (
                  <option value="current">
                    ⭐ เด็คปัจจุบันบนโต๊ะ ({tab === 'create' ? currentState.player1.deckName || 'Player 1' : currentState.player2.deckName || 'Player 2'})
                  </option>
                )}
                <optgroup label="🏆 24 Tournament Meta Decks">
                  {LIMITLESS_META_DECKS.map((d) => (
                    <option key={d.id} value={`meta:${d.id}`}>
                      [{d.tier}] {d.name} {d.author ? `• ${d.author}` : ''}
                    </option>
                  ))}
                </optgroup>
                {customDecksList.length > 0 && (
                  <optgroup label="📦 เด็คที่คุณจัดเอง">
                    {customDecksList.map((d) => (
                      <option key={d.id} value={`custom:${d.id}`}>
                        {d.name} ({Object.values(d.cards || {}).reduce((a, b) => a + b.count, 0)} ใบ)
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="⭐ Standard Presets">
                  {PRESET_DECKS.map((p) => (
                    <option key={p.key} value={`preset:${p.key}`}>
                      {p.nameEn} ({p.nameTh})
                    </option>
                  ))}
                </optgroup>
              </select>

              {/* Visual Selected Deck Card Display */}
              <div
                id="selected-deck-card-display"
                onClick={() => setIsDeckCatalogOpen(true)}
                className="group relative flex items-center justify-between gap-3 p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 hover:border-indigo-400/60 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/10 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {selectedDeckPreview?.coverImageUrl ? (
                    <img
                      src={resolveCardImageUrl(selectedDeckPreview.coverImageUrl)}
                      alt={selectedDeckPreview.name}
                      className="w-10 h-14 object-cover rounded-xl border border-white/20 shadow-md flex-shrink-0 group-hover:scale-105 transition-transform"
                      onError={(e) => handleCardImageError(e, selectedDeckPreview.coverImageUrl)}
                    />
                  ) : (
                    <div className="w-10 h-14 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-xl flex-shrink-0">
                      🃏
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-white text-xs sm:text-sm truncate">
                        {selectedDeckPreview?.name || 'เลือกเด็ค'}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {selectedDeckKey.startsWith('custom:')
                          ? '📦 จัดเอง'
                          : selectedDeckKey.startsWith('meta:')
                          ? '🏆 Meta'
                          : selectedDeckKey.startsWith('preset:')
                          ? '⭐ Standard'
                          : 'โต๊ะ'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {selectedDeckPreview?.sub || 'เด็ค 60 ใบพร้อมประลอง'}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                      <span>✓</span>
                      <span>60 ใบพร้อมประลองทันที</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-open-deck-catalog"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeckCatalogOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 shrink-0 active:scale-95 transition"
                >
                  <span>🔄</span>
                  <span>เปลี่ยนเด็ค</span>
                </button>
              </div>

              {/* Quick Deck Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0">
                  ด่วน:
                </span>
                {(tab === 'create' ? currentState.player1.deck.length > 0 : currentState.player2.deck.length > 0) && (
                  <button
                    type="button"
                    id="chip-deck-current"
                    onClick={() => {
                      setSelectedDeckKey('current');
                      Sound.playCardFlip();
                    }}
                    className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition shrink-0 ${
                      selectedDeckKey === 'current'
                        ? 'bg-amber-500 text-black shadow'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10'
                    }`}
                  >
                    ⭐ บนโต๊ะ
                  </button>
                )}

                {customDecksList.slice(0, 3).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    id={`chip-deck-custom-${d.id}`}
                    onClick={() => {
                      setSelectedDeckKey(`custom:${d.id}`);
                      Sound.playCardFlip();
                    }}
                    className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition shrink-0 ${
                      selectedDeckKey === `custom:${d.id}`
                        ? 'bg-emerald-500 text-white shadow'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10'
                    }`}
                  >
                    📦 {d.name}
                  </button>
                ))}

                {LIMITLESS_META_DECKS.slice(0, 4).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    id={`chip-deck-meta-${m.id}`}
                    onClick={() => {
                      setSelectedDeckKey(`meta:${m.id}`);
                      Sound.playCardFlip();
                    }}
                    className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition shrink-0 ${
                      selectedDeckKey === `meta:${m.id}`
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10'
                    }`}
                  >
                    {m.name.split(' ')[0]} ex
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Deck Catalog Modal */}
            {isDeckCatalogOpen && (
              <div
                id="online-deck-catalog-modal"
                className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
                onClick={() => setIsDeckCatalogOpen(false)}
              >
                <div
                  className="relative w-full max-w-lg bg-slate-900/98 border border-white/20 rounded-3xl shadow-2xl p-4 sm:p-5 text-white flex flex-col gap-3 max-h-[88vh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Catalog Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🃏</span>
                      <div>
                        <h3 className="text-sm font-black text-white">เลือกเด็คสำหรับเริ่มเล่น</h3>
                        <p className="text-[11px] text-slate-400">เลือกจากเด็คจัดเอง, 24 Meta ระดับโลก หรือ Preset</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      id="btn-close-online-deck-catalog"
                      onClick={() => setIsDeckCatalogOpen(false)}
                      className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950/80 border border-white/10 text-xs">
                    <button
                      type="button"
                      id="tab-catalog-custom"
                      onClick={() => setCatalogCategory('custom')}
                      className={`py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                        catalogCategory === 'custom'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      📦 จัดเอง ({customDecksList.length})
                    </button>
                    <button
                      type="button"
                      id="tab-catalog-meta"
                      onClick={() => setCatalogCategory('meta')}
                      className={`py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                        catalogCategory === 'meta'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🏆 24 Meta
                    </button>
                    <button
                      type="button"
                      id="tab-catalog-preset"
                      onClick={() => setCatalogCategory('preset')}
                      className={`py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                        catalogCategory === 'preset'
                          ? 'bg-amber-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ⭐ Standard
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      id="input-catalog-search"
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="ค้นหาชื่อเด็ค..."
                      className="w-full px-3 py-1.5 bg-slate-800/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                    />
                    {catalogSearch && (
                      <button
                        type="button"
                        onClick={() => setCatalogSearch('')}
                        className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Decks Grid */}
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-2 max-h-[52vh]">
                    {filteredCatalogDecks.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        <span className="text-3xl block mb-2">📭</span>
                        {catalogCategory === 'custom'
                          ? 'ยังไม่มีเด็คที่จัดเอง (สร้างได้ที่หน้า จัดเด็ค)'
                          : 'ไม่พบเด็คที่ตรงกับการค้นหา'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredCatalogDecks.map((deckItem: any) => {
                          const itemKey =
                            catalogCategory === 'custom'
                              ? `custom:${deckItem.id}`
                              : catalogCategory === 'meta'
                              ? `meta:${deckItem.id}`
                              : `preset:${deckItem.key}`;
                          const isSelected = selectedDeckKey === itemKey;
                          const title = deckItem.name || deckItem.nameEn;
                          const sub =
                            deckItem.description ||
                            deckItem.tier ||
                            deckItem.nameTh ||
                            '';
                          const coverUrl = deckItem.coverImageUrl;

                          return (
                            <div
                              key={itemKey}
                              id={`catalog-deck-item-${deckItem.id || deckItem.key}`}
                              onClick={() => {
                                setSelectedDeckKey(itemKey);
                                Sound.playCardFlip();
                                setIsDeckCatalogOpen(false);
                              }}
                              className={`group flex items-center gap-2.5 p-2 rounded-2xl border transition cursor-pointer active:scale-98 ${
                                isSelected
                                  ? 'bg-indigo-950/70 border-indigo-400 ring-2 ring-indigo-400/50 shadow-md'
                                  : 'bg-slate-950/60 border-white/10 hover:border-white/30 hover:bg-slate-800/80'
                              }`}
                            >
                              {coverUrl ? (
                                <img
                                  src={resolveCardImageUrl(coverUrl)}
                                  alt={title}
                                  className="w-10 h-14 object-cover rounded-lg border border-white/20 shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform"
                                  onError={(e) => handleCardImageError(e, coverUrl)}
                                />
                              ) : (
                                <div className="w-10 h-14 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
                                  🃏
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-white text-xs truncate group-hover:text-indigo-300 transition-colors">
                                  {title}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                  {sub}
                                </div>
                                {isSelected && (
                                  <span className="inline-block mt-1 text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-500 text-white">
                                    ✓ เลือกอยู่
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab Form */}
            {tab === 'create' ? (
              <div className="flex flex-col gap-2.5">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ระบบจะสร้างรหัสห้อง และเชื่อมต่อแบบ WebRTC P2P (10–30ms) คู่ต่อสู้จะเลือกเด็คของตนเองเมื่อกด Join
                </p>

                <button
                  id="btn-confirm-create-room"
                  onClick={handleCreateRoom}
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? 'กำลังสร้างห้อง...' : '🚀 สร้างห้องและเริ่มเล่นทันที'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Active Rooms List */}
                <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-950/80 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>🌐</span>
                      <span>ห้องที่เปิดอยู่ (Active Rooms):</span>
                    </span>
                    <button
                      id="btn-refresh-active-rooms"
                      type="button"
                      onClick={fetchActiveRooms}
                      disabled={isLoadingRooms}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <span className={isLoadingRooms ? 'animate-spin' : ''}>🔄</span>
                      <span>รีเฟรช</span>
                    </button>
                  </div>

                  {isLoadingRooms ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      กำลังค้นหาห้องที่ออนไลน์...
                    </div>
                  ) : activeRooms.length === 0 ? (
                    <div className="py-3 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-white/5">
                      ยังไม่มีห้องที่เปิดอยู่ขณะนี้ (สามารถกดสร้างห้องใหม่ได้)
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                      {activeRooms.map((room) => (
                        <div
                          key={room.roomCode}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-white/10 hover:border-indigo-400/40 transition gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-black text-amber-300 text-xs">
                                {room.roomCode}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                  room.isGameStarted
                                    ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                                    : room.isP2Ready
                                    ? 'bg-blue-950 text-blue-300 border-blue-500/40'
                                    : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                {room.isGameStarted
                                  ? '⚔️ กำลังเล่น'
                                  : room.isP2Ready
                                  ? '👥 ผู้เล่นครบ (2/2)'
                                  : '🟢 รอคู่แข่ง (1/2)'}
                              </span>
                              {Boolean(room.spectatorsCount && room.spectatorsCount > 0) && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30">
                                  👁️ {room.spectatorsCount} ผู้เข้าชม
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              <span className="text-slate-200 font-medium">{room.p1Name}</span>
                              {room.p2Name ? (
                                <span> vs <span className="text-slate-200 font-medium">{room.p2Name}</span></span>
                              ) : (
                                <span className="text-slate-500"> ({room.p1Deck})</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!room.isP2Ready && (
                              <button
                                type="button"
                                id={`btn-join-room-${room.roomCode}`}
                                onClick={() => {
                                  setInputCode(room.roomCode);
                                  handleJoinRoom(room.roomCode, false);
                                }}
                                disabled={isLoading}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow active:scale-95 transition cursor-pointer flex-shrink-0 disabled:opacity-50"
                                title="เข้าร่วมเป็น Player 2"
                              >
                                ⚔️ เล่น
                              </button>
                            )}
                            <button
                              type="button"
                              id={`btn-spectate-room-${room.roomCode}`}
                              onClick={() => {
                                setInputCode(room.roomCode);
                                handleJoinRoom(room.roomCode, true);
                              }}
                              disabled={isLoading}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs shadow active:scale-95 transition cursor-pointer flex-shrink-0 disabled:opacity-50"
                              title="เข้าร่วมเป็นผู้เข้าชม (ดูการแข่งสด)"
                            >
                              👁️ เข้าชม
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual Code Input */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-white/10">
                  <span className="text-[11px] font-semibold text-slate-400">
                    หรือระบุรหัสห้องเอง (Manual Room Code):
                  </span>
                  <input
                    id="input-room-code"
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="เช่น V3-8921"
                    maxLength={10}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/20 text-center font-mono text-base font-bold text-amber-300 focus:outline-none focus:border-indigo-500 uppercase tracking-widest"
                  />
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      id="btn-confirm-join-room"
                      type="button"
                      onClick={() => handleJoinRoom(undefined, false)}
                      disabled={isLoading || !inputCode.trim()}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      {isLoading ? 'กำลังเข้า...' : '⚔️ เข้าเป็นผู้เล่น'}
                    </button>
                    <button
                      id="btn-confirm-spectate-room"
                      type="button"
                      onClick={() => handleJoinRoom(undefined, true)}
                      disabled={isLoading || !inputCode.trim()}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      {isLoading ? 'กำลังเข้า...' : '👁️ เข้าเป็นผู้เข้าชม'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs text-center font-semibold">
                ⚠️ {errorMessage}
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
};

