import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { logoutUser } from '../../utils/logout';
import Header from './common/Clientheader';
import HomeContent from './Homecontent';
import MyHookup from './MyHookup';
import ProfileContent from './ProfileContent';
import BillingContent from './BillingContent';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePage, setActivePage] = useState('discover');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isBioComplete, setIsBioComplete] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Handle resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      const tablet = window.innerWidth > 768 && window.innerWidth <= 1024;
      
      // Keep sidebar behavior based on viewport size without extra state
      if (mobile) {
        // On mobile, sidebar starts collapsed (hidden)
        setSidebarCollapsed(true);
      } else if (tablet) {
        // On tablet, sidebar starts collapsed (icons only)
        setSidebarCollapsed(true);
      } else {
        // On desktop, sidebar starts expanded (full)
        setSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

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
    refetchBio();
    setIsBioComplete(true);
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

  // Menu items order: Discover, My Hookups, Bio, Billing & Transfers, Settings
  const menuItems = [
    { id: 'discover', icon: '🔍', label: 'Discover' },
    { id: 'myhookups', icon: '💚', label: 'My Hookups', count: unreadCount },
    { id: 'bio', icon: '✏️', label: 'Bio' },
    { id: 'billing', icon: '💰', label: 'Billing & Transfers' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  const handleNavigate = (page: string) => {
    setActivePage(page);
  };

  const renderContent = () => {
    if (isBioComplete === false) {
      return <Clientaccountsetprofile onProfileComplete={handleProfileComplete} />;
    }
    
    if (bioLoading || isBioComplete === null) {
      return (
        <div className="ca-loading-container">
          <div className="ca-loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      );
    }
    
    switch(activePage) {
      case 'discover':
        return <HomeContent onNavigate={handleNavigate} />;
      case 'myhookups':
        return <MyHookup />;
      case 'bio':
        return <Clientbioupload onBioUpdateSuccess={handleProfileComplete} />;
      case 'billing':
        return <BillingContent />;
      case 'settings':
        return <ProfileContent />;
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
        <aside className={`ca-sidebar ${sidebarCollapsed ? 'ca-sidebar-collapsed' : ''}`}>
          {/* Sidebar Logo */}
          <div className="ca-sidebar-logo">
            {!sidebarCollapsed && <span className="ca-sidebar-logo-text">Hookiefy</span>}
            {sidebarCollapsed && <span className="ca-sidebar-logo-icon">💜</span>}
          </div>
          
          <nav className="ca-sidebar-nav">
            {menuItems.map((item) => (
              <div 
                key={item.id} 
                className={`ca-nav-item ${activePage === item.id ? 'ca-nav-active' : ''}`}
                onClick={() => {
                  setActivePage(item.id);
                }}
                title={sidebarCollapsed ? item.label : ''}
              >
                <span className="ca-nav-icon">{item.icon}</span>
                {!sidebarCollapsed && <span className="ca-nav-label">{item.label}</span>}
                {item.count !== undefined && item.count > 0 && !sidebarCollapsed && (
                  <span className="ca-nav-count">
                    {item.count > 99 ? '99+' : item.count}
                    {isFetchingCount && <span className="ca-nav-count-update">...</span>}
                  </span>
                )}
                {item.count !== undefined && item.count > 0 && sidebarCollapsed && (
                  <span className="ca-nav-count-collapsed">{item.count > 99 ? '99+' : item.count}</span>
                )}
              </div>
            ))}
            
            <div 
              className={`ca-nav-item ca-nav-logout ${isLoggingOut ? 'ca-nav-logging-out' : ''}`}
              onClick={handleLogout}
              title={sidebarCollapsed ? 'Logout' : ''}
            >
              <span className="ca-nav-icon">{isLoggingOut ? '⏳' : '🚪'}</span>
              {!sidebarCollapsed && <span className="ca-nav-label">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>}
            </div>
          </nav>
        </aside>

        <main className="ca-main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default Clientaccount;