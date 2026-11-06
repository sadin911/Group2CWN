import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  BinderPocketLayout,
  BinderSlotItem,
  BinderPage,
  CustomBinder,
  BinderTheme,
  PocketSleeveStyle,
} from '../types/binder';
import type { CardVariantKey, CollectionCardEntry } from '../types/collection';

export interface AutoSetSettings {
  coverTheme: BinderTheme;
  sleeveStyle: PocketSleeveStyle;
  pocketsPerPage: BinderPocketLayout;
  gridCols?: number;
  gridRows?: number;
}

const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
        return window.localStorage.getItem(name);
      }
    } catch {}
    return null;
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
        window.localStorage.setItem(name, value);
      }
    } catch {}
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.removeItem === 'function') {
        window.localStorage.removeItem(name);
      }
    } catch {}
  },
};

export interface CustomBinderState {
  binders: CustomBinder[];
  activeBinderId: string | null;
  currentPageIndex: number; // 0-indexed (points to the active left page or single page)
  viewMode: 'grid' | 'binder';
  autoSetSettings: AutoSetSettings;

  // Actions
  setViewMode: (mode: 'grid' | 'binder') => void;
  setActiveBinder: (id: string | null) => void;
  setCurrentPageIndex: (index: number) => void;
  nextPage: (totalPages: number, step?: number) => void;
  prevPage: (step?: number) => void;
  updateAutoSetSettings: (settings: Partial<AutoSetSettings>) => void;

  // Custom Binder CRUD
  createCustomBinder: (params?: Partial<CustomBinder>) => CustomBinder;
  updateBinder: (id: string, updates: Partial<CustomBinder>) => void;
  deleteBinder: (id: string) => void;

  // Page & Slot Actions
  setCardInSlot: (
    binderId: string,
    pageIndex: number,
    slotIndex: number,
    cardId?: string,
    variant?: CardVariantKey,
    customLabel?: string
  ) => void;
  insertCardsBatch: (
    binderId: string,
    startPageIndex: number,
    startSlotIndex: number,
    cards: Array<{ cardId: string; variant?: CardVariantKey; customLabel?: string }>,
    profileCards?: Record<string, CollectionCardEntry>
  ) => void;
  moveCardSlot: (
    binderId: string,
    source: { pageIndex: number; slotIndex: number },
    target: { pageIndex: number; slotIndex: number }
  ) => void;
  removeCardFromSlot: (binderId: string, pageIndex: number, slotIndex: number) => void;
  addPage: (binderId: string) => void;
  removePage: (binderId: string, pageIndex: number) => void;
}

/**
 * Extracts a numeric value and optional suffix from collector number strings.
 * e.g. "001-154" -> 1, "012/068" -> 12, "072a" -> 72 + "a"
 */
function parseCollectorNumber(str?: string): { num: number; suffix: string } {
  if (!str) return { num: 999999, suffix: '' };
  // Split by slash, dash, or whitespace to isolate card number
  const firstPart = str.trim().split(/[\s/-]/)[0];
  const match = firstPart.match(/^(\d+)(.*)$/);
  if (match) {
    return {
      num: parseInt(match[1], 10),
      suffix: match[2] || '',
    };
  }
  return { num: 999999, suffix: str };
}

/**
 * Sorts card list by collector number ascendingly, placing secret rares at the end.
 */
export function sortCardsByCollectorNumber<T extends { collectorNumber?: string; id?: string }>(cards: T[]): T[] {
  return [...cards].sort((a, b) => {
    const parsedA = parseCollectorNumber(a.collectorNumber);
    const parsedB = parseCollectorNumber(b.collectorNumber);

    if (parsedA.num !== parsedB.num) {
      return parsedA.num - parsedB.num;
    }
    if (parsedA.suffix !== parsedB.suffix) {
      return parsedA.suffix.localeCompare(parsedB.suffix);
    }
    return (a.id || '').localeCompare(b.id || '');
  });
}

/**
 * Generates structured BinderPage arrays for an Auto-Set binder.
 * Cards are ordered by collector number and mapped against user collection profile ownership.
 */
