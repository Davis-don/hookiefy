import { useState } from 'react';
import './NotificationBell.css';

type NotificationBellProps = {
  onClick?: () => void;
};

function NotificationBell({ onClick }: NotificationBellProps) {
  // TODO: replace with a real count from your notifications API
  const [count] = useState<number>(0);
  const hasUnread = count > 0;

  return (
    <button
      type="button"
      className="ua-bell"
      onClick={onClick}
      aria-label={
        hasUnread
          ? `Notifications (${count} unread)`
          : 'Notifications'
      }
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>

      {hasUnread && (
        <span className="ua-bell-badge" aria-hidden="true">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

export default NotificationBell;