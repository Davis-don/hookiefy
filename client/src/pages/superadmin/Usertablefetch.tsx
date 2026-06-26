import './usertablefetch.css'
import { useState, useEffect } from 'react'
import { FiUser, FiUsers, FiShield, FiSearch } from 'react-icons/fi'
import { AiTwotoneEdit } from "react-icons/ai";
import { MdDelete } from "react-icons/md";
import 'bootstrap/dist/css/bootstrap.min.css'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import Loadingcomponent from '../../components/superadmin/Loadingcomponent';

interface User {
  id: number;
  email: string;
  role: string;
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
}

interface UsertablefetchProps {
  searchTerm: string
  selectedRole: string
  searchType: string
  refreshTrigger?: number
}

// Fetch users - get ALL users (1000 records) for searching
const fetchAllUsers = async (
  accessToken: string | null
): Promise<User[]> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const url = `${import.meta.env.VITE_API_URL}/account/all/?page=1&page_size=1000`;

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
      throw new Error('Permission denied. Superadmin only.');
    }
    throw new Error(`Failed to fetch users: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
};

// Fetch users by role - get ALL users of that role (1000 records)
const fetchUsersByRole = async (
  accessToken: string | null,
  role: string
): Promise<User[]> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const url = `${import.meta.env.VITE_API_URL}/account/role/${role}/?page=1&page_size=1000`;

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
      throw new Error('Permission denied. Superadmin only.');
    }
    throw new Error(`Failed to fetch users: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
};

