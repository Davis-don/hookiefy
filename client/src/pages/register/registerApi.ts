// src/pages/Register/registerApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  gender: string;
  phoneNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type RegisterResponse = {
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

export async function registerUser(
  payload: RegisterPayload
): Promise<RegisterResponse> {
  const body = {
    first_name: payload.firstName,
    last_name: payload.lastName,
    gender: payload.gender,
    phone_number: payload.phoneNumber,
    email: payload.email,
    password: payload.password,
    password2: payload.confirmPassword,
  };

  const res = await fetch(`${API_BASE}/account/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    let message = 'Could not create your account.';

    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') {
        message = data.message;
      } else if (typeof data.detail === 'string') {
        message = data.detail;
      } else {
        // DRF field errors: { email: ["..."], password2: ["..."] }
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          const val = data[firstKey];
          const first =
            Array.isArray(val) && val.length > 0
              ? val[0]
              : typeof val === 'string'
                ? val
                : null;

          if (first) {
            // Friendlier labels for common fields
            const labels: Record<string, string> = {
              email: 'Email',
              password: 'Password',
              password2: 'Confirm password',
              first_name: 'First name',
              last_name: 'Last name',
              gender: 'Gender',
              phone_number: 'Phone number',
            };
            const label = labels[firstKey] || firstKey;
            message = `${label}: ${first}`;
          }
        }
      }
    }

    throw new Error(message);
  }

  return data as RegisterResponse;
}