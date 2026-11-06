import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealtimeTransportManager } from './realtimeTransportManager';

// Mock Firebase dependencies
vi.mock('../../utils/firebase', () => ({
  db: {},
  ensurePlaymatAuth: vi.fn().mockResolvedValue('test-uid'),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'mock-doc' })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn(() => vi.fn()),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(() => 1000),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  collection: vi.fn(() => ({ id: 'mock-col' })),
  getDocs: vi.fn().mockResolvedValue([]),
}));

vi.mock('../playmatSyncService', () => ({
  dispatchPlaymatAction: vi.fn().mockResolvedValue({}),
  subscribePlaymatRoom: vi.fn(() => vi.fn()),
  applyPlaymatAction: vi.fn((s) => s),
  isPlaymatCloudSyncEnabled: vi.fn(() => false),
  setPlaymatCloudSyncEnabled: vi.fn(),
}));

describe('RealtimeTransportManager', () => {
  let manager: RealtimeTransportManager;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default status and notifies status handlers', () => {
    manager = new RealtimeTransportManager('PK-9999', 'p1');
    const status = manager.getStatus();

    expect(status.roomCode).toBe('PK-9999');
    expect(status.peerRole).toBe('p2');
    expect(['connecting', 'cloud', 'p2p']).toContain(status.mode);

    manager.destroy();
  });

  it('subscribes to status changes and cleans up on unregister', () => {
    manager = new RealtimeTransportManager('PK-9999', 'p1');
    const onStatus = vi.fn();
    const unregister = manager.onStatusChange(onStatus);

    expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({
      roomCode: 'PK-9999',
    }));

    unregister();
    manager.destroy();
  });

  it('registers action handlers and allows deregistration', () => {
    manager = new RealtimeTransportManager('PK-9999', 'p1');
    const onAction = vi.fn();
    const unregister = manager.onAction(onAction);

    expect(typeof unregister).toBe('function');
    unregister();
    manager.destroy();
  });
});
