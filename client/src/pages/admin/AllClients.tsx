import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

interface ApiResponse {
  message: string;
  total_clients: number;
  clients: Client[];
}

type SortField = 'first_name' | 'last_name' | 'email' | 'gender' | 'date_joined';
type SortOrder = 'asc' | 'desc';
type FilterGender = 'all' | 'male' | 'female' | 'other' | 'nonbinary' | 'prefer_not_say';

interface EditState {
  id: number | null;
  field: 'first_name' | 'last_name' | 'email' | 'gender' | null;
  value: string;
}

interface ToastState {
  isOpen: boolean;
  type: 'delete' | 'bulkDelete' | null;
  title: string;
  message: string;
  clientId?: number;
  clientName?: string;
  clientIds?: number[];
}

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

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('date_joined');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterGender, setFilterGender] = useState<FilterGender>('all');
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState<boolean>(false);

  const [editingCell, setEditingCell] = useState<EditState>({
    id: null,
    field: null,
    value: '',
  });
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [toastState, setToastState] = useState<ToastState>({
    isOpen: false,
    type: null,
    title: '',
    message: '',
  });

  const { data, isLoading, error, refetch } = useQuery<ApiResponse>({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/accounts/clients/fetch/`, {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
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

  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${apiUrl}/accounts/client/${id}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete client');
      }

      return id;
    },
    onSuccess: () => {
      toast.success('Client deleted successfully!', { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      refetch();
      setSelectedClients([]);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete client', { duration: 5000 });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const response = await fetch(`${apiUrl}/accounts/clients/bulk/delete/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
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
      toast.error(error.message || 'Bulk delete failed', { duration: 5000 });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Client> }) => {
      const response = await fetch(`${apiUrl}/accounts/client/${id}/update/`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
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
      toast.success('Client updated successfully!', { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      refetch();
    },
    onError: (error: ApiError) => {
      if (error.first_name) toast.error(Array.isArray(error.first_name) ? error.first_name[0] : error.first_name);
      else if (error.last_name) toast.error(Array.isArray(error.last_name) ? error.last_name[0] : error.last_name);
      else if (error.email) toast.error(Array.isArray(error.email) ? error.email[0] : error.email);
      else if (error.gender) toast.error(Array.isArray(error.gender) ? error.gender[0] : error.gender);
      else if (error.non_field_errors) {
        toast.error(Array.isArray(error.non_field_errors) ? error.non_field_errors[0] : error.non_field_errors);
      } else if (error.error) {
        toast.error(error.error);
      } else {
        toast.error('Failed to update client');
      }
    },
  });

  const clients = data?.clients || [];

  const filteredAndSortedClients = useMemo(() => {
    if (!clients.length) return [];

    let filtered = [...clients];

    if (filterGender !== 'all') {
      filtered = filtered.filter((client) => client.gender === filterGender);
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((client) => {
        const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
        const email = client.email.toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
    }

    filtered.sort((a, b) => {
      let aValue: string | number = a[sortField] as string;
      let bValue: string | number = b[sortField] as string;

      if (sortField === 'date_joined') {
        aValue = new Date(a.date_joined).getTime();
        bValue = new Date(b.date_joined).getTime();
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue === bValue) return 0;
      return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
    });

    return filtered;
  }, [clients, searchTerm, filterGender, sortField, sortOrder]);

  const totalItems = filteredAndSortedClients.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClients = filteredAndSortedClients.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedClients([]);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
    setSelectedClients([]);
  };

  const handleSelectAll = () => {
    if (selectedClients.length === currentClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(currentClients.map((client) => client.id));
    }
  };

  const handleSelectClient = (id: number) => {
    setSelectedClients((prev) =>
      prev.includes(id) ? prev.filter((clientId) => clientId !== id) : [...prev, id]
    );
  };

  const handleEditStart = (
    id: number,
    field: 'first_name' | 'last_name' | 'email' | 'gender',
    currentValue: string
  ) => {
    setEditingCell({ id, field, value: currentValue });
    setEditingId(id);
  };

  const handleEditChange = (value: string) => {
    setEditingCell((prev) => ({ ...prev, value }));
  };

  const handleEditCancel = () => {
    setEditingCell({ id: null, field: null, value: '' });
    setEditingId(null);
  };

  const handleEditSave = async () => {
    if (!editingCell.id || !editingCell.field) return;

    const client = filteredAndSortedClients.find((c) => c.id === editingCell.id);
    if (!client) return;

    if (client[editingCell.field] === editingCell.value) {
      handleEditCancel();
      return;
    }

    if (editingCell.field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editingCell.value)) {
        toast.warning('Please enter a valid email address', { duration: 5000 });
        return;
      }
    }

    setEditLoading(true);
    try {
      await updateClientMutation.mutateAsync({
        id: editingCell.id,
        data: { [editingCell.field]: editingCell.value },
      });
      handleEditCancel();
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditSave();
    if (e.key === 'Escape') handleEditCancel();
  };

  const openDeleteToast = (id: number, firstName: string, lastName: string) => {
    setToastState({
      isOpen: true,
      type: 'delete',
      title: 'Delete Client',
      message: `Are you sure you want to delete ${firstName} ${lastName}?`,
      clientId: id,
      clientName: `${firstName} ${lastName}`,
    });
  };

  const openBulkDeleteToast = () => {
    if (selectedClients.length === 0) return;

    setToastState({
      isOpen: true,
      type: 'bulkDelete',
      title: 'Delete Selected Clients',
      message: `Delete ${selectedClients.length} selected client${selectedClients.length > 1 ? 's' : ''}?`,
      clientIds: selectedClients,
    });
  };

  const closeToast = () => {
    setToastState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleToastConfirm = async () => {
    const { type, clientId, clientIds } = toastState;
    closeToast();

    if (type === 'delete' && clientId) {
      setActionLoading(clientId);
      try {
        await deleteClientMutation.mutateAsync(clientId);
      } finally {
        setActionLoading(null);
      }
    } else if (type === 'bulkDelete' && clientIds) {
      setBulkActionLoading(true);
      try {
        await bulkDeleteMutation.mutateAsync(clientIds);
      } finally {
        setBulkActionLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    toast.info('Refreshing clients...', { duration: 2000 });
    refetch();
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterGender('all');
    setSortField('date_joined');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  if (isLoading) {
    return (
      <div className="acl-loading-wrapper">
        <Spinner size="large" color="#c41e3a" message="Loading clients..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="acl-error-wrapper">
        <div className="acl-error-card">
          <span className="acl-error-icon">👤</span>
          <h3>Failed to Load Clients</h3>
          <p>There was an error loading the client list. Please try again.</p>
          <button className="acl-retry-btn" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="acl-page">
      <div className="acl-main-container">
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

        <div className="acl-hero-card">
          <div className="acl-hero-left">
            <span className="acl-hero-chip">Client Directory</span>
            <h1 className="acl-hero-title">All Clients</h1>
            <p className="acl-hero-subtitle">
              Review records, update details inline, filter faster, and manage your client list from one clean workspace.
            </p>
          </div>

          <div className="acl-hero-stats">
            <div className="acl-summary-card">
              <span className="acl-summary-label">Total Clients</span>
              <strong>{data?.total_clients || 0}</strong>
            </div>
            <div className="acl-summary-card">
              <span className="acl-summary-label">Filtered Results</span>
              <strong>{totalItems}</strong>
            </div>
            <div className="acl-summary-card">
              <span className="acl-summary-label">Selected</span>
              <strong>{selectedClients.length}</strong>
            </div>
          </div>
        </div>

        <div className="acl-toolbar-card">
          <div className="acl-toolbar-top">
            <div className="acl-toolbar-heading">
              <h2>Client Records</h2>
              <p>Search, sort, filter, and refresh from here.</p>
            </div>

            <div className="acl-toolbar-actions">
              <button className="acl-refresh-btn" onClick={handleRefresh}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10" />
                  <path d="M1 14l5.36 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <div className="acl-filters-grid">
            <div className="acl-search-wrapper">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="acl-search-input"
              />
              {searchTerm && (
                <button className="acl-clear-search" onClick={() => setSearchTerm('')} type="button">
                  ✕
                </button>
              )}
            </div>

            <select
              value={filterGender}
              onChange={(e) => {
                setFilterGender(e.target.value as FilterGender);
                setCurrentPage(1);
              }}
              className="acl-filter-select"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="nonbinary">Non-binary</option>
              <option value="prefer_not_say">Prefer not to say</option>
            </select>

            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                setSortField(field);
                setSortOrder(order);
              }}
              className="acl-filter-select"
            >
              <option value="date_joined-desc">Newest First</option>
              <option value="date_joined-asc">Oldest First</option>
              <option value="first_name-asc">First Name A-Z</option>
              <option value="first_name-desc">First Name Z-A</option>
              <option value="last_name-asc">Last Name A-Z</option>
              <option value="last_name-desc">Last Name Z-A</option>
              <option value="email-asc">Email A-Z</option>
              <option value="email-desc">Email Z-A</option>
              <option value="gender-asc">Gender A-Z</option>
              <option value="gender-desc">Gender Z-A</option>
            </select>
          </div>

          {(filterGender !== 'all' || searchTerm) && (
            <div className="acl-active-filters">
              <span className="acl-active-filters-label">Active Filters</span>

              {filterGender !== 'all' && (
                <span className="acl-filter-tag">
                  Gender: {filterGender}
                  <button onClick={() => setFilterGender('all')} type="button">
                    ✕
                  </button>
                </span>
              )}

              {searchTerm && (
                <span className="acl-filter-tag">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} type="button">
                    ✕
                  </button>
                </span>
              )}

              <button className="acl-clear-inline-btn" onClick={clearAllFilters} type="button">
                Clear all
              </button>
            </div>
          )}

          <div className="acl-results-header">
            <div className="acl-results-count">
              {totalItems === 0
                ? 'Showing 0 results'
                : `Showing ${startIndex + 1} - ${Math.min(endIndex, totalItems)} of ${totalItems} clients`}
            </div>

            <div className="acl-items-per-page">
              <label htmlFor="acl-items-select">Show</label>
              <select id="acl-items-select" value={itemsPerPage} onChange={handleItemsPerPageChange}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>
        </div>

        <div className="acl-table-section">
          <div className="acl-table-wrapper">
            <table className="acl-table">
              <thead>
                <tr>
                  <th className="acl-checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedClients.length === currentClients.length && currentClients.length > 0}
                      onChange={handleSelectAll}
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
                {currentClients.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="acl-no-results">
                      <div className="acl-no-results-content">
                        <span className="acl-no-results-icon">👤</span>
                        <p>No clients found matching your criteria</p>
                        <button className="acl-clear-filters-btn" onClick={clearAllFilters}>
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentClients.map((client) => (
                    <tr key={client.id} className={selectedClients.includes(client.id) ? 'acl-selected-row' : ''}>
                      <td className="acl-checkbox-cell">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => handleSelectClient(client.id)}
                        />
                      </td>

                      <td>
                        <span className="acl-id-badge">#{client.id}</span>
                      </td>

                      <td>
                        {editingCell.id === client.id && editingCell.field === 'first_name' ? (
                          <div className="acl-edit-cell">
                            <input
                              type="text"
                              value={editingCell.value}
                              onChange={(e) => handleEditChange(e.target.value)}
                              onKeyDown={handleEditKeyPress}
                              onBlur={handleEditSave}
                              autoFocus
                              className="acl-edit-input"
                              disabled={editLoading}
                            />
                            {editLoading && (
                              <div className="acl-edit-loading">
                                <Spinner size="small" color="#c41e3a" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="acl-editable-field"
                            onDoubleClick={() => handleEditStart(client.id, 'first_name', client.first_name)}
                          >
                            <span className="acl-field-value">{client.first_name}</span>
                            <span className="acl-edit-icon">✏️</span>
                          </div>
                        )}
                      </td>

                      <td>
                        {editingCell.id === client.id && editingCell.field === 'last_name' ? (
                          <div className="acl-edit-cell">
                            <input
                              type="text"
                              value={editingCell.value}
                              onChange={(e) => handleEditChange(e.target.value)}
                              onKeyDown={handleEditKeyPress}
                              onBlur={handleEditSave}
                              autoFocus
                              className="acl-edit-input"
                              disabled={editLoading}
                            />
                            {editLoading && (
                              <div className="acl-edit-loading">
                                <Spinner size="small" color="#c41e3a" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="acl-editable-field"
                            onDoubleClick={() => handleEditStart(client.id, 'last_name', client.last_name)}
                          >
                            <span className="acl-field-value">{client.last_name}</span>
                            <span className="acl-edit-icon">✏️</span>
                          </div>
                        )}
                      </td>

                      <td>
                        {editingCell.id === client.id && editingCell.field === 'email' ? (
                          <div className="acl-edit-cell acl-edit-cell-wide">
                            <input
                              type="email"
                              value={editingCell.value}
                              onChange={(e) => handleEditChange(e.target.value)}
                              onKeyDown={handleEditKeyPress}
                              onBlur={handleEditSave}
                              autoFocus
                              className="acl-edit-input"
                              disabled={editLoading}
                            />
                            {editLoading && (
                              <div className="acl-edit-loading">
                                <Spinner size="small" color="#c41e3a" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="acl-editable-field acl-editable-field-email"
                            onDoubleClick={() => handleEditStart(client.id, 'email', client.email)}
                          >
                            <span className="acl-email-text">{client.email}</span>
                            <span className="acl-edit-icon">✏️</span>
                          </div>
                        )}
                      </td>

                      <td>
                        {editingCell.id === client.id && editingCell.field === 'gender' ? (
                          <div className="acl-edit-cell">
                            <select
                              value={editingCell.value}
                              onChange={(e) => handleEditChange(e.target.value)}
                              onBlur={handleEditSave}
                              autoFocus
                              className="acl-edit-select"
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
                              <div className="acl-edit-loading">
                                <Spinner size="small" color="#c41e3a" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="acl-editable-field"
                            onDoubleClick={() => handleEditStart(client.id, 'gender', client.gender || '')}
                          >
                            <span className={`acl-gender-badge acl-gender-${client.gender || 'prefer_not_say'}`}>
                              {client.gender || 'Not specified'}
                            </span>
                            <span className="acl-edit-icon">✏️</span>
                          </div>
                        )}
                      </td>

                      <td>
                        <span className={`acl-status-badge ${client.is_active ? 'acl-status-active' : 'acl-status-inactive'}`}>
                          {client.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td>
                        <span className="acl-date-text">{formatDate(client.date_joined)}</span>
                      </td>

                      <td className="acl-actions-cell">
                        {actionLoading === client.id ? (
                          <div className="acl-action-loading">
                            <Spinner size="small" color="#c41e3a" />
                          </div>
                        ) : (
                          <button
                            className="acl-delete-btn"
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
        </div>

        {totalPages > 1 && (
          <div className="acl-pagination">
            <button
              className="acl-pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              « Previous
            </button>

            <div className="acl-pagination-pages">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                return (
                  <button
                    key={pageNum}
                    className={`acl-pagination-page ${currentPage === pageNum ? 'acl-pagination-active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              className="acl-pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next »
            </button>
          </div>
        )}

        {selectedClients.length > 0 && (
          <div className="acl-bulk-actions">
            <span className="acl-selected-count">
              {selectedClients.length} client{selectedClients.length > 1 ? 's' : ''} selected
            </span>

            {bulkActionLoading ? (
              <div className="acl-bulk-loading">
                <Spinner size="medium" color="#c41e3a" message="Processing..." />
              </div>
            ) : (
              <button
                className="acl-bulk-delete-btn"
                onClick={openBulkDeleteToast}
                disabled={editLoading || editingId !== null}
              >
                🗑️ Delete Selected
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllClients;