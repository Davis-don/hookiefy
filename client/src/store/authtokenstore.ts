// store/authtokenstore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// TYPES
// ============================================================

export type AuthUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string | null;
  gender: string | null;
  role: string; // "superadmin" | "serviceprovider" | "serviceseeker"
  profile_image_url: string | null;
  has_profile_image: boolean;
  auth_provider: string;
};

type AuthTokens = {
  access: string | null;
  refresh: string | null;
  user: AuthUser | null;
};

type AuthState = AuthTokens & {
  setTokens: (tokens: {
    access: string;
    refresh: string;
    user?: AuthUser;
  }) => void;
  setUser: (user: AuthUser) => void;
  clearTokens: () => void;
};

// ============================================================
// STORE
// ============================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      access: null,
      refresh: null,
      user: null,

      /**
       * Set tokens (and optionally user).
       * If `user` is omitted, the existing user is preserved.
       */
      setTokens: ({ access, refresh, user }) =>
        set((prev) => ({
          access,
          refresh,
          user: user ?? prev.user,
        })),

      /**
       * Update only the user (useful after profile edits).
       */
      setUser: (user) =>
        set(() => ({
          user,
        })),

      /**
       * Wipe everything — tokens and user.
       */
      clearTokens: () =>
        set(() => ({
          access: null,
          refresh: null,
          user: null,
        })),
    }),
    {
      name: 'auth-storage', // key in localStorage
      partialize: (state) => ({
        access: state.access,
        refresh: state.refresh,
        user: state.user,
      }),
    }
  )
);