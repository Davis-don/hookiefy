// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  auth_provider: string;
  phone_number?: string;
  gender?: string;
  profile_image_url?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  access: string | null;
  refresh: string | null;

  setAuth: (payload: {
    user: AuthUser;
    access: string;
    refresh: string;
  }) => void;

  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access: null,
      refresh: null,

      setAuth: ({ user, access, refresh }) =>
        set({ user, access, refresh }),

      clearAuth: () =>
        set({ user: null, access: null, refresh: null }),
    }),
    {
      name: 'yp-auth', // localStorage key
    }
  )
);