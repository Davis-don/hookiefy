// store/authtokenstore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthTokens = {
  access: string | null;
  refresh: string | null;
};

type AuthState = AuthTokens & {
  setTokens: (tokens: { access: string; refresh: string }) => void;
  clearTokens: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      access: null,
      refresh: null,

      setTokens: ({ access, refresh }) =>
        set(() => ({
          access,
          refresh,
        })),

      clearTokens: () =>
        set(() => ({
          access: null,
          refresh: null,
        })),
    }),
    {
      name: 'auth-storage', // key in localStorage
      partialize: (state) => ({
        access: state.access,
        refresh: state.refresh,
      }),
    }
  )
);