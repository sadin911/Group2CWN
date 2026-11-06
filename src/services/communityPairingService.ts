import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import type { EnCardMapping } from '../utils/thaiEnglishCardMatcher';

export interface CommunityCardPairing {
  thaiCardId: string;
  thaiCardName: string;
  thaiSetId?: string;
  thaiSetName?: string;
  thaiNumber?: string;
  thaiImageUrl?: string;

  enCardId: string;
  enName: string;
  enSetId: string;
  enSetName: string;
  enNumber: string;
  enImageUrl: string;
  enOfficialImageUrl?: string;

  status: 'pending' | 'approved' | 'rejected';
  submittedByUid: string;
  submittedByEmail?: string;
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  notes?: string;
}

const COLLECTION_NAME = 'community_card_pairings';

/**
 * Submit a community pairing suggestion.
 * If submitted by an admin, it can be marked as 'approved' directly.
 */
export async function submitCardPairing(
  data: Omit<CommunityCardPairing, 'status' | 'submittedAt'> & { status?: 'pending' | 'approved' }
): Promise<void> {
  if (!data.thaiCardId || !data.enCardId) {
    throw new Error('thaiCardId and enCardId are required');
  }

  const safeDocId = data.thaiCardId.trim();
  const docRef = doc(db, COLLECTION_NAME, safeDocId);

  const payload: CommunityCardPairing = {
    ...data,
    thaiCardId: safeDocId,
    status: data.status || 'pending',
    submittedAt: Date.now(),
  };

  await setDoc(docRef, payload, { merge: true });
}

/**
 * Fetch all approved pairings to merge into the runtime matcher.
 * Returns a dictionary of [thaiCardId]: EnCardMapping.
 */
export async function fetchApprovedPairings(): Promise<Record<string, EnCardMapping>> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('status', '==', 'approved'));
    const snapshot = await getDocs(q);
    const result: Record<string, EnCardMapping> = {};

    snapshot.forEach((d) => {
      const data = d.data() as CommunityCardPairing;
      if (data && data.thaiCardId && data.enCardId) {
        result[data.thaiCardId] = {
          enCardId: data.enCardId,
          enName: data.enName,
          enSetId: data.enSetId,
          enSetName: data.enSetName,
          enNumber: data.enNumber,
          enImageUrl: data.enImageUrl,
          enOfficialImageUrl: data.enOfficialImageUrl,
          confidence: 100,
          matchMethod: 'community_approved',
          verified: true,
          matchedAt: data.reviewedAt
            ? new Date(data.reviewedAt).toISOString()
            : new Date().toISOString(),
          userOverridden: false,
        };
      }
    });

    return result;
  } catch (err) {
    console.warn('Could not fetch approved pairings from Firestore:', err);
    return {};
  }
}

/**
 * Fetch all pairings for the Admin Panel (pending, approved, rejected).
 */
export async function fetchAllPairings(): Promise<CommunityCardPairing[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    const list: CommunityCardPairing[] = [];

    snapshot.forEach((d) => {
      const data = d.data() as CommunityCardPairing;
      if (data && data.thaiCardId) {
        list.push(data);
      }
    });

    return list.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  } catch (err) {
    console.warn('Could not fetch pairings list for Admin:', err);
    return [];
  }
}

/**
 * Approve a pending pairing so it becomes active for all users globally.
 */
export async function approveCardPairing(thaiCardId: string, reviewerEmail: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, thaiCardId.trim());
  await updateDoc(docRef, {
    status: 'approved',
    reviewedAt: Date.now(),
    reviewedBy: reviewerEmail,
  });
}

/**
 * Reject a pending pairing.
 */
export async function rejectCardPairing(
  thaiCardId: string,
  reviewerEmail: string,
  notes?: string
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, thaiCardId.trim());
  await updateDoc(docRef, {
    status: 'rejected',
    reviewedAt: Date.now(),
    reviewedBy: reviewerEmail,
    ...(notes ? { notes } : {}),
  });
}

/**
 * Delete a pairing record completely.
 */
export async function deleteCardPairing(thaiCardId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, thaiCardId.trim());
  await deleteDoc(docRef);
}
