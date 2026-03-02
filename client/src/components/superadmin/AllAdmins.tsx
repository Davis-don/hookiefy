import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Spinner from '../../components/protected/protectedspinner/Spinner';
import ToastConfirmation from '../confirmationamodal/Confirmationmodal';
import { 
  updateAdmin,
  toggleAdminStatus, 
  deleteAdmin, 
  bulkDeactivateAdmins, 
  bulkDeleteAdmins,
} from '../../utils/adminactions';
import './alladmins.css';

interface Admin {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  gender: string;
  is_active: boolean;
  date_joined: string;
}

interface ApiResponse {
  message: string;
  total_admins: number;
  admins: Admin[];
}

type SortField = 'first_name' | 'last_name' | 'gender' | 'is_active' | 'date_joined';
type SortOrder = 'asc' | 'desc';
type FilterGender = 'all' | 'male' | 'female' | 'other' | 'nonbinary' | 'prefer_not_say';
type FilterStatus = 'all' | 'active' | 'inactive';

// Edit state interface
interface EditState {
  id: number | null;
  field: 'first_name' | 'last_name' | 'gender' | null;
  value: string;
}

// Toast state interface
interface ToastState {
  isOpen: boolean;
  type: 'delete' | 'deactivate' | 'activate' | 'bulkDelete' | 'bulkDeactivate' | null;
  title: string;
  message: string;
  adminId?: number;
  adminName?: string;
  adminIds?: number[];
  currentStatus?: boolean;
}

