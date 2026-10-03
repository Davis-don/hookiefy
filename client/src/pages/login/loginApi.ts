// src/pages/login/loginApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  message: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    gender?: string;
    phone_number?: string;
    profile_image_url?: string | null;
    role: string;
    auth_provider: string;
    date_joined?: string;
  };
  tokens: { access: string; refresh: string };
};

export async function loginUser(
  payload: LoginPayload
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/account/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
    }),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    let message = 'Invalid email or password.';
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.detail === 'string') message = data.detail;
      else {
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey])) {
          message = `${firstKey}: ${data[firstKey][0]}`;
        }
      }
    }
    throw new Error(message);
  }

  return data as LoginResponse;
}