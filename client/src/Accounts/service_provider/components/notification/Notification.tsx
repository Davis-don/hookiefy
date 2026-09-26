// components/notifications/Notification.tsx

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import {
  FiBell,
  FiX,
  FiCheck,
  FiTrash2,
  FiInfo,
  FiChevronRight,
  FiExternalLink,
} from 'react-icons/fi';
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
      throw new Error('Your session has expired. Please log in again.');
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

export const notifKeys = {
  all: ['notifications', 'all'] as const,
};

/* ─────────── Time helper ─────────── */

function formatFullDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/* ─────────── Detail modal ─────────── */

interface DetailModalProps {
  notification: ApiNotification | null;
  onClose: () => void;
  onViewConnection: (connectionId: string) => void;
  onMarkRead: (notificationId: string) => void;
  markingRead: boolean;
}

const NotificationDetailModal: React.FC<DetailModalProps> = ({
  notification,
  onClose,
  onViewConnection,
  onMarkRead,
  markingRead,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  /* Escape closes the modal */
  useEffect(() => {
    if (!notification) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [notification, onClose]);

  if (!notification) return null;

  const hasConnection = !!notification.connection?.connection_id;
  const isUnread = !notification.is_read;

  return createPortal(
    <div
      className="yp-notif-detail-root"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="yp-notif-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={notification.title}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          className="yp-notif-detail-close"
          onClick={onClose}
          aria-label="Close"
        >
          <FiX />
        </button>

        {/* Status pill */}
        <div className="yp-notif-detail-pill-row">
          <span
            className={`yp-notif-detail-pill yp-notif-detail-pill--${notification.category}`}
          >
            {notification.category_display || notification.category}
          </span>
          {isUnread ? (
            <span className="yp-notif-detail-pill yp-notif-detail-pill--unread">
              Unread
            </span>
          ) : (
            <span className="yp-notif-detail-pill yp-notif-detail-pill--read">
              Read
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="yp-notif-detail-title">{notification.title}</h2>

        {/* Meta */}
        <div className="yp-notif-detail-meta">
          <span className="yp-notif-detail-date">
            {formatFullDate(notification.created_at)}
          </span>
          {notification.sender && (
            <span className="yp-notif-detail-sender">
              From: <strong>{notification.sender.full_name}</strong>
            </span>
          )}
        </div>

        {/* Full message */}
        <div className="yp-notif-detail-body">
          <p>{notification.message}</p>
        </div>

        {/* Connection context, if any */}
        {notification.connection && (
          <div className="yp-notif-detail-context">
            <div className="yp-notif-detail-context-row">
              <span className="yp-notif-detail-context-label">
                Connection
              </span>
              <span className="yp-notif-detail-context-value">
                {notification.connected_user_name ||
                  notification.connection.status_display}
              </span>
            </div>
            {notification.connection.status_display && (
              <div className="yp-notif-detail-context-row">
                <span className="yp-notif-detail-context-label">
                  Status
                </span>
                <span className="yp-notif-detail-context-value">
                  {notification.connection.status_display}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="yp-notif-detail-actions">
          {hasConnection && (
            <button
              type="button"
              className="yp-notif-detail-btn yp-notif-detail-btn--primary"
              onClick={() =>
                onViewConnection(
                  notification.connection!.connection_id
                )
              }
            >
              <FiExternalLink />
              <span>View Contact</span>
              <FiChevronRight />
            </button>
          )}

          {isUnread && (
            <button
              type="button"
              className="yp-notif-detail-btn"
              disabled={markingRead}
              onClick={() => onMarkRead(notification.notification_id)}
            >
              <FiCheck />
              <span>
                {markingRead ? 'Marking…' : 'Mark as read'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─────────── Component ─────────── */

interface NotificationProps {
  onToggle?: (open: boolean) => void;
  onNavigate?: (connectionId: string | null) => void;
}

const Notification: React.FC<NotificationProps> = ({
  onToggle,
  onNavigate,
}) => {
  const access = useAccessToken();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ApiNotification | null>(null);
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

  /* ── Escape + body scroll lock for the panel ──────── */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !detail) close();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, detail]);

  /* ── Mutation: mark ONE read ──────────────────────── */
  const markOneMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiFetch(
        `${API_BASE}/mark-read/${notificationId}/`,
        access,
        { method: 'PUT' }
      );
    },
    onSuccess: (_data, notificationId) => {
      /* Update cache optimistically (already done in onMutate) */
      queryClient.invalidateQueries({ queryKey: notifKeys.all });

      /* Reflect change in the open detail modal */
      setDetail((prev) =>
        prev && prev.notification_id === notificationId
          ? {
              ...prev,
              is_read: true,
              read_at: new Date().toISOString(),
            }
          : prev
      );
    },
  });

  /* ── Mutation: mark ALL read ──────────────────────── */
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

  /* ── Click → open the detail modal ────────────────── */
  const onNotificationClick = useCallback((n: ApiNotification) => {
    setDetail(n);
  }, []);

  const closeDetail = useCallback(() => {
    setDetail(null);
  }, []);

  /* ── Detail modal → View Contact ─────────────────── */
  const handleViewConnection = useCallback(
    (connectionId: string) => {
      /* Close the detail modal + panel, then navigate */
      setDetail(null);
      setOpen(false);
      onToggle?.(false);
      onNavigate?.(connectionId);
    },
    [onNavigate, onToggle]
  );

  /* ── Detail modal → mark single as read ──────────── */
  const handleMarkReadFromModal = useCallback(
    (notificationId: string) => {
      markOneMutation.mutate(notificationId);
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

              <div className="yp-notif-info-banner">
                <FiInfo className="yp-notif-info-icon" />
                <span>
                  Tap any notification to see the full message.
                  Successful payment notifications stay unread until
                  you open the contact in <strong>Connections</strong>.
                </span>
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

      {/* ── Detail modal ──────────────────────────────── */}
      <NotificationDetailModal
        notification={detail}
        onClose={closeDetail}
        onViewConnection={handleViewConnection}
        onMarkRead={handleMarkReadFromModal}
        markingRead={markOneMutation.isPending}
      />
    </>
  );
};

export default Notification;