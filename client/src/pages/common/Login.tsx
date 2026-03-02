import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import './login.css';
import image1 from '../../assets/images/stefzn-pFW7o43y-FM-unsplash.jpg';
import Loginform from '../../components/login/Loginform';
import Spinner from '../../components/protected/protectedspinner/Spinner';

interface AuthCheckResponse {
  authenticated: boolean;
  redirect_to?: string;
  user?: {
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

const GlitterRain = () => {
  return (
    <div className="glitter-rain">
      <i></i><i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i><i></i>
    </div>
  );
};

const Logo = () => {
  return (
    <div className="login-logo">
      <div className="overall-login-logo-container">
        <h2 className="logo-name">Hookify</h2>
        <h3 className="logo-tagline">Find your perfect match</h3>
      </div>
    </div>
  );
};

function Login() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Check if user is already authenticated
  const { data, isLoading } = useQuery<AuthCheckResponse>({
    queryKey: ['loginPageAuthCheck'],
    queryFn: async () => {
      try {
        const response = await fetch(`${apiUrl}/accounts/check-auth/`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          // If 401 or 403, user is not authenticated
          if (response.status === 401 || response.status === 403) {
            return { authenticated: false };
          }
          throw new Error('Auth check failed');
        }

        const data = await response.json();
        return {
          authenticated: data.authenticated || false,
          redirect_to: data.redirect_to,
          user: data.user
        };
      } catch (err) {
        console.error('Auth check error:', err);
        return { authenticated: false };
      }
    },
    retry: 1,
    staleTime: 0, // Always check on mount
    refetchOnWindowFocus: false,
  });

  // Handle authentication check completion
  useEffect(() => {
    if (!isLoading) {
      setCheckingAuth(false);
    }
  }, [isLoading]);

  // Redirect if already authenticated
  useEffect(() => {
    if (data?.authenticated && data.redirect_to) {
      console.log('User already authenticated, redirecting to:', data.redirect_to);
      
      // Show a brief message before redirect
      const redirectTimer = setTimeout(() => {
        navigate(data.redirect_to!, { replace: true });
      }, 1500); // 1.5 second delay to show the message

      return () => clearTimeout(redirectTimer);
    }
  }, [data, navigate]);

  // Show loading while checking authentication
  if (checkingAuth || isLoading) {
    return (
      <div className="overall-login-page-container">
        <GlitterRain />
        <div className="left-side-login-page-container">
          <img src={image1} alt="Romantic moment" />
        </div>
        <div className="right-side-login-page-container">
          <Logo />
          <div className="login-checking-container">
            <Spinner 
              size="large" 
              color="#c41e3a" 
              message="Checking authentication..." 
            />
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, show redirect message
  if (data?.authenticated) {
    return (
      <div className="overall-login-page-container">
        <GlitterRain />
        <div className="left-side-login-page-container">
          <img src={image1} alt="Romantic moment" />
        </div>
        <div className="right-side-login-page-container">
          <Logo />
          <div className="login-redirect-container">
            <div className="redirect-card">
              <div className="redirect-hearts">
                <span>❤️</span>
                <span>💖</span>
                <span>💕</span>
              </div>
              <h3>Already Logged In!</h3>
              <p>You are already authenticated. Redirecting to your dashboard...</p>
              <div className="redirect-progress-bar">
                <div className="redirect-progress-fill"></div>
              </div>
              <div className="redirect-user-info">
                <p>Welcome back, {data.user?.first_name || 'User'}!</p>
                <p className="redirect-role">{data.user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If there's an error or not authenticated, show login form
  return (
    <div className="overall-login-page-container">
      <GlitterRain />
      <div className="left-side-login-page-container">
        <img src={image1} alt="Romantic moment" />
      </div>
      <div className="right-side-login-page-container">
        <Logo />
        {isSubmitting ? (
          <div className="login-spinner-container">
            <Spinner 
              size="large" 
              color="#c41e3a" 
              message="Signing you in..." 
            />
          </div>
        ) : (
          <Loginform onSubmittingChange={setIsSubmitting} />
        )}
      </div>
    </div>
  );
}

export default Login;