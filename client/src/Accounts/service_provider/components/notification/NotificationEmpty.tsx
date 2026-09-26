// src/components/notifications/NotificationEmpty.tsx

import React from 'react';
import { FiBell, FiAlertCircle, FiLoader } from 'react-icons/fi';
import './NotificationEmpty.css';

interface Props {
  variant: 'loading' | 'error' | 'empty';
  message?: string;
  onRetry?: () => void;
}

const NotificationEmpty: React.FC<Props> = ({
  variant,
  message,
  onRetry,
}) => {
  if (variant === 'loading') {
    return (
      <div className="yp-notif-empty">
        <FiLoader className="yp-notif-spin yp-notif-empty-icon" />
        <p className="yp-notif-empty-title">Loading notifications…</p>
      </div>
    );
  }

  if (variant === 'error') {
    return (
      <div className="yp-notif-empty">
        <FiAlertCircle className="yp-notif-empty-icon" />
        <p className="yp-notif-empty-title">
          Couldn't load notifications
        </p>
        {message && <p className="yp-notif-empty-sub">{message}</p>}
        {onRetry && (
          <button
            type="button"
            className="yp-notif-retry"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="yp-notif-empty">
      <div className="yp-notif-empty-icon yp-notif-empty-icon--round">
        <FiBell />
      </div>
      <p className="yp-notif-empty-title">You're all caught up</p>
      <p className="yp-notif-empty-sub">
        New notifications will appear here.
      </p>
    </div>
  );
};

export default NotificationEmpty;