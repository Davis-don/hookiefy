// ProtectedRoute.tsx
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authtokenstore";
import Spinner from "../Publicspinner/Spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

interface AuthCheckResponse {
  authenticated: boolean;
  user: {
    id: number;
    email: string;
    role: string; // "user" | "admin" | "superadmin"
    first_name?: string;
    last_name?: string;
    full_name?: string;
    profile_image_url?: string | null;
    has_profile_image?: boolean;
  };
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_URL;

  // ✅ Only tokens matter
  const { access, refresh, clearTokens, setTokens } = useAuthStore();

  const { data, isLoading, isError, error } = useQuery<AuthCheckResponse, Error>({
    queryKey: ["auth-check", access],
    queryFn: async () => {
      if (!access) throw new Error("No access token found");

      // 🔑 Only the token is sent
      let response = await fetch(`${API_URL}/account/auth-check/`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${access}`,
        },
      });

      // 🔄 Expired → refresh once → retry
      if (response.status === 401 && refresh) {
        const refreshResponse = await fetch(`${API_URL}/account/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });

        if (!refreshResponse.ok) {
          clearTokens();
          throw new Error("Session expired. Please login again.");
        }

        const refreshData = await refreshResponse.json();
        setTokens({ access: refreshData.access, refresh });

        response = await fetch(`${API_URL}/account/auth-check/`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${refreshData.access}`,
          },
        });
      }

      if (!response.ok) {
        throw new Error(`Auth failed with status: ${response.status}`);
      }

      return response.json();
    },
    retry: false,
    enabled: !!access,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // 🔀 Single redirect effect — no races
  useEffect(() => {
    if (isLoading) return;

    // No token → signin (remember where they wanted to go)
    if (!access) {
      navigate("/signin", {
        replace: true,
        state: { from: location.pathname },
      });
      return;
    }

    // Auth failed / refresh failed
    if (isError) {
      console.error("❌ Auth check failed:", error?.message);
      clearTokens();
      navigate("/signin", {
        replace: true,
        state: { from: location.pathname },
      });
      return;
    }

    // Not authenticated
    if (data && !data.authenticated) {
      clearTokens();
      navigate("/signin", {
        replace: true,
        state: { from: location.pathname },
      });
      return;
    }

    // Wrong role
    if (data?.user && allowedRoles && !allowedRoles.includes(data.user.role)) {
      console.warn(
        `Role "${data.user.role}" not allowed. Required: ${allowedRoles.join(", ")}`
      );
      navigate("/unauthorized", { replace: true });
    }
  }, [
    isLoading,
    isError,
    error,
    access,
    data,
    allowedRoles,
    navigate,
    clearTokens,
    location.pathname,
  ]);

  // 📝 Log role on success
  useEffect(() => {
    if (data?.user) {
      console.log("✅ Auth check successful — role:", data.user.role);
    }
  }, [data]);

  // ⏳ Loading
  if (isLoading) {
    return (
      <Spinner
        message="Checking authentication"
        slowMessage="Almost there — verifying your session…"
        slowAfter={4000}
      />
    );
  }

  // 🚫 Failures → return null (redirect effect handles nav)
  if (isError || !data?.authenticated) return null;

  // 🚫 Wrong role
  if (allowedRoles && data.user && !allowedRoles.includes(data.user.role)) {
    return null;
  }

  // ✅ Authenticated (+ role OK)
  return <div className="overall-protected-route">{children}</div>;
}

export default ProtectedRoute;