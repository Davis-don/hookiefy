// components/AdminNotifications.tsx
// ============================================================
// AdminNotifications.tsx - Admin Notifications Page
// ============================================================

import React from 'react';
import './AdminNotifications.css';

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

const AdminNotifications: React.FC = () => {
  const notifications: Notification[] = [
    { id: 1, title: 'New User Registered', message: 'John Doe has joined the platform', time: '5 min ago', read: false, type: 'info' },
    { id: 2, title: 'Payment Received', message: '$49.99 payment from Jane Smith', time: '1 hour ago', read: false, type: 'success' },
    { id: 3, title: 'System Update', message: 'New version 2.3.0 is available', time: '3 hours ago', read: true, type: 'warning' },
    { id: 4, title: 'Server Alert', message: 'High CPU usage detected', time: '1 day ago', read: true, type: 'error' },
    { id: 5, title: 'New Feature', message: 'Analytics dashboard has been updated', time: '2 days ago', read: true, type: 'info' },
  ];

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '🔴';
      default: return '📌';
    }
  };

  return (
    <div className="admin-notifications-container">
      <div className="admin-notifications-header">
        <h2>Notifications</h2>
        <p className="admin-notifications-subtitle">Stay updated with platform activity</p>
      </div>

      <div className="admin-notifications-list">
        {notifications.map(notif => (
          <div key={notif.id} className={`admin-notification-item ${notif.read ? 'read' : 'unread'}`}>
            <div className="admin-notification-icon">{getTypeIcon(notif.type)}</div>
            <div className="admin-notification-content">
              <div className="admin-notification-title">{notif.title}</div>
              <div className="admin-notification-message">{notif.message}</div>
              <div className="admin-notification-time">{notif.time}</div>
            </div>
            {!notif.read && <div className="admin-notification-unread-dot"></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminNotifications;