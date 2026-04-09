import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthReady: boolean;
  setAuthReady: (ready: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pinUnlocked: boolean;
  setPinUnlocked: (unlocked: boolean) => void;
  viewPostId: string | null;
  setViewPostId: (id: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isAuthReady: false,
  setAuthReady: (ready) => set({ isAuthReady: ready }),
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  pinUnlocked: false,
  setPinUnlocked: (unlocked) => set({ pinUnlocked: unlocked }),
  viewPostId: null,
  setViewPostId: (id) => set({ viewPostId: id }),
}));
