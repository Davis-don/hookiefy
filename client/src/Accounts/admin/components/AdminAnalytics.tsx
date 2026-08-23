// components/AdminAnalytics.tsx
// ============================================================
// AdminAnalytics.tsx - Analytics Dashboard for Admin
// ============================================================

import React from 'react';
import './AdminAnalytics.css';

interface StatCard {
  title: string;
  value: string | number;
  change: number;
  icon: string;
}

const AdminAnalytics: React.FC = () => {
  const stats: StatCard[] = [
    { title: 'Total Users', value: '12,847', change: 12.5, icon: '👥' },
    { title: 'Active Users', value: '8,231', change: 8.2, icon: '🟢' },
    { title: 'Total Revenue', value: '$45,230', change: 23.1, icon: '💰' },
    { title: 'Connections', value: '3,412', change: 5.8, icon: '🔗' },
  ];

  return (
    <div className="admin-analytics-container">
      <div className="admin-analytics-header">
        <h2>Analytics Dashboard</h2>
        <p className="admin-analytics-subtitle">Overview of platform performance</p>
      </div>

      <div className="admin-stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="admin-stat-card">
            <div className="admin-stat-icon">{stat.icon}</div>
            <div className="admin-stat-content">
              <span className="admin-stat-title">{stat.title}</span>
              <span className="admin-stat-value">{stat.value}</span>
              <span className={`admin-stat-change ${stat.change >= 0 ? 'positive' : 'negative'}`}>
                {stat.change >= 0 ? '↑' : '↓'} {Math.abs(stat.change)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-chart-placeholder">
        <div className="admin-chart-header">
          <h4>Weekly Activity</h4>
          <span className="admin-chart-subtitle">Last 7 days</span>
        </div>
        <div className="admin-chart-bars">
          {[65, 78, 45, 90, 70, 85, 95].map((height, index) => (
            <div key={index} className="admin-chart-bar-wrapper">
              <div 
                className="admin-chart-bar" 
                style={{ height: `${height}%` }}
              />
              <span className="admin-chart-label">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;