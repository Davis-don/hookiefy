import './adminclientfetch.css'
import { useState, useEffect } from 'react'
import { FiSearch } from 'react-icons/fi'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'

interface AssignedUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  gender: string;
  profile_image_url: string | null;
  profile_image_public_id: string | null;
  has_profile_image: boolean;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  assigned_at: string;
  updated_at: string;
}

interface AdminclientfetchProps {
  searchTerm: string
  searchType: string
  refreshTrigger?: number
}

// Fetch assigned users from the API
const fetchAssignedUsers = async (
  accessToken: string | null,
  page: number = 1,
  pageSize: number = 100
): Promise<{ data: AssignedUser[]; count: number; total_pages: number }> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const url = `${import.meta.env.VITE_API_URL}/assignments/assigned-users/?page=${page}&page_size=${pageSize}`;

  const response = await fetch(url, {
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
      throw new Error('Permission denied. Only admin or superadmin can view assigned users.');
    }
    throw new Error(`Failed to fetch assigned users: ${response.status}`);
  }

  const data = await response.json();
  return {
    data: data.data || [],
    count: data.count || 0,
    total_pages: data.total_pages || 0
  };
};

function Adminclientfetch({ searchTerm, searchType, refreshTrigger = 0 }: AdminclientfetchProps) {
  const { access: accessToken } = useAuthStore();
  const [allUsers, setAllUsers] = useState<AssignedUser[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<AssignedUser[]>([]);

  // Fetch assigned users
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['assignedUsers', refreshTrigger, accessToken],
    queryFn: () => fetchAssignedUsers(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  // Update data when response changes
  useEffect(() => {
    if (data?.data) {
      setAllUsers(data.data);
    }
  }, [data]);

  // Handle search filtering
  useEffect(() => {
    if (!searchTerm) {
      setDisplayedUsers(allUsers);
      return;
    }

    const term = searchTerm.toLowerCase();
    
    const filtered = allUsers.filter(user => {
      switch(searchType) {
        case 'name':
          return user.first_name?.toLowerCase().includes(term) || 
                 user.last_name?.toLowerCase().includes(term) ||
                 user.full_name?.toLowerCase().includes(term);
        case 'email':
          return user.email?.toLowerCase().includes(term);
        case 'phone':
          return user.phone_number?.includes(term);
        case 'all':
        default:
          return user.first_name?.toLowerCase().includes(term) ||
                 user.last_name?.toLowerCase().includes(term) ||
                 user.full_name?.toLowerCase().includes(term) ||
                 user.email?.toLowerCase().includes(term) ||
                 user.phone_number?.includes(term);
      }
    });
    
    setDisplayedUsers(filtered);
  }, [allUsers, searchTerm, searchType]);

  // Reset when refresh trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Get status badge
  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 'acf-status-active' : 'acf-status-inactive'
  }

  // Get initials
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U'
  }

  // Get avatar color - consistent cyan for all clients
  const getAvatarColor = () => {
    return '#00e5ff'
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Loading state
  if (isLoading && !allUsers.length) {
    return (
      <div className="acf-table-wrapper">
        <div className="acf-loading-state">
          <div className="acf-loading-spinner"></div>
          <p>Loading assigned clients...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (isError && !allUsers.length) {
    return (
      <div className="acf-table-wrapper">
        <div className="acf-error-state">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>😅</div>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
            {error instanceof Error ? error.message : 'Failed to load assigned users'}
          </p>
          <button 
            onClick={() => refetch()}
            className="acf-retry-btn"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    )
  }

  // No token
  if (!accessToken) {
    return (
      <div className="acf-table-wrapper">
        <div className="acf-error-state">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔒</div>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Please login to view assigned clients</p>
        </div>
      </div>
    )
  }

  return (
    <div className="acf-table-wrapper">
      {/* Results count */}
      <div className="acf-results-count">
        <div className="acf-results-left">
          <span>
            {displayedUsers.length} {displayedUsers.length === 1 ? 'client' : 'clients'} assigned
            {data?.count && data.count > 0 && (
              <span className="acf-total-label"> (Total: {data.count})</span>
            )}
          </span>
          {isFetching && (
            <span className="acf-loading-indicator">
              <span className="acf-loading-dots">...</span>
              Refreshing...
            </span>
          )}
        </div>
        {data?.count && data.count > 0 && (
          <span className="acf-total-count">
            Showing {displayedUsers.length} of {data.count}
          </span>
        )}
      </div>

      <div className="acf-table-scroll-container">
        <table className="acf-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Assigned At</th>
            </tr>
          </thead>
          <tbody>
            {displayedUsers.map((user) => {
              return (
                <tr key={user.id}>
                  <td>
                    <div className="acf-client-info">
                      <div 
                        className="acf-client-avatar"
                        style={{ background: getAvatarColor() }}
                      >
                        {user.profile_image_url ? (
                          <img 
                            src={user.profile_image_url} 
                            alt={user.full_name}
                            className="acf-client-avatar-img"
                          />
                        ) : (
                          getInitials(user.first_name, user.last_name)
                        )}
                      </div>
                      <div className="acf-client-name">
                        <span className="acf-full-name">{user.full_name || `${user.first_name} ${user.last_name}`}</span>
                        <span className="acf-client-id">ID: {user.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="acf-email-cell">{user.email}</td>
                  <td className="acf-phone-cell">{user.phone_number || 'N/A'}</td>
                  <td>
                    <span className={`acf-status-badge ${getStatusBadge(user.is_active)}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="acf-date-cell">
                    {formatDate(user.assigned_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {displayedUsers.length === 0 && !isLoading && allUsers.length > 0 && (
          <div className="acf-no-clients-found">
            <FiSearch className="acf-no-clients-icon" />
            <p>No clients found matching "{searchTerm}"</p>
          </div>
        )}

        {displayedUsers.length === 0 && allUsers.length === 0 && !isLoading && (
          <div className="acf-no-clients-found">
            <FiSearch className="acf-no-clients-icon" />
            <p>No clients assigned to you</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Adminclientfetch