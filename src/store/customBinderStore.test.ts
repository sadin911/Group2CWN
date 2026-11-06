import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useCustomBinderStore,
  computeAutoSetBinderPages,
  sortCardsByCollectorNumber,
} from './customBinderStore';
import type { CollectionCardEntry } from '../types/collection';

function installMemoryStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, String(value));
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
    get length() {
      return data.size;
    },
    key: (index: number) => Array.from(data.keys())[index] ?? null,
  });
}

describe('customBinderStore', () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
    // Reset store state
    useCustomBinderStore.setState({
      binders: [],
      activeBinderId: null,
      currentPageIndex: 0,
      viewMode: 'grid',
    });
  });

  describe('sortCardsByCollectorNumber', () => {
    it('sorts numeric and formatted collector numbers ascendingly', () => {
      const cards = [
        { id: 'c3', collectorNumber: '010-154' },
        { id: 'c1', collectorNumber: '001-154' },
        { id: 'c4', collectorNumber: '100-154' },
        { id: 'c2', collectorNumber: '002-154' },
        { id: 'c5', collectorNumber: '155-154' }, // Secret Rare
      ];

      const sorted = sortCardsByCollectorNumber(cards);
      expect(sorted.map((c) => c.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    });

    it('handles slashed formats and non-padded numbers correctly', () => {
      const cards = [
        { id: 'c2', collectorNumber: '2/68' },
        { id: 'c1', collectorNumber: '1/68' },
        { id: 'c3', collectorNumber: '11/68' },
      ];

      const sorted = sortCardsByCollectorNumber(cards);
      expect(sorted.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    });
  });

  describe('computeAutoSetBinderPages', () => {
    const mockCards = [
      { id: 'SV8a-1', set: { id: 'SV8a', name: 'Terastal Fest' }, collectorNumber: '001-187' },
      { id: 'SV8a-2', set: { id: 'SV8a', name: 'Terastal Fest' }, collectorNumber: '002-187' },
      { id: 'SV8a-3', set: { id: 'SV8a', name: 'Terastal Fest' }, collectorNumber: '003-187' },
      { id: 'SV8a-4', set: { id: 'SV8a', name: 'Terastal Fest' }, collectorNumber: '004-187' },
      { id: 'SV8a-5', set: { id: 'SV8a', name: 'Terastal Fest' }, collectorNumber: '005-187' },
      { id: 'OTHER-1', set: { id: 'SV7', name: 'Stellar Miracle' }, collectorNumber: '001-102' },
    ];

    const mockProfileCards: Record<string, CollectionCardEntry> = {
      'SV8a-1': {
        cardId: 'SV8a-1',
        variants: { normal: 2, holo: 0, reverse: 0, promo: 0 },
        updatedAt: 12345,
      },
      'SV8a-3': {
        cardId: 'SV8a-3',
        variants: { normal: 0, holo: 1, reverse: 2, promo: 0 },
        updatedAt: 12345,
      },
    };

    it('generates pages chunked by pocketsPerPage and maps owned status', () => {
      // 5 cards with 4 pockets per page -> 2 pages (4 slots on page 1, 4 slots on page 2 with 1 card and 3 empty)
      const pages = computeAutoSetBinderPages(mockCards, 'SV8a', mockProfileCards, 4);

      expect(pages).toHaveLength(2);
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[0].slots).toHaveLength(4);

      // Slot 0: SV8a-1 (owned, count = 2)
      expect(pages[0].slots[0].cardId).toBe('SV8a-1');
      expect(pages[0].slots[0].isOwned).toBe(true);
      expect(pages[0].slots[0].count).toBe(2);
      expect(pages[0].slots[0].variant).toBe('normal');

      // Slot 1: SV8a-2 (unowned ghost silhouette)
      expect(pages[0].slots[1].cardId).toBe('SV8a-2');
      expect(pages[0].slots[1].isOwned).toBe(false);
      expect(pages[0].slots[1].count).toBe(0);

      // Slot 2: SV8a-3 (owned, count = 3, reverse/holo)
      expect(pages[0].slots[2].cardId).toBe('SV8a-3');
      expect(pages[0].slots[2].isOwned).toBe(true);
      expect(pages[0].slots[2].count).toBe(3);

      // Page 2: Slot 0 is SV8a-5, slots 1-3 are empty slots
      expect(pages[1].pageNumber).toBe(2);
      expect(pages[1].slots[0].cardId).toBe('SV8a-5');
      expect(pages[1].slots[1].cardId).toBeUndefined();
      expect(pages[1].slots[1].isOwned).toBe(false);
    });

    it('returns 1 empty page if set has no cards', () => {
      const pages = computeAutoSetBinderPages(mockCards, 'NON_EXISTENT', {}, 9);
      expect(pages).toHaveLength(1);
      expect(pages[0].slots).toHaveLength(9);
      expect(pages[0].slots[0].cardId).toBeUndefined();
    });
  });

  describe('useCustomBinderStore actions', () => {
    it('creates a custom binder with default properties', () => {
      const store = useCustomBinderStore.getState();
      const binder = store.createCustomBinder({
        name: 'My SAR Showcase',
        coverTheme: 'burgundy-leather',
        sleeveStyle: 'holo-stars',
        pocketsPerPage: 9,
      });

      expect(binder.id).toBeDefined();
      expect(binder.name).toBe('My SAR Showcase');
      expect(binder.coverTheme).toBe('burgundy-leather');
      expect(binder.sleeveStyle).toBe('holo-stars');
      expect(binder.pocketsPerPage).toBe(9);
      expect(binder.pages).toHaveLength(1);
      expect(binder.pages[0].slots).toHaveLength(9);

      const updatedBinders = useCustomBinderStore.getState().binders;
      expect(updatedBinders).toHaveLength(1);
      expect(useCustomBinderStore.getState().activeBinderId).toBe(binder.id);
    });

    it('sets and removes cards in custom slots', () => {
      const store = useCustomBinderStore.getState();
      const binder = store.createCustomBinder({ name: 'Test Binder', pocketsPerPage: 4 });

      // Place card in page 0, slot 1
      useCustomBinderStore.getState().setCardInSlot(binder.id, 0, 1, 'SV8a-10', 'holo');

      let updated = useCustomBinderStore.getState().binders.find((b) => b.id === binder.id);
      expect(updated?.pages[0].slots[1].cardId).toBe('SV8a-10');
      expect(updated?.pages[0].slots[1].variant).toBe('holo');

      // Remove card from slot
      useCustomBinderStore.getState().removeCardFromSlot(binder.id, 0, 1);
      updated = useCustomBinderStore.getState().binders.find((b) => b.id === binder.id);
      expect(updated?.pages[0].slots[1].cardId).toBeUndefined();
    });

    it('adds and removes pages safely', () => {
      const store = useCustomBinderStore.getState();
      const binder = store.createCustomBinder({ name: 'Multi-Page Binder', pocketsPerPage: 9 });

      useCustomBinderStore.getState().addPage(binder.id);
      let updated = useCustomBinderStore.getState().binders.find((b) => b.id === binder.id);
      expect(updated?.pages).toHaveLength(2);
      expect(updated?.pages[1].pageNumber).toBe(2);

      useCustomBinderStore.getState().removePage(binder.id, 1);
      updated = useCustomBinderStore.getState().binders.find((b) => b.id === binder.id);
      expect(updated?.pages).toHaveLength(1);
    });

    it('navigates pages within boundaries', () => {
      const store = useCustomBinderStore.getState();

      store.setCurrentPageIndex(0);
      expect(useCustomBinderStore.getState().currentPageIndex).toBe(0);

      // Prev page at 0 stays at 0
      useCustomBinderStore.getState().prevPage(2);
      expect(useCustomBinderStore.getState().currentPageIndex).toBe(0);

      // Next page advances by step (e.g. 2 for 2-page spread)
      useCustomBinderStore.getState().nextPage(6, 2);
      expect(useCustomBinderStore.getState().currentPageIndex).toBe(2);

      useCustomBinderStore.getState().nextPage(6, 2);
      expect(useCustomBinderStore.getState().currentPageIndex).toBe(4);

      // Beyond max pages clamps
      useCustomBinderStore.getState().nextPage(6, 2);
      expect(useCustomBinderStore.getState().currentPageIndex).toBe(4); // max left spread index is 4 for 6 pages (pages 5 & 6)
    });

    it('updates and deletes binders', () => {
      const store = useCustomBinderStore.getState();
      const binder = store.createCustomBinder({ name: 'Old Name' });

      useCustomBinderStore.getState().updateBinder(binder.id, {
        name: 'New Name',
        coverTheme: 'ultra-ball',
      });

      let updated = useCustomBinderStore.getState().binders.find((b) => b.id === binder.id);
      expect(updated?.name).toBe('New Name');
      expect(updated?.coverTheme).toBe('ultra-ball');

      useCustomBinderStore.getState().deleteBinder(binder.id);
      expect(useCustomBinderStore.getState().binders).toHaveLength(0);
      expect(useCustomBinderStore.getState().activeBinderId).toBeNull();
    });

    it('toggles viewMode between grid and binder', () => {
      useCustomBinderStore.getState().setViewMode('binder');
      expect(useCustomBinderStore.getState().viewMode).toBe('binder');

      useCustomBinderStore.getState().setViewMode('grid');
      expect(useCustomBinderStore.getState().viewMode).toBe('grid');
    });

    it('inserts a batch of cards sequentially across pages when needed', () => {
      const store = useCustomBinderStore.getState();
      const binder = store.createCustomBinder({
        name: 'Batch Test Binder',
        pocketsPerPage: 4, // 4 slots per page
      });

      // Insert 6 cards starting from page 0, slot 0
      const cards = [
        { cardId: 'card-1', variant: 'normal' as const },
        { cardId: 'card-2', variant: 'holo' as const },
        { cardId: 'card-3', variant: 'reverse' as const },
        { cardId: 'card-4', variant: 'promo' as const },
        { cardId: 'card-5', variant: 'normal' as const },
        { cardId: 'card-6', variant: 'holo' as const },
      ];

      useCustomBinderStore.getState().insertCardsBatch(binder.id, 0, 0, cards);

      const updated = useCustomBinderStore.getState().binders.find((b) => b.id === binder.id)!;
      // Should have 2 pages because 6 cards > 4 slots
      expect(updated.pages.length).toBeGreaterThanOrEqual(2);

      // Page 0 slots: card-1, card-2, card-3, card-4
      expect(updated.pages[0].slots[0].cardId).toBe('card-1');
      expect(updated.pages[0].slots[1].cardId).toBe('card-2');
      expect(updated.pages[0].slots[2].cardId).toBe('card-3');
      expect(updated.pages[0].slots[3].cardId).toBe('card-4');

      // Page 1 slots: card-5, card-6
      expect(updated.pages[1].slots[0].cardId).toBe('card-5');
      expect(updated.pages[1].slots[1].cardId).toBe('card-6');
      expect(updated.pages[1].slots[2].cardId).toBeUndefined();
    });

    it('moves card to an empty slot or swaps two cards', () => {
      const store = useCustomBinderStore.getState();
      const binder = store.createCustomBinder({
        name: 'Move Test Binder',
        pocketsPerPage: 4,
      });

      // Set card-A at page 0 slot 0, card-B at page 0 slot 1
      useCustomBinderStore.getState().setCardInSlot(binder.id, 0, 0, 'card-A', 'normal');
      useCustomBinderStore.getState().setCardInSlot(binder.id, 0, 1, 'card-B', 'holo');

      // 1. Move card-A to empty slot 2
      useCustomBinderStore.getState().moveCardSlot(
        binder.id,
        { pageIndex: 0, slotIndex: 0 },
        { pageIndex: 0, slotIndex: 2 }
      );

      let updated = useCustomBinderStore.getState().binders.find((b) => b.id === binder.id)!;
      expect(updated.pages[0].slots[0].cardId).toBeUndefined();
      expect(updated.pages[0].slots[2].cardId).toBe('card-A');
      expect(updated.pages[0].slots[1].cardId).toBe('card-B');

      // 2. Swap slot 2 (card-A) with slot 1 (card-B)
      useCustomBinderStore.getState().moveCardSlot(
        binder.id,
        { pageIndex: 0, slotIndex: 2 },
        { pageIndex: 0, slotIndex: 1 }
      );

      updated = useCustomBinderStore.getState().binders.find((b) => b.id === binder.id)!;
      expect(updated.pages[0].slots[1].cardId).toBe('card-A');
      expect(updated.pages[0].slots[2].cardId).toBe('card-B');
    });

    it('reflows binder pages correctly when pocketsPerPage changes', () => {
      const store = useCustomBinderStore.getState();
      const binder = store.createCustomBinder({
        name: 'Reflow Test Binder',
        pocketsPerPage: 9, // starts as 9-pocket
      });

      // Insert 6 cards on page 0
      const cards = [
        { cardId: 'c1', variant: 'normal' as const },
        { cardId: 'c2', variant: 'normal' as const },
        { cardId: 'c3', variant: 'normal' as const },
        { cardId: 'c4', variant: 'normal' as const },
        { cardId: 'c5', variant: 'normal' as const },
        { cardId: 'c6', variant: 'normal' as const },
      ];
      useCustomBinderStore.getState().insertCardsBatch(binder.id, 0, 0, cards);

      // 1. Change layout from 9 to 4 (2x2)
      useCustomBinderStore.getState().updateBinder(binder.id, {
        pocketsPerPage: 4,
        gridCols: 2,
        gridRows: 2,
      });

      let updated = useCustomBinderStore.getState().binders.find((b) => b.id === binder.id)!;
      expect(updated.pocketsPerPage).toBe(4);
      expect(updated.gridCols).toBe(2);
      expect(updated.gridRows).toBe(2);
      // 6 cards in 4-pocket layout should create 2 pages
      expect(updated.pages).toHaveLength(2);
      // Page 1 has exactly 4 slots: c1, c2, c3, c4
      expect(updated.pages[0].slots).toHaveLength(4);
      expect(updated.pages[0].slots.map((s) => s.cardId)).toEqual(['c1', 'c2', 'c3', 'c4']);
      // Page 2 has exactly 4 slots: c5, c6, undefined, undefined
      expect(updated.pages[1].slots).toHaveLength(4);
      expect(updated.pages[1].slots[0].cardId).toBe('c5');
      expect(updated.pages[1].slots[1].cardId).toBe('c6');
      expect(updated.pages[1].slots[2].cardId).toBeUndefined();
      expect(updated.pages[1].slots[3].cardId).toBeUndefined();

      // 2. Change layout back to 9 (3x3)
      useCustomBinderStore.getState().updateBinder(binder.id, {
        pocketsPerPage: 9,
        gridCols: 3,
        gridRows: 3,
      });

      updated = useCustomBinderStore.getState().binders.find((b) => b.id === binder.id)!;
      expect(updated.pocketsPerPage).toBe(9);
      // All 6 cards should now fit on 1 page with 9 slots!
      expect(updated.pages).toHaveLength(1);
      expect(updated.pages[0].slots).toHaveLength(9);
      expect(updated.pages[0].slots.slice(0, 6).map((s) => s.cardId)).toEqual([
        'c1', 'c2', 'c3', 'c4', 'c5', 'c6'
      ]);
      expect(updated.pages[0].slots[6].cardId).toBeUndefined();
      expect(updated.pages[0].slots[7].cardId).toBeUndefined();
      expect(updated.pages[0].slots[8].cardId).toBeUndefined();
    });

    it('updates and persists autoSetSettings', () => {
      const initial = useCustomBinderStore.getState().autoSetSettings;
      expect(initial.pocketsPerPage).toBe(9);

      useCustomBinderStore.getState().updateAutoSetSettings({
        pocketsPerPage: 4,
        gridCols: 2,
        gridRows: 2,
        coverTheme: 'burgundy-leather',
      });

      const updated = useCustomBinderStore.getState().autoSetSettings;
      expect(updated.pocketsPerPage).toBe(4);
      expect(updated.gridCols).toBe(2);
      expect(updated.gridRows).toBe(2);
      expect(updated.coverTheme).toBe('burgundy-leather');
    });
  });
});
