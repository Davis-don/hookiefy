import type { ReactElement, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Spinner from "./protectedspinner/Spinner";
import './protected.css'

interface ProtectedRouteProps {
  children: ReactNode;
}

interface AuthResponse {
  authenticated: boolean;
  redirect_to?: string;
  user?: {
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

export default function ProtectedRoute({ children }: ProtectedRouteProps): ReactElement {
  const apiUrl = import.meta.env.VITE_API_URL;

  const { status, data } = useQuery<AuthResponse>({
    queryKey: ['authCheck'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/accounts/check-auth/`, {
        method: "GET",
        credentials: "include", // This sends the JWT cookies
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          return { authenticated: false };
        }
        throw new Error('Authentication check failed');
      }

      const data = await response.json();
      
      return { 
        authenticated: data.authenticated || false,
        redirect_to: data.redirect_to,
        user: data.user
      };
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (status === 'pending') {
    return (
      <div className="protected-route-loading">
        <Spinner 
          size="large" 
          color="#1a202c" 
          message="Verifying authentication..." 
        />
      </div>
    );
  }

  if (status === 'error' || !data?.authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (data.redirect_to && window.location.pathname !== data.redirect_to) {
    return <Navigate to={data.redirect_to} replace />;
  }

  return <>{children}</>;
}