// hooks/useRedirectIfAuthenticated.ts
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authtokenstore";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * 🔒 Module-level set of tokens we've already confirmed are dead.
 * Lives OUTSIDE React, OUTSIDE Zustand, OUTSIDE localStorage.
 * Prevents infinite 401 → clearTokens → rehydrate → refetch loops,
 * even if Zustand persist briefly flickers the old token back in.
 */
const deadTokens = new Set<string>();

export const roleHome: Record<string, string> = {
  superadmin: "/superadmin/dashboard",
  admin: "/admin/dashboard",
  user: "/user/dashboard",
};

interface AuthCheckResponse {
  authenticated: boolean;
  user: {
    id: number;
    email: string;
    role: "user" | "admin" | "superadmin";
    full_name?: string;
  };
}

/**
 * If a valid token exists, navigate to the user's role dashboard.
 * Call this on public pages (landing, /signin, /signup).
 */
export function useRedirectIfAuthenticated() {
  const navigate = useNavigate();
  const location = useLocation();
  const { access, refresh, clearTokens, setTokens } = useAuthStore();

  const { data, isSuccess, isError } = useQuery<AuthCheckResponse, Error>({
    // ✅ STABLE key — never key on `access`.
    // Keying on the token creates a new observer on every token change,
    // which is what was driving the infinite fetch loop.
    queryKey: ["auth-check"],

    queryFn: async () => {
      if (!access) throw new Error("NO_TOKEN");

      // 🚫 Short-circuit: if we already know this token is dead, don't even fetch.
      if (deadTokens.has(access)) {
        throw new Error("TOKEN_DEAD");
      }

      // ── Initial auth-check ─────────────────────────────────────────────
      let res = await fetch(`${API_URL}/account/auth-check/`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${access}`, // 🔑 token only
        },
      });

      // ── Expired → try refresh once, then retry ─────────────────────────
      if (res.status === 401 && refresh) {
        const refreshRes = await fetch(`${API_URL}/account/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });

        if (!refreshRes.ok) {
          // Refresh itself failed → mark old token dead + clear store
          deadTokens.add(access);
          clearTokens();
          throw new Error("REFRESH_FAILED");
        }

        const { access: newAccess } = await refreshRes.json();
        setTokens({ access: newAccess, refresh });

        // Retry auth-check with the new access token
        res = await fetch(`${API_URL}/account/auth-check/`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${newAccess}`,
          },
        });

        // ✅ If the retry ALSO 401s → mark the NEW token dead too
        if (!res.ok) {
          deadTokens.add(newAccess);
          clearTokens();
          throw new Error(`AUTH_${res.status}`);
        }

        return res.json();
      }

      // ── Any other non-ok response (401 without refresh, 403, 5xx, …) ───
      // ✅ Mark dead + clear store BEFORE throwing, so the next render sees
      //    access === null and the query stays disabled.
      if (!res.ok) {
        deadTokens.add(access);
        clearTokens();
        throw new Error(`AUTH_${res.status}`);
      }

      return res.json();
    },

    // ✅ Only run if:
    //    - we have a token, AND
    //    - that exact token isn't already blacklisted
    enabled: !!access && !deadTokens.has(access!),

    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,        // ✅ don't refetch on every mount
    refetchOnReconnect: false,    // ✅ don't refetch on network blips
    gcTime: 0,                    // ✅ don't cache failed results
  });

  // ── Redirect if authenticated ─────────────────────────────────────────
  useEffect(() => {
    if (!isSuccess || !data?.authenticated) return;

    const dest = roleHome[data.user.role];
    if (!dest) {
      console.warn(`No dashboard mapped for role "${data.user.role}"`);
      return;
    }

    // Don't redirect if already on that page (avoids loops)
    if (location.pathname === dest) return;

    console.log(`↪️ Authenticated as ${data.user.role} → ${dest}`);
    navigate(dest, { replace: true });
  }, [isSuccess, data, navigate, location.pathname]);

  // ── Belt-and-suspenders: clear on any query error ─────────────────────
  useEffect(() => {
    if (isError && access) {
      deadTokens.add(access);
      clearTokens();
    }
  }, [isError, access, clearTokens]);

  // Loading only if we have a live (non-dead) token and no result yet
  const isLoading =
    !!access && !deadTokens.has(access) && !isSuccess && !isError;

  return { isLoading };
}

export default useRedirectIfAuthenticated;