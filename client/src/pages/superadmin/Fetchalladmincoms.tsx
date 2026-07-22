import './fetchalladmincheck.css'
import { AiTwotoneEdit } from "react-icons/ai";
import 'bootstrap/dist/css/bootstrap.min.css'
import { useEditComModalStore } from "./store/admninmodaeditcom";
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import Loadingcomponent from '../../components/superadmin/Loadingcomponent';
import { FiSearch } from 'react-icons/fi';

interface FetchalladmincomsProps {
  searchTerm: string
  searchType: string
}

interface CommissionData {
  id: number;
  admin_id: number;
  admin_email: string;
  admin_full_name: string;
  admin_role: string;
  percentage: number;
  platform_percentage: number;
  created_at: string;
  updated_at: string;
}

// Fetch all commissions from API
const fetchAllCommissions = async (accessToken: string | null): Promise<CommissionData[]> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const url = `${import.meta.env.VITE_API_URL}/commissions/get-all-commissions/`;

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
    throw new Error(`Failed to fetch commissions: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
};

function Fetchalladmincoms({ searchTerm, searchType }: FetchalladmincomsProps) {
  const { access: accessToken } = useAuthStore();
  const { openModal } = useEditComModalStore();

  // Fetch commissions using useQuery
  const {
    data: commissions = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['commissions', accessToken],
    queryFn: () => fetchAllCommissions(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  const handleEdit = (commissionId: number) => {
    // Pass the commission ID to the modal
    openModal(commissionId.toString());
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  // Filter commissions based on search term and search type
  const filteredCommissions = commissions.filter(commission => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    
    switch(searchType) {
      case 'name':
        return commission.admin_full_name.toLowerCase().includes(term);
      case 'email':
        return commission.admin_email.toLowerCase().includes(term);
      case 'adminId':
        return commission.admin_id.toString().includes(term);
      default:
        return commission.admin_full_name.toLowerCase().includes(term) ||
               commission.admin_email.toLowerCase().includes(term) ||
               commission.admin_id.toString().includes(term);
    }
  });

  // ============================================
  // LOADING STATES
  // ============================================

  if (isLoading && !commissions.length) {
    return (
      <div className="overall-fetch-all-admin-checks">
        <div className="fau-initial-loading">
          <Loadingcomponent />
          <div className="admin-loading-text">Loading commissions...</div>
        </div>
      </div>
    );
  }

  if (isError && !commissions.length) {
    return (
      <div className="overall-fetch-all-admin-checks">
        <div className="admin-error-state">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>😅</div>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
            {error instanceof Error ? error.message : 'Failed to load commissions'}
          </p>
          <button 
            onClick={() => refetch()}
            className="admin-retry-btn"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="overall-fetch-all-admin-checks">
        <div className="admin-error-state">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔒</div>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Please login to view commissions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overall-fetch-all-admin-checks">
      {/* Results count */}
      <div className="admin-results-count">
        <div className="admin-results-left">
          <span>
            {filteredCommissions.length} {filteredCommissions.length === 1 ? 'admin' : 'admins'} found
            {commissions.length > 0 && (
              <span className="admin-total-label"> (Total: {commissions.length})</span>
            )}
          </span>
          {isFetching && (
            <span className="admin-loading-indicator">
              <span className="admin-mini-spinner"></span>
              <span className="admin-loading-label">Refreshing...</span>
            </span>
          )}
        </div>
        {commissions.length > 0 && (
          <span className="admin-total-count">
            Showing {filteredCommissions.length} of {commissions.length}
          </span>
        )}
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Admin</th>
            <th>Email</th>
            <th>Commission</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCommissions.map((commission) => (
            <tr key={commission.id}>
              <td>
                <div className="admin-info">
                  <div className="admin-avatar">
                    {getInitials(commission.admin_full_name)}
                  </div>
                  <div className="admin-name-details">
                    <span className="admin-full-name">{commission.admin_full_name}</span>
                    <span className="admin-id">ID: {commission.admin_id}</span>
                  </div>
                </div>
              </td>
              <td className="admin-email-cell">{commission.admin_email}</td>
              <td>
                <span className="admin-commission-badge">
                  {commission.percentage}%
                </span>
              </td>
              <td>
                <div className="admin-action-buttons">
                  <button
                    className="btn btn-outline-info btn-lg"
                    onClick={() => handleEdit(commission.id)}
                    title="Edit commission"
                  >
                    <AiTwotoneEdit />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredCommissions.length === 0 && commissions.length > 0 && (
        <div className="admin-no-admins-found">
          <FiSearch className="admin-no-admins-icon" />
          <p>No admins found matching "{searchTerm}"</p>
        </div>
      )}

      {filteredCommissions.length === 0 && commissions.length === 0 && !isLoading && (
        <div className="admin-no-admins-found">
          <div className="admin-no-admins-icon">👤</div>
          <p>No admins found</p>
        </div>
      )}
    </div>
  )
}

export default Fetchalladmincoms