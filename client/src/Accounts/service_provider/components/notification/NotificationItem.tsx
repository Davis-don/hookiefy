// src/components/notifications/NotificationItem.tsx

import React from 'react';
import {
  FiBell,
  FiPackage,
  FiStar,
  FiAlertCircle,
  FiCheckCircle,
  FiInbox,
  FiSend,
  FiLock,
} from 'react-icons/fi';
import './NotificationItem.css';

/* ─────────── Types ─────────── */

export type NotificationCategory =
  | 'hookup'
  | 'payment'
  | 'system'
  | 'service';

export type ConnectionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface MiniUser {
  id: number;
  email: string;
  full_name: string | null;
  profile_image_url: string | null;
}

export interface MiniConnection {
  connection_id: string;
  status: ConnectionStatus;
  status_display: string;
  created_at: string;
}

export interface ApiNotification {
  notification_id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  category_display: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender: MiniUser | null;
  receiver: MiniUser | null;
  connection: MiniConnection | null;
  connected_user_name?: string | null;
  connected_user_avatar?: string | null;
  connected_user_id?: number | null;
  action_taken_by?: 'sender' | 'receiver' | null;
}

export interface ConnectedUserContact {
  id: number;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender?: string | null;
  profile_image_url: string | null;
  has_profile_image?: boolean | null;
}

/* ─────────── Helpers ─────────── */

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - then) / 1000));

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

/* ─────────── Component ─────────── */

const ICON_MAP: Record<NotificationCategory, React.ReactNode> = {
  hookup: <FiPackage />,
  payment: <FiCheckCircle />,
  service: <FiStar />,
  system: <FiAlertCircle />,
};

interface Props {
  notification: ApiNotification;
  index: number;
  onClick: (n: ApiNotification) => void;
}

const NotificationItem: React.FC<Props> = ({
  notification: n,
  index,
  onClick,
}) => {
  const direction: 'sent' | 'received' = n.sender ? 'received' : 'sent';
  const isCompleted = n.connection?.status === 'COMPLETED';

  return (
    <button
      type="button"
      className={`yp-notif-item yp-notif-item--${n.category} ${
        n.is_read ? 'is-read' : 'is-unread'
      }`}
      onClick={() => onClick(n)}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <span className="yp-notif-item-icon">
        {ICON_MAP[n.category] ?? <FiBell />}
      </span>

      <span className="yp-notif-item-content">
        <span className="yp-notif-item-top">
          <span className="yp-notif-item-title">{n.title}</span>
          <span className="yp-notif-item-time">
            {timeAgo(n.created_at)}
          </span>
        </span>

        <span className="yp-notif-item-body">{n.message}</span>

        <span className="yp-notif-item-meta">
          <span className={`yp-notif-dir yp-notif-dir--${direction}`}>
            {direction === 'received' ? (
              <>
                <FiInbox /> Received
              </>
            ) : (
              <>
                <FiSend /> Sent
              </>
            )}
          </span>

          {n.connection && (
            <span
              className={`yp-notif-status yp-notif-status--${n.connection.status.toLowerCase()}`}
            >
              {isCompleted ? <FiCheckCircle /> : <FiLock />}
              {n.connection.status_display}
            </span>
          )}
        </span>
      </span>

      {!n.is_read && (
        <span className="yp-notif-item-dot" aria-hidden="true" />
      )}
    </button>
  );
};

export default React.memo(NotificationItem);