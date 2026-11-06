import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { fetchAllWebUsers, type WebUser } from './userService';
import { fetchAllPlaymatRooms, type PlaymatRoomSummary } from './playmatSyncService';
import defaultStats from '../data/communityStatsDefault.json';

export interface AdminCloudMetrics {
  users: {
    total: number;
    active24h: number;
    active7d: number;
    active30d: number;
    list: WebUser[];
  };
  playmat: {
    totalRooms: number;
    activeRooms: number;
    terminatedRooms: number;
  };
  shares: {
    totalShares: number;
    totalViews: number;
  };
  community: {
    totalUsers: number;
    uniqueCardsOwned: number;
    cardOwners: Record<string, number>;
  };
  fetchedAt: number;
}

const METRICS_CACHE_KEY = 'pokecount_admin_cloud_metrics_cache';
let memoryMetricsCache: AdminCloudMetrics | null = null;

function hasLocalStorage(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.localStorage.getItem === 'function' &&
      typeof window.localStorage.setItem === 'function'
    );
  } catch {
    return false;
  }
}

export function getCachedAdminCloudMetrics(): AdminCloudMetrics | null {
  if (memoryMetricsCache) return memoryMetricsCache;
  if (!hasLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(METRICS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export async function fetchAdminCloudMetrics(): Promise<AdminCloudMetrics> {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Fetch Users
  let usersList: WebUser[] = [];
  try {
    usersList = await fetchAllWebUsers();
  } catch (err) {
    console.warn('Admin metrics: failed to fetch users:', err);
  }

  const active24h = usersList.filter((u) => u.lastLoginAt && now - u.lastLoginAt <= dayMs).length;
  const active7d = usersList.filter((u) => u.lastLoginAt && now - u.lastLoginAt <= 7 * dayMs).length;
  const active30d = usersList.filter((u) => u.lastLoginAt && now - u.lastLoginAt <= 30 * dayMs).length;

  // 2. Fetch Playmat Rooms
  let roomsList: PlaymatRoomSummary[] = [];
  try {
    roomsList = await fetchAllPlaymatRooms();
  } catch (err) {
    console.warn('Admin metrics: failed to fetch playmat rooms:', err);
  }

  const activeRooms = roomsList.filter((r) => !r.isTerminated).length;
  const terminatedRooms = roomsList.filter((r) => r.isTerminated).length;

  // 3. Fetch Shared Collections
  let totalShares = 0;
  let totalViews = 0;
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'shared_collections'));
      totalShares = snap.size;
      snap.forEach((d) => {
        const data = d.data();
        totalViews += Number(data?.viewCount) || 0;
      });
    } catch (err) {
      console.warn('Admin metrics: failed to fetch shared collections:', err);
    }
  }

  // 4. Fetch Community Card Stats
  let communityTotalUsers = defaultStats.totalUsers || 5;
  let communityCardOwners: Record<string, number> = (defaultStats.cardOwners as Record<string, number>) || {};

  if (db) {
    try {
      const docRef = doc(db, 'community_stats', 'ownership');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        communityTotalUsers = data?.totalUsers || communityTotalUsers;
        communityCardOwners = data?.cardOwners || communityCardOwners;
      }
    } catch (err) {
      console.warn('Admin metrics: failed to fetch community stats:', err);
    }
  }

  const metrics: AdminCloudMetrics = {
    users: {
      total: usersList.length,
      active24h,
      active7d,
      active30d,
      list: usersList,
    },
    playmat: {
      totalRooms: roomsList.length,
      activeRooms,
      terminatedRooms,
    },
    shares: {
      totalShares,
      totalViews,
    },
    community: {
      totalUsers: communityTotalUsers,
      uniqueCardsOwned: Object.keys(communityCardOwners).length,
      cardOwners: communityCardOwners,
    },
    fetchedAt: now,
  };

  memoryMetricsCache = metrics;
  if (hasLocalStorage()) {
    try {
      localStorage.setItem(METRICS_CACHE_KEY, JSON.stringify(metrics));
    } catch {}
  }

  return metrics;
}
