// src/pages/login/googleApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type GoogleAuthResponse = {
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

export async function googleAuth(
  idToken: string
): Promise<GoogleAuthResponse> {
  const res = await fetch(`${API_BASE}/account/google/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: idToken }),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    let message = 'Google sign-in failed. Please try again.';
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

  return data as GoogleAuthResponse;
}