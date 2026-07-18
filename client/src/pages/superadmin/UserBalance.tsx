import './UserBalance.css';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authtokenstore';
import { toast } from 'sonner';
import { useState } from 'react';
import { MdRefresh } from 'react-icons/md';

interface BalanceData {
  balance: string;
  pending_balance: string;
  total_earned: string;
  total_withdrawn: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface BalanceResponse {
  message: string;
  has_balance: boolean;
  data: BalanceData;
}

const fetchUserBalance = async (accessToken: string | null): Promise<BalanceResponse> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/balance/current-balance/`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    if (response.status === 404) {
      throw new Error('Balance not found for this user');
    }
    throw new Error(`Failed to fetch balance: ${response.status}`);
  }

  return response.json();
};

// Helper function to format large numbers with K, M, B
const formatBalance = (value: number, currency: string): string => {
  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000_000) {
    return `${currency} ${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${currency} ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1_000) {
    return `${currency} ${(value / 1_000).toFixed(1)}K`;
  }
  
  return `${currency} ${value.toFixed(2)}`;
};

function UserBalance() {
  const { access: accessToken } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: balanceData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['userBalance', accessToken],
    queryFn: () => fetchUserBalance(accessToken),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (isError && error) {
    toast.error('Failed to load balance', {
      description: error instanceof Error ? error.message : 'Please try again later',
      duration: 4000,
      icon: '⚠️',
      style: {
        background: '#1a1a2e',
        border: '1px solid #ef4444',
        color: '#ffffff',
      },
    });
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="user-balance-minimal">
        <span className="balance-loading">...</span>
      </div>
    );
  }

  // Error state
  if (isError || !balanceData?.has_balance) {
    return (
      <div className="user-balance-minimal">
        <span className="balance-error">—</span>
      </div>
    );
  }

  const balance = balanceData.data;
  const numericBalance = Number(balance.balance);
  
  // Format the balance with K, M, B
  const formattedDisplay = formatBalance(numericBalance, balance.currency);

  return (
    <div className="user-balance-minimal">
      <span className="balance-amount-friendly">{formattedDisplay}</span>
      <button 
        className="balance-refresh-minimal" 
        onClick={handleRefresh}
        disabled={isRefreshing}
        aria-label="Refresh balance"
      >
        <MdRefresh className={`refresh-icon-minimal ${isRefreshing ? 'spinning' : ''}`} />
      </button>
    </div>
  );
}

export default UserBalance;