import './postsdiv.css'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import Postcard from './Postcard'
import Loadingcomponent from '../../components/superadmin/Loadingcomponent';
import { toast } from 'sonner'

// Define the Post interface matching your Django serializer
interface Post {
  id: string;
  email: string;
  full_name: string;
  role: string;
  gender: string;
  phone_number: string;
  profile_image_url: string | null;
  profile_image_public_id: string | null;
  profile: {
    bio: string | null;      // This is the user's bio
    city: string;
    county: string;
    country: string;
    age: number | null;
    date_of_birth: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  preference: {
    interested_in_gender: string;
    minimum_age: number;
    maximum_age: number;
  };
  location_score?: number;
}

// Extended interface for display purposes
interface DisplayPost extends Post {
  firstName: string;
  lastName: string;
  time: string;
  location: string;
  image: string | null;
  bio: string; // This is the user's bio from profile
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
    console.log('📦 Using cached feed data');
    return cachedPosts;
  }

  console.log('🌐 Fetching fresh feed data');
  
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
  console.log('📊 Full API Response: postdiv', result);
  
  // Handle both paginated and non-paginated responses
  const users = result.data || result;
  
  // Transform the API data to match the expected Postcard props
  const transformedPosts: DisplayPost[] = users.map((user: Post) => {
    // Extract first and last name from full_name
    const nameParts = user.full_name?.split(' ') || ['User', ''];
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Generate a location string from profile data
    const location = [user.profile?.city, user.profile?.county, user.profile?.country]
      .filter(Boolean)
      .join(', ') || 'Unknown Location';
    
    // ✅ CRITICAL FIX: Get the bio from the profile
    // The bio is in user.profile.bio
    const bio = user.profile?.bio || 'No bio available';
    
    console.log(`📝 User: ${firstName}, Bio: "${bio}"`);
    console.log(`🔍 Full profile data:`, user.profile);
    
    // Use the profile image URL from the API
    const imageUrl = user.profile_image_url || null;
    
    // Generate a time string (you can replace with actual timestamp from API if available)
    const timeOptions = ['2 hours ago', '3 hours ago', '5 hours ago', '7 hours ago', '12 hours ago', '1 day ago', '2 days ago'];
    const randomTime = timeOptions[Math.floor(Math.random() * timeOptions.length)];
    
    return {
      ...user,
      firstName,
      lastName,
      time: randomTime,
      location,
      image: imageUrl,
      bio: bio, // ✅ This is the bio from the profile
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
    if (data) {
      console.log('📦 Setting posts with data:', data);
      setPosts(data);
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
            console.log('✅ Background refresh completed');
          })
          .catch((err) => {
            console.warn('⚠️ Background refresh failed:', err);
          });
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
          <h3>No posts available</h3>
          <p>Follow more users to see their posts here</p>
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
          key={post.id} 
          id={post.id}
          firstName={post.firstName}
          lastName={post.lastName}
          time={post.time}
          location={post.location}
          image={post.image}
          bio={post.bio}  // ✅ Pass the bio directly
          profile_image_url={post.profile_image_url}
          preference={post.preference}
          gender={post.gender}
          email={post.email}
          phone_number={post.phone_number}
        />
      ))}
    </div>
  );
}

export default Postsdiv;