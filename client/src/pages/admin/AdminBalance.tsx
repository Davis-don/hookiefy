import React from 'react';
import './adminbalance.css';

interface AdminBalanceProps {
  amount?: number;
  currency?: string;
}

const AdminBalance: React.FC<AdminBalanceProps> = ({ 
  amount = 850000, 
  currency = 'KSH' 
}) => {
  const formatAmount = (value: number): string => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  };

  return (
    <div className="hookey-admin-balance-badge">
      <span className="hookey-admin-balance-symbol">{currency}</span>
      <span className="hookey-admin-balance-value">{formatAmount(amount)}</span>
      <span className="hookey-admin-balance-love">💖</span>
    </div>
  );
};

export default AdminBalance;