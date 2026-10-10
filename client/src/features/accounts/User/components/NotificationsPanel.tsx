// src/pages/accounts/User/components/NotificationsPanel.tsx

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../../store/authStore';
import { Spinner } from '../../../../components/spinner/Spinner';
import { useToast } from '../../../../components/toast/ToastContext';

import {
  fetchNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  type Notification,
} from '../api/notificationsApi';

import './notificationspanel.css';

/* ============================================================
   TYPES
   ============================================================ */

type NotificationsPanelProps = {
  open: boolean;
  onClose: () => void;
};

type View = 'list' | 'detail';

/* ============================================================
   CONSTANTS
   ============================================================ */

const LONG_PRESS_MS = 550;

/* ============================================================
   HELPERS
   ============================================================ */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ============================================================
   COMPONENT
   ============================================================ */

function NotificationsPanel({
  open,
  onClose,
}: NotificationsPanelProps) {
  const access = useAuthStore((s) => s.access);
  const toast = useToast();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Notification | null>(null);

  /* ── Action sheet (long press) ─────────────────────── */
  const [sheetTarget, setSheetTarget] = useState<Notification | null>(null);

  /* ── Clear-all confirmation modal ──────────────────── */
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  /* ── Long-press bookkeeping ────────────────────────── */
  const longPressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);

  /* ── Reset the whole panel when it closes ──────────── */
  useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => {
        setView('list');
        setSelected(null);
        setSheetTarget(null);
        setConfirmClearOpen(false);
      }, 220);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  /* ── Escape closes topmost layer ───────────────────── */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      if (confirmClearOpen) {
        setConfirmClearOpen(false);
      } else if (sheetTarget) {
        setSheetTarget(null);
      } else if (view === 'detail') {
        setView('list');
        setSelected(null);
      } else {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, view, sheetTarget, confirmClearOpen]);

  /* ── Fetch ─────────────────────────────────────────── */
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notifications', 'list', access],
    queryFn: () => fetchNotifications({ limit: 40 }),
    enabled: !!access && open,
    staleTime: 15_000,
  });

  const notifications = data?.results ?? [];
  const unreadCount = data?.unread_count ?? 0;

  /* ── Mutations ─────────────────────────────────────── */
  const readMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelected((prev) =>
        prev && prev.id === updated.id ? updated : prev,
      );
    },
    onError: () => toast.error('Could not mark as read.'),
  });

  const unreadMutation = useMutation({
    mutationFn: (id: string) => markNotificationUnread(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelected((prev) =>
        prev && prev.id === updated.id ? updated : prev,
      );
      toast.success('Marked as unread.');
      setSheetTarget(null);
    },
    onError: () => toast.error('Could not mark as unread.'),
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: (updated) => {
      toast.success(
        updated > 0
          ? `${updated} notification(s) marked as read.`
          : 'Nothing to mark.',
      );
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Could not mark all as read.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted.');
      setSheetTarget(null);
      if (view === 'detail') {
        setView('list');
        setSelected(null);
      }
    },
    onError: () => toast.error('Could not delete notification.'),
  });

  const clearAllMutation = useMutation({
    mutationFn: () => clearAllNotifications(),
    onSuccess: (deleted) => {
      toast.success(
        deleted > 0
          ? `${deleted} notification(s) cleared.`
          : 'Nothing to clear.',
      );
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSheetTarget(null);
      setConfirmClearOpen(false);
    },
    onError: () => {
      toast.error('Could not clear notifications.');
      setConfirmClearOpen(false);
    },
  });

  /* ── Long-press handlers ───────────────────────────── */

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pressStart.current = null;
  };

  const startLongPress = (
    e: React.PointerEvent<HTMLLIElement>,
    notif: Notification,
  ) => {
    if (e.button !== undefined && e.button !== 0) return;

    pressStart.current = { x: e.clientX, y: e.clientY };

    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
    }

    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      setSheetTarget(notif);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          (navigator as Navigator & {
            vibrate: (pattern: number | number[]) => boolean;
          }).vibrate(30);
        } catch {
          /* ignore */
        }
      }
    }, LONG_PRESS_MS);
  };

  const moveLongPress = (e: React.PointerEvent<HTMLLIElement>) => {
    if (!pressStart.current) return;
    const dx = e.clientX - pressStart.current.x;
    const dy = e.clientY - pressStart.current.y;
    if (dx * dx + dy * dy > 144) {
      cancelLongPress();
    }
  };

  /* ── Open detail — ignore if the sheet is open ─────── */
  const openDetail = (n: Notification) => {
    if (sheetTarget || confirmClearOpen) return;
    setSelected(n);
    setView('detail');

    if (n.is_unread) {
      readMutation.mutate(n.id);
    }
  };

  const goBack = () => {
    setView('list');
    setSelected(null);
  };

  const handleDetailDelete = () => {
    if (selected) deleteMutation.mutate(selected.id);
  };

  if (!open) return null;

  return (
    <>
      <div
        className="np-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="np-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        {/* ============================================================
            LIST VIEW
            ============================================================ */}
        {view === 'list' && (
          <>
            <header className="np-head">
              <div className="np-head-left">
                <h2 className="np-title">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="np-head-badge">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <button
                type="button"
                className="np-close"
                onClick={onClose}
                aria-label="Close notifications"
                title="Close"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </header>

            <div className="np-body">
              {isLoading && (
                <div className="np-state">
                  <Spinner
                    size={20}
                    color="#2563EB"
                    label="Loading notifications…"
                  />
                </div>
              )}

              {isError && (
                <div className="np-state np-state--error">
                  <p>
                    {(error as Error)?.message ||
                      'Could not load notifications.'}
                  </p>
                  <button
                    type="button"
                    className="np-retry"
                    onClick={() => refetch()}
                  >
                    Try again
                  </button>
                </div>
              )}

              {!isLoading &&
                !isError &&
                notifications.length === 0 && (
                  <div className="np-empty">
                    <div
                      className="np-empty-icon"
                      aria-hidden="true"
                    >
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
                        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                      </svg>
                    </div>
                    <p className="np-empty-title">
                      You're all caught up
                    </p>
                    <p className="np-empty-sub">
                      We'll let you know when something happens.
                    </p>
                  </div>
                )}

              {!isLoading &&
                !isError &&
                notifications.length > 0 && (
                  <ul className="np-list">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={
                          'np-item' +
                          (n.is_unread ? ' is-unread' : '') +
                          ` severity-${n.severity}` +
                          (sheetTarget?.id === n.id
                            ? ' is-sheeted'
                            : '')
                        }
                        onClick={() => openDetail(n)}
                        onPointerDown={(e) => startLongPress(e, n)}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        onPointerMove={moveLongPress}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        <span
                          className="np-item-dot"
                          aria-hidden="true"
                        />

                        <div className="np-item-body">
                          <div className="np-item-top">
                            <h3 className="np-item-title">
                              {n.title}
                            </h3>
                          </div>

                          {n.body && (
                            <p className="np-item-text">{n.body}</p>
                          )}

                          <div className="np-item-meta">
                            <span className="np-item-category">
                              {n.category_display}
                            </span>
                            <span
                              className="np-item-dot-sep"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                            <span className="np-item-time">
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            {notifications.length > 0 && (
              <footer className="np-foot np-foot--split">
                <button
                  type="button"
                  className="np-foot-btn np-foot-btn--read"
                  onClick={() => markAllMutation.mutate()}
                  disabled={
                    markAllMutation.isPending || unreadCount === 0
                  }
                  title={
                    unreadCount === 0
                      ? 'Nothing unread'
                      : 'Mark every notification as read'
                  }
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>
                    {markAllMutation.isPending
                      ? 'Marking…'
                      : 'Mark all read'}
                  </span>
                </button>

                <button
                  type="button"
                  className="np-foot-btn np-foot-btn--clear"
                  onClick={() => setConfirmClearOpen(true)}
                  disabled={clearAllMutation.isPending}
                  title="Delete every notification"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                  <span>
                    {clearAllMutation.isPending
                      ? 'Clearing…'
                      : 'Clear all'}
                  </span>
                </button>
              </footer>
            )}
          </>
        )}

        {/* ============================================================
            DETAIL VIEW
            ============================================================ */}
        {view === 'detail' && selected && (
          <>
            <header className="np-head np-head--detail">
              <button
                type="button"
                className="np-back"
                onClick={goBack}
                aria-label="Back to notifications"
                title="Back"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <h2 className="np-title np-title--detail">
                Notification
              </h2>

              <button
                type="button"
                className="np-close"
                onClick={onClose}
                aria-label="Close notifications"
                title="Close"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </header>

            <div className="np-body">
              <div
                className={
                  'np-detail' + ` severity-${selected.severity}`
                }
              >
                <div className="np-detail-meta-top">
                  <span
                    className={`np-detail-sev np-detail-sev--${selected.severity}`}
                  >
                    {selected.severity_display}
                  </span>
                  <span className="np-detail-cat">
                    {selected.category_display}
                  </span>
                </div>

                <h3 className="np-detail-title">
                  {selected.title}
                </h3>

                {selected.body && (
                  <p className="np-detail-text">
                    {selected.body}
                  </p>
                )}

                {selected.actor_name && (
                  <div className="np-detail-actor">
                    {selected.actor_image ? (
                      <img
                        src={selected.actor_image}
                        alt={selected.actor_name}
                        className="np-detail-actor-img"
                      />
                    ) : (
                      <span className="np-detail-actor-fallback">
                        {selected.actor_name
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                    <span className="np-detail-actor-name">
                      {selected.actor_name}
                    </span>
                  </div>
                )}

                <p className="np-detail-date">
                  {fullDate(selected.created_at)}
                </p>

                {selected.metadata &&
                  Object.keys(selected.metadata).length > 0 && (
                    <div className="np-detail-metadata">
                      <span className="np-detail-metadata-label">
                        Details
                      </span>
                      <ul className="np-detail-metadata-list">
                        {Object.entries(selected.metadata).map(
                          ([key, value]) => (
                            <li
                              key={key}
                              className="np-detail-metadata-row"
                            >
                              <span className="np-detail-metadata-key">
                                {key
                                  .replace(/_/g, ' ')
                                  .replace(/\b\w/g, (c) =>
                                    c.toUpperCase(),
                                  )}
                              </span>
                              <span className="np-detail-metadata-value">
                                {String(value)}
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            </div>

            <footer className="np-foot np-foot--detail">
              <div className="np-detail-actions">
                {selected.is_read ? (
                  <button
                    type="button"
                    className="np-detail-btn np-detail-btn--ghost"
                    onClick={() =>
                      unreadMutation.mutate(selected.id)
                    }
                    disabled={unreadMutation.isPending}
                  >
                    {unreadMutation.isPending
                      ? 'Saving…'
                      : 'Mark as unread'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="np-detail-btn np-detail-btn--ghost"
                    onClick={() =>
                      readMutation.mutate(selected.id)
                    }
                    disabled={readMutation.isPending}
                  >
                    {readMutation.isPending
                      ? 'Saving…'
                      : 'Mark as read'}
                  </button>
                )}

                <button
                  type="button"
                  className="np-detail-btn np-detail-btn--danger"
                  onClick={handleDetailDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending
                    ? 'Deleting…'
                    : 'Delete'}
                </button>
              </div>
            </footer>
          </>
        )}

        {/* ============================================================
            ACTION SHEET — appears on long press
            ============================================================ */}
        {sheetTarget && (
          <>
            <div
              className="np-sheet-backdrop"
              onClick={() => setSheetTarget(null)}
              aria-hidden="true"
            />

            <div
              className="np-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Notification actions"
            >
              <div className="np-sheet-handle" aria-hidden="true" />

              <div
                className={
                  'np-sheet-preview' + ` severity-${sheetTarget.severity}`
                }
              >
                <span className="np-sheet-preview-cat">
                  {sheetTarget.category_display}
                </span>
                <h4 className="np-sheet-preview-title">
                  {sheetTarget.title}
                </h4>
                {sheetTarget.body && (
                  <p className="np-sheet-preview-text">
                    {sheetTarget.body}
                  </p>
                )}
              </div>

              <ul className="np-sheet-actions">
                {sheetTarget.is_read ? (
                  <li>
                    <button
                      type="button"
                      className="np-sheet-btn np-sheet-btn--neutral"
                      onClick={() =>
                        unreadMutation.mutate(sheetTarget.id)
                      }
                      disabled={unreadMutation.isPending}
                    >
                      <span className="np-sheet-icon" aria-hidden="true">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 7l9 7 9-7" />
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                        </svg>
                      </span>
                      <span>Mark as unread</span>
                    </button>
                  </li>
                ) : (
                  <li>
                    <button
                      type="button"
                      className="np-sheet-btn np-sheet-btn--neutral"
                      onClick={() =>
                        readMutation.mutate(sheetTarget.id)
                      }
                      disabled={readMutation.isPending}
                    >
                      <span className="np-sheet-icon" aria-hidden="true">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span>Mark as read</span>
                    </button>
                  </li>
                )}

                <li>
                  <button
                    type="button"
                    className="np-sheet-btn np-sheet-btn--danger"
                    onClick={() =>
                      deleteMutation.mutate(sheetTarget.id)
                    }
                    disabled={deleteMutation.isPending}
                  >
                    <span className="np-sheet-icon" aria-hidden="true">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </span>
                    <span>
                      {deleteMutation.isPending
                        ? 'Deleting…'
                        : 'Delete notification'}
                    </span>
                  </button>
                </li>
              </ul>

              <button
                type="button"
                className="np-sheet-cancel"
                onClick={() => setSheetTarget(null)}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* ============================================================
            CLEAR-ALL CONFIRMATION MODAL
            ============================================================ */}
        {confirmClearOpen && (
          <>
            <div
              className="np-confirm-backdrop"
              onClick={() => {
                if (!clearAllMutation.isPending) {
                  setConfirmClearOpen(false);
                }
              }}
              aria-hidden="true"
            />

            <div
              className="np-confirm"
              role="alertdialog"
              aria-modal="true"
              aria-label="Confirm clear all notifications"
            >
              <div className="np-confirm-icon" aria-hidden="true">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12" y2="17.01" />
                </svg>
              </div>

              <h3 className="np-confirm-title">
                Clear all notifications?
              </h3>

              <p className="np-confirm-text">
                {notifications.length > 0 ? (
                  <>
                    This will permanently delete{' '}
                    <strong>
                      {notifications.length}{' '}
                      {notifications.length === 1
                        ? 'notification'
                        : 'notifications'}
                    </strong>
                    . This action cannot be undone.
                  </>
                ) : (
                  <>You have no notifications to clear.</>
                )}
              </p>

              <div className="np-confirm-actions">
                <button
                  type="button"
                  className="np-confirm-btn np-confirm-btn--ghost"
                  onClick={() => setConfirmClearOpen(false)}
                  disabled={clearAllMutation.isPending}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="np-confirm-btn np-confirm-btn--danger"
                  onClick={() => clearAllMutation.mutate()}
                  disabled={clearAllMutation.isPending}
                >
                  {clearAllMutation.isPending ? (
                    <span className="np-confirm-btn-spinner">
                      <Spinner size={14} label="Clearing…" />
                    </span>
                  ) : (
                    'Clear all'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

export default NotificationsPanel;