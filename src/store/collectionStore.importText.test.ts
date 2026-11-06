import { describe, it, expect, beforeEach } from 'vitest';
import { useCollectionStore } from './collectionStore';

describe('useCollectionStore importCollectionText', () => {
  beforeEach(() => {
    useCollectionStore.getState().resetToGuest();
  });

  it('imports cards in merge mode into active binder', () => {
    // SC1a cards: 1 (สไตรค์), 20 (เอเลซัน), 21 (สตรินเดอร์)
    const input = `
Set SC1a
1,3
20,5
21
`;
    const result = useCollectionStore.getState().importCollectionText(input, { mode: 'merge' });

    expect(result.success).toBe(true);
    expect(result.cardsImportedCount).toBe(9);
    expect(result.distinctCardsCount).toBe(3);
    expect(result.setsFound).toEqual(['SC1a']);

    const activeProfile =
      useCollectionStore.getState().profiles[useCollectionStore.getState().activeProfileId];
    expect(activeProfile.cards['TH-1']?.variants?.normal).toBe(3);
    expect(activeProfile.cards['TH-20']?.variants?.normal).toBe(5);
    expect(activeProfile.cards['TH-21']?.variants?.normal).toBe(1);

    // Import again in merge mode: TH-1 + 2 copies = 5 total
    const result2 = useCollectionStore.getState().importCollectionText('Set SC1a\n1,2', { mode: 'merge' });
    expect(result2.success).toBe(true);

    const updatedProfile =
      useCollectionStore.getState().profiles[useCollectionStore.getState().activeProfileId];
    expect(updatedProfile.cards['TH-1']?.variants?.normal).toBe(5);
  });

  it('imports cards in replace mode', () => {
    const input = `
Set SC1a
1,3
`;
    useCollectionStore.getState().importCollectionText(input, { mode: 'merge' });

    // Now replace count with 1
    const replaceResult = useCollectionStore
      .getState()
      .importCollectionText('Set SC1a\n1,1', { mode: 'replace' });
    expect(replaceResult.success).toBe(true);

    const activeProfile =
      useCollectionStore.getState().profiles[useCollectionStore.getState().activeProfileId];
    expect(activeProfile.cards['TH-1']?.variants?.normal).toBe(1);
  });

  it('supports holo, reverse, and promo variant import', () => {
    const input = `
Set SC1a
1,4
`;
    const result = useCollectionStore
      .getState()
      .importCollectionText(input, { finish: 'holo' });
    expect(result.success).toBe(true);

    const activeProfile =
      useCollectionStore.getState().profiles[useCollectionStore.getState().activeProfileId];
    expect(activeProfile.cards['TH-1']?.variants?.holo).toBe(4);
    expect(activeProfile.cards['TH-1']?.variants?.normal).toBe(0);
  });

  it('imports parsed cards directly via importCollectionParsedCards', () => {
    const list = [
      { cardId: 'TH-1', quantity: 3, variant: 'normal' as const },
      { cardId: 'TH-2', quantity: 2, variant: 'holo' as const },
    ];

    const res = useCollectionStore.getState().importCollectionParsedCards(list, { mode: 'merge' });
    expect(res.success).toBe(true);
    expect(res.cardsImportedCount).toBe(5);

    const activeProfile =
      useCollectionStore.getState().profiles[useCollectionStore.getState().activeProfileId];
    expect(activeProfile.cards['TH-1']?.variants?.normal).toBe(3);
    expect(activeProfile.cards['TH-2']?.variants?.holo).toBe(2);
  });

  it('reports error when no cards can be parsed', () => {
    const result = useCollectionStore.getState().importCollectionText('invalid text content');
    expect(result.success).toBe(false);
    expect(result.cardsImportedCount).toBe(0);
  });
});
