import { create } from 'zustand';
import {
  type PlaymatAllowedUser,
  fetchPlaymatAllowedUsers,
  savePlaymatAllowedUsers,
  getLocalAllowedUsers,
  getLocalTesterKey,
  setLocalTesterKey,
  checkHasPlaymatAccess,
} from '../services/playmatAccessService';
import { useAuthStore } from './authStore';

interface PlaymatAccessState {
  allowedUsers: PlaymatAllowedUser[];
  testerKey: string;
  loading: boolean;
  error: string | null;

  // Actions
  init: () => Promise<void>;
  setTesterKey: (key: string) => void;
  addAllowedUser: (
    identifier: string,
    note?: string,
    extra?: { email?: string; uid?: string }
  ) => Promise<boolean>;
  removeAllowedUser: (idOrIdentifier: string, extraUid?: string) => Promise<boolean>;
  hasAccess: () => boolean;
}

export const usePlaymatAccessStore = create<PlaymatAccessState>((set, get) => ({
  allowedUsers: getLocalAllowedUsers(),
  testerKey: getLocalTesterKey(),
  loading: false,
  error: null,

  init: async () => {
    set({ loading: true });
    try {
      const users = await fetchPlaymatAllowedUsers();
      set({ allowedUsers: users, loading: false, error: null });
    } catch (err: any) {
      set({ loading: false, error: err?.message || 'Failed to load allowed users' });
    }
  },

  setTesterKey: (key: string) => {
    setLocalTesterKey(key);
    set({ testerKey: key });
  },

  addAllowedUser: async (
    identifier: string,
    note?: string,
    extra?: { email?: string; uid?: string }
  ) => {
    const cleanIdent = identifier.trim().toLowerCase();
    if (!cleanIdent) return false;

    const currentUsers = get().allowedUsers;
    const cleanEmail = extra?.email?.trim().toLowerCase();
    const cleanUid = extra?.uid?.trim();

    // Check duplicate against identifier, email, or uid
    const isDuplicate = currentUsers.some((u) => {
      const uIdent = u.identifier.trim().toLowerCase();
      const uEmail = u.email?.trim().toLowerCase();
      const uUid = u.uid?.trim().toLowerCase();

      if (uIdent === cleanIdent) return true;
      if (cleanEmail && (uIdent === cleanEmail || uEmail === cleanEmail)) return true;
      if (cleanUid && (uIdent === cleanUid.toLowerCase() || uUid === cleanUid.toLowerCase())) return true;
      return false;
    });

    if (isDuplicate) {
      return false;
    }

    const currentUser = useAuthStore.getState().user;
    const newEntry: PlaymatAllowedUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      identifier: cleanIdent,
      email: cleanEmail,
      uid: cleanUid,
      note: note?.trim() || undefined,
      addedAt: Date.now(),
      addedBy: currentUser?.email || 'admin',
    };

    const nextList = [newEntry, ...currentUsers];
    set({ allowedUsers: nextList });
    await savePlaymatAllowedUsers(nextList);
    return true;
  },

  removeAllowedUser: async (idOrIdentifier: string, extraUid?: string) => {
    const currentUsers = get().allowedUsers;
    const targetKey = idOrIdentifier.trim().toLowerCase();
    const targetUid = extraUid?.trim().toLowerCase();

    const nextList = currentUsers.filter((u) => {
      const uId = u.id.toLowerCase();
      const uIdent = u.identifier.trim().toLowerCase();
      const uEmail = u.email?.trim().toLowerCase();
      const uUid = u.uid?.trim().toLowerCase();

      if (uId === targetKey || uIdent === targetKey) return false;
      if (uEmail && uEmail === targetKey) return false;
      if (uUid && (uUid === targetKey || (targetUid && uUid === targetUid))) return false;
      return true;
    });

    set({ allowedUsers: nextList });
    await savePlaymatAllowedUsers(nextList);
    return true;
  },

  hasAccess: () => {
    const user = useAuthStore.getState().user;
    const allowed = get().allowedUsers;
    const key = get().testerKey;
    return checkHasPlaymatAccess(user, allowed, key);
  },
}));

/**
 * Fully reactive hook that re-renders components whenever user, allowedUsers,
 * or testerKey changes!
 */
export function useHasPlaymatAccess(): boolean {
  const user = useAuthStore((s) => s.user);
  const allowedUsers = usePlaymatAccessStore((s) => s.allowedUsers);
  const testerKey = usePlaymatAccessStore((s) => s.testerKey);
  return checkHasPlaymatAccess(user, allowedUsers, testerKey);
}

