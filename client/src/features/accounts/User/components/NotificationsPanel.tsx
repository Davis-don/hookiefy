// src/pages/accounts/User/components/NotificationsPanel.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../../store/authStore';
import { Spinner } from '../../../../components/spinner/Spinner';
import { useToast } from '../../../../components/toast/ToastContext';

import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type Notification,
} from '../api/notificationsApi';

import './notificationspanel.css';

type NotificationsPanelProps = {
  open: boolean;
  onClose: () => void;
};

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

function NotificationsPanel({
  open,
  onClose,
}: NotificationsPanelProps) {
  const access = useAuthStore((s) => s.access);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ── Lock body scroll while the panel is open ──────── */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Could not mark as read.'),
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
    },
    onError: () => toast.error('Could not delete notification.'),
  });

  /* ── Handlers ──────────────────────────────────────── */
  const handleClickNotification = (n: Notification) => {
    // Mark as read on click, without waiting for the request.
    if (n.is_unread) {
      readMutation.mutate(n.id);
    }

    // If it has an action, navigate to the target URL.
    if (n.has_action && n.action_url) {
      onClose();
      navigate(n.action_url);
      return;
    }

    // Otherwise just expand / collapse the message body.
    setExpandedId((prev) => (prev === n.id ? null : n.id));
  };

  const handleDelete = (
    e: React.MouseEvent,
    id: string,
  ) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className="np-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="np-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        {/* ── Header ──────────────────────────────────── */}
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

        {/* ── Body ────────────────────────────────────── */}
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

          {!isLoading && !isError && notifications.length === 0 && (
            <div className="np-empty">
              <div className="np-empty-icon" aria-hidden="true">
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
              <p className="np-empty-title">You're all caught up</p>
              <p className="np-empty-sub">
                We'll let you know when something happens.
              </p>
            </div>
          )}

          {!isLoading && !isError && notifications.length > 0 && (
            <ul className="np-list">
              {notifications.map((n) => {
                const expanded = expandedId === n.id;
                return (
                  <li
                    key={n.id}
                    className={
                      'np-item' +
                      (n.is_unread ? ' is-unread' : '') +
                      ` severity-${n.severity}` +
                      (expanded ? ' is-expanded' : '')
                    }
                    onClick={() => handleClickNotification(n)}
                  >
                    {/* Left dot */}
                    <span
                      className="np-item-dot"
                      aria-hidden="true"
                    />

                    {/* Content */}
                    <div className="np-item-body">
                      <div className="np-item-top">
                        <h3 className="np-item-title">
                          {n.title}
                        </h3>
                        <button
                          type="button"
                          className="np-item-delete"
                          onClick={(e) => handleDelete(e, n.id)}
                          aria-label="Delete notification"
                          title="Delete"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>

                      {n.body && (
                        <p
                          className={
                            'np-item-text' +
                            (expanded ? ' is-expanded' : '')
                          }
                        >
                          {n.body}
                        </p>
                      )}

                      <div className="np-item-meta">
                        <span className="np-item-category">
                          {n.category_display}
                        </span>
                        <span className="np-item-dot-sep" aria-hidden="true">
                          ·
                        </span>
                        <span className="np-item-time">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────── */}
        {unreadCount > 0 && (
          <footer className="np-foot">
            <button
              type="button"
              className="np-mark-all"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
            >
              {markAllMutation.isPending
                ? 'Marking…'
                : 'Mark all as read'}
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}

export default NotificationsPanel;