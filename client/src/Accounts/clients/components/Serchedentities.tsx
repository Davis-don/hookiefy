import './serchedentities.css'
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import Loadingcomponent from '../../../components/superadmin/Loadingcomponent';
import { toast } from 'sonner';
import useSearchFeedStore from '../store/sechfeed'

interface SerchedentitiesProps {
  searchTerm: string;
}

interface SearchResult {
  id: string;
  full_name: string;
  profile_image_url: string | null;
  location: string | null;
  city: string | null;
  county: string | null;
  country: string | null;
}

// Fetch search results from the API
const fetchSearchResults = async (accessToken: string | null, searchTerm: string): Promise<SearchResult[]> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  if (!searchTerm.trim()) {
    return [];
  }

  console.log(`🔍 Searching for: ${searchTerm}`);
  
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/profile/search/?q=${encodeURIComponent(searchTerm)}&limit=50`,
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
    throw new Error(`Failed to fetch search results: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
};

function Serchedentities({ searchTerm }: SerchedentitiesProps) {
  const { access: accessToken } = useAuthStore();
  const [results, setResults] = useState<SearchResult[]>([]);
  const { setSelectedUser } = useSearchFeedStore();

  const shouldFetch = !!accessToken && searchTerm.trim().length > 0;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['searchResults', searchTerm, accessToken],
    queryFn: () => fetchSearchResults(accessToken, searchTerm),
    enabled: shouldFetch,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  useEffect(() => {
    if (data) {
      setResults(data);
    }
  }, [data]);

  useEffect(() => {
    if (isError && error) {
      toast.error('Failed to search users', {
        description: error instanceof Error ? error.message : 'Please try again',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    }
  }, [isError, error]);

  // Handle user card click
  const handleUserClick = (userId: string) => {
    console.log('🖱️ Search result clicked for user:', userId);
    setSelectedUser(userId);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="overall-serchedentities-container loading-container">
        <Loadingcomponent />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="overall-serchedentities-container error-container">
        <div className="search-error">
          <span className="search-error-icon">😅</span>
          <h3>Search failed</h3>
          <p>{error instanceof Error ? error.message : 'Failed to search users'}</p>
          <button onClick={() => refetch()} className="search-retry-btn">
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // No access token
  if (!accessToken) {
    return (
      <div className="overall-serchedentities-container error-container">
        <div className="search-error">
          <span className="search-error-icon">🔒</span>
          <h3>Please Login</h3>
          <p>You need to be logged in to search users</p>
        </div>
      </div>
    );
  }

  // Empty state - no results
  if (!isLoading && results.length === 0 && searchTerm.trim().length > 0) {
    return (
      <div className="overall-serchedentities-container empty-container">
        <div className="search-empty-state">
          <div className="search-empty-icon">🔍</div>
          <h3 className="search-empty-title">No results found</h3>
          <p className="search-empty-description">
            No users match "{searchTerm}". Try a different search term.
          </p>
        </div>
      </div>
    );
  }

  // Typing state - waiting for more input
  if (searchTerm.trim().length > 0 && results.length === 0 && !isLoading) {
    return (
      <div className="overall-serchedentities-container empty-container">
        <div className="search-empty-state">
          <div className="search-empty-icon">⌨️</div>
          <h3 className="search-empty-title">Keep typing...</h3>
          <p className="search-empty-description">
            Type more characters to find matching users
          </p>
        </div>
      </div>
    );
  }

  // Render search results
  return (
    <div className="overall-serchedentities-container">
      {results.map((result) => (
        <div 
          key={result.id} 
          className="search-result-card"
          onClick={() => handleUserClick(result.id)}
        >
          <div className="search-result-avatar-wrapper">
            {result.profile_image_url ? (
              <img 
                src={result.profile_image_url} 
                alt={result.full_name}
                className="search-result-avatar"
              />
            ) : (
              <div className="search-result-avatar-fallback">
                <span>{result.full_name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="search-result-info">
            <div className="search-result-name">{result.full_name}</div>
            {result.location && (
              <div className="search-result-location">
                <span className="search-result-location-icon">📍</span>
                <span>{result.location}</span>
              </div>
            )}
            <div className="search-result-username">
              @{result.full_name.toLowerCase().replace(/\s/g, '')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Serchedentities;