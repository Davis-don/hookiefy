import { useQuery } from '@tanstack/react-query';
import './homecontent.css';
import Clientdatacards from './Clientdatacards';
import Spinner from '../../components/protected/protectedspinner/Spinner';

// Types for the API response
interface BioCompletionResponse {
  success: boolean;
  is_complete: boolean;
  missing_fields: string[];
  missing_fields_labels: string[];
  completion_percentage: number;
  message: string;
}

interface HomecontentProps {
  onNavigate?: (page: string) => void;
}

function Homecontent({ }: HomecontentProps) {
  const apiUrl = import.meta.env.VITE_API_URL;

  // Fetch bio completion status using React Query
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<BioCompletionResponse>({
    queryKey: ['bioCompletion'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/client-img/client-check-bio-complete/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch bio completion status');
      }

      return response.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="homecontent-loading-container">
        <Spinner 
          size="large" 
          color="#4f46e5" 
          message="Loading your dashboard..." 
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="homecontent-error-container">
        <div className="homecontent-error-card">
          <span className="homecontent-error-icon">⚠️</span>
          <h3>Unable to Load Dashboard</h3>
          <p>There was an error loading your information. Please refresh the page.</p>
          <button className="homecontent-retry-btn" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isBioComplete = data?.is_complete ?? false;

  return (
    <div className="homecontent-main-container">
      <Clientdatacards 
        isBlurred={!isBioComplete}
        isClickable={isBioComplete}
      />
    </div>
  );
}

export default Homecontent;