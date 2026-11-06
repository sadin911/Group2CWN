import { describe, it, expect, vi } from 'vitest';
import {
  generateShareId,
  encodeSnapshotToUrl,
  decodeSnapshotFromUrl,
  publishSharedCollection,
} from './sharedCollectionService';
import type { CollectionProfile } from '../types/collection';

vi.mock('firebase/firestore', () => ({
  doc: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  setDoc: vi.fn(async () => undefined),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => null })),
}));

vi.mock('../utils/firebase', () => ({
  db: {},
}));

describe('sharedCollectionService', () => {
  it('generates a valid shareId starting with pk_', () => {
    const id = generateShareId();
    expect(id).toMatch(/^pk_[a-z0-9]{8}$/);
  });

  it('encodes and decodes snapshots via URL safely', () => {
    const mockSnapshot: any = {
      shareId: 'pk_test1234',
      ownerName: 'Trainer Ash',
      binderName: 'My Kanto Holos',
      cards: {
        'SV8a-025': {
          variants: { normal: 0, holo: 1, reverse: 0, promo: 0 },
        },
      },
      stats: {
        totalCards: 1,
        uniqueCards: 1,
        estimatedValueTHB: 500,
        estimatedValueUSD: 14.5,
      },
      settings: {
        showPrices: true,
        showWishlist: true,
        showNotes: false,
      },
      createdAt: '2026-09-08T00:00:00.000Z',
      updatedAt: '2026-09-08T00:00:00.000Z',
    };

    const encoded = encodeSnapshotToUrl(mockSnapshot);
    expect(encoded).toBeTypeOf('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeSnapshotFromUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.shareId).toBe('pk_test1234');
    expect(decoded?.ownerName).toBe('Trainer Ash');
    expect(decoded?.cards['SV8a-025'].variants.holo).toBe(1);
  });

  it('builds a shared collection snapshot with correct stats and filtering', async () => {
    const profile: CollectionProfile = {
      id: 'profile-1',
      name: 'Charizard Vault',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cards: {
        'SV8a-001': {
          cardId: 'SV8a-001',
          variants: { normal: 2, holo: 1, reverse: 0, promo: 0 },
          updatedAt: Date.now(),
          note: 'Secret Note',
        },
        'SV8a-002': {
          cardId: 'SV8a-002',
          variants: { normal: 0, holo: 0, reverse: 0, promo: 0 },
          isWishlist: true,
          updatedAt: Date.now(),
        },
      },
    };

    const { snapshot, shareUrl } = await publishSharedCollection({
      profile,
      settings: {
        showPrices: true,
        showWishlist: false, // omit wishlist-only cards
        showNotes: false,    // omit note
      },
      ownerName: 'Red',
    });

    expect(snapshot.shareId).toMatch(/^pk_/);
    expect(shareUrl).toContain(snapshot.shareId);
    expect(snapshot.ownerName).toBe('Red');
    expect(snapshot.binderName).toBe('Charizard Vault');
    expect(snapshot.stats.totalCards).toBe(3);
    expect(snapshot.stats.uniqueCards).toBe(1);

    // SV8a-002 was wishlist only with 0 count, and showWishlist was false -> omitted
    expect(snapshot.cards['SV8a-002']).toBeUndefined();

    // SV8a-001 had a note, but showNotes was false -> note omitted
    expect(snapshot.cards['SV8a-001'].note).toBeUndefined();
    expect(snapshot.cards['SV8a-001'].variants.normal).toBe(2);
  });
});
