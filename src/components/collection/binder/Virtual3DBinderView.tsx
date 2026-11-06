import { useState, useMemo, useEffect } from 'react';
import pokemonCardData from '../../../data/pokemonNames.json';
import { useCollectionStore } from '../../../store/collectionStore';
import {
  useCustomBinderStore,
  computeAutoSetBinderPages,
} from '../../../store/customBinderStore';
import { BinderBookSpread } from './BinderBookSpread';
import { BinderSettingsModal } from './BinderSettingsModal';
import { BinderCardPickerDrawer } from './BinderCardPickerDrawer';
import { CardCollectionModal } from '../CardCollectionModal';
import { sortSetsByThaiRelease } from '../../../utils/setOrder';
import type { CustomBinder, BinderSlotItem } from '../../../types/binder';
import type { CardVariantKey } from '../../../types/collection';

const EMPTY_CARDS_RECORD: Record<string, any> = {};

export interface Virtual3DBinderViewProps {
  onSwitchToGridView?: () => void;
}

export function Virtual3DBinderView({ onSwitchToGridView }: Virtual3DBinderViewProps) {
  const activeProfileId = useCollectionStore((s) => s.activeProfileId);
  const activeProfile = useCollectionStore((s) => s.profiles[activeProfileId]);
  const profileCards = activeProfile?.cards ?? EMPTY_CARDS_RECORD;

  const binders = useCustomBinderStore((s) => s.binders);
  const activeBinderId = useCustomBinderStore((s) => s.activeBinderId);
  const currentPageIndex = useCustomBinderStore((s) => s.currentPageIndex);
  const setViewMode = useCustomBinderStore((s) => s.setViewMode);
  const setActiveBinder = useCustomBinderStore((s) => s.setActiveBinder);
  const setCurrentPageIndex = useCustomBinderStore((s) => s.setCurrentPageIndex);
  const nextPage = useCustomBinderStore((s) => s.nextPage);
  const prevPage = useCustomBinderStore((s) => s.prevPage);
  const createCustomBinder = useCustomBinderStore((s) => s.createCustomBinder);
  const updateBinder = useCustomBinderStore((s) => s.updateBinder);
  const deleteBinder = useCustomBinderStore((s) => s.deleteBinder);
  const setCardInSlot = useCustomBinderStore((s) => s.setCardInSlot);
  const removeCardFromSlot = useCustomBinderStore((s) => s.removeCardFromSlot);
  const insertCardsBatch = useCustomBinderStore((s) => s.insertCardsBatch);
  const moveCardSlot = useCustomBinderStore((s) => s.moveCardSlot);
  const addPage = useCustomBinderStore((s) => s.addPage);
  const autoSetSettings = useCustomBinderStore((s) => s.autoSetSettings);
  const updateAutoSetSettings = useCustomBinderStore((s) => s.updateAutoSetSettings);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inspectCard, setInspectCard] = useState<any | null>(null);
  const [pickerTarget, setPickerTarget] = useState<{ pageIndex: number; slotIndex: number; mode?: 'single' | 'batch' } | null>(null);
  const [movingSource, setMovingSource] = useState<{ pageIndex: number; slotIndex: number } | null>(null);

  // Generate list of Thai sets for auto-set binders
  const setsList = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const card of pokemonCardData as any[]) {
      if (card.set?.id && !map.has(card.set.id)) {
        map.set(card.set.id, { id: card.set.id, name: card.set.name });
      }
    }
    const unsorted = Array.from(map.values()).map((s) => ({
      id: s.id,
      name: s.name,
      totalCards: 0,
      collectedCards: 0,
      percentage: 0,
      regulationMarks: [],
    }));
    return sortSetsByThaiRelease(unsorted);
  }, []);

  // Selected auto-set ID if active binder is auto-set
  const [selectedAutoSetId, setSelectedAutoSetId] = useState<string>(() => {
    return setsList[0]?.id || 'SV8a';
  });

  // Active custom binder from store (if activeBinderId matches one)
  const currentCustomBinder = useMemo(() => {
    return binders.find((b) => b.id === activeBinderId) || null;
  }, [binders, activeBinderId]);

  // Is current view mode auto-set or custom?
  const isAutoSetMode = !currentCustomBinder;

  // Virtual Binder Object to feed into BinderBookSpread
  const displayBinder: CustomBinder = useMemo(() => {
    if (currentCustomBinder) {
      return currentCustomBinder;
    }
    const currentSet = setsList.find((s) => s.id === selectedAutoSetId);
    return {
      id: `auto-set-${selectedAutoSetId}`,
      name: currentSet ? `สมุดชุด ${currentSet.name} (${currentSet.id})` : 'สมุดสะสมประจำชุด',
      description: 'จัดเรียงตามลำดับเลขคอลเลกเตอร์อย่างเป็นทางการ',
      mode: 'auto-set',
      setId: selectedAutoSetId,
      coverTheme: autoSetSettings.coverTheme,
      sleeveStyle: autoSetSettings.sleeveStyle,
      pocketsPerPage: autoSetSettings.pocketsPerPage,
      gridCols: autoSetSettings.gridCols,
      gridRows: autoSetSettings.gridRows,
      pages: [],
      createdAt: 0,
      updatedAt: 0,
    };
  }, [currentCustomBinder, selectedAutoSetId, setsList, autoSetSettings]);

  // Fast O(1) Card Lookup Map
  const allCardsMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of pokemonCardData as any[]) {
      map.set(c.id, c);
    }
    return map;
  }, []);

  // Calculate pages for active binder
  const computedPages = useMemo(() => {
    if (displayBinder.mode === 'auto-set' && displayBinder.setId) {
      return computeAutoSetBinderPages(
        pokemonCardData,
        displayBinder.setId,
        profileCards,
        displayBinder.pocketsPerPage
      );
    }
    return displayBinder.pages.length > 0
      ? displayBinder.pages
      : [
          {
            pageNumber: 1,
            slots: Array.from({ length: displayBinder.pocketsPerPage }, (_, idx) => ({
              slotIndex: idx,
              cardId: undefined,
              isOwned: false,
              count: 0,
            })),
          },
        ];
  }, [displayBinder, profileCards]);

  // Clamp current page index if pages length changed
  useEffect(() => {
    if (currentPageIndex >= computedPages.length) {
      setCurrentPageIndex(Math.max(0, computedPages.length - 1));
    }
  }, [computedPages.length, currentPageIndex, setCurrentPageIndex]);

  // Calculate set progress stats for auto-set
  const setProgressStats = useMemo(() => {
    if (!isAutoSetMode) return null;
    const setCards = (pokemonCardData as any[]).filter(
      (c) => c.set?.id === selectedAutoSetId
    );
    const total = setCards.length;
    let owned = 0;
    for (const c of setCards) {
      const entry = profileCards[c.id];
      if (
        entry &&
        ((entry.variants?.normal || 0) +
          (entry.variants?.holo || 0) +
          (entry.variants?.reverse || 0) +
          (entry.variants?.promo || 0)) > 0
      ) {
        owned++;
      }
    }
    const percent = total > 0 ? Math.round((owned / total) * 100) : 0;
    return { total, owned, percent };
  }, [isAutoSetMode, selectedAutoSetId, profileCards]);

  // Handlers
  const handleSlotClick = (_slot: BinderSlotItem, card?: any) => {
    if (card) {
      setInspectCard(card);
    }
  };

  const handleEmptySlotClick = (pageIndex: number, slotIndex: number) => {
    if (displayBinder.mode === 'custom') {
      setPickerTarget({ pageIndex, slotIndex });
    }
  };

  const handleRemoveCard = (pageIndex: number, slotIndex: number) => {
    if (currentCustomBinder) {
      removeCardFromSlot(currentCustomBinder.id, pageIndex, slotIndex);
    }
  };

  const handleSelectCardForSlot = (
    pageIndex: number,
    slotIndex: number,
    cardId: string,
    variant: CardVariantKey
  ) => {
    if (currentCustomBinder) {
      setCardInSlot(currentCustomBinder.id, pageIndex, slotIndex, cardId, variant);
    }
  };

  const handleSelectCardsBatch = (
    startPageIndex: number,
    startSlotIndex: number,
    cards: Array<{ cardId: string; variant: CardVariantKey }>
  ) => {
    if (currentCustomBinder) {
      insertCardsBatch(
        currentCustomBinder.id,
        startPageIndex,
        startSlotIndex,
        cards,
        profileCards
      );
      setPickerTarget(null);
    }
  };

  const handleMoveCard = (
    source: { pageIndex: number; slotIndex: number },
    target: { pageIndex: number; slotIndex: number }
  ) => {
    if (currentCustomBinder) {
      moveCardSlot(currentCustomBinder.id, source, target);
      setMovingSource(null);
    }
  };

  const handleCreateNewBinder = () => {
    const newB = createCustomBinder({
      name: `สมุดสะสมที่ ${binders.length + 1}`,
      coverTheme: 'burgundy-leather',
      sleeveStyle: 'holo-stars',
      pocketsPerPage: 9,
    });
    setActiveBinder(newB.id);
  };

  const handleSwitchToGrid = () => {
    setViewMode('grid');
    onSwitchToGridView?.();
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-gradient-to-b from-neutral-950 via-[#0d0e12] to-neutral-950 flex flex-col items-center justify-start pb-12 transition-colors">
      {/* Top Interactive Toolbar */}
      <div className="w-full max-w-6xl px-3 sm:px-6 pt-3 pb-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-14 z-30">
        {/* Left: Binder Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-xl bg-neutral-900 border border-white/15 p-1">
            <button
              type="button"
              onClick={() => setActiveBinder(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isAutoSetMode
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              📚 ประจำชุด (Auto-Set)
            </button>
            <button
              type="button"
              onClick={() => {
                if (binders.length > 0) {
                  setActiveBinder(binders[0].id);
                } else {
                  handleCreateNewBinder();
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isAutoSetMode
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              ✨ สร้างเอง ({binders.length})
            </button>
          </div>

          {/* Sub-selector: Select Set or Select Custom Binder */}
          {isAutoSetMode ? (
            <select
              value={selectedAutoSetId}
              onChange={(e) => {
                setSelectedAutoSetId(e.target.value);
                setCurrentPageIndex(0);
              }}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/15 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none max-w-[220px] truncate"
            >
              {setsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-1.5">
              <select
                value={currentCustomBinder?.id || ''}
                onChange={(e) => setActiveBinder(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/15 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none max-w-[200px] truncate"
              >
                {binders.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleCreateNewBinder}
                title="สร้างสมุดสะสมเล่มใหม่"
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-amber-400 border border-white/10 flex items-center justify-center font-bold text-sm transition-colors"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Center: Progress & Title */}
        {isAutoSetMode && setProgressStats && (
          <div className="flex items-center gap-3 bg-neutral-900/80 px-3 py-1.5 rounded-xl border border-white/10">
            <div className="text-[11px] text-neutral-300">
              ความสมบูรณ์ชุด: <span className="text-amber-400 font-bold">{setProgressStats.percent}%</span>
            </div>
            <div className="w-24 h-2 bg-neutral-800 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${setProgressStats.percent}%` }}
              />
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">
              {setProgressStats.owned}/{setProgressStats.total}
            </div>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Batch Insert Cards (in custom mode) */}
          {!isAutoSetMode && currentCustomBinder && (
            <button
              type="button"
              onClick={() => {
                const page = computedPages[currentPageIndex];
                const firstEmptyIdx = page?.slots.findIndex((s) => !s.cardId);
                const targetSlot = firstEmptyIdx !== -1 && firstEmptyIdx !== undefined ? firstEmptyIdx : 0;
                setPickerTarget({ pageIndex: currentPageIndex, slotIndex: targetSlot, mode: 'batch' });
              }}
              data-testid="btn-batch-add-cards"
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <span>📥</span> ใส่หลายใบ
            </button>
          )}

          {/* Add Page (in custom mode) */}
          {!isAutoSetMode && currentCustomBinder && (
            <button
              type="button"
              onClick={() => addPage(currentCustomBinder.id)}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-white/15 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <span>📄</span> เพิ่มหน้า
            </button>
          )}

          {/* Settings Modal Toggle */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            data-testid="binder-settings-btn"
            className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-white/15 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <span>⚙️</span> ปก/ซอง
          </button>

          {/* Switch back to standard grid view */}
          <button
            type="button"
            onClick={handleSwitchToGrid}
            data-testid="switch-to-grid-btn"
            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span>⊞</span> ตารางปกติ
          </button>
        </div>
      </div>

      {/* Main 3D Book Spread Presentation */}
      <div className="w-full flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
        <BinderBookSpread
          binder={displayBinder}
          pages={computedPages}
          currentPageIndex={currentPageIndex}
          allCardsMap={allCardsMap}
          onSlotClick={handleSlotClick}
          onEmptySlotClick={handleEmptySlotClick}
          onRemoveCard={handleRemoveCard}
          onMoveCard={handleMoveCard}
          movingSource={movingSource}
          onStartMove={(src) => setMovingSource(src)}
          onCancelMove={() => setMovingSource(null)}
          onPrevPage={() => prevPage(2)}
          onNextPage={() => nextPage(computedPages.length, 2)}
          onPageSelect={(idx) => setCurrentPageIndex(idx)}
        />
      </div>

      {/* Page Quick Scrubber Slider */}
      {computedPages.length > 1 && (
        <div className="w-full max-w-md px-6 py-2 flex items-center gap-3">
          <span className="text-[11px] font-mono text-neutral-400">หน้า 1</span>
          <input
            type="range"
            min={0}
            max={computedPages.length - 1}
            step={1}
            value={currentPageIndex}
            onChange={(e) => setCurrentPageIndex(parseInt(e.target.value, 10))}
            className="flex-1 accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
          />
          <span className="text-[11px] font-mono text-neutral-400">
            หน้า {computedPages.length}
          </span>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <BinderSettingsModal
          isOpen={isSettingsOpen}
          binder={displayBinder}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(updates) => {
            if (currentCustomBinder) {
              updateBinder(currentCustomBinder.id, updates);
            } else {
              updateAutoSetSettings({
                coverTheme: updates.coverTheme,
                sleeveStyle: updates.sleeveStyle,
                pocketsPerPage: updates.pocketsPerPage,
                gridCols: updates.gridCols,
                gridRows: updates.gridRows,
              });
            }
          }}
          onDelete={(binderId) => {
            deleteBinder(binderId);
          }}
        />
      )}

      {/* Card Picker Drawer (for custom binders) */}
      {pickerTarget && (
        <BinderCardPickerDrawer
          isOpen={Boolean(pickerTarget)}
          pageIndex={pickerTarget.pageIndex}
          slotIndex={pickerTarget.slotIndex}
          initialMode={pickerTarget.mode || 'single'}
          allCards={pokemonCardData as any[]}
          profileCards={profileCards}
          onClose={() => setPickerTarget(null)}
          onSelectCard={handleSelectCardForSlot}
          onSelectCardsBatch={handleSelectCardsBatch}
        />
      )}

      {/* Card Detail / Inspection Modal */}
      {inspectCard && (
        <CardCollectionModal
          card={inspectCard}
          onClose={() => setInspectCard(null)}
        />
      )}

      {/* Active Moving Banner Indicator */}
      {movingSource && (
        <div
          data-testid="moving-active-banner"
          className="fixed bottom-6 z-50 flex items-center gap-3 bg-neutral-900/95 border border-amber-400/80 shadow-2xl px-4 py-2.5 rounded-2xl backdrop-blur-md animate-pulse"
        >
          <span className="text-amber-300 text-xs font-bold flex items-center gap-1.5">
            <span className="text-sm">⇄</span> กำลังย้ายการ์ด: แตะช่องปลายทางเพื่อวาง หรือ แตะการ์ดอื่นเพื่อสลับ
          </span>
          <button
            type="button"
            onClick={() => setMovingSource(null)}
            className="px-2.5 py-1 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      )}
    </div>
  );
}
