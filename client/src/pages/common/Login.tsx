import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import './login.css';
import {  Lock, Mail, Eye, EyeOff, ArrowRight, Shield, CheckCircle, Unlock, ArrowLeft } from 'lucide-react';

// Animated Phone Component (writing and deleting messages)
const AnimatedPhone = () => {
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [typingIndex, setTypingIndex] = useState(0);
  
  const messages = [
    "Hey... you free tonight? 🔥",
    "I wanna hook up with you 💕",
    "Let's meet up 😉",
    "Your place or mine? ✨",
    "Can't stop thinking about you 💘"
  ];
  
  useEffect(() => {
    const currentFullMessage = messages[messageIndex];
    
    if (!isDeleting && typingIndex < currentFullMessage.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + currentFullMessage[typingIndex]);
        setTypingIndex(prev => prev + 1);
      }, 80);
      return () => clearTimeout(timer);
    } else if (!isDeleting && typingIndex === currentFullMessage.length) {
      const timer = setTimeout(() => {
        setIsDeleting(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (isDeleting && typingIndex > 0) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev.slice(0, -1));
        setTypingIndex(prev => prev - 1);
      }, 40);
      return () => clearTimeout(timer);
    } else if (isDeleting && typingIndex === 0) {
      setIsDeleting(false);
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }
  }, [isDeleting, typingIndex, messageIndex, messages]);

  return (
    <div className="hookify-login-animated-phone">
      <div className="hookify-login-phone-frame">
        <div className="hookify-login-phone-notch"></div>
        <div className="hookify-login-phone-screen">
          <div className="hookify-login-phone-status">
            <span className="hookify-login-phone-time">9:41</span>
            <div className="hookify-login-phone-battery">
              <span>📶</span>
              <span>🔋</span>
            </div>
          </div>
          
          <div className="hookify-login-phone-chat-header">
            <div className="hookify-login-chat-avatar">💕</div>
            <div className="hookify-login-chat-info">
              <h4>Hookify Match</h4>
              <span>Online · Typing...</span>
            </div>
          </div>
          
          <div className="hookify-login-phone-chat-messages">
            <div className="hookify-login-chat-bubble received">
              <p>Hey there! Ready for an adventure?</p>
              <span>9:41 PM</span>
            </div>
            
            <div className="hookify-login-chat-bubble sent">
              <p>
                {displayedText || "..."}
                <span className="hookify-login-typing-cursor">|</span>
              </p>
              <span>Just now</span>
            </div>
          </div>
          
          <div className="hookify-login-phone-chat-input">
            <div className="hookify-login-input-field">
              <span>Type a message...</span>
            </div>
            <div className="hookify-login-send-btn">➤</div>
          </div>
        </div>
        <div className="hookify-login-phone-home"></div>
      </div>
      
      <div className="hookify-login-phone-notification">
        <div className="hookify-login-notif-icon">🔔</div>
        <div className="hookify-login-notif-text">
          <strong>New match!</strong>
          <span>Someone wants to connect</span>
        </div>
      </div>
    </div>
  );
};

// Animated Padlocks Component
const AnimatedPadlocks = () => {
  return (
    <div className="hookify-login-padlocks">
      <div className="hookify-login-padlock padlock-1">
        <Lock size={36} />
        <div className="padlock-shine"></div>
      </div>
      <div className="hookify-login-padlock padlock-2">
        <Lock size={28} />
        <div className="padlock-shine"></div>
      </div>
      <div className="hookify-login-padlock padlock-3">
        <Unlock size={40} />
        <div className="padlock-shine"></div>
      </div>
      <div className="hookify-login-padlock padlock-4">
        <Lock size={24} />
        <div className="padlock-shine"></div>
      </div>
      <div className="hookify-login-padlock padlock-5">
        <Shield size={32} />
        <div className="padlock-shine"></div>
      </div>
      <div className="hookify-login-padlock padlock-6">
        <Lock size={20} />
        <div className="padlock-shine"></div>
      </div>
    </div>
  );
};

// Security Badges Component
const SecurityBadges = () => {
  return (
    <div className="hookify-login-security-badges">
      <div className="hookify-login-badge">
        <CheckCircle size={16} />
        <span>End-to-End Encrypted</span>
      </div>
      <div className="hookify-login-badge">
        <CheckCircle size={16} />
        <span>Verified Profiles Only</span>
      </div>
      <div className="hookify-login-badge">
        <CheckCircle size={16} />
        <span>Private & Confidential</span>
      </div>
      <div className="hookify-login-badge">
        <Shield size={16} />
        <span>24/7 Security Monitoring</span>
      </div>
    </div>
  );
};

// Floating Hearts Animation
const FloatingHearts = () => {
  return (
    <div className="hookify-login-floating-hearts">
      <div className="hookify-login-heart heart-1">💕</div>
      <div className="hookify-login-heart heart-2">💖</div>
      <div className="hookify-login-heart heart-3">💘</div>
      <div className="hookify-login-heart heart-4">💗</div>
      <div className="hookify-login-heart heart-5">💓</div>
      <div className="hookify-login-heart heart-6">✨</div>
      <div className="hookify-login-heart heart-7">💫</div>
    </div>
  );
};

// Logo Component
const Logo = () => {
  return (
    <div className="hookify-login-logo">
      <div className="hookify-login-logo-icon">💕</div>
      <h1 className="hookify-login-logo-name">Hookify</h1>
      <p className="hookify-login-logo-tagline">Find your perfect match</p>
    </div>
  );
};

// Back Button Component
const BackButton = () => {
  const navigate = useNavigate();
  return (
    <button className="hookify-login-back-btn" onClick={() => navigate('/')}>
      <ArrowLeft size={20} />
      <span>Back to Home</span>
    </button>
  );
};

// Login Form Component
const LoginForm = ({ onSubmittingChange, onSubmit }: { onSubmittingChange: (val: boolean) => void; onSubmit: (email: string, password: string) => Promise<void> }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    onSubmittingChange(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError('Invalid email or password');
      onSubmittingChange(false);
    }
  };

  return (
    <form className="hookify-login-form" onSubmit={handleSubmit}>
      <div className="hookify-login-form-header">
        <h2>Welcome Back</h2>
        <p>Sign in to continue your journey</p>
      </div>
      
      {error && (
        <div className="hookify-login-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      
      <div className="hookify-login-input-group">
        <div className="hookify-login-input-icon">
          <Mail size={24} />
        </div>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="hookify-login-input"
        />
      </div>
      
      <div className="hookify-login-input-group">
        <div className="hookify-login-input-icon">
          <Lock size={24} />
        </div>
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="hookify-login-input"
        />
        <button 
          type="button"
          className="hookify-login-password-toggle"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      
      <button type="submit" className="hookify-login-submit">
        <span>Sign In</span>
        <ArrowRight size={20} />
      </button>
      
      <div className="hookify-login-footer">
        <p className="hookify-login-note">🔒 Only invited members can join</p>
      </div>
    </form>
  );
};

// Redirect Component
const RedirectMessage = ({ user }: { user?: { first_name?: string; role?: string } }) => {
  return (
    <div className="hookify-login-redirect-card">
      <div className="hookify-login-redirect-hearts">
        <span>💕</span>
        <span>💖</span>
        <span>💘</span>
        <span>💗</span>
      </div>
      <h3>Already Logged In!</h3>
      <p>You are already authenticated. Redirecting to your dashboard...</p>
      <div className="hookify-login-redirect-progress">
        <div className="hookify-login-redirect-progress-bar"></div>
      </div>
      {user && (
        <div className="hookify-login-redirect-user">
          <p>Welcome back, <strong>{user.first_name || 'User'}</strong>!</p>
          <span className="hookify-login-redirect-role">{user.role}</span>
        </div>
      )}
    </div>
  );
};

// Main Login Component
function Login() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  const { data, isLoading } = useQuery({
    queryKey: ['loginPageAuthCheck'],
    queryFn: async () => {
      try {
        const response = await fetch(`${apiUrl}/accounts/check-auth/`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
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
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isLoading) {
      setCheckingAuth(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (data?.authenticated && data.redirect_to) {
      const redirectTimer = setTimeout(() => {
        navigate(data.redirect_to!, { replace: true });
      }, 1500);
      return () => clearTimeout(redirectTimer);
    }
  }, [data, navigate]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await fetch(`${apiUrl}/accounts/login/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      if (data.redirect_to) {
        navigate(data.redirect_to);
      } else {
        navigate('/');
      }
    } catch (error) {
      throw error;
    }
  };

  if (checkingAuth || isLoading) {
    return (
      <div className="hookify-login-page">
        <FloatingHearts />
        <AnimatedPadlocks />
        <SecurityBadges />
        <div className="hookify-login-grid">
          <div className="hookify-login-left">
            <AnimatedPhone />
          </div>
          <div className="hookify-login-right">
            <BackButton />
            <Logo />
            <div className="hookify-login-spinner-container">
              <div className="hookify-login-spinner"></div>
              <p>Checking authentication...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (data?.authenticated) {
    return (
      <div className="hookify-login-page">
        <FloatingHearts />
        <AnimatedPadlocks />
        <SecurityBadges />
        <div className="hookify-login-grid">
          <div className="hookify-login-left">
            <AnimatedPhone />
          </div>
          <div className="hookify-login-right">
            <BackButton />
            <Logo />
            <RedirectMessage user={data.user} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hookify-login-page">
      <FloatingHearts />
      <AnimatedPadlocks />
      <SecurityBadges />
      <div className="hookify-login-grid">
        <div className="hookify-login-left">
          <AnimatedPhone />
        </div>
        <div className="hookify-login-right">
          <BackButton />
          <Logo />
          {isSubmitting ? (
            <div className="hookify-login-spinner-container">
              <div className="hookify-login-spinner"></div>
              <p>Signing you in...</p>
            </div>
          ) : (
            <LoginForm onSubmittingChange={setIsSubmitting} onSubmit={handleLogin} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;