// LoginForm.tsx
import "./loginform.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authtokenstore";
import { useNavigate } from "react-router-dom";

// Eye icon components
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

interface LoginData {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
  };
}

function LoginForm() {
  const [loginData, setLoginData] = useState<LoginData>({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  
  const { setTokens } = useAuthStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await fetch(`${API_URL}/account/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Login failed");
      }

      return result as LoginResponse;
    },

    onSuccess: (data) => {
      setTokens({
        access: data.access,
        refresh: data.refresh,
      });

      console.log("✅ Login successful, tokens stored in auth store");

      if (data.user?.role === "superadmin") {
        navigate("/superadmin/dashboard");
      } else if (data.user?.role === "admin") {
        navigate("/admin/dashboard");
      } else if (data.user?.role === "user") {
        navigate("/user/dashboard");
      } else {
        navigate("/unauthorized");
      }
    },

    onError: (error: any) => {
      console.error("❌ Login error:", error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  return (
    <div className="auth-login-container">
      <div className="auth-login-wrapper">
        <div className="auth-login-header">
          <h3 className="auth-brand-name">Hookiefy</h3>
          <h1 className="auth-login-title">Welcome Back</h1>
          <p className="auth-login-subtitle">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-login-form">
          <div className="auth-input-group">
            <label className="auth-input-label">Email Address</label>
            <input
              className="auth-input-field"
              type="email"
              name="email"
              placeholder="Enter your email"
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-input-label">Password</label>
            <div className="auth-password-wrapper">
              <input
                className="auth-input-field auth-password-input"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {loginMutation.isSuccess && (
            <p className="auth-success-message">
              {loginMutation.data?.message}
            </p>
          )}

          {loginMutation.isError && (
            <p className="auth-error-message">
              {(loginMutation.error as Error).message}
            </p>
          )}

          <div className="auth-form-actions">
            <button
              className="auth-login-btn"
              type="submit"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </button>

            <div className="auth-forgot-password">
              <a href="/forgot-password">Forgot Password?</a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginForm;