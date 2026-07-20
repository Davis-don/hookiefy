import './revenuebylocations.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authtokenstore';
import Loadingcomponent from '../../components/superadmin/Loadingcomponent';
import { toast } from 'sonner';
import worldimage from '../../assets/images/images.jpeg';

interface LocationRevenue {
  location: string;
  revenue: number;
  percentage: number;
}

interface RevenueResponse {
  message: string;
  data: LocationRevenue[];
  count: number;
  status: string;
}

const fetchRevenueByLocation = async (accessToken: string | null): Promise<LocationRevenue[]> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/connections/revenue-by-location/`,
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
    throw new Error(`Failed to fetch revenue by location: ${response.status}`);
  }

  const data: RevenueResponse = await response.json();
  return data.data || [];
};

const progressColors = [
  '#00E5FF',
  '#7B2FFC',
  '#00C853',
  '#FF9800',
  '#F44336',
  '#9C27B0',
  '#3F51B5',
  '#009688',
  '#E91E63',
  '#FFC107',
];

function Revenuebylocations() {
  const { access: accessToken } = useAuthStore();

  const {
    data: locationsRevenue,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['revenueByLocation', accessToken],
    queryFn: () => fetchRevenueByLocation(accessToken),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Show error toast if fetch fails
  if (isError && error) {
    toast.error('Failed to load revenue by location', {
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
      <div className="overall-revenue-by-locations-concern loading-container">
        <Loadingcomponent />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="overall-revenue-by-locations-concern error-container">
        <div className="revenue-error">
          <span className="revenue-error-icon">😅</span>
          <p>{error instanceof Error ? error.message : 'Failed to load revenue data'}</p>
          <button onClick={() => refetch()} className="revenue-retry-btn">
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!locationsRevenue || locationsRevenue.length === 0) {
    return (
      <div className="overall-revenue-by-locations-concern empty-container">
        <div className="revenue-empty">
          <span className="revenue-empty-icon">📊</span>
          <h3>No revenue data</h3>
          <p>No completed connections with revenue found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overall-revenue-by-locations-concern">
      <div className="map-image-location">
        <img
          src={worldimage}
          alt="World Map"
        />
      </div>

      <div className="actual-locations-with-revenue">
        {locationsRevenue.map((location, index) => (
          <div
            className="location-revenue-item"
            key={location.location}
          >
            <div className="location-header">
              <span>{location.location}</span>
              <span>
                KSh {location.revenue.toLocaleString()}
              </span>
            </div>

            <div className="progress">
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                style={{
                  width: `${location.percentage}%`,
                  backgroundColor:
                    progressColors[
                      index % progressColors.length
                    ],
                }}
                aria-valuenow={location.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {location.percentage}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Revenuebylocations;