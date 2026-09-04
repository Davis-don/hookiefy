import './postsdiv.css'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore'
import Postcard from './Postcard'
import Advertcard from './Advertcard'
import Loadingcomponent from '../../common/components/Loading/Loadingcomponent'
import { toast } from 'sonner'

// ============================================================
// TYPES
// ============================================================

// User data structure
interface UserData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  country: string;
  county: string;
  city: string;
  role: string;
  profile_image_url: string | null;
  bio: string | null;
  interested_in_gender: string;
  minimum_age: number;
  maximum_age: number;
}

// Advert data structure
interface AdvertData {
  id: string;
  title: string;
  description: string | null;
  url: string;
  type: 'image' | 'video';
  public_id: string | null;
  created_at: string;
}

// Feed item wrapper
interface FeedItem {
  type: 'user' | 'advert';
  data: UserData | AdvertData;
}

// Display post for user
interface DisplayUserPost {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  location: string;
  image: string | null;
  bio: string | null;
  gender: string;
  interested_in_gender: string;
  minimum_age: number;
  maximum_age: number;
  profile_image_url: string | null;
  phone_number?: string;
  has_accepted?: boolean;
  sent_pending?: boolean;
  received_pending?: boolean;
  type: 'user';
}

// Display advert
interface DisplayAdvert {
  id: string;
  title: string;
  description: string | null;
  url: string;
  mediaType: 'image' | 'video';
  public_id: string | null;
  created_at: string;
  type: 'advert';
  time: string;
}

type DisplayItem = DisplayUserPost | DisplayAdvert;

// ============================================================
// SIMPLE CACHE
// ============================================================

let cachedItems: DisplayItem[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ============================================================
// FETCH FUNCTION
// ============================================================

const fetchFeed = async (accessToken: string | null, forceRefresh = false): Promise<DisplayItem[]> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  // Check cache
  const now = Date.now();
  if (!forceRefresh && cachedItems && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    return cachedItems;
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
  
  // Extract the users array from the response
  let items: FeedItem[] = [];
  
  if (result.users && Array.isArray(result.users)) {
    items = result.users;
  } else if (result.data && Array.isArray(result.data)) {
    items = result.data;
  } else if (Array.isArray(result)) {
    items = result;
  } else {
    console.error('Expected array but got:', result);
    return [];
  }

  // Transform items to display format
  const transformedItems: DisplayItem[] = items.map((item: FeedItem) => {
    if (item.type === 'user') {
      const user = item.data as UserData;
      const location = [user.city, user.county, user.country].filter(Boolean).join(', ') || 'Unknown Location';
      
      return {
        id: user.id,
        firstName: user.first_name || 'User',
        lastName: user.last_name || '',
        email: user.email,
        location,
        image: user.profile_image_url || null,
        bio: user.bio || null,
        gender: user.role || 'Not specified',
        interested_in_gender: user.interested_in_gender || 'Not specified',
        minimum_age: user.minimum_age || 18,
        maximum_age: user.maximum_age || 100,
        profile_image_url: user.profile_image_url || null,
        type: 'user' as const,
        has_accepted: false,
        sent_pending: false,
        received_pending: false,
      };
    } else {
      // Advert
      const advert = item.data as AdvertData;
      const timeOptions = ['2 hours ago', '3 hours ago', '5 hours ago', '7 hours ago', '12 hours ago', '1 day ago', '2 days ago'];
      const randomTime = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      
      return {
        id: advert.id,
        title: advert.title,
        description: advert.description,
        url: advert.url,
        mediaType: advert.type,
        public_id: advert.public_id,
        created_at: advert.created_at,
        type: 'advert' as const,
        time: randomTime,
      };
    }
  });

  // Update cache
  cachedItems = transformedItems;
  cacheTimestamp = now;

  return transformedItems;
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function Postsdiv() {
  const { access: accessToken } = useAuthStore();
  const [items, setItems] = useState<DisplayItem[]>([]);
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
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });

  // Update items when data changes
  useEffect(() => {
    if (data && data.length > 0) {
      console.log('📦 Setting items with data:', data);
      setItems(data);
      isFirstLoad.current = false;
    } else if (data && data.length === 0) {
      console.log('📭 No items in feed');
      setItems([]);
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
            setItems(freshData);
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

  // ---- Loading State ----
  if (isLoading && !items.length) {
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

  // ---- Error State ----
  if (isError && !items.length) {
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

  // ---- No Access Token ----
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

  // ---- Empty State ----
  if (items.length === 0 && !isLoading) {
    return (
      <div className="overall-posts-container empty-container">
        <div className="feed-empty">
          <span className="feed-empty-icon">📭</span>
          <h3>No content available</h3>
          <p>Check back later for new posts and adverts</p>
        </div>
      </div>
    );
  }

  // ---- Render Feed ----
  return (
    <div className="overall-posts-container">
      {isFetching && items.length > 0 && (
        <div className="feed-refreshing-indicator">
          <span className="feed-refreshing-dot"></span>
          <span>Refreshing...</span>
        </div>
      )}
      
      {items.map((item) => {
        if (item.type === 'user') {
          // Render user post
          const user = item as DisplayUserPost;
          return (
            <Postcard
              key={`user-${user.id}`}
              id={String(user.id)}
              firstName={user.firstName}
              lastName={user.lastName}
              time="2 hours ago"
              location={user.location}
              image={user.image}
              bio={user.bio || 'No bio available'}
              profile_image_url={user.profile_image_url}
              preference={{
                interested_in_gender: user.interested_in_gender || 'Not specified',
                minimum_age: user.minimum_age || 18,
                maximum_age: user.maximum_age || 100
              }}
              gender={user.gender}
              email={user.email}
              phone_number=""
              has_accepted={user.has_accepted || false}
              sent_pending={user.sent_pending || false}
              received_pending={user.received_pending || false}
            />
          );
        } else {
          // Render advert
          const advert = item as DisplayAdvert;
          return (
            <Advertcard
              key={`advert-${advert.id}`}
              id={advert.id}
              title={advert.title}
              description={advert.description}
              url={advert.url}
              mediaType={advert.mediaType}
              publicId={advert.public_id}
              created_at={advert.created_at}
              time={advert.time}
            />
          );
        }
      })}
    </div>
  );
}

export default Postsdiv;