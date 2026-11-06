import { describe, it, expect, beforeEach } from 'vitest';
import exampleImportData from '../../exampleimport.json';
import { useCollectionStore } from './collectionStore';

const jsonContent = JSON.stringify(exampleImportData);

describe('useCollectionStore importCollectionJSON with Pokillionaire format', () => {
  beforeEach(() => {
    useCollectionStore.getState().resetToGuest();
  });

  it('imports exampleimport.json into active profile with merge mode', () => {
    const result = useCollectionStore.getState().importCollectionJSON(jsonContent, {
      mode: 'merge',
    });

    expect(result.success).toBe(true);
    expect(result.format).toBe('pokillionaire');
    expect(result.cardsImportedCount).toBe(204); // sum of quantities
    expect(result.distinctCardsCount).toBe(169); // distinct cards

    const activeProfile =
      useCollectionStore.getState().profiles[useCollectionStore.getState().activeProfileId];
    expect(Object.keys(activeProfile.cards).length).toBe(169);

    // Verify card 002 ยันยันมา in MA3 (TH-12912)
    const cardEntry = activeProfile.cards['TH-12912'];
    expect(cardEntry).toBeDefined();
    expect(cardEntry.variants.normal).toBe(1);
  });

  it('imports into a newly created profile with new_profile mode', () => {
    const prevActiveId = useCollectionStore.getState().activeProfileId;

    const result = useCollectionStore.getState().importCollectionJSON(jsonContent, {
      mode: 'new_profile',
      profileName: 'Pokillionaire Collection Test',
    });

    expect(result.success).toBe(true);
    expect(result.format).toBe('pokillionaire');

    const newActiveId = useCollectionStore.getState().activeProfileId;
    expect(newActiveId).not.toBe(prevActiveId);

    const newProfile = useCollectionStore.getState().profiles[newActiveId];
    expect(newProfile.name).toBe('Pokillionaire Collection Test');
    expect(Object.keys(newProfile.cards).length).toBe(169);
  });

  it('imports with replace mode replacing previous cards', () => {
    // First import a single card
    useCollectionStore.getState().importCollectionText('Set SC1a\n1,3', { mode: 'merge' });
    const profileBefore =
      useCollectionStore.getState().profiles[useCollectionStore.getState().activeProfileId];
    expect(profileBefore.cards['TH-1']).toBeDefined();

    // Now import Pokillionaire with replace mode
    const result = useCollectionStore.getState().importCollectionJSON(jsonContent, {
      mode: 'replace',
    });

    expect(result.success).toBe(true);
    const profileAfter =
      useCollectionStore.getState().profiles[useCollectionStore.getState().activeProfileId];
    expect(profileAfter.cards['TH-1']).toBeUndefined(); // SC1a card replaced
    expect(Object.keys(profileAfter.cards).length).toBe(169);
  });
});
