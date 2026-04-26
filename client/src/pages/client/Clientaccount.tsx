import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { logoutUser } from '../../utils/logout';
import Header from './common/Clientheader';
import HomeContent from './Homecontent';
import MyHookup from './MyHookup';
import ProfileContent from './ProfileContent';
import BillingContent from './BillingContent';
import Uploadclientimg from './Uploadclientimg';
import Clientbioupload from './Clientbioupload';
import Clientaccountsetprofile from './Clientaccountsetprofile';
import './clientaccount.css';

// Types for bio completion check
interface BioCompletionResponse {
  success: boolean;
  is_complete: boolean;
  missing_fields: string[];
  missing_fields_labels: string[];
  completion_percentage: number;
  message: string;
}

function Clientaccount() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('discover');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isBioComplete, setIsBioComplete] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Fetch bio completion status
  const { 
    data: bioData, 
    isLoading: bioLoading,
    refetch: refetchBio
  } = useQuery<BioCompletionResponse>({
    queryKey: ['bioCompletionStatus'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/client-img/client-check-bio-complete/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch bio completion status');
      }

      return response.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Update bio complete status when data loads
  useEffect(() => {
    if (bioData) {
      setIsBioComplete(bioData.is_complete);
    }
  }, [bioData]);

  // Handle profile completion from Clientaccountsetprofile
  const handleProfileComplete = () => {
    // Refetch bio completion status to update the state
    refetchBio();
    // Also manually set isBioComplete to true for immediate UI update
    setIsBioComplete(true);
    // Optionally set active page to discover after profile completion
    setActivePage('discover');
  };

  // Fetch unread hookup count with automatic refetching
  const { 
    data: unreadCountData, 
    refetch: refetchUnreadCount,
    isFetching: isFetchingCount
  } = useQuery({
    queryKey: ['unread-hookup-count'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/hookup/unread-count/`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch unread count');
      }
      
      const result = await response.json();
      return result;
    },
    enabled: isBioComplete === true,
    refetchInterval: isBioComplete === true ? 15000 : false,
    refetchOnWindowFocus: isBioComplete === true,
    refetchOnMount: isBioComplete === true,
    refetchOnReconnect: isBioComplete === true,
    staleTime: 5000,
  });

  const unreadCount = unreadCountData?.unread_count || 0;

  const handleNotificationClick = () => {
    setActivePage('myhookups');
    if (isMobile) {
      setSidebarOpen(false);
    }
    setTimeout(() => {
      refetchUnreadCount();
    }, 1000);
  };

  useEffect(() => {
    const handleRefreshUnreadCount = () => {
      refetchUnreadCount();
    };

    window.addEventListener('refreshUnreadCount', handleRefreshUnreadCount);
    window.addEventListener('hookupStatusChanged', handleRefreshUnreadCount);
    window.addEventListener('notificationRead', handleRefreshUnreadCount);
    
    return () => {
      window.removeEventListener('refreshUnreadCount', handleRefreshUnreadCount);
      window.removeEventListener('hookupStatusChanged', handleRefreshUnreadCount);
      window.removeEventListener('notificationRead', handleRefreshUnreadCount);
    };
  }, [refetchUnreadCount]);

  useEffect(() => {
    if (activePage === 'myhookups' && isBioComplete) {
      refetchUnreadCount();
    }
  }, [activePage, refetchUnreadCount, isBioComplete]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && isBioComplete) {
        refetchUnreadCount();
      }
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [refetchUnreadCount, isBioComplete]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    const success = await logoutUser(apiUrl);
    
    if (success) {
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } else {
      setIsLoggingOut(false);
    }
  };

  const menuItems = [
    { id: 'discover', icon: '🔍', label: 'Discover' },
    { id: 'myhookups', icon: '💚', label: 'My Hookups', count: unreadCount },
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'billing', icon: '💰', label: 'Billing & Transfers' },
    { id: 'profilephoto', icon: '📸', label: 'Profile Photo' },
    { id: 'profilebio', icon: '✏️', label: 'Profile Bio' }
  ];

  const handleNavigate = (page: string) => {
    setActivePage(page);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const renderContent = () => {
    // Show profile setup if bio is not complete
    if (isBioComplete === false) {
      return <Clientaccountsetprofile onProfileComplete={handleProfileComplete} />;
    }
    
    // Show loading state while checking bio completion
    if (bioLoading || isBioComplete === null) {
      return (
        <div className="ca-loading-container">
          <div className="ca-loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      );
    }
    
    // Show main content if bio is complete
    switch(activePage) {
      case 'discover':
        return <HomeContent onNavigate={handleNavigate} />;
      case 'myhookups':
        return <MyHookup />;
      case 'profile':
        return <ProfileContent />;
      case 'billing':
        return <BillingContent />;
      case 'profilephoto':
        return <Uploadclientimg />;
      case 'profilebio':
        return <Clientbioupload onBioUpdateSuccess={handleProfileComplete} />;
      default:
        return <HomeContent onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="ca-app">
      <Header 
        toggleSidebar={toggleSidebar}
        unreadCount={unreadCount}
        onNotificationClick={handleNotificationClick}
      />
      
      <div className="ca-layout">
        <aside className={`ca-sidebar ${sidebarOpen ? 'ca-sidebar-open' : 'ca-sidebar-closed'}`}>
          <nav className="ca-sidebar-nav">
            {menuItems.map((item) => (
              <div 
                key={item.id} 
                className={`ca-nav-item ${activePage === item.id ? 'ca-nav-active' : ''}`}
                onClick={() => {
                  setActivePage(item.id);
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
              >
                <span className="ca-nav-icon">{item.icon}</span>
                <span className="ca-nav-label">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="ca-nav-count">
                    {item.count > 99 ? '99+' : item.count}
                    {isFetchingCount && (
                      <span className="ca-nav-count-update">...</span>
                    )}
                  </span>
                )}
              </div>
            ))}
            
            <div 
              className={`ca-nav-item ca-nav-logout ${isLoggingOut ? 'ca-nav-logging-out' : ''}`}
              onClick={handleLogout}
            >
              <span className="ca-nav-icon">{isLoggingOut ? '⏳' : '🚪'}</span>
              <span className="ca-nav-label">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </div>
          </nav>
        </aside>

        {isMobile && sidebarOpen && (
          <div className="ca-sidebar-overlay" onClick={toggleSidebar}></div>
        )}

        <main className="ca-main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default Clientaccount;