export function computeAutoSetBinderPages(
  allCards: any[],
  setId: string,
  profileCards: Record<string, CollectionCardEntry> = {},
  pocketsPerPage: BinderPocketLayout = 9
): BinderPage[] {
  // 1. Filter set cards
  const setCards = allCards.filter(
    (c) => c.set?.id === setId || c.setId === setId || c.set === setId
  );

  if (setCards.length === 0) {
    // Return 1 empty placeholder page
    return [
      {
        pageNumber: 1,
        slots: Array.from({ length: pocketsPerPage }, (_, idx) => ({
          slotIndex: idx,
          cardId: undefined,
          isOwned: false,
          count: 0,
        })),
      },
    ];
  }

  // 2. Sort cards by collector number
  const sortedCards = sortCardsByCollectorNumber(setCards);

  // 3. Chunk into pages of pocketsPerPage
  const totalPages = Math.ceil(sortedCards.length / pocketsPerPage);
  const pages: BinderPage[] = [];

  for (let p = 0; p < totalPages; p++) {
    const pageSlots: BinderSlotItem[] = [];
    const startIndex = p * pocketsPerPage;

    for (let s = 0; s < pocketsPerPage; s++) {
      const card = sortedCards[startIndex + s];
      if (card) {
        const entry = profileCards[card.id];
        let totalCount = 0;
        let bestVariant: CardVariantKey = 'normal';

        if (entry?.variants) {
          const v = entry.variants;
          totalCount = (v.normal || 0) + (v.holo || 0) + (v.reverse || 0) + (v.promo || 0);

          // Determine preferred display variant
          if (v.holo && v.holo > 0) bestVariant = 'holo';
          else if (v.reverse && v.reverse > 0) bestVariant = 'reverse';
          else if (v.promo && v.promo > 0) bestVariant = 'promo';
          else bestVariant = 'normal';
        }

        pageSlots.push({
          slotIndex: s,
          cardId: card.id,
          isOwned: totalCount > 0,
          variant: bestVariant,
          count: totalCount,
        });
      } else {
        // Remainder empty pocket
        pageSlots.push({
          slotIndex: s,
          cardId: undefined,
          isOwned: false,
          count: 0,
        });
      }
    }

    pages.push({
      pageNumber: p + 1,
      slots: pageSlots,
    });
  }

  return pages;
}

/**
 * Reflows existing custom binder pages into a new pocket layout (e.g. 4, 9, 12, 16).
 * Preserves all placed cards in order across pages, ensuring every page has
 * exactly `newPocketsPerPage` valid slots.
 */
