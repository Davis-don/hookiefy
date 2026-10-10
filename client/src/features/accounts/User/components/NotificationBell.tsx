// src/pages/accounts/User/components/NotificationBell.tsx

import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../../store/authStore';
import { fetchUnreadCount } from '../api/notificationsApi';

import './NotificationBell.css';

type NotificationBellProps = {
  onClick?: () => void;
};

function NotificationBell({ onClick }: NotificationBellProps) {
  const access = useAuthStore((s) => s.access);

  const { data: count = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count', access],
    queryFn: fetchUnreadCount,
    enabled: !!access,
    staleTime: 30_000,
    refetchInterval: 45_000,     // poll every 45 seconds
    refetchOnWindowFocus: true,
  });

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
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

export default NotificationBell;