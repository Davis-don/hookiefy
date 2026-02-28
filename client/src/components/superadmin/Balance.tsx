import React from 'react';
import './balance.css';

interface BalanceProps {
  amount?: number;
  currency?: string;
}

const Balance: React.FC<BalanceProps> = ({ 
  amount = 1250000, 
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
    <div className="hookey-superadmin-balance-pill">
      <span className="hookey-superadmin-balance-currency">{currency}</span>
      <span className="hookey-superadmin-balance-amount">{formatAmount(amount)}</span>
      <span className="hookey-superadmin-balance-heart">❤️</span>
    </div>
  );
};

export default Balance;