// components/notifications/Notification.tsx

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { FiBell, FiX, FiCheck, FiTrash2 } from 'react-icons/fi';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import NotificationItem from './NotificationItem';
import type { ApiNotification } from './NotificationItem';
import NotificationEmpty from './NotificationEmpty';
import { useAuthStore } from '../../../../store/authtokenstore';
import './notification.css';

/* ─────────── API config ─────────── */

/**
 * Your .env has:
 *   VITE_API_URL=http://localhost:8000
 *
 * Notifications live under /notifications/ on Django, so we append
 * that prefix here. This keeps VITE_API_URL usable by the rest of
 * the app (account, plans, payments, etc.) without breaking them.
 */
function resolveApiBase(): string {
  // @ts-ignore — Vite injects this
  const envUrl: string | undefined = import.meta.env?.VITE_API_URL;

  const NOTIF_PREFIX = '/notifications';

  if (!envUrl || !envUrl.trim()) return NOTIF_PREFIX;

  const trimmed = envUrl.replace(/\/+$/, '');
  if (trimmed.endsWith(NOTIF_PREFIX)) return trimmed;

  return `${trimmed}${NOTIF_PREFIX}`;
}

const API_BASE = resolveApiBase();

/* ─────────── Auth token helper ─────────── */

function readStoredToken(): string | null {
  const directKeys = [
    'access_token',
    'accessToken',
    'access',
    'token',
    'jwt',
    'authToken',
  ];

  for (const k of directKeys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v && v.trim() && !v.startsWith('{')) return v;
  }

  const jsonKeys = ['user', 'auth', 'session', 'currentUser'];
  for (const k of jsonKeys) {
    const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const token =
        parsed?.access_token ||
        parsed?.accessToken ||
        parsed?.access ||
        parsed?.token ||
        parsed?.jwt;
      if (typeof token === 'string' && token.trim()) return token;
    } catch {
      /* not JSON */
    }
  }

  return null;
}

function useAccessToken(): string | null {
  const store = useAuthStore() as unknown;

  const fromStore = useMemo(() => {
    if (!store || typeof store !== 'object') return null;
    const s = store as Record<string, unknown>;

    const candidates = [
      s.access,
      s.accessToken,
      s.access_token,
      s.token,
      s.jwt,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) return c;
    }

    const nested = (s.tokens || s.auth) as
      | Record<string, unknown>
      | undefined;
    if (nested) {
      const inner =
        nested.access ||
        nested.accessToken ||
        nested.access_token ||
        nested.token;
      if (typeof inner === 'string' && inner.trim()) return inner;
    }

    return null;
  }, [store]);

  return fromStore || readStoredToken();
}

/* ─────────── Fetch wrapper ─────────── */

async function apiFetch<T>(
  url: string,
  access: string | null,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  const raw = await res.text().catch(() => '');

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;

    if (isJson && raw) {
      try {
        const parsed = JSON.parse(raw);
        detail = parsed.detail || parsed.message || detail;
      } catch {
        /* keep default */
      }
    } else if (raw) {
      detail =
        `Unexpected ${contentType || 'non-JSON'} response from ${url}. ` +
        `Body starts: ${raw.slice(0, 120)}`;
    }

    if (res.status === 401) {
      throw new Error(
        'Your session has expired. Please log in again.'
      );
    }
    if (res.status === 404) {
      throw new Error(
        `API endpoint not found: ${url}. ` +
          `Check that Django is running and the path is correct.`
      );
    }
    throw new Error(detail);
  }

  if (!isJson) {
    throw new Error(
      `Expected JSON from ${url}, got "${contentType}". ` +
        `Body starts: ${raw.slice(0, 120)}`
    );
  }

  return JSON.parse(raw) as T;
}

/* ─────────── Query keys ─────────── */

const notifKeys = {
  all: ['notifications', 'all'] as const,
};

/* ─────────── Component ─────────── */

interface NotificationProps {
  onToggle?: (open: boolean) => void;
}

const Notification: React.FC<NotificationProps> = ({ onToggle }) => {
  const access = useAccessToken();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /* ── Query: notifications list ─────────────────────── */
  const {
    data: notifications = [],
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: notifKeys.all,
    queryFn: async () => {
      const res = await apiFetch<{ data: ApiNotification[] }>(
        `${API_BASE}/all/?page_size=50`,
        access
      );
      return res.data || [];
    },
    enabled: !!access,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const error = queryError
    ? (queryError as Error).message || 'Failed to load notifications.'
    : null;

  /* ── Unread count ──────────────────────────────────── */
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  /* ── Toggle panel ──────────────────────────────────── */
  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      onToggle?.(next);
      if (next) refetch();
      return next;
    });
  }, [onToggle, refetch]);

  const close = useCallback(() => {
    setOpen(false);
    onToggle?.(false);
  }, [onToggle]);

  /* ── Escape + body scroll lock ─────────────────────── */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  /* ── Mutation: mark one read (optimistic) ──────────── */
  const markOneMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiFetch(
        `${API_BASE}/mark-read/${notificationId}/`,
        access,
        { method: 'PUT' }
      );
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: notifKeys.all });

      const previous = queryClient.getQueryData<ApiNotification[]>(
        notifKeys.all
      );

      queryClient.setQueryData<ApiNotification[]>(
        notifKeys.all,
        (old = []) =>
          old.map((n) =>
            n.notification_id === notificationId
              ? {
                  ...n,
                  is_read: true,
                  read_at: n.read_at ?? new Date().toISOString(),
                }
              : n
          )
      );

      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(notifKeys.all, ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notifKeys.all });
    },
  });

  /* ── Mutation: mark all read (optimistic) ──────────── */
  const markAllMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(
        `${API_BASE}/mark-all-read-all/`,
        access,
        { method: 'PUT' }
      );
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notifKeys.all });

      const previous = queryClient.getQueryData<ApiNotification[]>(
        notifKeys.all
      );

      queryClient.setQueryData<ApiNotification[]>(
        notifKeys.all,
        (old = []) =>
          old.map((n) => ({
            ...n,
            is_read: true,
            read_at: n.read_at ?? new Date().toISOString(),
          }))
      );

      return { previous };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(notifKeys.all, ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notifKeys.all });
    },
  });

  /* ── Click handler: just mark read ─────────────────── */
  const onNotificationClick = useCallback(
    (n: ApiNotification) => {
      if (!n.is_read) {
        markOneMutation.mutate(n.notification_id);
      }
    },
    [markOneMutation]
  );

  const markAllRead = useCallback(() => {
    markAllMutation.mutate();
  }, [markAllMutation]);

  const clearView = useCallback(() => {
    queryClient.setQueryData<ApiNotification[]>(notifKeys.all, []);
  }, [queryClient]);

  /* ── Render ────────────────────────────────────────── */
  return (
    <>
      <button
        type="button"
        className="yp-notif-bell"
        onClick={toggleOpen}
        aria-label={`Notifications${
          unreadCount > 0 ? `, ${unreadCount} unread` : ''
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <FiBell className="yp-notif-bell-icon" />

        {unreadCount > 0 && (
          <>
            <span className="yp-notif-badge" aria-hidden="true">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
            <span className="yp-notif-ping" aria-hidden="true" />
          </>
        )}
      </button>

      {open &&
        createPortal(
          <div className="yp-notif-root" role="presentation">
            <div
              className="yp-notif-backdrop"
              onClick={close}
              aria-hidden="true"
            />

            <div
              ref={panelRef}
              className="yp-notif-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Notifications"
            >
              <div className="yp-notif-handle" aria-hidden="true" />

              <div className="yp-notif-header">
                <div className="yp-notif-header-left">
                  <h3 className="yp-notif-title">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="yp-notif-count-pill">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className="yp-notif-header-right">
                  {notifications.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="yp-notif-action"
                        onClick={markAllRead}
                        disabled={
                          unreadCount === 0 ||
                          markAllMutation.isPending
                        }
                        title="Mark all as read"
                      >
                        <FiCheck />
                        <span>
                          {markAllMutation.isPending
                            ? 'Marking…'
                            : 'Mark all read'}
                        </span>
                      </button>

                      <button
                        type="button"
                        className="yp-notif-action yp-notif-action--danger"
                        onClick={clearView}
                        title="Clear view"
                      >
                        <FiTrash2 />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="yp-notif-close"
                    onClick={close}
                    aria-label="Close notifications"
                  >
                    <FiX />
                  </button>
                </div>
              </div>

              <div className="yp-notif-list">
                {loading && notifications.length === 0 && (
                  <NotificationEmpty variant="loading" />
                )}

                {!loading && error && (
                  <NotificationEmpty
                    variant="error"
                    message={error}
                    onRetry={refetch}
                  />
                )}

                {!loading &&
                  !error &&
                  notifications.length === 0 && (
                    <NotificationEmpty variant="empty" />
                  )}

                {!loading &&
                  !error &&
                  notifications.map((n, i) => (
                    <NotificationItem
                      key={n.notification_id}
                      notification={n}
                      index={i}
                      onClick={onNotificationClick}
                    />
                  ))}

                {isFetching && !loading && notifications.length > 0 && (
                  <div className="yp-notif-refreshing">
                    Refreshing…
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default Notification;