const AllAdmins: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('date_joined');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterGender, setFilterGender] = useState<FilterGender>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedAdmins, setSelectedAdmins] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState<boolean>(false);
  
  // Inline edit states
  const [editingCell, setEditingCell] = useState<EditState>({ id: null, field: null, value: '' });
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Toast state
  const [toastState, setToastState] = useState<ToastState>({
    isOpen: false,
    type: null,
    title: '',
    message: ''
  });

  // Fetch admins data using useQuery
  const { data, isLoading, error, refetch } = useQuery<ApiResponse>({
    queryKey: ['admins'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/accounts/admins/fetch/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admins');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Filter, search, and sort admins
  const filteredAndSortedAdmins = useMemo(() => {
    if (!data?.admins) return [];
    
    let filtered = data.admins;
    
    // Apply gender filter
    if (filterGender !== 'all') {
      filtered = filtered.filter(admin => admin.gender === filterGender);
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(admin => 
        filterStatus === 'active' ? admin.is_active : !admin.is_active
      );
    }
    
    // Apply search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(admin => {
        const fullName = `${admin.first_name} ${admin.last_name}`.toLowerCase();
        const email = admin.email.toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Handle special cases
      if (sortField === 'is_active') {
        aValue = a.is_active ? 1 : 0;
        bValue = b.is_active ? 1 : 0;
      } else if (sortField === 'date_joined') {
        aValue = new Date(a.date_joined).getTime();
        bValue = new Date(b.date_joined).getTime();
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [data?.admins, searchTerm, filterGender, filterStatus, sortField, sortOrder]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectedAdmins.length === filteredAndSortedAdmins.length) {
      setSelectedAdmins([]);
    } else {
      setSelectedAdmins(filteredAndSortedAdmins.map(admin => admin.id));
    }
  };

  // Handle select single
  const handleSelectAdmin = (id: number) => {
    setSelectedAdmins(prev => {
      if (prev.includes(id)) {
        return prev.filter(adminId => adminId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle inline edit start
  const handleEditStart = (id: number, field: 'first_name' | 'last_name' | 'gender', currentValue: string) => {
    setEditingCell({ id, field, value: currentValue });
    setEditingId(id);
  };

  // Handle inline edit change
  const handleEditChange = (value: string) => {
    setEditingCell(prev => ({ ...prev, value }));
  };

  // Handle inline edit save
  const handleEditSave = async () => {
    if (!editingCell.id || !editingCell.field) return;

    const admin = filteredAndSortedAdmins.find(a => a.id === editingCell.id);
    if (!admin) return;

    // Check if value actually changed
    if (admin[editingCell.field] === editingCell.value) {
      setEditingCell({ id: null, field: null, value: '' });
      setEditingId(null);
      return;
    }

    setEditLoading(true);
    try {
      const updateData: any = {};
      updateData[editingCell.field] = editingCell.value;
      
      await updateAdmin(editingCell.id, updateData);
      await refetch(); // Refresh the list
    } catch (error) {
      console.error('Edit failed:', error);
    } finally {
      setEditLoading(false);
      setEditingCell({ id: null, field: null, value: '' });
      setEditingId(null);
    }
  };

  // Handle inline edit cancel
  const handleEditCancel = () => {
    setEditingCell({ id: null, field: null, value: '' });
    setEditingId(null);
  };

  // Handle key press in edit input
  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  // Open toast for deactivate/activate
  const openStatusToast = (id: number, currentStatus: boolean, firstName: string, lastName: string) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    const fullName = `${firstName} ${lastName}`;
    
    setToastState({
      isOpen: true,
      type: currentStatus ? 'deactivate' : 'activate',
      title: `${currentStatus ? 'Deactivate' : 'Activate'} Admin`,
      message: `Are you sure you want to ${action} ${fullName}?`,
      adminId: id,
      adminName: fullName,
      currentStatus
    });
  };

  // Open toast for delete
  const openDeleteToast = (id: number, firstName: string, lastName: string) => {
    const fullName = `${firstName} ${lastName}`;
    
    setToastState({
      isOpen: true,
      type: 'delete',
      title: 'Delete Admin',
      message: `Are you sure you want to delete ${fullName}?`,
      adminId: id,
      adminName: fullName
    });
  };

  // Open toast for bulk deactivate
  const openBulkDeactivateToast = () => {
    if (selectedAdmins.length === 0) return;
    
    setToastState({
      isOpen: true,
      type: 'bulkDeactivate',
      title: 'Deactivate Multiple',
      message: `Deactivate ${selectedAdmins.length} selected admin${selectedAdmins.length > 1 ? 's' : ''}?`,
      adminIds: selectedAdmins
    });
  };

  // Open toast for bulk delete
  const openBulkDeleteToast = () => {
    if (selectedAdmins.length === 0) return;
    
    setToastState({
      isOpen: true,
      type: 'bulkDelete',
      title: 'Delete Multiple',
      message: `Delete ${selectedAdmins.length} selected admin${selectedAdmins.length > 1 ? 's' : ''}?`,
      adminIds: selectedAdmins
    });
  };

  // Close toast
  const closeToast = () => {
    setToastState(prev => ({ ...prev, isOpen: false }));
  };

  // Handle toast confirm
  const handleToastConfirm = async () => {
    const { type, adminId, adminIds } = toastState;
    
    closeToast();
    
    if (type === 'deactivate' || type === 'activate') {
      if (!adminId) return;
      setActionLoading(adminId);
      try {
        await toggleAdminStatus(adminId, type === 'deactivate');
        await refetch();
      } catch (error) {
        console.error('Toggle status failed:', error);
      } finally {
        setActionLoading(null);
      }
    }
    else if (type === 'delete') {
      if (!adminId) return;
      setActionLoading(adminId);
      try {
        await deleteAdmin(adminId);
        await refetch();
      } catch (error) {
        console.error('Delete failed:', error);
      } finally {
        setActionLoading(null);
      }
    }
    else if (type === 'bulkDeactivate') {
      if (!adminIds) return;
      setBulkActionLoading(true);
      try {
        await bulkDeactivateAdmins(adminIds);
        setSelectedAdmins([]);
        await refetch();
      } catch (error) {
        console.error('Bulk deactivate failed:', error);
      } finally {
        setBulkActionLoading(false);
      }
    }
    else if (type === 'bulkDelete') {
      if (!adminIds) return;
      setBulkActionLoading(true);
      try {
        await bulkDeleteAdmins(adminIds);
        setSelectedAdmins([]);
        await refetch();
      } catch (error) {
        console.error('Bulk delete failed:', error);
      } finally {
        setBulkActionLoading(false);
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="admin-clients-loading-container">
        <Spinner 
          size="large" 
          color="#c41e3a" 
          message="Loading admins..." 
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="admin-clients-error-container">
        <div className="error-card">
          <span className="error-icon">💔</span>
          <h3>Failed to Load Admins</h3>
          <p>There was an error loading the admin list. Please try again.</p>
          <button className="retry-btn" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-clients-container">
      {/* Toast Confirmation */}
      <ToastConfirmation
        isOpen={toastState.isOpen}
        title={toastState.title}
        message={toastState.message}
        confirmText={toastState.type?.includes('delete') ? 'Delete' : 'Confirm'}
        cancelText="Cancel"
        type={toastState.type?.includes('delete') ? 'danger' : 'warning'}
        onConfirm={handleToastConfirm}
        onCancel={closeToast}
        autoClose={false}
      />

      <div className="admin-clients-header">
        <h2>Admin Management</h2>
        <p>Total Admins: {data?.total_admins || 0}</p>
      </div>

      {/* Search and Filters Grid */}
      <div className="filters-grid">
        {/* Search - takes most space */}
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="🔍 Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Gender Filter Dropdown */}
        <div className="filter-wrapper">
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value as FilterGender)}
            className="filter-select"
          >
            <option value="all">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="nonbinary">Non-binary</option>
            <option value="prefer_not_say">Prefer not to say</option>
          </select>
        </div>

        {/* Status Filter Dropdown */}
        <div className="filter-wrapper">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="filter-wrapper sort-wrapper">
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
              setSortField(field);
              setSortOrder(order);
            }}
            className="filter-select"
          >
            <option value="date_joined-desc">Newest First</option>
            <option value="date_joined-asc">Oldest First</option>
            <option value="first_name-asc">Name A-Z</option>
            <option value="first_name-desc">Name Z-A</option>
            <option value="last_name-asc">Last Name A-Z</option>
            <option value="last_name-desc">Last Name Z-A</option>
            <option value="gender-asc">Gender A-Z</option>
            <option value="gender-desc">Gender Z-A</option>
            <option value="is_active-desc">Active First</option>
            <option value="is_active-asc">Inactive First</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filterGender !== 'all' || filterStatus !== 'all' || searchTerm) && (
        <div className="active-filters">
          <span className="active-filters-label">Active Filters:</span>
          {filterGender !== 'all' && (
            <span className="filter-tag">
              Gender: {filterGender}
              <button onClick={() => setFilterGender('all')}>✕</button>
            </span>
          )}
          {filterStatus !== 'all' && (
            <span className="filter-tag">
              Status: {filterStatus}
              <button onClick={() => setFilterStatus('all')}>✕</button>
            </span>
          )}
          {searchTerm && (
            <span className="filter-tag">
              Search: "{searchTerm}"
              <button onClick={() => setSearchTerm('')}>✕</button>
            </span>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="results-count">
        Showing {filteredAndSortedAdmins.length} of {data?.total_admins || 0} admins
      </div>

      {/* Table Container with Scroll */}
      <div className="table-container">
        <table className="admins-table">
          <thead>
            <tr>
              <th className="checkbox-cell">
                <input
                  type="checkbox"
                  checked={selectedAdmins.length === filteredAndSortedAdmins.length && filteredAndSortedAdmins.length > 0}
                  onChange={handleSelectAll}
                  className="checkbox-input"
                />
              </th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Gender</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedAdmins.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-results">
                  <div className="no-results-content">
                    <span className="no-results-icon">😢</span>
                    <p>No admins found matching your criteria</p>
                    <button 
                      className="clear-filters-btn"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterGender('all');
                        setFilterStatus('all');
                        setSortField('date_joined');
                        setSortOrder('desc');
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedAdmins.map((admin) => (
                <tr key={admin.id} className={selectedAdmins.includes(admin.id) ? 'selected-row' : ''}>
                  <td className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedAdmins.includes(admin.id)}
                      onChange={() => handleSelectAdmin(admin.id)}
                      className="checkbox-input"
                    />
                  </td>
                  
                  {/* First Name - Editable */}
                  <td>
                    {editingCell.id === admin.id && editingCell.field === 'first_name' ? (
                      <div className="edit-cell">
                        <input
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => handleEditChange(e.target.value)}
                          onKeyDown={handleEditKeyPress}
                          onBlur={handleEditSave}
                          autoFocus
                          className="edit-input"
                          disabled={editLoading}
                        />
                        {editLoading && (
                          <div className="edit-loading-spinner">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="editable-field"
                        onDoubleClick={() => handleEditStart(admin.id, 'first_name', admin.first_name)}
                      >
                        {actionLoading === admin.id ? (
                          <div className="action-loading">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        ) : (
                          <>
                            <span className="field-value">{admin.first_name}</span>
                            <span className="edit-icon">✏️</span>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  
                  {/* Last Name - Editable */}
                  <td>
                    {editingCell.id === admin.id && editingCell.field === 'last_name' ? (
                      <div className="edit-cell">
                        <input
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => handleEditChange(e.target.value)}
                          onKeyDown={handleEditKeyPress}
                          onBlur={handleEditSave}
                          autoFocus
                          className="edit-input"
                          disabled={editLoading}
                        />
                        {editLoading && (
                          <div className="edit-loading-spinner">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="editable-field"
                        onDoubleClick={() => handleEditStart(admin.id, 'last_name', admin.last_name)}
                      >
                        {actionLoading === admin.id ? (
                          <div className="action-loading">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        ) : (
                          <>
                            <span className="field-value">{admin.last_name}</span>
                            <span className="edit-icon">✏️</span>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  
                  {/* Gender - Editable with dropdown */}
                  <td>
                    {editingCell.id === admin.id && editingCell.field === 'gender' ? (
                      <div className="edit-cell">
                        <select
                          value={editingCell.value}
                          onChange={(e) => handleEditChange(e.target.value)}
                          onBlur={handleEditSave}
                          autoFocus
                          className="edit-select"
                          disabled={editLoading}
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="nonbinary">Non-binary</option>
                          <option value="prefer_not_say">Prefer not to say</option>
                        </select>
                        {editLoading && (
                          <div className="edit-loading-spinner">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="editable-field"
                        onDoubleClick={() => handleEditStart(admin.id, 'gender', admin.gender)}
                      >
                        {actionLoading === admin.id ? (
                          <div className="action-loading">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        ) : (
                          <>
                            <span className={`gender-badge gender-${admin.gender}`}>
                              {admin.gender}
                            </span>
                            <span className="edit-icon">✏️</span>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  
                  {/* Status */}
                  <td>
                    {actionLoading === admin.id ? (
                      <div className="action-loading">
                        <Spinner size="small" color="#c41e3a" />
                      </div>
                    ) : (
                      <span className={`status-badge ${admin.is_active ? 'status-active' : 'status-inactive'}`}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  
                  {/* Actions */}
                  <td className="actions-cell">
                    {actionLoading === admin.id ? (
                      <div className="action-loading">
                        <Spinner size="small" color="#c41e3a" />
                      </div>
                    ) : (
                      <>
                        <button
                          className={`action-btn ${admin.is_active ? 'deactivate-btn' : 'activate-btn'}`}
                          onClick={() => openStatusToast(admin.id, admin.is_active, admin.first_name, admin.last_name)}
                          disabled={bulkActionLoading || editLoading || editingId !== null}
                        >
                          {admin.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => openDeleteToast(admin.id, admin.first_name, admin.last_name)}
                          disabled={bulkActionLoading || editLoading || editingId !== null}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions (shown when items are selected) */}
      {selectedAdmins.length > 0 && (
        <div className="bulk-actions">
          <span className="selected-count">
            {selectedAdmins.length} admin{selectedAdmins.length > 1 ? 's' : ''} selected
          </span>
          <div className="bulk-buttons">
            {bulkActionLoading ? (
              <div className="bulk-loading">
                <Spinner size="medium" color="#c41e3a" message="Processing..." />
              </div>
            ) : (
              <>
                <button 
                  className="bulk-btn bulk-deactivate"
                  onClick={openBulkDeactivateToast}
                  disabled={editLoading || editingId !== null}
                >
                  🔴 Deactivate Selected
                </button>
                <button 
                  className="bulk-btn bulk-delete"
                  onClick={openBulkDeleteToast}
                  disabled={editLoading || editingId !== null}
                >
                  🗑️ Delete Selected
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllAdmins;