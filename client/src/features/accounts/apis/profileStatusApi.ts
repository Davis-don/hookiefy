// src/pages/login/profileStatusApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type ProfileStatusResponse = {
  is_complete: boolean;
  missing_fields: string[];
  missing_labels: string[];
  completion_percent: number;
  total_required: number;
  filled_count: number;
};

export async function fetchProfileStatus(
  token: string | null
): Promise<ProfileStatusResponse> {
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(`${API_BASE}/account/profile/status/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    let message = 'Could not check your profile.';
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.detail === 'string') message = data.detail;
    }
    throw new Error(message);
  }

  return data as ProfileStatusResponse;
}