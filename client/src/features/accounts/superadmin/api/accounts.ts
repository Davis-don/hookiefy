// src/api/accounts.ts
//
// Super-admin account API.
// Fully self-contained — no imports from registerApi.ts or any
// other module. Owns its own types, its own fetch, its own error
// parsing. Only the wire contract with the backend
// (POST /account/register/, GET /account/accounts/) is shared,
// and that's a stable public interface, not an internal dependency.

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type Gender = 'M' | 'F' | 'O';

export type CreateYoupataAccountPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;       // ← added
  gender?: Gender;
  password: string;
  confirmPassword: string;
};

export type YoupataAccount = {
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
  is_youpata_managed?: boolean;
  date_joined?: string;
};

export type CreateYoupataAccountResponse = {
  message: string;
  user: YoupataAccount;
  tokens: { access: string; refresh: string };
};

/** Envelope returned by `GET /account/accounts/`. */
export type YoupataAccountListResponse = {
  count: number;
  results: YoupataAccount[];
};

// ─────────────────────────────────────────────────────────
// Error parsing — DRF-aware, self-contained
// ─────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  password2: 'Confirm password',
  first_name: 'First name',
  last_name: 'Last name',
  gender: 'Gender',
  phone_number: 'Phone number',
};

function parseErrorBody(data: any, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;

  if (typeof data.message === 'string') return data.message;
  if (typeof data.detail === 'string') return data.detail;

  // DRF field errors: { email: ["..."], password2: ["..."] }
  const firstKey = Object.keys(data)[0];
  if (!firstKey) return fallback;

  const val = data[firstKey];
  const first =
    Array.isArray(val) && val.length > 0
      ? val[0]
      : typeof val === 'string'
        ? val
        : null;

  if (!first) return fallback;

  const label = FIELD_LABELS[firstKey] || firstKey;
  return `${label}: ${first}`;
}

// ─────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────

export async function createYoupataAccount(
  payload: CreateYoupataAccountPayload,
  accessToken: string,
): Promise<CreateYoupataAccountResponse> {
  if (!accessToken) {
    throw new Error(
      'Your session has expired. Please log in again as a superadmin.',
    );
  }

  // Snake-case mapping for the backend serializer.
  const body = {
    first_name: payload.firstName,
    last_name: payload.lastName,
    email: payload.email.trim().toLowerCase(),
    phone_number: payload.phoneNumber?.trim() || null,   // ← added
    gender: payload.gender || null,
    password: payload.password,
    password2: payload.confirmPassword,
  };

  const res = await fetch(`${API_BASE}/account/register/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Presence of this token makes the backend treat the caller
      // as a superadmin → is_youpata_managed=True on the new account.
      Authorization: `Bearer ${accessToken}`,
    },
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
    throw new Error(
      parseErrorBody(data, 'Could not create the account.'),
    );
  }

  return data as CreateYoupataAccountResponse;
}

// ─────────────────────────────────────────────────────────
// List
// ─────────────────────────────────────────────────────────
//
// Backend returns: { count: number, results: YoupataAccount[] }
// We also tolerate a bare array (in case the view is later swapped
// for a paginated DRF ListAPIView, or a different server impl).

export async function listYoupataAccounts(
  accessToken: string,
): Promise<YoupataAccount[]> {
  if (!accessToken) {
    throw new Error(
      'Your session has expired. Please log in again as a superadmin.',
    );
  }

  const res = await fetch(
    `${API_BASE}/account/accounts/?ordering=-date_joined`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(
      parseErrorBody(data, 'Could not load accounts.'),
    );
  }

  // Envelope: { count, results }
  if (data && typeof data === 'object' && Array.isArray(data.results)) {
    return data.results as YoupataAccount[];
  }

  // Bare array
  if (Array.isArray(data)) {
    return data as YoupataAccount[];
  }

  return [];
}
// ─────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────
//
// Superadmin only. Backend: PATCH /account/profile/?user_id=<id>
// The backend rejects ?user_id when the caller isn't a
// superadmin, so passing the token is the whole security
// story.

export type UpdateYoupataAccountPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  gender?: Gender | '';
};

export async function updateYoupataAccount(
  userId: number,
  payload: UpdateYoupataAccountPayload,
  accessToken: string,
): Promise<YoupataAccount> {
  if (!accessToken) {
    throw new Error(
      'Your session has expired. Please log in again as a superadmin.',
    );
  }

  // Only send keys that were actually provided, so a partial
  // PATCH doesn't wipe untouched fields.
  const body: Record<string, any> = {};

  if (payload.firstName !== undefined) {
    body.first_name = payload.firstName.trim();
  }
  if (payload.lastName !== undefined) {
    body.last_name = payload.lastName.trim();
  }
  if (payload.email !== undefined) {
    body.email = payload.email.trim().toLowerCase();
  }
  if (payload.phoneNumber !== undefined) {
    body.phone_number = payload.phoneNumber.trim() || null;
  }
  if (payload.gender !== undefined) {
    body.gender = payload.gender || null;
  }

  const res = await fetch(
    `${API_BASE}/account/profile/?user_id=${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    },
  );

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(
      parseErrorBody(data, 'Could not update the account.'),
    );
  }

  // Backend responds { message, user }
  return (data.user as YoupataAccount);
}
// ─────────────────────────────────────────────────────────
// Update password (superadmin reset)
// ─────────────────────────────────────────────────────────
//
// Backend: PATCH /account/password/?user_id=<id>
// When the caller is a superadmin, the current password is
// NOT required — the server sets the new one directly.

export type UpdateYoupataPasswordPayload = {
  password: string;
  confirmPassword: string;
};

export async function updateYoupataAccountPassword(
  userId: number,
  payload: UpdateYoupataPasswordPayload,
  accessToken: string,
): Promise<void> {
  if (!accessToken) {
    throw new Error(
      'Your session has expired. Please log in again as a superadmin.',
    );
  }

  const body = {
    password: payload.password,
    password2: payload.confirmPassword,
  };

  const res = await fetch(
    `${API_BASE}/account/password/?user_id=${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    },
  );

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(
      parseErrorBody(data, 'Could not update the password.'),
    );
  }
}