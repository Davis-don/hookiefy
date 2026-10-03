import { useState } from 'react';

import UserHeader from '../components/UserHeader';
import HomeTab from '../components/Home';
import StoriesTab from '../components/StoriesTab';
import MyBusiness from '../../../businesses/components/MyBusiness';
import ProfileTab from '../components/Profile';
import BillingTab from '../components/Billing';
import Logout from '../components/Logout';

import './useraccount.css';

type TabKey = 'home' | 'stories' | 'business' | 'profile' | 'billing';

type NavItem = {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  /** Renders as the floating gradient pill in the mobile bottom nav. */
  primary?: boolean;
};

const HomeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 10v10h14V10" />
  </svg>
);

const StoriesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const BusinessIcon = () => (
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

const BillingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="6" width="19" height="13" rx="2" />
    <line x1="2.5" y1="10" x2="21.5" y2="10" />
    <line x1="6" y1="15" x2="10" y2="15" />
  </svg>
);

function Useraccount() {
  // Home stays the default active tab.
  const [active, setActive] = useState<TabKey>('home');

  // Home → Stories → Business (center, primary) → Billing
  const navItems: NavItem[] = [
    { key: 'home',     label: 'Home',     icon: <HomeIcon /> },
    { key: 'stories',  label: 'Stories',  icon: <StoriesIcon /> },
    { key: 'business', label: 'Business', icon: <BusinessIcon />, primary: true },
    { key: 'billing',  label: 'Billing',  icon: <BillingIcon /> },
  ];

  const goToProfile = () => setActive('profile');

  const renderTab = () => {
    switch (active) {
      case 'home':     return <HomeTab />;
      case 'stories':  return <StoriesTab />;
      case 'business': return <MyBusiness onGoToProfile={goToProfile} />;
      case 'profile':  return <ProfileTab />;
      case 'billing':  return <BillingTab />;
      default:         return <HomeTab />;
    }
  };

  return (
    <div className="ua-shell">
      <aside className="ua-sidebar">
        <div className="ua-sidebar-logo">
          <span className="ua-logo-you">You</span>
          <span className="ua-logo-p">p</span>
          <span className="ua-logo-ata">ata</span>
        </div>

        <nav className="ua-sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActive(item.key)}
              className={
                'ua-sidebar-link' + (active === item.key ? ' is-active' : '')
              }
            >
              <span className="ua-sidebar-icon">{item.icon}</span>
              <span className="ua-sidebar-label">{item.label}</span>
            </button>
          ))}

          <Logout variant="sidebar" />
        </nav>
      </aside>

      <div className="ua-main">
        <UserHeader onOpenProfile={goToProfile} />
        <div className="ua-content">{renderTab()}</div>
      </div>

      <nav className="ua-bottom-nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActive(item.key)}
            className={
              'ua-bottom-link' +
              (active === item.key ? ' is-active' : '') +
              (item.primary ? ' is-primary' : '')
            }
            aria-label={item.label}
          >
            {item.icon}
          </button>
        ))}

        <Logout variant="bottom" />
      </nav>
    </div>
  );
}

export default Useraccount;