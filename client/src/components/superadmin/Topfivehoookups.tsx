import './topfivehookup.css'
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authtokenstore';
import Loadingcomponent from '../../components/superadmin/Loadingcomponent';
import { toast } from 'sonner';

interface HookupData {
  hookup_id: string;
  sender_id: number;
  sender_name: string;
  sender_email: string;
  sender_profile_image: string | null;
  receiver_id: number;
  receiver_name: string;
  receiver_email: string;
  receiver_profile_image: string | null;
  status: string;
  status_display: string;
  payment_status: string;
  amount_paid: string;
  created_at: string;
  updated_at: string;
}

interface HookupResponse {
  message: string;
  data: HookupData[];
  count: number;
  status: string;
}

const fetchAdminHookups = async (accessToken: string | null): Promise<HookupData[]> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/connections/admin-hookups/`,
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
    if (response.status === 403) {
      throw new Error('Permission denied.');
    }
    throw new Error(`Failed to fetch hookups: ${response.status}`);
  }

  const data: HookupResponse = await response.json();
  return data.data || [];
};

function Topfivehoookups() {
  const { access: accessToken } = useAuthStore();

  const {
    data: hookups,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['adminHookups', accessToken],
    queryFn: () => fetchAdminHookups(accessToken),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Show error toast if fetch fails
  if (isError && error) {
    toast.error('Failed to load hookups', {
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

  // Get status color class
  const getStatusClass = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'completed':
        return 'status-completed';
      case 'accepted':
        return 'status-accepted';
      case 'pending':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  // Format currency
  const formatCurrency = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    return `KSh ${numAmount.toLocaleString()}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get only the first 5 hookups
  const topFiveHookups = hookups?.slice(0, 5) || [];

  // Loading state
  if (isLoading) {
    return (
      <div className="overall-top-five-hookups-concern loading-container">
        <Loadingcomponent />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="overall-top-five-hookups-concern error-container">
        <div className="hookup-error">
          <span className="hookup-error-icon">😅</span>
          <p>{error instanceof Error ? error.message : 'Failed to load hookups'}</p>
          <button onClick={() => refetch()} className="hookup-retry-btn">
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!topFiveHookups || topFiveHookups.length === 0) {
    return (
      <div className="overall-top-five-hookups-concern empty-container">
        <div className="hookup-empty">
          <span className="hookup-empty-icon">📭</span>
          <h3>No hookups found</h3>
          <p>Your clients haven't made any hookups yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overall-top-five-hookups-concern">
      <div className="hookup-table-header">
        <h3>Recent Hookups</h3>
        <span className="hookup-count">{topFiveHookups.length} records</span>
      </div>

      <div className="hookup-table-wrapper">
        <table className="hookup-table">
          <thead>
            <tr>
              <th>Hookup ID</th>
              <th>Buyer</th>
              <th>Seller</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {topFiveHookups.map((hookup) => (
              <tr key={hookup.hookup_id}>
                <td className="hookup-id-cell">
                  {hookup.hookup_id.substring(0, 8)}...
                </td>
                <td className="user-cell">
                  <div className="user-info">
                    <span className="user-name">{hookup.sender_name}</span>
                    <span className="user-email">{hookup.sender_email}</span>
                  </div>
                </td>
                <td className="user-cell">
                  <div className="user-info">
                    <span className="user-name">{hookup.receiver_name}</span>
                    <span className="user-email">{hookup.receiver_email}</span>
                  </div>
                </td>
                <td className="amount-cell">
                  {formatCurrency(hookup.amount_paid || '0')}
                </td>
                <td>
                  <span className={`status-badge ${getStatusClass(hookup.status)}`}>
                    {hookup.status_display || hookup.status}
                  </span>
                </td>
                <td className="date-cell">
                  {formatDate(hookup.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Topfivehoookups;