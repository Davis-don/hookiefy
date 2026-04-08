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
import './clientaccount.css';

function Clientaccount() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('discover');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Fetch pending hookup count with automatic refetching
  const { 
    data: pendingCountData, 
    refetch: refetchPendingCount,
    isFetching: isFetchingCount
  } = useQuery({
    queryKey: ['pending-hookup-count'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/hookup/hookup/pending-count/`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending count');
      }
      
      const result = await response.json();
      return result;
    },
    // Auto-refetch every 15 seconds for real-time updates
    refetchInterval: 15000,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
    // Refetch when component mounts
    refetchOnMount: true,
    // Refetch when network reconnects
    refetchOnReconnect: true,
    // Keep data fresh for 5 seconds
    staleTime: 5000,
  });

  const pendingCount = pendingCountData?.pending_count || 0;

  // Set up a listener for custom events that might affect pending count
  useEffect(() => {
    // Function to handle custom refresh events
    const handleRefreshPendingCount = () => {
      refetchPendingCount();
    };

    // Listen for custom events from other components
    window.addEventListener('refreshPendingCount', handleRefreshPendingCount);
    window.addEventListener('hookupStatusChanged', handleRefreshPendingCount);
    
    return () => {
      window.removeEventListener('refreshPendingCount', handleRefreshPendingCount);
      window.removeEventListener('hookupStatusChanged', handleRefreshPendingCount);
    };
  }, [refetchPendingCount]);

  // Refetch when active page changes to my hookups
  useEffect(() => {
    if (activePage === 'myhookups') {
      refetchPendingCount();
    }
  }, [activePage, refetchPendingCount]);

  // Set up an interval to manually refetch even if tab is not focused (optional)
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Only refetch if the document is visible (performance optimization)
      if (document.visibilityState === 'visible') {
        refetchPendingCount();
      }
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [refetchPendingCount]);

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
    { id: 'myhookups', icon: '💚', label: 'My Hookups', count: pendingCount },
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
        return <Clientbioupload />;
      default:
        return <HomeContent onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="ca-app">
      <Header 
        toggleSidebar={toggleSidebar}
        unreadCount={pendingCount}
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

          <div className="ca-sidebar-footer">
            <div className="ca-premium-card">
              <h4 className="ca-premium-title">Go Premium</h4>
              <p className="ca-premium-text">Get unlimited access to all features</p>
              <button className="ca-premium-btn">Upgrade Now</button>
            </div>
          </div>
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