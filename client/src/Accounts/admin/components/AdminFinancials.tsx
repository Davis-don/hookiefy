// components/AdminFinancials.tsx
// ============================================================
// AdminFinancials.tsx - Financial Management for Admin
// ============================================================

import React from 'react';
import './AdminFinancials.css';

interface Transaction {
  id: number;
  user: string;
  amount: number;
  type: 'payment' | 'refund' | 'withdrawal';
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

const AdminFinancials: React.FC = () => {
  const transactions: Transaction[] = [
    { id: 1, user: 'John Doe', amount: 49.99, type: 'payment', status: 'completed', date: '2024-04-10' },
    { id: 2, user: 'Jane Smith', amount: 29.99, type: 'payment', status: 'pending', date: '2024-04-09' },
    { id: 3, user: 'Bob Johnson', amount: -19.99, type: 'refund', status: 'completed', date: '2024-04-08' },
    { id: 4, user: 'Alice Brown', amount: 99.99, type: 'payment', status: 'completed', date: '2024-04-07' },
    { id: 5, user: 'Charlie Wilson', amount: 49.99, type: 'withdrawal', status: 'pending', date: '2024-04-06' },
  ];

  const totalRevenue = transactions
    .filter(t => t.type === 'payment' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPending = transactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + Math.max(t.amount, 0), 0);

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'payment': return 'type-payment';
      case 'refund': return 'type-refund';
      case 'withdrawal': return 'type-withdrawal';
      default: return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'status-completed';
      case 'pending': return 'status-pending';
      case 'failed': return 'status-failed';
      default: return '';
    }
  };

  return (
    <div className="admin-financials-container">
      <div className="admin-financials-header">
        <h2>Financial Management</h2>
        <p className="admin-financials-subtitle">Track revenue and transactions</p>
      </div>

      <div className="admin-financial-summary">
        <div className="admin-financial-card">
          <span className="admin-financial-label">Total Revenue</span>
          <span className="admin-financial-value">${totalRevenue.toFixed(2)}</span>
        </div>
        <div className="admin-financial-card">
          <span className="admin-financial-label">Pending Amount</span>
          <span className="admin-financial-value pending">${totalPending.toFixed(2)}</span>
        </div>
        <div className="admin-financial-card">
          <span className="admin-financial-label">Total Transactions</span>
          <span className="admin-financial-value">{transactions.length}</span>
        </div>
      </div>

      <div className="admin-transactions-table-wrapper">
        <h4 className="admin-transactions-title">Recent Transactions</h4>
        <table className="admin-transactions-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(transaction => (
              <tr key={transaction.id}>
                <td>{transaction.user}</td>
                <td className={`admin-transaction-amount ${transaction.amount < 0 ? 'negative' : ''}`}>
                  ${Math.abs(transaction.amount).toFixed(2)}
                </td>
                <td><span className={`admin-transaction-type ${getTypeColor(transaction.type)}`}>{transaction.type}</span></td>
                <td><span className={`admin-transaction-status ${getStatusColor(transaction.status)}`}>{transaction.status}</span></td>
                <td>{transaction.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFinancials;