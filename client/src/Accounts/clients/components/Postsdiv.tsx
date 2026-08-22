import './postsdiv.css'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore'
import Postcard from './Postcard'
import Loadingcomponent from '../../../components/superadmin/Loadingcomponent';
import { toast } from 'sonner'

// Define the Post interface - FLAT structure with connection status
interface Post {
  id: string | number;
  email: string;
  first_name: string;  // ✅ Changed from full_name
  last_name: string;   // ✅ Added last_name
  full_name?: string;  // Optional fallback
  role: string;
  gender: string;
  phone_number: string | null;
  profile_image_url: string | null;
  profile_image_public_id: string | null;
  
  // Flattened profile fields
  bio: string | null;
  city: string;
  county: string;
  country: string;
  age: number | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
  
  // Flattened preference fields
  interested_in_gender: string;
  minimum_age: number;
  maximum_age: number;
  
  // Connection status
  has_accepted: boolean;
  sent_pending: boolean;
  received_pending: boolean;
  
  location_score?: number;
}

// Extended interface for display purposes
interface DisplayPost extends Post {
  firstName: string;
  lastName: string;
  time: string;
  location: string;
  image: string | null;
}

// Simple in-memory cache
let cachedPosts: DisplayPost[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch feed function with caching
const fetchFeed = async (accessToken: string | null, forceRefresh = false): Promise<DisplayPost[]> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  // Check if cache is valid
  const now = Date.now();
  if (!forceRefresh && cachedPosts && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    return cachedPosts;
  }
  
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
    throw new Error(`Failed to fetch feed: ${response.status}`);
  }

  const result = await response.json();
  
  // Handle the response structure
  let users = [];
  
  // Check if result has a 'users' property (your API response)
  if (result.users && Array.isArray(result.users)) {
    users = result.users;
  }
  // Check if result has a 'data' property (alternative format)
  else if (result.data && Array.isArray(result.data)) {
    users = result.data;
  }
  // Check if result itself is an array
  else if (Array.isArray(result)) {
    users = result;
  }
  // Check if result has a 'results' property (paginated)
  else if (result.results && Array.isArray(result.results)) {
    users = result.results;
  }
  else {
    console.error('Expected array but got:', result);
    return [];
  }
  
  // Transform the API data to match the expected Postcard props
  const transformedPosts: DisplayPost[] = users.map((user: any) => {
    // ✅ Extract first and last name from API response
    // API returns: first_name and last_name separately
    const firstName = user.first_name || 'User';
    const lastName = user.last_name || '';
    
    // Extract location from flattened fields
    const location = [
      user.city,
      user.county,
      user.country
    ].filter(Boolean).join(', ') || 'Unknown Location';
    
    // Use the profile image URL
    const imageUrl = user.profile_image_url || null;
    
    // Generate a time string
    const timeOptions = ['2 hours ago', '3 hours ago', '5 hours ago', '7 hours ago', '12 hours ago', '1 day ago', '2 days ago'];
    const randomTime = timeOptions[Math.floor(Math.random() * timeOptions.length)];
    
    return {
      ...user,
      firstName,
      lastName,
      time: randomTime,
      location,
      image: imageUrl,
      // Ensure connection status fields exist with defaults
      has_accepted: user.has_accepted || false,
      sent_pending: user.sent_pending || false,
      received_pending: user.received_pending || false,
    };
  });

  // Update cache
  cachedPosts = transformedPosts;
  cacheTimestamp = now;

  return transformedPosts;
};

function Postsdiv() {
  const { access: accessToken } = useAuthStore();
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const intervalRef = useRef<number | null>(null);
  const isFirstLoad = useRef(true);

  // Fetch feed using useQuery
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isRefetching,
  } = useQuery({
    queryKey: ['feed', accessToken],
    queryFn: () => fetchFeed(accessToken, false),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });

  // Update posts when data changes
  useEffect(() => {
    if (data && data.length > 0) {
      console.log('📦 Setting posts with data:', data);
      setPosts(data);
      isFirstLoad.current = false;
    } else if (data && data.length === 0) {
      console.log('📭 No posts in feed');
      setPosts([]);
      isFirstLoad.current = false;
    }
  }, [data]);

  // Background refresh every 30 seconds
  useEffect(() => {
    if (!accessToken) return;

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = window.setInterval(() => {
      if (!isFetching && !isRefetching) {
        console.log('🔄 Background refresh triggered');
        fetchFeed(accessToken, true)
          .then((freshData) => {
            setPosts(freshData);
          })
          .catch(() => {});
      }
    }, 30000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [accessToken, isFetching, isRefetching]);

  // Show error toast if fetch fails
  useEffect(() => {
    if (isError && error) {
      toast.error('Failed to load feed', {
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

  // Loading state
  if (isLoading && !posts.length) {
    return (
      <div className="overall-posts-container loading-container">
        <div className="fau-initial-loading">
          <Loadingcomponent />
          <div className="feed-loader">
            <div className="feed-loader-dots">
              {[...Array(8)].map((_, i) => (
                <span key={i} className="feed-loader-dot" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
            <span className="feed-loading-text">Loading your feed...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError && !posts.length) {
    return (
      <div className="overall-posts-container error-container">
        <div className="feed-error">
          <span className="feed-error-icon">😅</span>
          <h3>Couldn't load feed</h3>
          <p>{error instanceof Error ? error.message : 'Failed to load feed'}</p>
          <button 
            onClick={() => refetch()}
            className="feed-retry-btn"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // No access token
  if (!accessToken) {
    return (
      <div className="overall-posts-container error-container">
        <div className="feed-error">
          <span className="feed-error-icon">🔒</span>
          <h3>Please Login</h3>
          <p>You need to be logged in to view the feed</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (posts.length === 0 && !isLoading) {
    return (
      <div className="overall-posts-container empty-container">
        <div className="feed-empty">
          <span className="feed-empty-icon">📭</span>
          <h3>No users available</h3>
          <p>Check back later for new connections</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overall-posts-container">
      {isFetching && posts.length > 0 && (
        <div className="feed-refreshing-indicator">
          <span className="feed-refreshing-dot"></span>
          <span>Refreshing...</span>
        </div>
      )}
      
      {posts.map((post) => (
        <Postcard 
          key={String(post.id)}
          id={String(post.id)}
          firstName={post.firstName}
          lastName={post.lastName}
          time={post.time}
          location={post.location}
          image={post.image}
          bio={post.bio || 'No bio available'}
          profile_image_url={post.profile_image_url}
          preference={{
            interested_in_gender: post.interested_in_gender || 'Not specified',
            minimum_age: post.minimum_age || 18,
            maximum_age: post.maximum_age || 100
          }}
          gender={post.gender}
          email={post.email}
          phone_number={post.phone_number || ''}
          has_accepted={post.has_accepted || false}
          sent_pending={post.sent_pending || false}
          received_pending={post.received_pending || false}
        />
      ))}
    </div>
  );
}

export default Postsdiv;