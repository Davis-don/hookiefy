// hooks/useRedirectIfAuthenticated.ts
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authtokenstore";

const API_URL = import.meta.env.VITE_API_URL 

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
    queryKey: ["auth-check", access],
    queryFn: async () => {
      if (!access) throw new Error("NO_TOKEN");

      let res = await fetch(`${API_URL}/account/auth-check/`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${access}`, // 🔑 token only
        },
      });

      // 🔄 Expired → try refresh once, then retry
      if (res.status === 401 && refresh) {
        const refreshRes = await fetch(`${API_URL}/account/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });

        if (!refreshRes.ok) {
          clearTokens();
          throw new Error("REFRESH_FAILED");
        }

        const { access: newAccess } = await refreshRes.json();
        setTokens({ access: newAccess, refresh });

        res = await fetch(`${API_URL}/account/auth-check/`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${newAccess}`,
          },
        });
      }

      if (!res.ok) throw new Error(`AUTH_${res.status}`);
      return res.json();
    },
    enabled: !!access,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

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

  useEffect(() => {
    if (isError) {
      console.warn("Stored token invalid — clearing");
      clearTokens();
    }
  }, [isError, clearTokens]);

  return { isLoading: !isSuccess && !isError && !!access };
}