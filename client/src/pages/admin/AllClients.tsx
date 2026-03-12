import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../store/Toaststore';
import Spinner from '../../components/protected/protectedspinner/Spinner';
import ToastConfirmation from '../../components/confirmationamodal/Confirmationmodal';
import './allclients.css';

interface Client {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  gender: string;
  is_active: boolean;
  date_joined: string;
}

// API returns array directly? Based on your serializer, might be wrapped
interface ApiResponse {
  message: string;
  total_clients: number;
  clients: Client[];
}

type SortField = 'first_name' | 'last_name' | 'email' | 'gender' | 'date_joined';
type SortOrder = 'asc' | 'desc';
type FilterGender = 'all' | 'male' | 'female' | 'other' | 'nonbinary' | 'prefer_not_say';

// Edit state interface
interface EditState {
  id: number | null;
  field: 'first_name' | 'last_name' | 'email' | 'gender' | null;
  value: string;
}

// Toast state interface
interface ToastState {
  isOpen: boolean;
  type: 'delete' | 'bulkDelete' | null;
  title: string;
  message: string;
  clientId?: number;
  clientName?: string;
  clientIds?: number[];
}

// API Error interface
interface ApiError {
  error?: string;
  first_name?: string[];
  last_name?: string[];
  email?: string[];
  gender?: string[];
  non_field_errors?: string[];
  message?: string;
}

