// src/pages/accounts/User/api/profileApi.ts

import { useAuthStore } from '../../../store/authStore';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ============================================================
   TYPES — mirrors backend UserSerializer
   ============================================================ */

export type UserRole = 'superadmin' | 'user';
export type AuthProvider = 'local' | 'google';
export type Gender = 'M' | 'F' | 'O' | '';

export type UserProfile = {
  // identity
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;

  // profile
  gender: Gender | null;
  phone_number: string | null;
  profile_image_url: string | null;
  profile_image_public_id: string | null;

  // account meta
  role: UserRole;
  auth_provider: AuthProvider;
  is_google_user: boolean;
  has_profile_image: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
};

/* ── Counts + totals from /account/me/ ──────────────────── */

export type UserCounts = {
  businesses: number;
  posts: number;
  products: number;
  stories: number;
};

export type UserTotals = {
  post_views: number;
  product_views: number;
  story_views: number;
  all_views: number;
};

export type CurrentUserResponse = {
  user: UserProfile;
  counts: UserCounts;
  totals: UserTotals;
};

/* ============================================================
   HELPERS
   ============================================================ */

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function extractErrorMessage(data: any, fallback: string): string {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    if (typeof data.message === 'string') return data.message;
    if (typeof data.detail === 'string') return data.detail;
    const firstKey = Object.keys(data)[0];
    if (firstKey && Array.isArray(data[firstKey])) {
      return `${firstKey}: ${data[firstKey][0]}`;
    }
  }
  return fallback;
}

/* ============================================================
   IMAGE COMPRESSION — runs in the browser before upload
   Keeps payloads well under Cloudinary's 10 MB free-tier cap.
   ============================================================ */

/**
 * Downscale + re-encode an image so it comfortably fits under
 * Cloudinary's 10 MB limit.
 *
 * - Files ≤ 2 MB are returned untouched.
 * - GIFs are returned untouched (canvas would kill the animation).
 * - Everything else: resized to fit inside `maxDimension`,
 *   re-encoded as JPEG at `quality`, and returned.
 *
 * On any failure, the original file is returned so the upload
 * can still proceed.
 */
export async function compressImage(
  file: File,
  maxDimension = 2000,
  quality = 0.85
): Promise<File> {
  // Skip small files
  if (file.size <= 2 * 1024 * 1024) return file;

  // Skip GIFs (canvas would break the animation)
  if (file.type === 'image/gif') return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Only shrink if larger than the target
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);

      // Draw with image smoothing on for quality downscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);

          const compressed = new File(
            [blob],
            file.name.replace(/\.(png|webp|gif|jpg|jpeg)$/i, '.jpg'),
            { type: 'image/jpeg', lastModified: Date.now() }
          );

          // If for some reason it's not smaller, keep the original
          resolve(compressed.size < file.size ? compressed : file);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

/* ============================================================
   GET /account/me/ — current logged-in user
   Returns the full payload: user + counts + totals.
   ============================================================ */

export async function fetchCurrentUser(): Promise<CurrentUserResponse> {
  const access = useAuthStore.getState().access;

  const res = await fetch(`${API_BASE}/account/me/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractErrorMessage(data, 'Failed to load your profile.')
    );
  }

  return data as CurrentUserResponse;
}

/* ============================================================
   UPLOAD PROFILE IMAGE
   POST /account/profile/image/upload/
   multipart/form-data — field name: "image"
   ============================================================ */

export type UploadProfileImageResponse = {
  message: string;
  profile_image_url: string;
  profile_image_public_id: string;
};

export async function uploadProfileImage(
  file: File
): Promise<UploadProfileImageResponse> {
  const access = useAuthStore.getState().access;

  // Compress first so large images fit under Cloudinary's cap
  const toUpload = await compressImage(file);

  const form = new FormData();
  form.append('image', toUpload);

  const res = await fetch(`${API_BASE}/account/profile/image/upload/`, {
    method: 'POST',
    headers: {
      // ⚠️ Do NOT set Content-Type — the browser must set the
      // multipart boundary automatically.
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    body: form,
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractErrorMessage(data, 'Failed to upload profile image.')
    );
  }

  return data as UploadProfileImageResponse;
}

/* ============================================================
   UPDATE USER PROFILE
   PATCH /account/profile/
   ============================================================ */

export type UpdateUserPayload = {
  email?: string;
  first_name?: string;
  last_name?: string;
  gender?: 'M' | 'F' | 'O' | '';
  phone_number?: string;
};

export type UpdateUserResponse = {
  message: string;
  user: UserProfile;
};

export async function updateUserProfile(
  payload: UpdateUserPayload
): Promise<UpdateUserResponse> {
  const access = useAuthStore.getState().access;

  const res = await fetch(`${API_BASE}/account/profile/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractErrorMessage(data, 'Failed to update your account.')
    );
  }

  return data as UpdateUserResponse;
}

/* ============================================================
   UPDATE PASSWORD
   PATCH /account/password/
   ============================================================ */

export type UpdatePasswordPayload = {
  old_password: string;
  new_password: string;
  new_password2: string;
};

export type UpdatePasswordResponse = {
  message: string;
};

export async function updateUserPassword(
  payload: UpdatePasswordPayload
): Promise<UpdatePasswordResponse> {
  const access = useAuthStore.getState().access;

  const res = await fetch(`${API_BASE}/account/password/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractErrorMessage(data, 'Failed to update your password.')
    );
  }

  return data as UpdatePasswordResponse;
}