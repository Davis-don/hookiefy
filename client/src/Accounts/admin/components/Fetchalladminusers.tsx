// Fetchalladminusers.tsx
// ============================================================
// Fetchalladminusers.tsx - Fetch Users Assigned to Current Admin
// ============================================================

import './fetchalladminusers.css'
import { useState, useEffect, } from 'react';
import { useAuthStore } from '../../../store/authtokenstore';
import { toast } from 'sonner';
import { 
  FiUser, 
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiSearch,
  FiX
} from 'react-icons/fi';
import Loadingcomponent from '../../common/components/Loading/Loadingcomponent';

// ============================================================
// TYPES
// ============================================================

interface AssignedUserData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  gender: string;
  profile_image_url: string | null;
  has_profile_image: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  assigned_at: string;
  updated_at: string;
}

interface AssignedUsersResponse {
  message: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  data: AssignedUserData[];
}

// ============================================================
// COMPONENT
// ============================================================

function Fetchalladminusers() {
  const { access: accessToken } = useAuthStore();
  const [users, setUsers] = useState<AssignedUserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AssignedUserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 10,
    total_pages: 1,
    total_count: 0,
    has_next: false,
    has_previous: false,
  });

  // ---- Fetch assigned users ----
  const fetchAssignedUsers = async (page: number = 1) => {
    if (!accessToken) {
      setError('No access token found. Please login again.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/assignments/assigned-users/?page=${page}&page_size=${pagination.page_size}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You do not have permission to view assigned users.');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch assigned users');
      }

      const result: AssignedUsersResponse = await response.json();
      
      setUsers(result.data);
      setFilteredUsers(result.data);
      setPagination({
        page: result.page,
        page_size: result.page_size,
        total_pages: result.total_pages,
        total_count: result.count,
        has_next: result.has_next,
        has_previous: result.has_previous,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch assigned users';
      setError(errorMessage);
      toast.error('Error fetching assigned users', {
        description: errorMessage,
        duration: 5000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Initial fetch ----
  useEffect(() => {
    fetchAssignedUsers(1);
  }, [accessToken]);

  // ---- Search filter ----
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = users.filter(user => 
      user.full_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.phone_number?.toLowerCase().includes(searchLower) ||
      user.first_name.toLowerCase().includes(searchLower) ||
      user.last_name.toLowerCase().includes(searchLower)
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  // ---- Handle page change ----
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.total_pages) return;
    fetchAssignedUsers(newPage);
  };

  // ---- Clear search ----
  const clearSearch = () => {
    setSearchTerm('');
  };

  // ---- Format date ----
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // ---- Format time ----
  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="fau-main-wrapper">
        <div className="fau-loading-container">
          <Loadingcomponent />
          <p className="fau-loading-text">Loading assigned users...</p>
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="fau-main-wrapper">
        <div className="fau-error-container">
          <div className="fau-error-icon">😅</div>
          <p className="fau-error-text">{error}</p>
          <button 
            onClick={() => fetchAssignedUsers(1)}
            className="fau-retry-btn"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // ---- No users state ----
  if (users.length === 0) {
    return (
      <div className="fau-main-wrapper">
        <div className="fau-empty-container">
          <div className="fau-empty-icon">👤</div>
          <h3 className="fau-empty-title">No Assigned Users</h3>
          <p className="fau-empty-text">You don't have any users assigned to you yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fau-main-wrapper">
      {/* Search Bar */}
      <div className="fau-search-container">
        <div className="fau-search-wrapper">
          <FiSearch className="fau-search-icon" />
          <input
            type="text"
            className="fau-search-input"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="fau-search-clear" onClick={clearSearch}>
              <FiX />
            </button>
          )}
        </div>
       
      </div>

      {/* Users Table - Scrollable on mobile */}
      <div className="fau-table-scroll">
        <table className="fau-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Assigned</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id} className="fau-table-row">
                  <td className="fau-user-cell">
                    <div className="fau-user-avatar">
                      {user.profile_image_url ? (
                        <img 
                          src={user.profile_image_url} 
                          alt={user.full_name}
                          className="fau-user-avatar-img"
                        />
                      ) : (
                        <div className="fau-user-avatar-fallback">
                          <FiUser />
                        </div>
                      )}
                    </div>
                    <div className="fau-user-name">
                      <span className="fau-user-fullname">{user.full_name}</span>
                      <span className="fau-user-username">@{user.email.split('@')[0]}</span>
                    </div>
                  </td>
                  <td className="fau-email-cell">{user.email}</td>
                  <td className="fau-phone-cell">{user.phone_number || '—'}</td>
                  <td>
                    <span className={`fau-status-badge ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                      {user.is_active ? (
                        <>
                          <FiCheckCircle className="fau-status-icon" />
                          Active
                        </>
                      ) : (
                        <>
                          <FiXCircle className="fau-status-icon" />
                          Inactive
                        </>
                      )}
                    </span>
                  </td>
                  <td className="fau-date-cell">
                    <div className="fau-date-info">
                      <FiClock className="fau-date-icon" />
                      <div>
                        <div>{formatDate(user.assigned_at)}</div>
                        <div className="fau-date-time">{formatTime(user.assigned_at)}</div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="fau-no-results">
                  <div className="fau-no-results-content">
                    <FiSearch className="fau-no-results-icon" />
                    <span>No users found matching "{searchTerm}"</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && filteredUsers.length === users.length && (
        <div className="fau-pagination">
          <button
            className="fau-pagination-btn"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.has_previous}
          >
            Previous
          </button>
          <span className="fau-pagination-info">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <button
            className="fau-pagination-btn"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.has_next}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default Fetchalladminusers;