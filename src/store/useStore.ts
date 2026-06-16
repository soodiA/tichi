import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, LessonSession } from '../types';

interface AppState {
  currentUser: UserProfile | null;
  currentSession: LessonSession | null;
  setCurrentUser: (user: UserProfile | null) => void;
  setCurrentSession: (session: LessonSession | null) => void;
  addDiamonds: (amount: number) => void;
  incrementStreak: () => void;
  updateAvatar: (avatarUrl: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      currentSession: null,

      setCurrentUser: (user) => set({ currentUser: user }),
      setCurrentSession: (session) => set({ currentSession: session }),

      addDiamonds: (amount) => {
        const user = get().currentUser;
        if (!user) return;
        set({ currentUser: { ...user, diamonds: user.diamonds + amount, totalScore: user.totalScore + amount } });
      },

      updateAvatar: (avatarUrl) => {
        const user = get().currentUser;
        if (!user) return;
        set({ currentUser: { ...user, avatarUrl } });
      },

      incrementStreak: () => {
        const user = get().currentUser;
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];
        if (user.lastActiveDate === today) return;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const newStreak = user.lastActiveDate === yesterday ? user.streakDays + 1 : 1;
        set({ currentUser: { ...user, streakDays: newStreak, lastActiveDate: today } });
      },
    }),
    { name: 'tichi-store' }
  )
);
