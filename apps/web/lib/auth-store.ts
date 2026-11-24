'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  username: string;
  role: 'dn' | 'htx';
  dn_id: string;
  display_name: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'openpaddy-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
