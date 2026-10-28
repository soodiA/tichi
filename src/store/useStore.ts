import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '../db/db';
import type { UserProfile, LessonSession } from '../types';

interface AppState {
  currentUser: UserProfile | null;
  currentSession: LessonSession | null;
  setCurrentUser: (user: UserProfile | null) => void;
  setCurrentSession: (session: LessonSession | null) => void;
  addDiamonds: (amount: number) => void;
  incrementStreak: () => void;
  updateAvatar: (avatarUrl: string) => void;
  /** Spend coins to keep the streak across missed days; returns false if coins are insufficient. */
  restoreStreak: (cost: number) => boolean;
  resetStreak: () => void;
}

export const STREAK_COST_PER_DAY = 40;

// Local calendar date, matching incrementStreak.
const dayString = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Whole days skipped between lastActiveDate and today (0 if active today or yesterday). */
export function missedDays(lastActiveDate?: string): number {
  if (!lastActiveDate) return 0;
  const diff = Math.round((Date.parse(dayString(new Date())) - Date.parse(lastActiveDate)) / 86400000);
  return Math.max(0, diff - 1);
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
        db.profiles.update(user.id, { avatarUrl }).catch(() => {});
      },

      restoreStreak: (cost) => {
        const user = get().currentUser;
        if (!user || user.diamonds < cost) return false;
        // Pretend the user was active yesterday so the next lesson continues the streak.
        set({ currentUser: { ...user, diamonds: user.diamonds - cost, lastActiveDate: dayString(new Date(Date.now() - 86400000)) } });
        return true;
      },

      resetStreak: () => {
        const user = get().currentUser;
        if (!user) return;
        set({ currentUser: { ...user, streakDays: 0 } });
      },

      incrementStreak: () => {
        const user = get().currentUser;
        if (!user) return;
        const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const today = ymd(new Date());
        if (user.lastActiveDate === today) return;
        const yesterday = ymd(new Date(Date.now() - 86400000));
        const newStreak = user.lastActiveDate === yesterday ? user.streakDays + 1 : 1;
        set({ currentUser: { ...user, streakDays: newStreak, lastActiveDate: today } });
      },
    }),
    { name: 'tichi-store' }
  )
);