export function reflowBinderPages(
  pages: BinderPage[],
  newPocketsPerPage: BinderPocketLayout
): BinderPage[] {
  const filledSlots: BinderSlotItem[] = [];
  for (const page of pages) {
    for (const slot of page.slots) {
      if (slot.cardId) {
        filledSlots.push(slot);
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(filledSlots.length / newPocketsPerPage));
  const newPages: BinderPage[] = [];

  let cardCursor = 0;
  for (let p = 0; p < totalPages; p++) {
    const pageSlots: BinderSlotItem[] = [];
    for (let s = 0; s < newPocketsPerPage; s++) {
      if (cardCursor < filledSlots.length) {
        const item = filledSlots[cardCursor++];
        pageSlots.push({
          ...item,
          slotIndex: s,
        });
      } else {
        pageSlots.push({
          slotIndex: s,
          cardId: undefined,
          isOwned: false,
          count: 0,
        });
      }
    }
    newPages.push({
      pageNumber: p + 1,
      slots: pageSlots,
    });
  }

  return newPages;
}

export const useCustomBinderStore = create<CustomBinderState>()(
  persist(
    (set) => ({
      binders: [],
      activeBinderId: null,
      currentPageIndex: 0,
      viewMode: 'grid',
      autoSetSettings: {
        coverTheme: 'black-leather',
        sleeveStyle: 'matte-black',
        pocketsPerPage: 9,
        gridCols: 3,
        gridRows: 3,
      },

      setViewMode: (viewMode) => set({ viewMode }),

      setActiveBinder: (activeBinderId) =>
        set({
          activeBinderId,
          currentPageIndex: 0, // Reset to page 1 on switch
        }),

      setCurrentPageIndex: (currentPageIndex) => set({ currentPageIndex }),

      nextPage: (totalPages, step = 2) => {
        set((state) => {
          // If totalPages is 6 and step is 2, valid left indices are 0, 2, 4.
          // Max left index is (totalPages % 2 === 0 ? totalPages - 2 : totalPages - 1)
          const maxLeft = Math.max(0, Math.floor((totalPages - 1) / step) * step);
          const nextIndex = Math.min(state.currentPageIndex + step, maxLeft);
          return { currentPageIndex: nextIndex };
        });
      },

      prevPage: (step = 2) => {
        set((state) => ({
          currentPageIndex: Math.max(0, state.currentPageIndex - step),
        }));
      },

      updateAutoSetSettings: (settings) => {
        set((state) => ({
          autoSetSettings: {
            ...state.autoSetSettings,
            ...settings,
          },
        }));
      },

      createCustomBinder: (params = {}) => {
        const pockets = params.pocketsPerPage || 9;
        const now = Date.now();
        const initialPage: BinderPage = {
          pageNumber: 1,
          slots: Array.from({ length: pockets }, (_, idx) => ({
            slotIndex: idx,
            cardId: undefined,
            isOwned: false,
            count: 0,
          })),
        };

        const newBinder: CustomBinder = {
          id: params.id || `binder-${now}-${Math.random().toString(36).slice(2, 7)}`,
          name: params.name || 'สมุดสะสมใหม่ (My Showcase)',
          description: params.description || '',
          mode: params.mode || 'custom',
          setId: params.setId,
          coverTheme: params.coverTheme || 'black-leather',
          sleeveStyle: params.sleeveStyle || 'matte-black',
          pocketsPerPage: pockets,
          gridCols: params.gridCols,
          gridRows: params.gridRows,
          pages: params.pages && params.pages.length > 0 ? params.pages : [initialPage],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          binders: [...state.binders, newBinder],
          activeBinderId: newBinder.id,
          currentPageIndex: 0,
        }));

        return newBinder;
      },

      updateBinder: (id, updates) => {
        set((state) => ({
          binders: state.binders.map((b) => {
            if (b.id !== id) return b;

            let updatedPages = b.pages;
            const newPockets = updates.pocketsPerPage;
            if (newPockets && newPockets !== b.pocketsPerPage) {
              updatedPages = reflowBinderPages(b.pages, newPockets);
            }

            return {
              ...b,
              ...updates,
              pages: updatedPages,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteBinder: (id) => {
        set((state) => {
          const remaining = state.binders.filter((b) => b.id !== id);
          return {
            binders: remaining,
            activeBinderId: state.activeBinderId === id ? null : state.activeBinderId,
            currentPageIndex: 0,
          };
        });
      },

      setCardInSlot: (binderId, pageIndex, slotIndex, cardId, variant = 'normal', customLabel) => {
        set((state) => {
          const updatedBinders = state.binders.map((b) => {
            if (b.id !== binderId) return b;

            const pages = [...b.pages];
            if (!pages[pageIndex]) return b;

            const page = { ...pages[pageIndex] };
            const slots = [...page.slots];

            slots[slotIndex] = {
              slotIndex,
              cardId,
              isOwned: true,
              variant,
              count: 1,
              customLabel,
            };

            page.slots = slots;
            pages[pageIndex] = page;

            return {
              ...b,
              pages,
              updatedAt: Date.now(),
            };
          });

          return { binders: updatedBinders };
        });
      },

      insertCardsBatch: (binderId, startPageIndex, startSlotIndex, cards, profileCards) => {
        if (!cards || cards.length === 0) return;

        set((state) => {
          const updatedBinders = state.binders.map((b) => {
            if (b.id !== binderId) return b;

            const pages = b.pages.map((p) => ({
              ...p,
              slots: p.slots.map((s) => ({ ...s })),
            }));

            let curPageIndex = Math.max(0, startPageIndex);
            let curSlotIndex = Math.max(0, startSlotIndex);

            // Ensure starting page exists
            while (pages.length <= curPageIndex) {
              const newPageNum = pages.length + 1;
              pages.push({
                pageNumber: newPageNum,
                slots: Array.from({ length: b.pocketsPerPage }, (_, idx) => ({
                  slotIndex: idx,
                  cardId: undefined,
                  isOwned: false,
                  count: 0,
                })),
              });
            }

            for (const item of cards) {
              while (true) {
                if (curPageIndex >= pages.length) {
                  const newPageNum = pages.length + 1;
                  pages.push({
                    pageNumber: newPageNum,
                    slots: Array.from({ length: b.pocketsPerPage }, (_, idx) => ({
                      slotIndex: idx,
                      cardId: undefined,
                      isOwned: false,
                      count: 0,
                    })),
                  });
                }

                const page = pages[curPageIndex];
                let foundSlotIndex = -1;
                for (let sIdx = curSlotIndex; sIdx < page.slots.length; sIdx++) {
                  if (!page.slots[sIdx].cardId) {
                    foundSlotIndex = sIdx;
                    break;
                  }
                }

                if (foundSlotIndex !== -1) {
                  const entry = profileCards ? profileCards[item.cardId] : undefined;
                  const hasProfileCopies = entry && Object.values(entry.variants || {}).some((v) => v > 0);
                  const count = entry ? Object.values(entry.variants || {}).reduce((a, b) => a + b, 0) : 1;

                  page.slots[foundSlotIndex] = {
                    slotIndex: foundSlotIndex,
                    cardId: item.cardId,
                    isOwned: true,
                    variant: item.variant || 'normal',
                    count: hasProfileCopies ? count : 1,
                    customLabel: item.customLabel,
                  };

                  curSlotIndex = foundSlotIndex + 1;
                  break;
                } else {
                  curPageIndex++;
                  curSlotIndex = 0;
                }
              }
            }

            return {
              ...b,
              pages,
              updatedAt: Date.now(),
            };
          });

          return { binders: updatedBinders };
        });
      },

      moveCardSlot: (binderId, source, target) => {
        if (
          source.pageIndex === target.pageIndex &&
          source.slotIndex === target.slotIndex
        ) {
          return;
        }

        set((state) => {
          const updatedBinders = state.binders.map((b) => {
            if (b.id !== binderId) return b;

            const pages = b.pages.map((p) => ({
              ...p,
              slots: p.slots.map((s) => ({ ...s })),
            }));

            if (!pages[source.pageIndex] || !pages[target.pageIndex]) return b;

            const sourceSlot = pages[source.pageIndex].slots[source.slotIndex];
            const targetSlot = pages[target.pageIndex].slots[target.slotIndex];

            if (!sourceSlot || !targetSlot) return b;

            const sourceCardData = {
              cardId: sourceSlot.cardId,
              isOwned: sourceSlot.isOwned,
              variant: sourceSlot.variant,
              count: sourceSlot.count,
              customLabel: sourceSlot.customLabel,
            };

            const targetCardData = {
              cardId: targetSlot.cardId,
              isOwned: targetSlot.isOwned,
              variant: targetSlot.variant,
              count: targetSlot.count,
              customLabel: targetSlot.customLabel,
            };

            pages[source.pageIndex].slots[source.slotIndex] = {
              slotIndex: source.slotIndex,
              ...targetCardData,
            };

            pages[target.pageIndex].slots[target.slotIndex] = {
              slotIndex: target.slotIndex,
              ...sourceCardData,
            };

            return {
              ...b,
              pages,
              updatedAt: Date.now(),
            };
          });

          return { binders: updatedBinders };
        });
      },

      removeCardFromSlot: (binderId, pageIndex, slotIndex) => {
        set((state) => {
          const updatedBinders = state.binders.map((b) => {
            if (b.id !== binderId) return b;

            const pages = [...b.pages];
            if (!pages[pageIndex]) return b;

            const page = { ...pages[pageIndex] };
            const slots = [...page.slots];

            slots[slotIndex] = {
              slotIndex,
              cardId: undefined,
              isOwned: false,
              count: 0,
            };

            page.slots = slots;
            pages[pageIndex] = page;

            return {
              ...b,
              pages,
              updatedAt: Date.now(),
            };
          });

          return { binders: updatedBinders };
        });
      },

      addPage: (binderId) => {
        set((state) => {
          const updatedBinders = state.binders.map((b) => {
            if (b.id !== binderId) return b;

            const newPageNumber = b.pages.length + 1;
            const newPage: BinderPage = {
              pageNumber: newPageNumber,
              slots: Array.from({ length: b.pocketsPerPage }, (_, idx) => ({
                slotIndex: idx,
                cardId: undefined,
                isOwned: false,
                count: 0,
              })),
            };

            return {
              ...b,
              pages: [...b.pages, newPage],
              updatedAt: Date.now(),
            };
          });

          return { binders: updatedBinders };
        });
      },

      removePage: (binderId, pageIndex) => {
        set((state) => {
          const updatedBinders = state.binders.map((b) => {
            if (b.id !== binderId) return b;
            if (b.pages.length <= 1) return b; // Keep at least 1 page

            const pages = b.pages
              .filter((_, idx) => idx !== pageIndex)
              .map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

            return {
              ...b,
              pages,
              updatedAt: Date.now(),
            };
          });

          return {
            binders: updatedBinders,
            currentPageIndex: Math.max(0, Math.min(state.currentPageIndex, (state.binders.find((b) => b.id === binderId)?.pages.length || 1) - 2)),
          };
        });
      },
    }),
    {
      name: 'pokecount_custom_binders',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        binders: state.binders,
        activeBinderId: state.activeBinderId,
        viewMode: state.viewMode,
      }),
    }
  )
);
