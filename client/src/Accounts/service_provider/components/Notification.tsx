// Notification.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FiBell,
  FiX,
  FiCheck,
  FiPackage,
  FiStar,
  FiAlertCircle,
  FiTrash2,
  FiCheckCircle,
} from 'react-icons/fi';
import './notification.css';

/* ────────────────────────────────────────────────────────
   TYPES
   ──────────────────────────────────────────────────────── */

export type NotificationType =
  | 'order'
  | 'review'
  | 'alert'
  | 'success';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

interface NotificationProps {
  /** Optional: called when the panel opens/closes */
  onToggle?: (open: boolean) => void;
}

/* ────────────────────────────────────────────────────────
   DEMO DATA (replace with your API later)
   ──────────────────────────────────────────────────────── */

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    type: 'order',
    title: 'New order received',
    body: 'Sarah K. just booked your home cleaning service for tomorrow at 10:00 AM.',
    time: '2 min ago',
    read: false,
  },
  {
    id: 'n2',
    type: 'review',
    title: 'You got a 5★ review',
    body: '"Fantastic work — very professional and on time!" — Grace W.',
    time: '1 hr ago',
    read: false,
  },
  {
    id: 'n3',
    type: 'success',
    title: 'Payout completed',
    body: 'KES 12,500 has been sent to your M-Pesa account.',
    time: '3 hr ago',
    read: true,
  },
  {
    id: 'n4',
    type: 'alert',
    title: 'Profile incomplete',
    body: 'Add a portfolio image to appear higher in search results.',
    time: 'Yesterday',
    read: true,
  },
];

/* ────────────────────────────────────────────────────────
   ICON MAP
   ──────────────────────────────────────────────────────── */

const ICON_MAP: Record<NotificationType, React.ReactNode> = {
  order: <FiPackage />,
  review: <FiStar />,
  alert: <FiAlertCircle />,
  success: <FiCheckCircle />,
};

/* ────────────────────────────────────────────────────────
   COMPONENT
   ──────────────────────────────────────────────────────── */

const Notification: React.FC<NotificationProps> = ({ onToggle }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ── Toggle ─────────────────────────────────────────── */
  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  }, [onToggle]);

  const close = useCallback(() => {
    setOpen(false);
    onToggle?.(false);
  }, [onToggle]);

  /* ── Escape to close ────────────────────────────────── */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('keydown', onKey);

    // Lock body scroll while panel is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  /* ── Actions ────────────────────────────────────────── */
  const markAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  const markOneRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <>
      {/* ── Bell button ─────────────────────────────── */}
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
          <span className="yp-notif-badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {unreadCount > 0 && (
          <span className="yp-notif-ping" aria-hidden="true" />
        )}
      </button>

      {/* ── Top-sliding panel (portal) ──────────────── */}
      {open &&
        createPortal(
          <div className="yp-notif-root" role="presentation">
            {/* Backdrop */}
            <div
              className="yp-notif-backdrop"
              onClick={close}
              aria-hidden="true"
            />

            {/* Panel */}
            <div
              ref={panelRef}
              className="yp-notif-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Notifications"
            >
              {/* Drag handle (mobile) */}
              <div className="yp-notif-handle" aria-hidden="true" />

              {/* Header */}
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
                        disabled={unreadCount === 0}
                        title="Mark all as read"
                      >
                        <FiCheck />
                        <span>Mark all read</span>
                      </button>

                      <button
                        type="button"
                        className="yp-notif-action yp-notif-action--danger"
                        onClick={clearAll}
                        title="Clear all"
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

              {/* List */}
              <div className="yp-notif-list">
                {notifications.length === 0 ? (
                  <div className="yp-notif-empty">
                    <div className="yp-notif-empty-icon">
                      <FiBell />
                    </div>
                    <p className="yp-notif-empty-title">
                      You're all caught up
                    </p>
                    <p className="yp-notif-empty-sub">
                      New notifications will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`yp-notif-item yp-notif-item--${n.type} ${
                        n.read ? 'is-read' : 'is-unread'
                      }`}
                      onClick={() => markOneRead(n.id)}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <span className="yp-notif-item-icon">
                        {ICON_MAP[n.type]}
                      </span>

                      <span className="yp-notif-item-content">
                        <span className="yp-notif-item-top">
                          <span className="yp-notif-item-title">
                            {n.title}
                          </span>
                          <span className="yp-notif-item-time">
                            {n.time}
                          </span>
                        </span>
                        <span className="yp-notif-item-body">
                          {n.body}
                        </span>
                      </span>

                      {!n.read && (
                        <span
                          className="yp-notif-item-dot"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ))
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