// components/SuperadminBalance.tsx
// ============================================================
// SuperadminBalance.tsx - Super Admin Balance Display Component
// Gold premium theme - distinct from admin balance
// ============================================================

import './superadminbalance.css'
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';

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
    user?: {
      email: string;
      full_name: string;
      role: string;
    };
  };
}

// ============================================================
// API HELPERS
// ============================================================

const fetchSuperadminBalance = async (accessToken: string | null): Promise<BalanceData> => {
  if (!accessToken) {
    throw new Error('No access token found.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/balance/superadmin/`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('You do not have permission to access superadmin balance');
    }
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

function SuperadminBalance() {
  const { access: accessToken } = useAuthStore();

  const { 
    data: balanceData, 
    isLoading, 
    isError,
    error 
  } = useQuery<BalanceData>({
    queryKey: ['superadminBalance', accessToken],
    queryFn: () => fetchSuperadminBalance(accessToken),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Format currency with K/M/B formatting and KES - SAME AS ADMIN BALANCE
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

  // Loading state - show spinner
  if (isLoading) {
    return (
      <div className="superadmin-balance-container">
        <div className="superadmin-balance-loading">
          <div className="superadmin-balance-spinner"></div>
        </div>
      </div>
    );
  }

  // Error state - show fallback
  if (isError) {
    console.error('Superadmin balance error:', error);
    return (
      <div className="superadmin-balance-container">
        <span className="superadmin-balance-amount">0.00 KES</span>
      </div>
    );
  }

  // No balance state - show 0.00 KES
  const hasBalance = balanceData?.has_balance && balanceData?.data;
  
  if (!hasBalance) {
    return (
      <div className="superadmin-balance-container">
        <span className="superadmin-balance-amount">0.00 KES</span>
      </div>
    );
  }

  return (
    <div className="superadmin-balance-container">
      <span className="superadmin-balance-amount">
        {formatCurrency(balanceData.data?.balance)}
      </span>
    </div>
  );
}

export default SuperadminBalance;