// ProtectedRoute.tsx
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authtokenstore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  
  // ✅ Get auth state from store
  const { access, refresh, clearTokens } = useAuthStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["auth-check", access],
    queryFn: async () => {
      // ✅ Check if we have an access token
      if (!access) {
        throw new Error("No access token found");
      }

      const response = await fetch(`${API_URL}/account/auth-check/`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${access}`, // 🔑 Send token in header
        },
      });

      // ✅ If token is invalid/expired, try to refresh
      if (response.status === 401) {
        try {
          // Attempt to refresh the token
          const refreshResponse = await fetch(`${API_URL}/account/refresh/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: refresh }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            // Update tokens in store
            const { setTokens } = useAuthStore.getState();
            setTokens({
              access: refreshData.access,
              refresh: refresh || "", // Keep the same refresh token
            });
            
            // Retry the original request with new token
            const retryResponse = await fetch(`${API_URL}/account/auth-check/`, {
              method: "GET",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${refreshData.access}`,
              },
            });

            if (!retryResponse.ok) {
              throw new Error(`Auth failed with status: ${retryResponse.status}`);
            }

            return retryResponse.json();
          } else {
            // Refresh failed, clear tokens and redirect to login
            clearTokens();
            navigate("/login");
            throw new Error("Session expired. Please login again.");
          }
        } catch (refreshError) {
          clearTokens();
          navigate("/login");
          throw refreshError;
        }
      }

      if (!response.ok) {
        throw new Error(`Auth failed with status: ${response.status}`);
      }

      return response.json();
    },
    retry: false,
    enabled: !!access, // ✅ Only run query if we have an access token
  });

  // ✅ Check role-based access
  useEffect(() => {
    if (data?.user && allowedRoles) {
      const userRole = data.user.role;
      if (!allowedRoles.includes(userRole)) {
        console.warn(`User role "${userRole}" not allowed. Required: ${allowedRoles.join(", ")}`);
        navigate("/unauthorized");
      }
    }
  }, [data, allowedRoles, navigate]);

  // ✅ Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && (isError || !data?.authenticated)) {
      navigate("/login");
    }
  }, [isLoading, isError, data, navigate]);

  // ✅ Log success data
  useEffect(() => {
    if (data) {
      console.log("✅ Auth check successful:", data);
    }
  }, [data]);

  // ❌ Log errors
  useEffect(() => {
    if (isError) {
      console.error("❌ ERROR FETCHING AUTH:", error);
    }
  }, [isError, error]);

  // ✅ Show loading state
  if (isLoading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh" 
      }}>
        <p>⏳ Loading authentication status...</p>
      </div>
    );
  }

  // ✅ If not authenticated, return null (will redirect via useEffect)
  if (isError || !data?.authenticated) {
    return null;
  }

  // ✅ Check role-based access
  if (allowedRoles && data?.user) {
    const userRole = data.user.role;
    if (!allowedRoles.includes(userRole)) {
      return null; // Will redirect via useEffect
    }
  }

  return (
    <div className="overall-protected-route">
      {children}
    </div>
  );
}

export default ProtectedRoute;