import './welcomeconcernsuperadminconcern.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import Loadingcomponent from './Loadingcomponent'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'

interface UserData {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: string;
}

const fetchCurrentUser = async (accessToken: string | null): Promise<UserData> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/account/current-user/`,
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
    throw new Error(`Failed to fetch user: ${response.status}`);
  }

  return response.json();
};

function Welcomeconcernsuperadmin() {
  const { access: accessToken } = useAuthStore();

  const { 
    data: user, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['currentUser', accessToken],
    queryFn: () => fetchCurrentUser(accessToken),
    enabled: !!accessToken, // Only run if we have a token
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="overall-concern-main" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Loadingcomponent />
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="overall-concern-main" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>😅</div>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
            {error instanceof Error ? error.message : 'Failed to load user data'}
          </p>
          <button 
            onClick={() => refetch()}
            style={{
              padding: '0.5rem 1.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // No token available
  if (!accessToken) {
    return (
      <div className="overall-concern-main" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔒</div>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
            Please login to continue
          </p>
        </div>
      </div>
    );
  }

  const firstName = user?.first_name || 'User';

  return (
    <div className="overall-concern-main">
      <div className="welcome-emoji">👋</div>
      <h2 className="welcome-header">
        Hello, <span className="highlight">{firstName}</span>
      </h2>
      <p className="welcome-subtitle">
        Welcome to your Hookiefy dashboard. Track your progress and gain valuable insights.
      </p>
    </div>
  )
}

export default Welcomeconcernsuperadmin