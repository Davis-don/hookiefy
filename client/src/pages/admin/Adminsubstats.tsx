import './adminsubstats.css'
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authtokenstore';
import Substatscard from '../../components/superadmin/Substatscard';
import { FiUsers, FiDollarSign, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import Loadingcomponent from '../../components/superadmin/Loadingcomponent';
import { toast } from 'sonner';

interface DashboardStats {
  clients: {
    title: string;
    value: number;
    percentage: number;
    trend: string;
    trendcolor: string;
    color: string;
  };
  revenue: {
    title: string;
    value: number;
    percentage: number;
    trend: string;
    trendcolor: string;
    color: string;
  };
}

interface StatsResponse {
  message: string;
  data: DashboardStats;
}

// Helper function to format large numbers with K, M, B
const formatNumber = (value: number): string => {
  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1) + 'B';
  }
  if (absValue >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + 'M';
  }
  if (absValue >= 1_000) {
    return (value / 1_000).toFixed(1) + 'K';
  }
  
  return value.toString();
};

const fetchDashboardStats = async (accessToken: string | null): Promise<DashboardStats> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/stats/admin-dashboard-stats/`,
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
    throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
  }

  const data: StatsResponse = await response.json();
  return data.data;
};

function Adminsubstats() {
  const { access: accessToken } = useAuthStore();

  const {
    data: statsData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isRefetching,
  } = useQuery({
    queryKey: ['dashboardStats', accessToken],
    queryFn: () => fetchDashboardStats(accessToken),
    enabled: !!accessToken,
    staleTime: 30 * 1000, // 30 seconds - data becomes stale after 30s
    gcTime: 5 * 60 * 1000, // 5 minutes - cache garbage collection
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds (1 minute)
    refetchIntervalInBackground: true, // Keep refetching even when tab is not active
    retry: 2,
    placeholderData: (previousData) => previousData, // Keep old data while fetching new
  });

  // Show error toast if fetch fails
  if (isError && error) {
    toast.error('Failed to load dashboard stats', {
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

  // Loading state - only show on initial load
  if (isLoading) {
    return (
      <div className="overall-sub-stats-container loading-container">
        <Loadingcomponent />
      </div>
    );
  }

  // Error state
  if (isError || !statsData) {
    return (
      <div className="overall-sub-stats-container error-container">
        <div className="stats-error">
          <span className="stats-error-icon">😅</span>
          <h3>Couldn't load stats</h3>
          <p>{error instanceof Error ? error.message : 'Failed to load dashboard statistics'}</p>
          <button onClick={() => refetch()} className="stats-retry-btn">
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // Prepare data for the cards with formatted values
  const financeStatData = [
    {
      icon: FiUsers,
      title: statsData.clients.title,
      value: formatNumber(statsData.clients.value),
      percentage: statsData.clients.percentage,
      trendIcon: statsData.clients.trend === 'up' ? FiTrendingUp : FiTrendingDown,
      color: statsData.clients.color,
      trendcolor: statsData.clients.trendcolor,
    },
    {
      icon: FiDollarSign,
      title: statsData.revenue.title,
      value: formatNumber(statsData.revenue.value),
      percentage: statsData.revenue.percentage,
      trendIcon: statsData.revenue.trend === 'up' ? FiTrendingUp : FiTrendingDown,
      color: statsData.revenue.color,
      trendcolor: statsData.revenue.trendcolor,
    },
  ];

  return (
    <div className="overall-sub-stats-container">
      {/* Show subtle refresh indicator when refetching in background */}
      {(isFetching || isRefetching) && (
        <div className="stats-refreshing-indicator">
          <span className="refreshing-dot"></span>
          <span className="refreshing-text">Updating...</span>
        </div>
      )}
      
      {financeStatData.map((item, index) => (
        <Substatscard key={index} data={item} />
      ))}
    </div>
  );
}

export default Adminsubstats;