function Usertablefetch({ 
  searchTerm, 
  selectedRole, 
  searchType, 
  refreshTrigger = 0
}: UsertablefetchProps) {
  const { access: accessToken } = useAuthStore();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<User[]>([]);

  // Fetch users based on selected role
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['users', selectedRole, refreshTrigger, accessToken],
    queryFn: () => {
      if (selectedRole === 'all' || selectedRole === '') {
        return fetchAllUsers(accessToken);
      } else {
        return fetchUsersByRole(accessToken, selectedRole);
      }
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  // Update data when response changes
  useEffect(() => {
    if (data) {
      setAllUsers(data);
    }
  }, [data]);

  // Handle search filtering - search across ALL fetched data
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
        case 'role':
          return user.role?.toLowerCase().includes(term);
        case 'all':
        default:
          return user.first_name?.toLowerCase().includes(term) ||
                 user.last_name?.toLowerCase().includes(term) ||
                 user.full_name?.toLowerCase().includes(term) ||
                 user.email?.toLowerCase().includes(term) ||
                 user.phone_number?.includes(term) ||
                 user.role?.toLowerCase().includes(term);
      }
    });
    
    setDisplayedUsers(filtered);
  }, [allUsers, searchTerm, searchType]);

  // Reset when role changes
  useEffect(() => {
    setAllUsers([]);
    setDisplayedUsers([]);
  }, [selectedRole]);

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'admin':
        return { color: '#00e5ff', icon: <FiShield />, label: 'Admin' }
      case 'superadmin':
        return { color: '#7b2ffc', icon: <FiShield />, label: 'Super Admin' }
      case 'user':
        return { color: '#00e676', icon: <FiUsers />, label: 'User' }
      default:
        return { color: '#b6f9ff', icon: <FiUser />, label: role }
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 'fau-status-active' : 'fau-status-inactive'
  }

  const handleDelete = (id: number) => {
    alert(`Delete user with ID: ${id}`)
  }

  const handleEdit = (id: number) => {
    alert(`Edit user with ID: ${id}`)
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U'
  }

  const getAvatarColor = (role: string) => {
    switch(role) {
      case 'admin':
        return '#00e5ff'
      case 'superadmin':
        return '#7b2ffc'
      case 'user':
        return '#00e676'
      default:
        return '#b6f9ff'
    }
  }

  // ============================================
  // SMOOTH SINE WAVE LOADING - SMALL & SUBTLE
  // ============================================
  const SmallSineWave = ({ isRefreshing = false }: { isRefreshing?: boolean }) => {
    const dotCount = 12;
    const colors = [
      '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', 
      '#54a0ff', '#5f27cd', '#1dd1a1', '#f368e0',
      '#00d2d3', '#ff9f43', '#2e86de', '#ee5a24'
    ];
    
    const dotIndices = Array.from({ length: dotCount }, (_, i) => i);
    
    return (
      <div className={`fau-mini-wave ${isRefreshing ? 'fau-mini-wave-refreshing' : ''}`}>
        {dotIndices.map((index: number) => {
          const angle = (index / dotCount) * Math.PI * 2;
          const y = Math.sin(angle) * 6;
          const scale = 0.6 + Math.abs(Math.sin(angle)) * 0.6;
          const color = colors[index % colors.length];
          const size = 5 + Math.abs(Math.sin(angle)) * 5;
          
          return (
            <span 
              key={index}
              className="fau-mini-dot"
              style={{ 
                background: color,
                transform: `translateY(${y}px) scale(${scale})`,
                animationDelay: `${index * 0.04}s`,
                width: `${size}px`,
                height: `${size}px`,
              }}
            />
          );
        })}
      </div>
    );
  };

  // ============================================
  // BIG LOADER FOR INITIAL LOADING
  // ============================================
  const BigSineWave = () => {
    const dotCount = 15;
    const colors = [
      '#ff6b6b', '#ff9f43', '#feca57', '#ffd93d', 
      '#6bcb77', '#4d96ff', '#48dbfb', '#0abde3',
      '#a29bfe', '#6c5ce7', '#fd79a8', '#e17055',
      '#00b894', '#00cec9', '#0984e3'
    ];
    
    const dotIndices = Array.from({ length: dotCount }, (_, i) => i);
    
    return (
      <div className="fau-big-wave-container">
        <div className="fau-big-wave">
          {dotIndices.map((index: number) => {
            const angle = (index / dotCount) * Math.PI * 2;
            const y = Math.sin(angle) * 20;
            const scale = 0.5 + Math.abs(Math.sin(angle)) * 0.8;
            const color = colors[index % colors.length];
            const size = 10 + Math.abs(Math.sin(angle)) * 12;
            
            return (
              <span 
                key={index}
                className="fau-big-dot"
                style={{ 
                  background: color,
                  transform: `translateY(${y}px) scale(${scale})`,
                  animationDelay: `${index * 0.06}s`,
                  boxShadow: `0 0 30px ${color}60`,
                  width: `${size}px`,
                  height: `${size}px`,
                }}
              />
            );
          })}
        </div>
        <span className="fau-big-label">Loading users...</span>
      </div>
    );
  };

  if (isLoading && !allUsers.length) {
    return (
      <div className="fau-table-wrapper">
        <div className="fau-initial-loading">
          <Loadingcomponent />
          <BigSineWave />
        </div>
      </div>
    )
  }

  if (isError && !allUsers.length) {
    return (
      <div className="fau-table-wrapper">
        <div className="fau-error-state">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>😅</div>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
            {error instanceof Error ? error.message : 'Failed to load users'}
          </p>
          <button 
            onClick={() => refetch()}
            className="fau-retry-btn"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    )
  }

  if (!accessToken) {
    return (
      <div className="fau-table-wrapper">
        <div className="fau-error-state">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔒</div>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Please login to view users</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fau-table-wrapper">
      {/* Results count with mini wave */}
      <div className="fau-results-count">
        <div className="fau-results-left">
          <span>
            {displayedUsers.length} {displayedUsers.length === 1 ? 'user' : 'users'} found
            {selectedRole !== 'all' && selectedRole !== '' && (
              <span className="fau-role-filter-label"> • Role: {selectedRole}</span>
            )}
            {allUsers.length > 0 && (
              <span className="fau-total-label"> (Total: {allUsers.length})</span>
            )}
          </span>
          {isFetching && (
            <span className="fau-loading-indicator">
              <SmallSineWave isRefreshing={true} />
              <span className="fau-loading-label">Refreshing...</span>
            </span>
          )}
        </div>
        {allUsers.length > 0 && (
          <span className="fau-total-count">
            Showing {displayedUsers.length} of {allUsers.length}
          </span>
        )}
      </div>

      <div className="fau-table-scroll-container">
        <table className="fau-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedUsers.map((user) => {
              const roleBadge = getRoleBadge(user.role)
              return (
                <tr key={user.id}>
                  <td>
                    <div className="fau-user-info">
                      <div 
                        className="fau-user-avatar"
                        style={{ background: getAvatarColor(user.role) }}
                      >
                        {user.profile_image_url ? (
                          <img 
                            src={user.profile_image_url} 
                            alt={user.full_name}
                            className="fau-user-avatar-img"
                          />
                        ) : (
                          getInitials(user.first_name, user.last_name)
                        )}
                      </div>
                      <div className="fau-user-name">
                        <span className="fau-full-name">{user.full_name || `${user.first_name} ${user.last_name}`}</span>
                        <span className="fau-user-id">ID: {user.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="fau-email-cell">{user.email}</td>
                  <td className="fau-phone-cell">{user.phone_number || 'N/A'}</td>
                  <td>
                    <span className="fau-role-badge" style={{ color: roleBadge.color }}>
                      {roleBadge.icon}
                      {roleBadge.label}
                    </span>
                  </td>
                  <td>
                    <span className={`fau-status-badge ${getStatusBadge(user.is_active)}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="fau-action-buttons">
                      <button
                        className='btn btn-outline-info fau-edit-btn'
                        onClick={() => handleEdit(user.id)}
                      >
                        <AiTwotoneEdit className='fs-2'/>
                      </button>
                      <button
                        className='btn btn-outline-danger fau-delete-btn'
                        onClick={() => handleDelete(user.id)}
                      >
                        <MdDelete className='fs-2'/>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {displayedUsers.length === 0 && !isLoading && allUsers.length > 0 && (
          <div className="fau-no-users-found">
            <FiSearch className="fau-no-users-icon" />
            <p>No users found matching "{searchTerm}"</p>
          </div>
        )}

        {displayedUsers.length === 0 && allUsers.length === 0 && !isLoading && (
          <div className="fau-no-users-found">
            <FiSearch className="fau-no-users-icon" />
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Usertablefetch