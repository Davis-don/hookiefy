import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../store/Toaststore';
import Spinner from '../protected/protectedspinner/Spinner';
import ToastConfirmation from '../confirmationamodal/Confirmationmodal';
import './allconfig.css'

interface Config {
  id: number;
  admin: number;
  admin_email: string;
  commission_percentage: string;
  created_at: string;
  updated_at: string;
}

// API returns array directly, not wrapped in an object


type SortField = 'admin_email' | 'commission_percentage' | 'created_at' | 'updated_at';
type SortOrder = 'asc' | 'desc';

// Edit state interface
interface EditState {
  id: number | null;
  field: 'commission_percentage' | null;
  value: string;
}

// Toast state interface
interface ToastState {
  isOpen: boolean;
  type: 'delete' | 'bulkDelete' | null;
  title: string;
  message: string;
  configId?: number;
  configEmail?: string;
  configIds?: number[];
}

// API Error interface
interface ApiError {
  error?: string;
  commission_percentage?: string[];
  non_field_errors?: string[];
  message?: string;
}

const AllConfigs: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const queryClient = useQueryClient();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedConfigs, setSelectedConfigs] = useState<number[]>([]);
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

  // Fetch configs data using useQuery
  const { data: configs = [], isLoading, error, refetch } = useQuery<Config[]>({
    queryKey: ['adminConfigs'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/superconfig/all/`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch configurations');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Delete single config mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${apiUrl}/superconfig/delete/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete configuration');
      }

      return id;
    },
    onSuccess: () => {
      toast.success('Configuration deleted successfully!', {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['adminConfigs'] });
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete configuration', {
        duration: 5000,
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(
        ids.map(id => 
          fetch(`${apiUrl}/superconfig/delete/${id}/`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
            },
          }).then(async res => {
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || `Failed to delete config ${id}`);
            }
            return id;
          })
        )
      );

      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        throw new Error(`${failed} configuration(s) failed to delete`);
      }

      return ids;
    },
    onSuccess: (ids) => {
      toast.success(`${ids.length} configuration${ids.length > 1 ? 's' : ''} deleted successfully!`, {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['adminConfigs'] });
      setSelectedConfigs([]);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Bulk delete failed', {
        duration: 5000,
      });
    },
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Config> }) => {
      const response = await fetch(`${apiUrl}/superconfig/update/${id}/`, {
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
      toast.success('Configuration updated successfully!', {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['adminConfigs'] });
      refetch();
    },
    onError: (error: ApiError) => {
      if (error.commission_percentage) {
        const errorMsg = Array.isArray(error.commission_percentage) 
          ? error.commission_percentage[0] 
          : error.commission_percentage;
        toast.error(errorMsg, { duration: 5000 });
      } else if (error.non_field_errors) {
        const errorMsg = Array.isArray(error.non_field_errors) 
          ? error.non_field_errors[0] 
          : error.non_field_errors;
        toast.error(errorMsg, { duration: 5000 });
      } else if (error.error) {
        toast.error(error.error, { duration: 5000 });
      } else {
        toast.error('Failed to update configuration', { duration: 5000 });
      }
    },
  });

  // Filter, search, and sort configs
  const filteredAndSortedConfigs = useMemo(() => {
    if (!configs.length) return [];

    let filtered = configs;

    // Apply search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(config => 
        config.admin_email.toLowerCase().includes(searchLower) ||
        config.commission_percentage.includes(searchLower)
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle special cases
      if (sortField === 'created_at' || sortField === 'updated_at') {
        aValue = new Date(a[sortField]).getTime();
        bValue = new Date(b[sortField]).getTime();
      } else if (sortField === 'commission_percentage') {
        aValue = parseFloat(a.commission_percentage);
        bValue = parseFloat(b.commission_percentage);
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
  }, [configs, searchTerm, sortField, sortOrder]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectedConfigs.length === filteredAndSortedConfigs.length) {
      setSelectedConfigs([]);
    } else {
      setSelectedConfigs(filteredAndSortedConfigs.map(config => config.id));
    }
  };

  // Handle select single
  const handleSelectConfig = (id: number) => {
    setSelectedConfigs(prev => {
      if (prev.includes(id)) {
        return prev.filter(configId => configId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle inline edit start
  const handleEditStart = (id: number, field: 'commission_percentage', currentValue: string) => {
    setEditingCell({ id, field, value: currentValue });
    setEditingId(id);
  };

  // Handle inline edit change
  const handleEditChange = (value: string) => {
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setEditingCell(prev => ({ ...prev, value }));
    }
  };

  // Handle inline edit save
  const handleEditSave = async () => {
    if (!editingCell.id || !editingCell.field) return;

    const config = filteredAndSortedConfigs.find(c => c.id === editingCell.id);
    if (!config) return;

    // Check if value actually changed
    if (config.commission_percentage === editingCell.value) {
      setEditingCell({ id: null, field: null, value: '' });
      setEditingId(null);
      return;
    }

    // Validate commission percentage
    const percentage = parseFloat(editingCell.value);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast.warning('Commission percentage must be between 0 and 100', { duration: 5000 });
      return;
    }

    setEditLoading(true);
    try {
      await updateConfigMutation.mutateAsync({
        id: editingCell.id,
        data: { commission_percentage: editingCell.value }
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
  const openDeleteToast = (id: number, email: string) => {
    setToastState({
      isOpen: true,
      type: 'delete',
      title: 'Delete Configuration',
      message: `Are you sure you want to delete configuration for ${email}?`,
      configId: id,
      configEmail: email
    });
  };

  // Open toast for bulk delete
  const openBulkDeleteToast = () => {
    if (selectedConfigs.length === 0) return;

    setToastState({
      isOpen: true,
      type: 'bulkDelete',
      title: 'Delete Multiple',
      message: `Delete ${selectedConfigs.length} selected configuration${selectedConfigs.length > 1 ? 's' : ''}?`,
      configIds: selectedConfigs
    });
  };

  // Close toast
  const closeToast = () => {
    setToastState(prev => ({ ...prev, isOpen: false }));
  };

  // Handle toast confirm
  const handleToastConfirm = async () => {
    const { type, configId, configIds } = toastState;

    closeToast();

    if (type === 'delete') {
      if (!configId) return;
      setActionLoading(configId);
      try {
        await deleteConfigMutation.mutateAsync(configId);
      } catch (error) {
        // Error is handled by mutation
      } finally {
        setActionLoading(null);
      }
    }
    else if (type === 'bulkDelete') {
      if (!configIds) return;
      setBulkActionLoading(true);
      try {
        await bulkDeleteMutation.mutateAsync(configIds);
      } catch (error) {
        // Error is handled by mutation
      } finally {
        setBulkActionLoading(false);
      }
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    toast.info('Refreshing configurations...', { duration: 2000 });
    refetch();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="configs-loading-container">
        <Spinner 
          size="large" 
          color="#c41e3a" 
          message="Loading configurations..." 
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="configs-error-container">
        <div className="error-card">
          <span className="error-icon">⚙️</span>
          <h3>Failed to Load Configurations</h3>
          <p>There was an error loading the configurations. Please try again.</p>
          <button className="retry-btn" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="configs-container">
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

      <div className="configs-header">
        <div className="header-left">
          <h2>⚙️ System Configurations</h2>
          <p>Total Configs: {configs.length || 0}</p>
        </div>
        <button 
          className="refresh-btn"
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
      <div className="configs-filters-grid">
        {/* Search - takes most space */}
        <div className="configs-search-wrapper">
          <input
            type="text"
            placeholder="🔍 Search by email or configuration value..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="configs-search-input"
          />
          {searchTerm && (
            <button 
              className="configs-clear-search"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="configs-filter-wrapper">
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
              setSortField(field);
              setSortOrder(order);
            }}
            className="configs-filter-select"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="admin_email-asc">Email A-Z</option>
            <option value="admin_email-desc">Email Z-A</option>
            <option value="commission_percentage-desc">Highest Value</option>
            <option value="commission_percentage-asc">Lowest Value</option>
            <option value="updated_at-desc">Recently Updated</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {searchTerm && (
        <div className="configs-active-filters">
          <span className="configs-active-filters-label">Active Filters:</span>
          {searchTerm && (
            <span className="configs-filter-tag">
              Search: "{searchTerm}"
              <button onClick={() => setSearchTerm('')}>✕</button>
            </span>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="configs-results-count">
        Showing {filteredAndSortedConfigs.length} of {configs.length || 0} configurations
      </div>

      {/* Table Container with Scroll */}
      <div className="configs-table-container">
        <table className="configs-table">
          <thead>
            <tr>
              <th className="configs-checkbox-cell">
                <input
                  type="checkbox"
                  checked={selectedConfigs.length === filteredAndSortedConfigs.length && filteredAndSortedConfigs.length > 0}
                  onChange={handleSelectAll}
                  className="configs-checkbox-input"
                />
              </th>
              <th>Admin Email</th>
              <th>Admin ID</th>
              <th>Configuration Value</th>
              <th>Created</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedConfigs.length === 0 ? (
              <tr>
                <td colSpan={7} className="configs-no-results">
                  <div className="configs-no-results-content">
                    <span className="configs-no-results-icon">⚙️</span>
                    <p>No configurations found matching your criteria</p>
                    <button 
                      className="configs-clear-filters-btn"
                      onClick={() => {
                        setSearchTerm('');
                        setSortField('created_at');
                        setSortOrder('desc');
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedConfigs.map((config) => (
                <tr key={config.id} className={selectedConfigs.includes(config.id) ? 'configs-selected-row' : ''}>
                  <td className="configs-checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedConfigs.includes(config.id)}
                      onChange={() => handleSelectConfig(config.id)}
                      className="configs-checkbox-input"
                    />
                  </td>

                  {/* Admin Email */}
                  <td>
                    <div className="configs-email-cell">
                      <span className="configs-email-text">{config.admin_email}</span>
                    </div>
                  </td>

                  {/* Admin ID */}
                  <td>
                    <span className="configs-id-badge">#{config.admin}</span>
                  </td>

                  {/* Configuration Value - Editable */}
                  <td>
                    {editingCell.id === config.id && editingCell.field === 'commission_percentage' ? (
                      <div className="configs-edit-cell">
                        <input
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => handleEditChange(e.target.value)}
                          onKeyDown={handleEditKeyPress}
                          onBlur={handleEditSave}
                          autoFocus
                          className="configs-edit-input"
                          disabled={editLoading}
                          placeholder="Enter value"
                        />
                        <span className="configs-edit-suffix">%</span>
                        {editLoading && (
                          <div className="configs-edit-loading-spinner">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="configs-editable-field"
                        onDoubleClick={() => handleEditStart(config.id, 'commission_percentage', config.commission_percentage)}
                      >
                        {actionLoading === config.id ? (
                          <div className="configs-action-loading">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        ) : (
                          <>
                            <span className="configs-percentage-value">
                              {config.commission_percentage}%
                            </span>
                            <span className="configs-edit-icon">✏️</span>
                          </>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Created At */}
                  <td>
                    <div className="configs-date-cell">
                      <span className="configs-date-text">{formatDate(config.created_at)}</span>
                    </div>
                  </td>

                  {/* Updated At */}
                  <td>
                    <div className="configs-date-cell">
                      <span className="configs-date-text">{formatDate(config.updated_at)}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="configs-actions-cell">
                    {actionLoading === config.id ? (
                      <div className="configs-action-loading">
                        <Spinner size="small" color="#c41e3a" />
                      </div>
                    ) : (
                      <>
                        <button
                          className="configs-action-btn configs-delete-btn"
                          onClick={() => openDeleteToast(config.id, config.admin_email)}
                          disabled={bulkActionLoading || editLoading || editingId !== null}
                          title="Delete configuration"
                        >
                          🗑️
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
      {selectedConfigs.length > 0 && (
        <div className="configs-bulk-actions">
          <span className="configs-selected-count">
            {selectedConfigs.length} configuration{selectedConfigs.length > 1 ? 's' : ''} selected
          </span>
          <div className="configs-bulk-buttons">
            {bulkActionLoading ? (
              <div className="configs-bulk-loading">
                <Spinner size="medium" color="#c41e3a" message="Processing..." />
              </div>
            ) : (
              <button 
                className="configs-bulk-btn configs-bulk-delete"
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

export default AllConfigs;