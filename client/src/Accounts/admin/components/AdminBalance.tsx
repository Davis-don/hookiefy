// components/AdminBalance.tsx
// ============================================================
// AdminBalance.tsx - Admin Balance Display
// ============================================================

import './AdminBalance.css'
import { useAuthStore } from '../../../store/authtokenstore';
import { useQuery } from '@tanstack/react-query';

// ============================================================
// TYPES
// ============================================================

interface BalanceData {
  message: string;
  has_balance: boolean;
  data?: {
    balance: string;
    pending_balance: string;
    total_earned: string;
    total_withdrawn: string;
    currency: string;
    created_at: string;
    updated_at: string;
  };
}

// ============================================================
// API HELPERS
// ============================================================

const fetchAdminBalance = async (accessToken: string | null): Promise<BalanceData> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/balance/current-balance/`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return {
        message: 'Balance not found',
        has_balance: false
      };
    }
    throw new Error('Failed to fetch balance');
  }

  return response.json();
};

// ============================================================
// COMPONENT
// ============================================================

function AdminBalance() {
  const { access: accessToken } = useAuthStore();

  // ---- Fetch balance data ----
  const { 
    data: balanceData, 
    isLoading: isLoadingBalance,
    isError,
    error,
  } = useQuery<BalanceData>({
    queryKey: ['adminBalance', accessToken],
    queryFn: () => fetchAdminBalance(accessToken),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    retry: 1,
  });

  // Format currency with K/M/B formatting and KES
  const formatCurrency = (amount: string | undefined) => {
    if (!amount) return '0.00 KES';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount === 0) return '0.00 KES';
    
    // Format with K, M, B for large numbers
    let formattedValue: string;
    if (numAmount >= 1000000000) {
      formattedValue = (numAmount / 1000000000).toFixed(1) + 'B';
    } else if (numAmount >= 1000000) {
      formattedValue = (numAmount / 1000000).toFixed(1) + 'M';
    } else if (numAmount >= 1000) {
      formattedValue = (numAmount / 1000).toFixed(1) + 'K';
    } else {
      formattedValue = numAmount.toFixed(2);
    }
    
    return `${formattedValue} KES`;
  };

  // Check if user has balance
  const hasBalance = balanceData?.has_balance && balanceData?.data;

  // Loading state - show spinner
  if (isLoadingBalance) {
    return (
      <div className="admin-balance-container">
        <div className="admin-balance-loading">
          <div className="admin-balance-spinner"></div>
        </div>
      </div>
    );
  }

  // Error state - show fallback
  if (isError) {
    console.error('Balance fetch error:', error);
    return (
      <div className="admin-balance-container">
        <span className="admin-balance-amount">0.00 KES</span>
      </div>
    );
  }

  // No balance state - show 0.00 KES
  if (!hasBalance) {
    return (
      <div className="admin-balance-container">
        <span className="admin-balance-amount">0.00 KES</span>
      </div>
    );
  }

  return (
    <div className="admin-balance-container">
      <span className="admin-balance-amount">
        {formatCurrency(balanceData.data?.balance)}
      </span>
    </div>
  );
}

export default AdminBalance;