const AllClients: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const queryClient = useQueryClient();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('date_joined');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterGender, setFilterGender] = useState<FilterGender>('all');
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
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

  // Fetch clients data using useQuery
  const { data, isLoading, error, refetch } = useQuery<ApiResponse>({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/accounts/clients/fetch/`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch clients');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Delete single client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${apiUrl}/accounts/client/${id}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete client');
      }

      return id;
    },
    onSuccess: () => {
      toast.success('Client deleted successfully!', {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete client', {
        duration: 5000,
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Using the bulk delete endpoint
      const response = await fetch(`${apiUrl}/accounts/clients/bulk/delete/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ client_ids: ids }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk delete failed');
      }

      return ids;
    },
    onSuccess: (ids) => {
      toast.success(`${ids.length} client${ids.length > 1 ? 's' : ''} deleted successfully!`, {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSelectedClients([]);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Bulk delete failed', {
        duration: 5000,
      });
    },
  });

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Client> }) => {
      const response = await fetch(`${apiUrl}/accounts/client/${id}/update/`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Client updated successfully!', {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      refetch();
    },
    onError: (error: ApiError) => {
      if (error.first_name) {
        const errorMsg = Array.isArray(error.first_name) ? error.first_name[0] : error.first_name;
        toast.error(errorMsg, { duration: 5000 });
      } else if (error.last_name) {
        const errorMsg = Array.isArray(error.last_name) ? error.last_name[0] : error.last_name;
        toast.error(errorMsg, { duration: 5000 });
      } else if (error.email) {
        const errorMsg = Array.isArray(error.email) ? error.email[0] : error.email;
        toast.error(errorMsg, { duration: 5000 });
      } else if (error.gender) {
        const errorMsg = Array.isArray(error.gender) ? error.gender[0] : error.gender;
        toast.error(errorMsg, { duration: 5000 });
      } else if (error.non_field_errors) {
        const errorMsg = Array.isArray(error.non_field_errors) 
          ? error.non_field_errors[0] 
          : error.non_field_errors;
        toast.error(errorMsg, { duration: 5000 });
      } else if (error.error) {
        toast.error(error.error, { duration: 5000 });
      } else {
        toast.error('Failed to update client', { duration: 5000 });
      }
    },
  });

  // Extract clients array from response
  const clients = data?.clients || [];

  // Filter, search, and sort clients
  const filteredAndSortedClients = useMemo(() => {
    if (!clients.length) return [];

    let filtered = clients;

    // Apply gender filter
    if (filterGender !== 'all') {
      filtered = filtered.filter(client => client.gender === filterGender);
    }

    // Apply search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(client => {
        const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
        const email = client.email.toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle special cases
      if (sortField === 'date_joined') {
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
  }, [clients, searchTerm, filterGender, sortField, sortOrder]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectedClients.length === filteredAndSortedClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredAndSortedClients.map(client => client.id));
    }
  };

  // Handle select single
  const handleSelectClient = (id: number) => {
    setSelectedClients(prev => {
      if (prev.includes(id)) {
        return prev.filter(clientId => clientId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle inline edit start
  const handleEditStart = (id: number, field: 'first_name' | 'last_name' | 'email' | 'gender', currentValue: string) => {
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

    const client = filteredAndSortedClients.find(c => c.id === editingCell.id);
    if (!client) return;

    // Check if value actually changed
    if (client[editingCell.field] === editingCell.value) {
      setEditingCell({ id: null, field: null, value: '' });
      setEditingId(null);
      return;
    }

    // Validate email format if editing email
    if (editingCell.field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editingCell.value)) {
        toast.warning('Please enter a valid email address', { duration: 5000 });
        return;
      }
    }

    setEditLoading(true);
    try {
      const updateData: any = {};
      updateData[editingCell.field] = editingCell.value;
      
      await updateClientMutation.mutateAsync({
        id: editingCell.id,
        data: updateData
      });
    } catch (error) {
      // Error is handled by mutation onError
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

  // Open toast for delete
  const openDeleteToast = (id: number, firstName: string, lastName: string) => {
    const fullName = `${firstName} ${lastName}`;
    
    setToastState({
      isOpen: true,
      type: 'delete',
      title: 'Delete Client',
      message: `Are you sure you want to delete ${fullName}?`,
      clientId: id,
      clientName: fullName
    });
  };

  // Open toast for bulk delete
  const openBulkDeleteToast = () => {
    if (selectedClients.length === 0) return;

    setToastState({
      isOpen: true,
      type: 'bulkDelete',
      title: 'Delete Multiple Clients',
      message: `Delete ${selectedClients.length} selected client${selectedClients.length > 1 ? 's' : ''}?`,
      clientIds: selectedClients
    });
  };

  // Close toast
  const closeToast = () => {
    setToastState(prev => ({ ...prev, isOpen: false }));
  };

  // Handle toast confirm
  const handleToastConfirm = async () => {
    const { type, clientId, clientIds } = toastState;

    closeToast();

    if (type === 'delete') {
      if (!clientId) return;
      setActionLoading(clientId);
      try {
        await deleteClientMutation.mutateAsync(clientId);
      } catch (error) {
        // Error is handled by mutation
      } finally {
        setActionLoading(null);
      }
    }
    else if (type === 'bulkDelete') {
      if (!clientIds) return;
      setBulkActionLoading(true);
      try {
        await bulkDeleteMutation.mutateAsync(clientIds);
      } catch (error) {
        // Error is handled by mutation
      } finally {
        setBulkActionLoading(false);
      }
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    toast.info('Refreshing clients...', { duration: 2000 });
    refetch();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="clients-loading-container">
        <Spinner 
          size="large" 
          color="#c41e3a" 
          message="Loading clients..." 
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="clients-error-container">
        <div className="clients-error-card">
          <span className="clients-error-icon">👤</span>
          <h3>Failed to Load Clients</h3>
          <p>There was an error loading the client list. Please try again.</p>
          <button className="clients-retry-btn" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="clients-container">
      {/* Toast Confirmation */}
      <ToastConfirmation
        isOpen={toastState.isOpen}
        title={toastState.title}
        message={toastState.message}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleToastConfirm}
        onCancel={closeToast}
        autoClose={false}
      />

      <div className="clients-header">
        <div className="clients-header-left">
          <h2>👥 Client Management</h2>
          <p>Total Clients: {data?.total_clients || 0}</p>
        </div>
        <button 
          className="clients-refresh-btn"
          onClick={handleRefresh}
          title="Refresh data"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Refresh
        </button>
      </div>

      {/* Search and Filters Grid */}
      <div className="clients-filters-grid">
        {/* Search - takes most space */}
        <div className="clients-search-wrapper">
          <input
            type="text"
            placeholder="🔍 Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="clients-search-input"
          />
          {searchTerm && (
            <button 
              className="clients-clear-search"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Gender Filter Dropdown */}
        <div className="clients-filter-wrapper">
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value as FilterGender)}
            className="clients-filter-select"
          >
            <option value="all">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="nonbinary">Non-binary</option>
            <option value="prefer_not_say">Prefer not to say</option>
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="clients-filter-wrapper">
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
              setSortField(field);
              setSortOrder(order);
            }}
            className="clients-filter-select"
          >
            <option value="date_joined-desc">Newest First</option>
            <option value="date_joined-asc">Oldest First</option>
            <option value="first_name-asc">Name A-Z</option>
            <option value="first_name-desc">Name Z-A</option>
            <option value="last_name-asc">Last Name A-Z</option>
            <option value="last_name-desc">Last Name Z-A</option>
            <option value="email-asc">Email A-Z</option>
            <option value="email-desc">Email Z-A</option>
            <option value="gender-asc">Gender A-Z</option>
            <option value="gender-desc">Gender Z-A</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filterGender !== 'all' || searchTerm) && (
        <div className="clients-active-filters">
          <span className="clients-active-filters-label">Active Filters:</span>
          {filterGender !== 'all' && (
            <span className="clients-filter-tag">
              Gender: {filterGender}
              <button onClick={() => setFilterGender('all')}>✕</button>
            </span>
          )}
          {searchTerm && (
            <span className="clients-filter-tag">
              Search: "{searchTerm}"
              <button onClick={() => setSearchTerm('')}>✕</button>
            </span>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="clients-results-count">
        Showing {filteredAndSortedClients.length} of {data?.total_clients || 0} clients
      </div>

      {/* Table Container with Scroll */}
      <div className="clients-table-container">
        <table className="clients-table">
          <thead>
            <tr>
              <th className="clients-checkbox-cell">
                <input
                  type="checkbox"
                  checked={selectedClients.length === filteredAndSortedClients.length && filteredAndSortedClients.length > 0}
                  onChange={handleSelectAll}
                  className="clients-checkbox-input"
                />
              </th>
              <th>ID</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Gender</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedClients.length === 0 ? (
              <tr>
                <td colSpan={9} className="clients-no-results">
                  <div className="clients-no-results-content">
                    <span className="clients-no-results-icon">👤</span>
                    <p>No clients found matching your criteria</p>
                    <button 
                      className="clients-clear-filters-btn"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterGender('all');
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
              filteredAndSortedClients.map((client) => (
                <tr key={client.id} className={selectedClients.includes(client.id) ? 'clients-selected-row' : ''}>
                  <td className="clients-checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.id)}
                      onChange={() => handleSelectClient(client.id)}
                      className="clients-checkbox-input"
                    />
                  </td>

                  {/* ID */}
                  <td>
                    <span className="clients-id-badge">#{client.id}</span>
                  </td>

                  {/* First Name - Editable */}
                  <td>
                    {editingCell.id === client.id && editingCell.field === 'first_name' ? (
                      <div className="clients-edit-cell">
                        <input
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => handleEditChange(e.target.value)}
                          onKeyDown={handleEditKeyPress}
                          onBlur={handleEditSave}
                          autoFocus
                          className="clients-edit-input"
                          disabled={editLoading}
                        />
                        {editLoading && (
                          <div className="clients-edit-loading-spinner">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="clients-editable-field"
                        onDoubleClick={() => handleEditStart(client.id, 'first_name', client.first_name)}
                      >
                        {actionLoading === client.id ? (
                          <div className="clients-action-loading">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        ) : (
                          <>
                            <span className="clients-field-value">{client.first_name}</span>
                            <span className="clients-edit-icon">✏️</span>
                          </>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Last Name - Editable */}
                  <td>
                    {editingCell.id === client.id && editingCell.field === 'last_name' ? (
                      <div className="clients-edit-cell">
                        <input
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => handleEditChange(e.target.value)}
                          onKeyDown={handleEditKeyPress}
                          onBlur={handleEditSave}
                          autoFocus
                          className="clients-edit-input"
                          disabled={editLoading}
                        />
                        {editLoading && (
                          <div className="clients-edit-loading-spinner">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="clients-editable-field"
                        onDoubleClick={() => handleEditStart(client.id, 'last_name', client.last_name)}
                      >
                        {actionLoading === client.id ? (
                          <div className="clients-action-loading">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        ) : (
                          <>
                            <span className="clients-field-value">{client.last_name}</span>
                            <span className="clients-edit-icon">✏️</span>
                          </>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Email - Editable */}
                  <td>
                    {editingCell.id === client.id && editingCell.field === 'email' ? (
                      <div className="clients-edit-cell">
                        <input
                          type="email"
                          value={editingCell.value}
                          onChange={(e) => handleEditChange(e.target.value)}
                          onKeyDown={handleEditKeyPress}
                          onBlur={handleEditSave}
                          autoFocus
                          className="clients-edit-input"
                          disabled={editLoading}
                        />
                        {editLoading && (
                          <div className="clients-edit-loading-spinner">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="clients-editable-field"
                        onDoubleClick={() => handleEditStart(client.id, 'email', client.email)}
                      >
                        {actionLoading === client.id ? (
                          <div className="clients-action-loading">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        ) : (
                          <>
                            <span className="clients-email-text">{client.email}</span>
                            <span className="clients-edit-icon">✏️</span>
                          </>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Gender - Editable with dropdown */}
                  <td>
                    {editingCell.id === client.id && editingCell.field === 'gender' ? (
                      <div className="clients-edit-cell">
                        <select
                          value={editingCell.value || ''}
                          onChange={(e) => handleEditChange(e.target.value)}
                          onBlur={handleEditSave}
                          autoFocus
                          className="clients-edit-select"
                          disabled={editLoading}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="nonbinary">Non-binary</option>
                          <option value="prefer_not_say">Prefer not to say</option>
                        </select>
                        {editLoading && (
                          <div className="clients-edit-loading-spinner">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="clients-editable-field"
                        onDoubleClick={() => handleEditStart(client.id, 'gender', client.gender || '')}
                      >
                        {actionLoading === client.id ? (
                          <div className="clients-action-loading">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        ) : (
                          <>
                            <span className={`clients-gender-badge clients-gender-${client.gender || 'prefer_not_say'}`}>
                              {client.gender || 'Not specified'}
                            </span>
                            <span className="clients-edit-icon">✏️</span>
                          </>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Status - Always Active (no toggle) */}
                  <td>
                    <span className="clients-status-badge">
                      Active
                    </span>
                  </td>

                  {/* Joined Date */}
                  <td>
                    <div className="clients-date-cell">
                      <span className="clients-date-text">{formatDate(client.date_joined)}</span>
                    </div>
                  </td>

                  {/* Actions - Only Delete */}
                  <td className="clients-actions-cell">
                    {actionLoading === client.id ? (
                      <div className="clients-action-loading">
                        <Spinner size="small" color="#c41e3a" />
                      </div>
                    ) : (
                      <button
                        className="clients-action-btn clients-delete-btn"
                        onClick={() => openDeleteToast(client.id, client.first_name, client.last_name)}
                        disabled={bulkActionLoading || editLoading || editingId !== null}
                        title="Delete client"
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions (shown when items are selected) */}
      {selectedClients.length > 0 && (
        <div className="clients-bulk-actions">
          <span className="clients-selected-count">
            {selectedClients.length} client{selectedClients.length > 1 ? 's' : ''} selected
          </span>
          <div className="clients-bulk-buttons">
            {bulkActionLoading ? (
              <div className="clients-bulk-loading">
                <Spinner size="medium" color="#c41e3a" message="Processing..." />
              </div>
            ) : (
              <button 
                className="clients-bulk-btn clients-bulk-delete"
                onClick={openBulkDeleteToast}
                disabled={editLoading || editingId !== null}
              >
                🗑️ Delete Selected
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllClients;