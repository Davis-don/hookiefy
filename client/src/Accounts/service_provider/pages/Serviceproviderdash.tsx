// Serviceproviderdash.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import './serviceproviderdash.css';
import Header from '../components/Header';
import Home from '../components/Home';
import MyServices from '../components/MyServices';
import Profile from '../components/Profile';
import Stories from '../components/stories/Stories';
import AddData from '../components/AddData';
import MyConnections from '../components/connections/MyConnections';
import Notification from '../components/notification/Notification';
import Subscription from '../components/subscription/Subscription';
import { useAuthStore } from '../../../store/authtokenstore';
import {
  fetchPremiumStatus,
  type PremiumStatusResponse,
} from '../components/PremiumBadge';

const FULL_BLEED_TABS = new Set(['home', 'add-data', 'connections']);

/* ── API helpers ─────────────────────────────────── */

function resolveApiBase(): string {
  // @ts-ignore
  const envUrl: string | undefined = import.meta.env?.VITE_API_URL;
  const NOTIF_PREFIX = '/notifications';
  if (!envUrl || !envUrl.trim()) return NOTIF_PREFIX;
  const trimmed = envUrl.replace(/\/+$/, '');
  if (trimmed.endsWith(NOTIF_PREFIX)) return trimmed;
  return `${trimmed}${NOTIF_PREFIX}`;
}

const API_BASE = resolveApiBase();

function readStoredToken(): string | null {
  const keys = [
    'access_token',
    'accessToken',
    'access',
    'token',
    'jwt',
    'authToken',
  ];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v && v.trim() && !v.startsWith('{')) return v;
  }
  const jsonKeys = ['user', 'auth', 'session', 'currentUser'];
  for (const k of jsonKeys) {
    const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const token =
        parsed?.access_token ||
        parsed?.accessToken ||
        parsed?.access ||
        parsed?.token ||
        parsed?.jwt;
      if (typeof token === 'string' && token.trim()) return token;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function useAccessToken(): string | null {
  const store = useAuthStore() as unknown;
  return useMemo(() => {
    if (store && typeof store === 'object') {
      const s = store as Record<string, unknown>;
      const candidates = [
        s.access,
        s.accessToken,
        s.access_token,
        s.token,
        s.jwt,
      ];
      for (const c of candidates) {
        if (typeof c === 'string' && c.trim()) return c;
      }
      const nested = (s.tokens || s.auth) as
        | Record<string, unknown>
        | undefined;
      if (nested) {
        const inner =
          nested.access ||
          nested.accessToken ||
          nested.access_token ||
          nested.token;
        if (typeof inner === 'string' && inner.trim()) return inner;
      }
    }
    return readStoredToken();
  }, [store]);
}

interface UnreadPaidResponse {
  has_unread: boolean;
  unread_count: number;
  connection_ids: string[];
}

async function fetchUnreadPaidConnections(
  access: string | null
): Promise<UnreadPaidResponse> {
  if (!access) {
    return { has_unread: false, unread_count: 0, connection_ids: [] };
  }
  const res = await fetch(`${API_BASE}/has-unread-paid-connections/`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${access}`,
    },
  });
  if (!res.ok) {
    return { has_unread: false, unread_count: 0, connection_ids: [] };
  }
  return res.json();
}

/* ── Dashboard ───────────────────────────────────── */

const Serviceproviderdash = () => {
  const access = useAccessToken();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('home');
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAddData, setShowAddData] = useState(false);
  const [focusConnectionId, setFocusConnectionId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  /* ── Premium status query ────────────────────────── */
  /* Uses the shared fetcher from PremiumBadge so the
     endpoint lives in exactly one place. */
  const { data: premium } = useQuery<PremiumStatusResponse | null>({
    queryKey: ['premium-status', access],
    queryFn: () => fetchPremiumStatus(access),
    enabled: !!access,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return 60_000;
      if (d.is_expired) return 30_000;
      const total = d.time_remaining?.total_seconds;
      if (!d.is_premium || total == null || total <= 0) return 60_000;
      if (total > 86400) return 30 * 60_000;
      if (total > 3600) return 15 * 60_000;
      if (total > 600) return 5 * 60_000;
      return 60_000;
    },
  });

  /* Gate: service providers without an active premium */
  const isGated = useMemo(() => {
    if (!premium) return false;
    if (premium.role !== 'serviceprovider') return false;
    if (premium.is_premium) return false;
    return true;
  }, [premium]);

  /* ── Unread paid connections (only used when not gated) ── */
  const { data: unreadPaid } = useQuery({
    queryKey: ['notifications', 'unread-paid-connections'],
    queryFn: () => fetchUnreadPaidConnections(access),
    enabled: !!access && !isGated,
    refetchInterval: isGated ? false : 30_000,
    refetchOnWindowFocus: !isGated,
  });

  const hasUnreadPaid = !!unreadPaid?.has_unread;

  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠', component: Home },
    { id: 'stories', label: 'Stories', icon: '📸', component: Stories },
    {
      id: 'connections',
      label: 'Connections',
      icon: '🔗',
      component: MyConnections,
    },
    {
      id: 'my-services',
      label: 'My Services',
      icon: '🛠️',
      component: MyServices,
    },
    {
      id: 'subscription',
      label: 'Subscription',
      icon: '💎',
      component: Subscription,
    },
  ];

  /* ── Content: gated shows only Subscription ─────── */
  const renderActiveComponent = () => {
    if (isGated) {
      return <Subscription />;
    }

    if (showAddData)
      return <AddData onClose={() => setShowAddData(false)} />;
    if (showProfile) return <Profile />;

    const activeItem = menuItems.find((item) => item.id === activeTab);
    const ActiveComponent = activeItem?.component || Home;

    if (activeTab === 'connections') {
      return (
        <MyConnections
          focusConnectionId={focusConnectionId}
          onContactOpened={() => {
            queryClient.invalidateQueries({
              queryKey: ['notifications', 'unread-paid-connections'],
            });
            queryClient.invalidateQueries({
              queryKey: ['notifications', 'all'],
            });
            setFocusConnectionId(null);
          }}
        />
      );
    }

    return <ActiveComponent />;
  };

  /* ── Guarded handlers — no-op while gated ───────── */
  const handleHeaderProfileClick = () => {
    if (isGated) return;
    setShowProfile(true);
    setShowAddData(false);
    setActiveTab('');
  };

  const handleNavClick = (id: string) => {
    if (isGated) return;
    setShowProfile(false);
    setShowAddData(false);
    setActiveTab(id);
    if (id !== 'connections') setFocusConnectionId(null);
  };

  const handleBrandClick = () => {
    if (isGated) return;
    setShowProfile(false);
    setShowAddData(false);
    setActiveTab('home');
    setFocusConnectionId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddClick = () => {
    if (isGated) return;
    setShowProfile(false);
    setShowAddData(true);
    setActiveTab('add-data');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNotificationNavigate = useCallback(
    (connectionId: string | null) => {
      if (isGated) return;
      setShowProfile(false);
      setShowAddData(false);
      setActiveTab('connections');
      setFocusConnectionId(connectionId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isGated]
  );

  const handleOpenSubscription = useCallback(() => {
    setShowProfile(false);
    setShowAddData(false);
    setActiveTab('subscription');
    setFocusConnectionId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const mobileNavItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'stories', label: 'Stories', icon: '📸' },
    { id: 'connections', label: 'Connections', icon: '🔗' },
    { id: 'my-services', label: 'My Services', icon: '🛠️' },
  ];

  const leftItems = mobileNavItems.slice(0, 2);
  const rightItems = mobileNavItems.slice(2);

  const useFullBleed =
    !showProfile && FULL_BLEED_TABS.has(activeTab);

  /* ═══════════════════════════════════════════════════
     DASHBOARD SHELL
     When gated, all interactive elements are disabled
     (via `disabled` + the `--gated` class), but the
     layout is unchanged. The Subscription component
     fills the main content area.
     ═══════════════════════════════════════════════════ */
  return (
    <div
      className={`yp-dash-container ${
        isGated ? 'yp-dash-container--gated' : ''
      }`}
    >
      {isMobile && (
        <Header
          onProfileClick={handleHeaderProfileClick}
          onBrandClick={handleBrandClick}
          onSubscriptionClick={handleOpenSubscription}
        />
      )}

      {!isMobile && (
        <aside
          className={`yp-dash-sidebar ${
            sidebarOpen ? 'yp-dash-sidebar-open' : ''
          } ${isGated ? 'yp-dash-sidebar--gated' : ''}`}
        >
          <div className="yp-dash-sidebar-header">
            <h2
              className="yp-dash-sidebar-logo"
              onClick={handleBrandClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleBrandClick();
                }
              }}
              role="link"
              tabIndex={0}
              aria-label="Go to home"
              aria-disabled={isGated}
            >
              <span className="yp-logo-you">You</span>
              <span className="yp-logo-p">p</span>
              <span className="yp-logo-ata">ata</span>
            </h2>

            <button
              className="yp-dash-sidebar-toggle"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
              type="button"
              disabled={isGated}
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          <nav className="yp-dash-sidebar-nav">
            {menuItems.map((item) => {
              const showDot =
                item.id === 'connections' && hasUnreadPaid;
              const isSubscription = item.id === 'subscription';
              const disabled = isGated && !isSubscription;

              return (
                <button
                  key={item.id}
                  className={`yp-dash-sidebar-item ${
                    activeTab === item.id &&
                    !showProfile &&
                    !showAddData
                      ? 'yp-dash-sidebar-item-active'
                      : ''
                  } ${disabled ? 'is-disabled' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  type="button"
                  disabled={disabled}
                  aria-disabled={disabled}
                >
                  <span className="yp-dash-sidebar-icon-wrap">
                    <span className="yp-dash-sidebar-icon">
                      {item.icon}
                    </span>
                    {showDot && (
                      <span
                        className="yp-nav-notif-dot yp-nav-notif-dot--glitter"
                        aria-label="New paid contact"
                      />
                    )}
                  </span>
                  <span className="yp-dash-sidebar-label">
                    {item.label}
                  </span>
                </button>
              );
            })}

            <button
              className={`yp-dash-sidebar-item ${
                showAddData ? 'yp-dash-sidebar-item-active' : ''
              } ${isGated ? 'is-disabled' : ''}`}
              onClick={handleAddClick}
              type="button"
              disabled={isGated}
              aria-disabled={isGated}
            >
              <span className="yp-dash-sidebar-icon">➕</span>
              <span className="yp-dash-sidebar-label">Add Data</span>
            </button>
          </nav>

          <div className="yp-dash-sidebar-footer">
            <button
              className={`yp-dash-user-info ${
                isGated ? 'is-disabled' : ''
              }`}
              onClick={handleHeaderProfileClick}
              aria-label="Open profile"
              type="button"
              disabled={isGated}
              aria-disabled={isGated}
            >
              <div className="yp-dash-user-avatar">SP</div>
              <div className="yp-dash-user-details">
                <span className="yp-dash-user-name">
                  Service Provider
                </span>
                <span className="yp-dash-user-status">Online</span>
              </div>
            </button>
          </div>
        </aside>
      )}

      <main
        className={`yp-dash-main ${
          !isMobile && sidebarOpen ? 'yp-dash-main-shifted' : ''
        }`}
      >
        {useFullBleed ? (
          <div className="yp-dash-full-bleed">
            {renderActiveComponent()}
          </div>
        ) : (
          <div className="yp-dash-content-wrapper">
            {renderActiveComponent()}
          </div>
        )}
      </main>

      {!isMobile && (
        <div
          className={`yp-dash-bell-slot ${
            isGated ? 'is-disabled' : ''
          }`}
          aria-disabled={isGated}
        >
          <Notification onNavigate={handleNotificationNavigate} />
        </div>
      )}

      {isMobile && (
        <nav
          className={`yp-dash-bottom-nav ${
            isGated ? 'yp-dash-bottom-nav--gated' : ''
          }`}
        >
          {leftItems.map((item) => {
            const showDot =
              item.id === 'connections' && hasUnreadPaid;
            const disabled = isGated;

            return (
              <button
                key={item.id}
                className={`yp-dash-nav-item ${
                  activeTab === item.id &&
                  !showProfile &&
                  !showAddData
                    ? 'yp-dash-nav-item-active'
                    : ''
                } ${disabled ? 'is-disabled' : ''}`}
                onClick={() => handleNavClick(item.id)}
                aria-label={item.label}
                type="button"
                disabled={disabled}
                aria-disabled={disabled}
              >
                <span className="yp-dash-nav-icon-wrap">
                  <span className="yp-dash-nav-icon">
                    {item.icon}
                  </span>
                  {showDot && (
                    <span
                      className="yp-nav-notif-dot yp-nav-notif-dot--glitter"
                      aria-label="New paid contact"
                    />
                  )}
                </span>
              </button>
            );
          })}

          <button
            className={`yp-dash-nav-add ${
              isGated ? 'is-disabled' : ''
            }`}
            onClick={handleAddClick}
            aria-label="Add"
            type="button"
            disabled={isGated}
            aria-disabled={isGated}
          >
            <span className="yp-dash-nav-add-icon">+</span>
          </button>

          {rightItems.map((item) => {
            const showDot =
              item.id === 'connections' && hasUnreadPaid;
            const disabled = isGated;

            return (
              <button
                key={item.id}
                className={`yp-dash-nav-item ${
                  activeTab === item.id &&
                  !showProfile &&
                  !showAddData
                    ? 'yp-dash-nav-item-active'
                    : ''
                } ${disabled ? 'is-disabled' : ''}`}
                onClick={() => handleNavClick(item.id)}
                aria-label={item.label}
                type="button"
                disabled={disabled}
                aria-disabled={disabled}
              >
                <span className="yp-dash-nav-icon-wrap">
                  <span className="yp-dash-nav-icon">
                    {item.icon}
                  </span>
                  {showDot && (
                    <span
                      className="yp-nav-notif-dot yp-nav-notif-dot--glitter"
                      aria-label="New paid contact"
                    />
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default Serviceproviderdash;