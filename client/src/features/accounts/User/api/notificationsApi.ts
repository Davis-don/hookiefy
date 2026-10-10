// src/pages/accounts/User/api/notificationsApi.ts

import { useAuthStore } from '../../../../store/authStore';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ============================================================
   TYPES
   ============================================================ */

export type NotificationCategory =
  | 'payment'
  | 'subscription'
  | 'system'
  | 'security'
  | 'social'
  | 'business'
  | 'engagement'
  | 'promo';

export type NotificationSeverity =
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export type Notification = {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  category_display: string;
  severity: NotificationSeverity;
  severity_display: string;
  actor: number | null;
  actor_name: string | null;
  actor_image: string | null;
  action_label: string;
  action_url: string;
  has_action: boolean;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  is_unread: boolean;
  is_expired: boolean;
  read_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationsListResponse = {
  count: number;
  unread_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
  results: Notification[];
};

export type ListNotificationsParams = {
  status?: 'read' | 'unread' | 'all';
  category?: NotificationCategory;
  severity?: NotificationSeverity;
  live?: boolean;
  limit?: number;
  offset?: number;
};

/* ============================================================
   HEADERS
   ============================================================ */

function authHeaders(): HeadersInit {
  const access = useAuthStore.getState().access;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (access) headers.Authorization = `Bearer ${access}`;
  return headers;
}

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

function extractError(data: any, fallback: string): string {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    if (typeof data.message === 'string') return data.message;
    if (typeof data.detail === 'string') return data.detail;
  }
  return fallback;
}

function buildQuery(params?: ListNotificationsParams): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  if (params.status) usp.set('status', params.status);
  if (params.category) usp.set('category', params.category);
  if (params.severity) usp.set('severity', params.severity);
  if (params.live !== undefined) usp.set('live', String(params.live));
  if (params.limit != null) usp.set('limit', String(params.limit));
  if (params.offset != null) usp.set('offset', String(params.offset));
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

/* ============================================================
   LIST
   ============================================================ */

export async function fetchNotifications(
  params?: ListNotificationsParams,
): Promise<NotificationsListResponse> {
  const res = await fetch(
    `${API_BASE}/notifications/${buildQuery(params)}`,
    { method: 'GET', headers: authHeaders() },
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractError(data, 'Failed to load notifications.'),
    );
  }

  return data as NotificationsListResponse;
}

/* ============================================================
   UNREAD COUNT
   ============================================================ */

export async function fetchUnreadCount(): Promise<number> {
  const res = await fetch(
    `${API_BASE}/notifications/unread-count/`,
    { method: 'GET', headers: authHeaders() },
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractError(data, 'Failed to load unread count.'),
    );
  }

  return (data as { unread_count: number }).unread_count ?? 0;
}

/* ============================================================
   MARK ONE AS READ
   ============================================================ */

export async function markNotificationRead(
  id: string,
): Promise<Notification> {
  const res = await fetch(
    `${API_BASE}/notifications/${id}/read/`,
    { method: 'POST', headers: authHeaders() },
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractError(data, 'Failed to mark notification as read.'),
    );
  }

  return (data as { notification: Notification }).notification;
}

/* ============================================================
   MARK ONE AS UNREAD
   ============================================================ */

export async function markNotificationUnread(
  id: string,
): Promise<Notification> {
  const res = await fetch(
    `${API_BASE}/notifications/${id}/unread/`,
    { method: 'POST', headers: authHeaders() },
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractError(data, 'Failed to mark notification as unread.'),
    );
  }

  return (data as { notification: Notification }).notification;
}

/* ============================================================
   MARK ALL AS READ
   ============================================================ */

export async function markAllNotificationsRead(): Promise<number> {
  const res = await fetch(
    `${API_BASE}/notifications/read-all/`,
    { method: 'POST', headers: authHeaders() },
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractError(data, 'Failed to mark all as read.'),
    );
  }

  return (data as { updated: number }).updated ?? 0;
}

/* ============================================================
   DELETE ONE
   ============================================================ */

export async function deleteNotification(
  id: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/notifications/${id}/delete/`,
    { method: 'DELETE', headers: authHeaders() },
  );

  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(
      extractError(data, 'Failed to delete notification.'),
    );
  }
}

/* ============================================================
   CLEAR ALL
   ============================================================ */

export async function clearAllNotifications(): Promise<number> {
  const res = await fetch(
    `${API_BASE}/notifications/clear-all/`,
    { method: 'DELETE', headers: authHeaders() },
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractError(data, 'Failed to clear notifications.'),
    );
  }

  return (data as { deleted: number }).deleted ?? 0;
}