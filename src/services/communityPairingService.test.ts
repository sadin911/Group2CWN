import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitCardPairing,
  fetchApprovedPairings,
  fetchAllPairings,
  approveCardPairing,
  rejectCardPairing,
  deleteCardPairing,
} from './communityPairingService';

const mockSetDoc = vi.fn((..._args: any[]) => Promise.resolve());
const mockUpdateDoc = vi.fn((..._args: any[]) => Promise.resolve());
const mockDeleteDoc = vi.fn((..._args: any[]) => Promise.resolve());
let mockDocs: any[] = [];

vi.mock('firebase/firestore', () => ({
  collection: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  doc: (...segments: unknown[]) => ({ id: segments[segments.length - 1], path: segments.slice(1).join('/') }),
  query: (c: any, ..._filters: any[]) => c,
  where: vi.fn(),
  getDocs: vi.fn(async () => ({
    forEach: (cb: (doc: any) => void) => {
      mockDocs.forEach((d) => cb({ id: d.thaiCardId, data: () => d }));
    },
  })),
  setDoc: (ref: any, data: any, options?: any) => mockSetDoc(ref, data, options),
  updateDoc: (ref: any, data: any) => mockUpdateDoc(ref, data),
  deleteDoc: (ref: any) => mockDeleteDoc(ref),
}));

vi.mock('../utils/firebase', () => ({
  db: {},
}));

describe('communityPairingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocs = [];
  });

  it('submits a pending pairing by default', async () => {
    await submitCardPairing({
      thaiCardId: 'TH-sv5-1',
      thaiCardName: 'Pikachu',
      enCardId: 'EN-sv5-1',
      enName: 'Pikachu',
      enSetId: 'sv5',
      enSetName: 'Temporal Forces',
      enNumber: '1',
      enImageUrl: 'https://images.pokemontcg.io/sv5/1.png',
      submittedByUid: 'user-123',
      submittedByEmail: 'user@example.com',
    });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const calls = mockSetDoc.mock.calls as any[];
    const payload = calls[0]?.[1];
    expect(payload.thaiCardId).toBe('TH-sv5-1');
    expect(payload.status).toBe('pending');
    expect(payload.submittedByUid).toBe('user-123');
  });

  it('submits an approved pairing when status is approved (e.g. by admin)', async () => {
    await submitCardPairing({
      thaiCardId: 'TH-sv5-2',
      thaiCardName: 'Raichu',
      enCardId: 'EN-sv5-2',
      enName: 'Raichu',
      enSetId: 'sv5',
      enSetName: 'Temporal Forces',
      enNumber: '2',
      enImageUrl: 'https://images.pokemontcg.io/sv5/2.png',
      submittedByUid: 'admin-123',
      submittedByEmail: 'admin@poke.com',
      status: 'approved',
    });

    const calls = mockSetDoc.mock.calls as any[];
    const payload = calls[0]?.[1];
    expect(payload.status).toBe('approved');
  });

  it('fetches approved pairings and maps to EnCardMapping dictionary', async () => {
    mockDocs = [
      {
        thaiCardId: 'TH-sv5-1',
        thaiCardName: 'Pikachu',
        enCardId: 'EN-sv5-1',
        enName: 'Pikachu',
        enSetId: 'sv5',
        enSetName: 'Temporal Forces',
        enNumber: '1',
        enImageUrl: 'https://images.pokemontcg.io/sv5/1.png',
        status: 'approved',
        reviewedAt: 1700000000000,
      },
    ];

    const result = await fetchApprovedPairings();
    expect(result['TH-sv5-1']).toBeDefined();
    expect(result['TH-sv5-1'].enName).toBe('Pikachu');
    expect(result['TH-sv5-1'].matchMethod).toBe('community_approved');
    expect(result['TH-sv5-1'].confidence).toBe(100);
  });

  it('approves, rejects, and deletes pairings', async () => {
    await approveCardPairing('TH-sv5-1', 'admin@poke.com');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateCalls = mockUpdateDoc.mock.calls as any[];
    expect(updateCalls[0]?.[1]).toMatchObject({
      status: 'approved',
      reviewedBy: 'admin@poke.com',
    });

    await rejectCardPairing('TH-sv5-1', 'admin@poke.com');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    expect(updateCalls[1]?.[1]).toMatchObject({
      status: 'rejected',
      reviewedBy: 'admin@poke.com',
    });

    await deleteCardPairing('TH-sv5-1');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });

  it('fetches all pairings for admin panel', async () => {
    mockDocs = [
      { thaiCardId: 'TH-1', thaiCardName: 'Bulbasaur', submittedAt: 100 },
      { thaiCardId: 'TH-2', thaiCardName: 'Ivysaur', submittedAt: 200 },
    ];

    const list = await fetchAllPairings();
    expect(list).toHaveLength(2);
    // Should be sorted by submittedAt descending
    expect(list[0].thaiCardId).toBe('TH-2');
  });
});
