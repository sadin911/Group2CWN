import { describe, it, expect, beforeEach } from 'vitest';
import { useCommunityStore } from './communityStore';
import { useCollectionStore } from './collectionStore';
import { useCustomBinderStore } from './customBinderStore';

describe('communityStore card ownership reactive stats suite', () => {
  const TEST_CARD_ID = 'TEST-CARD-001';
  const BASE_POPULAR_CARD_ID = 'TEST-CARD-POPULAR';

  beforeEach(() => {
    // Reset stores to predictable test states
    useCommunityStore.setState({
      totalUsers: 5,
      cardOwners: {
        [TEST_CARD_ID]: 1, // 1 out of 5 = 20%
        [BASE_POPULAR_CARD_ID]: 2, // 2 out of 5 = 40%
      },
      loading: false,
      lastFetchedAt: Date.now(),
    });

    useCollectionStore.setState({
      profiles: {
        default: {
          id: 'default',
          name: 'Main',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          cards: {},
        },
      },
      activeProfileId: 'default',
    });

    useCustomBinderStore.setState({
      binders: [],
      activeBinderId: null,
      currentPageIndex: 0,
      viewMode: 'binder',
    });
  });

  it('returns baseline snapshot stats when current user does not own the card', () => {
    const stats = useCommunityStore.getState().getCardStats(TEST_CARD_ID);
    expect(stats.count).toBe(1);
    expect(stats.totalUsers).toBe(5);
    expect(stats.percentage).toBe(20);
    expect(stats.tier).toBe('rare');
    expect(stats.tierLabel).toContain('แรร์ (Rare)');
  });

  it('returns unclaimed (0%) for cards with 0 base owners when unowned', () => {
    const stats = useCommunityStore.getState().getCardStats('UNOWNED-CARD-999');
    expect(stats.count).toBe(0);
    expect(stats.percentage).toBe(0);
    expect(stats.tier).toBe('unclaimed');
    expect(stats.tierLabel).toContain('ยังไม่มีใครครอบครอง (0%)');
  });

  it('immediately reflects ownership when isLocallyOwnedOverride is passed as true', () => {
    const { getCardStats } = useCommunityStore.getState();

    // With 1 base owner, active user owning it should immediately make count = 2 (40%)
    const updatedStats = getCardStats(TEST_CARD_ID, true);
    expect(updatedStats.count).toBe(2);
    expect(updatedStats.totalUsers).toBe(5);
    expect(updatedStats.percentage).toBe(40);
    expect(updatedStats.tier).toBe('uncommon');
    expect(updatedStats.tierLabel).toContain('ปานกลาง (Uncommon)');

    // With 0 base owner, active user owning it should make count = 1 (20%)
    const unownedTurnedOwned = getCardStats('UNOWNED-CARD-999', true);
    expect(unownedTurnedOwned.count).toBe(1);
    expect(unownedTurnedOwned.percentage).toBe(20);
    expect(unownedTurnedOwned.tier).toBe('rare');
  });

  it('immediately updates when user adds card to collectionStore', () => {
    const { getCardStats } = useCommunityStore.getState();

    // Before adding: 1 owner
    expect(getCardStats(TEST_CARD_ID).count).toBe(1);

    // User adds 1 normal variant to active profile in collectionStore
    useCollectionStore.getState().setVariantCount(TEST_CARD_ID, 'normal', 1);

    // After adding: automatically detects ownership in collectionStore and reflects 2 owners
    const stats = getCardStats(TEST_CARD_ID);
    expect(stats.count).toBe(2);
    expect(stats.percentage).toBe(40);
    expect(stats.tier).toBe('uncommon');

    // User sets back to 0
    useCollectionStore.getState().setVariantCount(TEST_CARD_ID, 'normal', 0);
    const revertedStats = getCardStats(TEST_CARD_ID);
    expect(revertedStats.count).toBe(1);
    expect(revertedStats.percentage).toBe(20);
  });

  it('immediately updates when user places card into customBinderStore', () => {
    const { getCardStats } = useCommunityStore.getState();

    // Create a custom binder
    const binder = useCustomBinderStore.getState().createCustomBinder({ name: 'Test Binder' });

    // Initially unowned card
    expect(getCardStats('BINDER-CARD-XYZ').count).toBe(0);

    // Place card into slot 0 of page 0
    useCustomBinderStore.getState().setCardInSlot(binder.id, 0, 0, 'BINDER-CARD-XYZ', 'normal');

    // Stats should now detect card in binder and increment count to 1 (20%)
    const stats = getCardStats('BINDER-CARD-XYZ');
    expect(stats.count).toBe(1);
    expect(stats.percentage).toBe(20);
    expect(stats.tier).toBe('rare');
  });
});
