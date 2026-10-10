// src/pages/accounts/Super/Superaccount.tsx

import { useState } from 'react';

import SuperHeader from '../components/SuperHeader';
import HomeTab from '../components/HomeTab';
import BusinessesTab from '../components/BusinessesTab';
import UsersTab from '../components/UsersTab';
import PlansTab from '../components/PlansTab';
import SettingsTab from '../components/SettingsTab';
import SuperProfile from '../components/SuperProfile';

import './superaccount.css';

type TabKey =
  | 'home'
  | 'businesses'
  | 'users'
  | 'plans'
  | 'settings'
  | 'profile';

type NavItem = {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
};

/* ── Icons ───────────────────────────────────────────── */

const HomeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 10v10h14V10" />
  </svg>
);

const BusinessesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l1.5-5h15L21 9" />
    <path d="M4 9v11h16V9" />
    <path d="M9 20v-6h6v6" />
    <path d="M3 9c0 1.5 1.2 2.7 2.7 2.7S8.4 10.5 8.4 9" />
    <path d="M8.4 9c0 1.5 1.2 2.7 2.7 2.7S13.8 10.5 13.8 9" />
    <path d="M13.8 9c0 1.5 1.2 2.7 2.7 2.7S19.2 10.5 19.2 9" />
    <path d="M19.2 9c0 1.5 1.2 2.7 2.7 2.7" />
  </svg>
);

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 21c0-3.6 2.9-6.5 6.5-6.5S15.5 17.4 15.5 21" />
    <circle cx="17" cy="7" r="2.5" />
    <path d="M15.5 14.5c3 .3 6 2.7 6 6.5" />
  </svg>
);

/* ── Component ───────────────────────────────────────── */

function Superaccount() {
  const [active, setActive] = useState<TabKey>('home');

  // Only the primary destinations live in the sidebar /
  // bottom nav. Plans, Settings, and Profile are reached
  // through the header menu (and the avatar).
  const navItems: NavItem[] = [
    { key: 'home',       label: 'Home',       icon: <HomeIcon /> },
    { key: 'businesses', label: 'Businesses', icon: <BusinessesIcon /> },
    { key: 'users',      label: 'Users',      icon: <UsersIcon /> },
  ];

  const renderTab = () => {
    switch (active) {
      case 'home':       return <HomeTab />;
      case 'businesses': return <BusinessesTab />;
      case 'users':      return <UsersTab />;
      case 'plans':      return <PlansTab />;
      case 'settings':   return <SettingsTab />;
      case 'profile':    return <SuperProfile />;
      default:           return <HomeTab />;
    }
  };

  return (
    <div className="sa-shell">
      <aside className="sa-sidebar">
        <div className="sa-sidebar-logo">
          <span className="sa-logo-you">You</span>
          <span className="sa-logo-p">p</span>
          <span className="sa-logo-ata">ata</span>
          <span className="sa-logo-badge">Admin</span>
        </div>

        <nav className="sa-sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActive(item.key)}
              className={
                'sa-sidebar-link' + (active === item.key ? ' is-active' : '')
              }
            >
              <span className="sa-sidebar-icon">{item.icon}</span>
              <span className="sa-sidebar-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="sa-main">
        {/* Header handles: menu dropdown + profile avatar. */}
        <SuperHeader
          onOpenProfile={() => setActive('profile')}
          onOpenPlans={() => setActive('plans')}
          onOpenSettings={() => setActive('settings')}
        />

        <div className="sa-content">{renderTab()}</div>
      </div>

      <nav className="sa-bottom-nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActive(item.key)}
            className={
              'sa-bottom-link' + (active === item.key ? ' is-active' : '')
            }
            aria-label={item.label}
          >
            {item.icon}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default Superaccount;