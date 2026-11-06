import { create } from 'zustand';
import { onAuthStateChanged, deleteUser, type User } from 'firebase/auth';
import { auth, signInWithGoogle, logOut } from '../utils/firebase';
import { useCollectionStore } from './collectionStore';
import { useDeckStore } from './deckStore';
import { syncUserProfile, deleteUserCloudData } from '../services/userService';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<User | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Setup persistent auth state listener
  onAuthStateChanged(auth, (user) => {
    set({ user, loading: false, error: null });
    if (user) {
      syncUserProfile(user).catch(console.warn);
      useDeckStore.getState().loadUserDecksFromCloud(user.uid).catch(console.warn);
    } else {
      useCollectionStore.getState().resetToGuest();
      useDeckStore.getState().resetToGuestDecks();
    }
  });

  return {
    user: null,
    loading: true,
    error: null,

    signIn: async () => {
      set({ loading: true, error: null });
      try {
        const user = await signInWithGoogle();
        set({ user, loading: false });
        return user;
      } catch (err: any) {
        set({ loading: false, error: err?.message || 'Login failed' });
        return null;
      }
    },

    signOut: async () => {
      set({ loading: true });
      try {
        await logOut();
        set({ user: null, loading: false, error: null });
      } catch (err: any) {
        set({ loading: false, error: err?.message || 'Logout failed' });
      }
    },

    deleteAccount: async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return false;
      const uid = currentUser.uid;
      set({ loading: true, error: null });

      try {
        // 1. Delete all Firestore data for this user
        await deleteUserCloudData(uid);

        // 2. Clear user-scoped local storage keys
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(`pokecount_user_${uid}`);
            localStorage.removeItem(`pokecount_user_decks_${uid}`);
            localStorage.removeItem(`pokecount_deleted_binders_${uid}`);
          }
        } catch {}

        // 3. Delete Firebase Auth user credentials
        try {
          await deleteUser(currentUser);
        } catch (authErr) {
          console.warn('Firebase deleteUser error (signing out instead):', authErr);
          await logOut();
        }

        // 4. Reset in-memory stores to guest mode
        useCollectionStore.getState().resetToGuest();
        useDeckStore.getState().resetToGuestDecks();
        set({ user: null, loading: false, error: null });
        return true;
      } catch (err: any) {
        console.error('Delete account error:', err);
        set({ loading: false, error: err?.message || 'Delete account failed' });
        return false;
      }
    },

    clearError: () => set({ error: null }),
  };
});
