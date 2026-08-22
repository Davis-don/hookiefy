import './serchfeed.css';
import Serchfeedcard from './Serchfeedcard';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import Loadingcomponent from '../../../components/superadmin/Loadingcomponent';
import { toast } from 'sonner';

// Define the User interface matching your Django serializer
interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  gender: string;
  phone_number: string;
  profile_image_url: string | null;
  profile_image_public_id: string | null;
  profile: {
    city: string;
    county: string;
    country: string;
  };
  preference: {
    interested_in_gender: string;
    minimum_age: number;
    maximum_age: number;
  };
}

// Define the SearchFeed interface locally for the card component
interface SearchFeedCardUser {
  id: string;
  profileImage: string | null;
}

// Interface for the API response
interface FeedApiResponse {
  status: string;
  data: User[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

// Simple in-memory cache
let cachedUsers: User[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch search feed function with caching
const fetchSearchFeed = async (accessToken: string | null, forceRefresh = false): Promise<User[]> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  // Check if cache is valid
  const now = Date.now();
  if (!forceRefresh && cachedUsers && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    console.log('📦 Using cached search feed data');
    return cachedUsers;
  }

  console.log('🌐 Fetching fresh search feed data');
  
  const response = await fetch(`${import.meta.env.VITE_API_URL}/feed/info/`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    if (response.status === 403) {
      throw new Error('Permission denied.');
    }
    throw new Error(`Failed to fetch search feed: ${response.status}`);
  }

  const result: FeedApiResponse = await response.json();
  
  // 🟢 FIX: Extract the data array from the response
  // Check if the response has a data property that is an array
  let userArray: User[] = [];
  
  if (result && result.status === 'success' && Array.isArray(result.data)) {
    userArray = result.data;
    console.log(`✅ Found ${userArray.length} users in feed`);
  } else if (Array.isArray(result)) {
    // Fallback: if the response is directly an array (backward compatibility)
    userArray = result;
  } else {
    // If neither, log the unexpected structure
    console.warn('⚠️ Unexpected API response structure:', result);
    userArray = [];
  }
  
  // Update cache
  cachedUsers = userArray;
  cacheTimestamp = now;

  return userArray;
};

function Searchfeed() {
  const { access: accessToken } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);

  // Fetch feed using useQuery
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['searchfeed', accessToken],
    queryFn: () => fetchSearchFeed(accessToken, false),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });

  // Update users when data changes - ensure it's always an array
  useEffect(() => {
    if (data) {
      setUsers(Array.isArray(data) ? data : []);
    }
  }, [data]);

  // Show error toast if fetch fails
  useEffect(() => {
    if (isError && error) {
      toast.error('Failed to load search feed', {
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
  }, [isError, error]);

  // Loading state - show loader while fetching
  if (isLoading) {
    return (
      <div className="overall-searchfeed-container-user loading-container">
        <Loadingcomponent />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="overall-searchfeed-container-user error-container">
        <div className="feed-error">
          <span className="feed-error-icon">😅</span>
          <h3>Couldn't load users</h3>
          <p>{error instanceof Error ? error.message : 'Failed to load users'}</p>
          <button onClick={() => refetch()} className="feed-retry-btn">
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // No access token
  if (!accessToken) {
    return (
      <div className="overall-searchfeed-container-user error-container">
        <div className="feed-error">
          <span className="feed-error-icon">🔒</span>
          <h3>Please Login</h3>
          <p>You need to be logged in to view users</p>
        </div>
      </div>
    );
  }

  // Empty state - only show when data is loaded and there are no users
  // Use Array.isArray and length check for safety
  if (!isLoading && (!Array.isArray(users) || users.length === 0)) {
    return (
      <div className="overall-searchfeed-container-user empty-container">
        <div className="feed-empty-state">
          <div className="empty-state-icon">👥</div>
          <h3 className="empty-state-title">No users found</h3>
          <p className="empty-state-description">Try adjusting your search or check back later</p>
          <button onClick={() => refetch()} className="empty-state-retry-btn">
            🔄 Refresh
          </button>
        </div>
      </div>
    );
  }

  // Safely render users - ensure users is an array before mapping
  return (
    <div className="overall-searchfeed-container-user">
      {Array.isArray(users) && users.map((user) => {
        // Create a SearchFeedCardUser object that matches what Serchfeedcard expects
        const cardUser: SearchFeedCardUser = {
          id: user.id,
          profileImage: user.profile_image_url || null,
        };
        
        return (
          <Serchfeedcard
            key={user.id}
            user={cardUser}
          />
        );
      })}
    </div>
  );
}

export default Searchfeed;