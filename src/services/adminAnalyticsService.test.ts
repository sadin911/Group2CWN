import { describe, it, expect } from 'vitest';
import {
  fetchAdminCloudMetrics,
  getCachedAdminCloudMetrics,
} from './adminAnalyticsService';

describe('adminAnalyticsService', () => {
  it('returns valid AdminCloudMetrics structure when fetchAdminCloudMetrics is called', async () => {
    const metrics = await fetchAdminCloudMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.users).toBeDefined();
    expect(typeof metrics.users.total).toBe('number');
    expect(typeof metrics.users.active24h).toBe('number');
    expect(typeof metrics.users.active7d).toBe('number');
    expect(typeof metrics.users.active30d).toBe('number');
    expect(Array.isArray(metrics.users.list)).toBe(true);

    expect(metrics.playmat).toBeDefined();
    expect(typeof metrics.playmat.totalRooms).toBe('number');
    expect(typeof metrics.playmat.activeRooms).toBe('number');
    expect(typeof metrics.playmat.terminatedRooms).toBe('number');

    expect(metrics.shares).toBeDefined();
    expect(typeof metrics.shares.totalShares).toBe('number');
    expect(typeof metrics.shares.totalViews).toBe('number');

    expect(metrics.community).toBeDefined();
    expect(typeof metrics.community.totalUsers).toBe('number');
    expect(typeof metrics.community.uniqueCardsOwned).toBe('number');
    expect(typeof metrics.community.cardOwners).toBe('object');

    expect(typeof metrics.fetchedAt).toBe('number');
  }, 15000);

  it('retrieves cached metrics from localStorage cache', async () => {
    await fetchAdminCloudMetrics();
    const cached = getCachedAdminCloudMetrics();
    expect(cached).not.toBeNull();
    expect(typeof cached?.users.total).toBe('number');
  }, 15000);
});
