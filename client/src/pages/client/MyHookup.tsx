import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { FaHeart, FaCheck, FaTimes, FaClock, FaSpinner, FaSync } from 'react-icons/fa';
import { toast } from '../../store/Toaststore';
import SentHookupPreview from './SentHookupPreview';
import ReceivedHookupPreview from './ReceivedHookupPreview';
import SentHookupDetail from './SentHookupDetail';
import ReceivedHookupDetail from './ReceivedHookupDetail';
import './myhookup.css'

interface Hookup {
  id: number;
  sender_id: number;
  receiver_id: number;
  sender_name: string;
  receiver_name: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  payment_status: 'paid' | 'not_paid';
  is_paid: boolean;
  message: string | null;
  location: string | null;
  scheduled_time: string | null;
  is_read_by_sender: boolean;
  is_read_by_receiver: boolean;
  is_deleted_by_sender: boolean;
  is_deleted_by_receiver: boolean;
  is_read_by_current_user: boolean;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  paid_at: string | null;
  role?: 'sent' | 'received';
  sender_image?: string | null;
  receiver_image?: string | null;
}

interface HookupsResponse {
  sent: Hookup[];
  received: Hookup[];
  total_sent: number;
  total_received: number;
}

type TabType = 'all' | 'sent' | 'received';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const MyHookup = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedHookup, setSelectedHookup] = useState<Hookup | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch all hookups with aggressive real-time settings
  const { 
    data, 
    isLoading, 
    error, 
    refetch, 
    isFetching 
  } = useQuery<HookupsResponse>({
    queryKey: ['my-hookups'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/hookup/my-hookups/`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch hookups');
      }
      
      const result = await response.json();
      setLastRefresh(new Date());
      
      return {
        ...result,
        sent: result.sent.map((h: Hookup) => ({ ...h, role: 'sent' as const })),
        received: result.received.map((h: Hookup) => ({ ...h, role: 'received' as const }))
      };
    },
    // Real-time refresh settings
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 2000,
    gcTime: 60000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle payment status from URL params (AFTER refetch is declared)
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const errorMessage = searchParams.get('message');
    
    if (paymentStatus === 'success') {
      toast.success('Payment completed successfully! Your hookup is now active.', {
        title: '🎉 Payment Successful!',
        duration: 5000,
      });
      // Remove query params from URL without reloading
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      newParams.delete('order_tracking_id');
      newParams.delete('message');
      setSearchParams(newParams, { replace: true });
      // Refresh hookups to show updated status
      setTimeout(() => refetch(), 500);
    } else if (paymentStatus === 'failed') {
      toast.error('Payment failed. Please try again.', {
        title: '❌ Payment Failed',
        duration: 5000,
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      newParams.delete('order_tracking_id');
      setSearchParams(newParams, { replace: true });
    } else if (paymentStatus === 'pending') {
      toast.info('Your payment is being processed. Please wait a moment.', {
        title: '⏳ Payment Processing',
        duration: 5000,
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      newParams.delete('order_tracking_id');
      setSearchParams(newParams, { replace: true });
      // Poll for status update
      const interval = setInterval(() => {
        refetch();
      }, 3000);
      setTimeout(() => clearInterval(interval), 30000);
    } else if (paymentStatus === 'error') {
      toast.error(errorMessage || 'An error occurred processing your payment.', {
        title: '⚠️ Error',
        duration: 5000,
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      newParams.delete('message');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refetch]);

  // Manual refresh with visual feedback
  const handleManualRefresh = useCallback(async () => {
    toast.info('Refreshing hookups...', {
      title: '🔄 Updating',
      icon: '🔄',
      duration: 1500,
    });
    await refetch();
    toast.success('Hookups updated!', {
      title: '✓ Updated',
      icon: '✨',
      duration: 2000,
    });
  }, [refetch]);

  // WebSocket-like polling for instant updates (every 5 seconds when visible)
  useEffect(() => {
    let intervalId: number | null = null;
    
    const startPolling = () => {
      intervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          refetch();
        }
      }, 5000);
    };
    
    startPolling();
    
    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [refetch]);

  // Listen for visibility changes to refresh immediately
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      toast.success('Back online! Refreshing hookups...', {
        title: '🌐 Connected',
        icon: '✅',
        duration: 3000,
      });
      refetch();
    };
    
    const handleOffline = () => {
      toast.warning('You are offline. Hookups may be outdated.', {
        title: '📡 Offline',
        icon: '⚠️',
        duration: 3000,
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refetch]);

  // Mark as read mutation with immediate UI update
  const markReadMutation = useMutation({
    mutationFn: async (hookupId: number) => {
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookupId}/mark-read/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark as read');
      }
      
      return response.json();
    },
    onMutate: async (hookupId) => {
      await queryClient.cancelQueries({ queryKey: ['my-hookups'] });
      
      const previousData = queryClient.getQueryData<HookupsResponse>(['my-hookups']);
      
      if (previousData) {
        const updatedSent = previousData.sent.map(h => 
          h.id === hookupId ? { ...h, is_read_by_current_user: true } : h
        );
        const updatedReceived = previousData.received.map(h => 
          h.id === hookupId ? { ...h, is_read_by_current_user: true } : h
        );
        
        queryClient.setQueryData(['my-hookups'], {
          ...previousData,
          sent: updatedSent,
          received: updatedReceived,
        });
      }
      
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-hookups'] });
      window.dispatchEvent(new Event('hookupStatusChanged'));
    },
    onError: (error: Error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['my-hookups'], context.previousData);
      }
      toast.error(error.message, {
        title: '❌ Error',
        icon: '💔',
        duration: 3000,
      });
    },
  });

  const handleMarkAsRead = (hookupId: number) => {
    markReadMutation.mutate(hookupId);
  };

  const handleHookupClick = (hookup: Hookup) => {
    setSelectedHookup(hookup);
    setModalOpen(true);
    
    if (!hookup.is_read_by_current_user) {
      handleMarkAsRead(hookup.id);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedHookup(null);
    refetch();
  };

  const getAllHookups = (): Hookup[] => {
    if (!data) return [];
    
    const sent = data.sent || [];
    const received = data.received || [];
    
    if (activeTab === 'sent') return sent;
    if (activeTab === 'received') return received;
    
    return [...sent, ...received];
  };

  const getFilteredHookups = (): Hookup[] => {
    const allHookups = getAllHookups();
    
    if (statusFilter === 'all') return allHookups;
    
    return allHookups.filter(hookup => hookup.approval_status === statusFilter);
  };

  const getUnreadCount = (): number => {
    if (!data) return 0;
    const sentUnread = (data.sent || []).filter(h => !h.is_read_by_current_user).length;
    const receivedUnread = (data.received || []).filter(h => !h.is_read_by_current_user).length;
    return sentUnread + receivedUnread;
  };

  const filteredHookups = getFilteredHookups();
  const unreadCount = getUnreadCount();

  // Listen for custom events to refresh
  useEffect(() => {
    const handleRefresh = () => {
      refetch();
    };
    
    window.addEventListener('hookupStatusChanged', handleRefresh);
    window.addEventListener('refreshHookups', handleRefresh);
    
    return () => {
      window.removeEventListener('hookupStatusChanged', handleRefresh);
      window.removeEventListener('refreshHookups', handleRefresh);
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="mh-loading">
        <div className="mh-loading-spinner">
          <FaSpinner className="mh-spin" />
          <p>Loading your hookups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mh-error">
        <div className="mh-error-card">
          <span className="mh-error-icon">💔</span>
          <h3>Unable to Load Hookups</h3>
          <p>There was an error loading your hookup requests.</p>
          <button className="mh-retry-btn" onClick={() => refetch()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const sentCount = data?.sent?.length || 0;
  const receivedCount = data?.received?.length || 0;
  const totalCount = sentCount + receivedCount;

  return (
    <div className="mh-container">
      <div className="mh-header">
        <div className="mh-header-content">
          <h1 className="mh-title">
            <FaHeart className="mh-title-icon" />
            My Hookups
          </h1>
          {unreadCount > 0 && (
            <span className="mh-unread-badge">{unreadCount} new</span>
          )}
          <button 
            className="mh-refresh-btn" 
            onClick={handleManualRefresh} 
            disabled={isFetching}
            title="Refresh now"
          >
            <FaSync className={isFetching ? 'mh-spin-small' : ''} />
          </button>
        </div>
        <p className="mh-subtitle">Manage all your hookup requests and connections</p>
        <div className="mh-last-refresh">
          Last updated: {lastRefresh.toLocaleTimeString()}
          {isFetching && <span className="mh-refreshing-text"> (updating...)</span>}
        </div>
      </div>

      <div className="mh-stats">
        <div className="mh-stat-card">
          <div className="mh-stat-icon">📤</div>
          <div className="mh-stat-info">
            <span className="mh-stat-value">{sentCount}</span>
            <span className="mh-stat-label">Sent Requests</span>
          </div>
        </div>
        <div className="mh-stat-card">
          <div className="mh-stat-icon">📥</div>
          <div className="mh-stat-info">
            <span className="mh-stat-value">{receivedCount}</span>
            <span className="mh-stat-label">Received Requests</span>
          </div>
        </div>
        <div className="mh-stat-card">
          <div className="mh-stat-icon">💚</div>
          <div className="mh-stat-info">
            <span className="mh-stat-value">{totalCount}</span>
            <span className="mh-stat-label">Total Hookups</span>
          </div>
        </div>
      </div>

      <div className="mh-tabs">
        <button
          className={`mh-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
          {totalCount > 0 && <span className="mh-tab-count">{totalCount}</span>}
        </button>
        <button
          className={`mh-tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Sent
          {sentCount > 0 && <span className="mh-tab-count">{sentCount}</span>}
        </button>
        <button
          className={`mh-tab ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          Received
          {receivedCount > 0 && <span className="mh-tab-count">{receivedCount}</span>}
        </button>
      </div>

      <div className="mh-filters">
        <button
          className={`mh-filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All Status
        </button>
        <button
          className={`mh-filter-chip ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          <FaClock /> Pending
        </button>
        <button
          className={`mh-filter-chip ${statusFilter === 'approved' ? 'active' : ''}`}
          onClick={() => setStatusFilter('approved')}
        >
          <FaCheck /> Approved
        </button>
        <button
          className={`mh-filter-chip ${statusFilter === 'rejected' ? 'active' : ''}`}
          onClick={() => setStatusFilter('rejected')}
        >
          <FaTimes /> Rejected
        </button>
      </div>

      {filteredHookups.length === 0 ? (
        <div className="mh-empty">
          <div className="mh-empty-content">
            <span className="mh-empty-icon">💚</span>
            <h3>No hookups found</h3>
            <p>
              {statusFilter !== 'all'
                ? `You don't have any ${statusFilter} hookup requests.`
                : activeTab === 'sent'
                ? "You haven't sent any hookup requests yet."
                : activeTab === 'received'
                ? "You haven't received any hookup requests yet."
                : "You don't have any hookup requests yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="mh-list">
          {filteredHookups.map((hookup) => (
            hookup.role === 'sent' ? (
              <SentHookupPreview
                key={hookup.id}
                hookup={hookup}
                onClick={() => handleHookupClick(hookup)}
              />
            ) : (
              <ReceivedHookupPreview
                key={hookup.id}
                hookup={hookup}
                onClick={() => handleHookupClick(hookup)}
              />
            )
          ))}
        </div>
      )}

      {modalOpen && selectedHookup && (
        selectedHookup.role === 'sent' ? (
          <SentHookupDetail
            hookup={selectedHookup}
            onClose={closeModal}
            onRefresh={refetch}
          />
        ) : (
          <ReceivedHookupDetail
            hookup={selectedHookup}
            onClose={closeModal}
            onRefresh={refetch}
          />
        )
      )}
    </div>
  );
};

export default MyHookup;