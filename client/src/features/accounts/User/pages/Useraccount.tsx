// src/features/accounts/User/pages/Useraccount.tsx

import { useEffect, useRef, useState } from 'react';

import UserHeader from '../components/UserHeader';
import Home from '../components/Home';
import StoriesTab from '../components/StoriesTab';
import MyBusiness from '../../../businesses/components/MyBusiness';
import ProfileTab from '../components/Profile';
import BillingTab from '../components/Billing';
import DeliveriesTab from '../components/DeliveriesTab';
import DeliveriesIcon from '../components/DeliveriesIcon';
import Logout from '../components/Logout';
import SubscriptionGuard from '../components/SubscriptionGuard';

import SearchResults from '../../../search/components/SearchResults';
import type { SearchScope } from '../../../search/components/SearchBar';

import BusinessDetails from '../../../businesses/components/BusinessDetails';
import PostDetailPage from '../components/feed/PostDetail';
import ProductDetailPage from '../components/feed/ProductDetail';
import ProductPayment from '../components/feed/ProductPayment';
import StoryDetail from '../../../stories/components/StoryDetail';

import { useProfileStatus } from '../../../accounts/hooks/useProfileStatus';
import Confirmprofilecomplete from '../../User/components/Confirmprofilecomplete';

import './useraccount.css';

/* ============================================================
   TYPES
   ============================================================ */

type TabKey =
  | 'home'
  | 'stories'
  | 'business'
  | 'deliveries'
  | 'profile'
  | 'billing';

type OpenView =
  | { kind: 'business'; id: number }
  | { kind: 'post'; id: number }
  | { kind: 'product'; id: number; youpata?: boolean }
  | { kind: 'product-payment'; id: number }
  | { kind: 'story'; id: number }
  | null;

type NavItem = {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
  bottomNav?: boolean;
};

/* ============================================================
   SCROLL-DIRECTION HOOK
   ============================================================ */

function useScrollBars(
  targetRef: React.RefObject<HTMLElement | null>,
) {
  const [showHeader, setShowHeader] = useState(true);
  const [showBottom, setShowBottom] = useState(true);

  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;

    lastY.current = node.scrollTop;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = Math.max(0, node.scrollTop);
        const delta = y - lastY.current;

        if (y <= 8) {
          setShowHeader(true);
          setShowBottom(true);
        } else if (delta > 8) {
          setShowHeader(false);
          setShowBottom(true);
        } else if (delta < -8) {
          setShowHeader(true);
          setShowBottom(false);
        }

        lastY.current = y;
        ticking.current = false;
      });
    };

    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, []);

  return { showHeader, showBottom };
}

/* ============================================================
   ICONS
   ============================================================ */

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

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

function Useraccount() {
  const [active, setActive] = useState<TabKey>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [openView, setOpenView] = useState<OpenView>(null);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const { showHeader, showBottom } = useScrollBars(contentRef);

  const {
    data: profileStatus,
    isLoading: profileLoading,
  } = useProfileStatus();

  const profileIncomplete =
    !profileLoading &&
    profileStatus !== undefined &&
    profileStatus.is_complete === false;

  const navItems: NavItem[] = [
    { key: 'home',       label: 'Home',       icon: <HomeIcon /> },
    { key: 'stories',    label: 'Stories',    icon: <StoriesIcon /> },
    { key: 'business',   label: 'Business',   icon: <BusinessIcon />, primary: true },
    {
      key: 'deliveries',
      label: 'Deliveries',
      icon: <DeliveriesIcon />,
      bottomNav: false,
    },
    { key: 'billing',    label: 'Billing',    icon: <BillingIcon /> },
  ];

  const goToProfile = () => {
    setActive('profile');
    setSearchQuery('');
    setOpenView(null);
  };
  const goToBilling = () => setActive('billing');
  const goToDeliveries = () => {
    setActive('deliveries');
    setSearchQuery('');
    setOpenView(null);
  };

  const handleSearch = (q: string) => setSearchQuery(q);

  const renderTab = () => {
    switch (active) {
      case 'home':
        return (
          <Home
            onOpenPayment={(productId) =>
              setOpenView({ kind: 'product-payment', id: productId })
            }
            onGoToProfile={goToProfile}
            navVisible={showHeader}
          />
        );
      case 'stories':    return <StoriesTab onGoToProfile={goToProfile} />;
      case 'business':   return <MyBusiness onGoToProfile={goToProfile} />;
      case 'deliveries': return <DeliveriesTab />;
      case 'profile':    return <ProfileTab />;
      case 'billing':    return <BillingTab />;
      default:
        return (
          <Home
            onOpenPayment={(productId) =>
              setOpenView({ kind: 'product-payment', id: productId })
            }
            onGoToProfile={goToProfile}
            navVisible={showHeader}
          />
        );
    }
  };

  const renderContent = (): React.ReactNode => {
    if (profileIncomplete && active !== 'profile') {
      return (
        <div className="home-state-locked">
          <div className="home-locked-wrap">
            <Confirmprofilecomplete
              missingLabels={profileStatus.missing_labels}
              completionPercent={profileStatus.completion_percent}
              onComplete={goToProfile}
            />
          </div>
        </div>
      );
    }

    if (openView) {
      switch (openView.kind) {
        case 'business':
          return (
            <BusinessDetails
              businessId={openView.id}
              onBack={() => setOpenView(null)}
            />
          );

        case 'post':
          return (
            <PostDetailPage
              postId={openView.id}
              onBack={() => setOpenView(null)}
              onOpenBusiness={(id) =>
                setOpenView({ kind: 'business', id })
              }
            />
          );

        case 'product':
          return (
            <ProductDetailPage
              productId={openView.id}
              isYoupataManaged={openView.youpata}
              onPurchase={(id) =>
                setOpenView({ kind: 'product-payment', id })
              }
              onBack={() => setOpenView(null)}
              onOpenBusiness={(id) =>
                setOpenView({ kind: 'business', id })
              }
            />
          );

        case 'product-payment':
          return (
            <ProductPayment
              productId={openView.id}
              onBack={() => setOpenView(null)}
              onOpenBusiness={(id) =>
                setOpenView({ kind: 'business', id })
              }
            />
          );

        case 'story':
          return (
            <StoryDetail
              storyId={openView.id}
              onBack={() => setOpenView(null)}
            />
          );
      }
    }

    if (searchQuery) {
      return (
        <SearchResults
          query={searchQuery}
          scope={searchScope}
          onClose={() => setSearchQuery('')}
          onOpenBusiness={(id) => setOpenView({ kind: 'business', id })}
          onOpenPost={(id) => setOpenView({ kind: 'post', id })}
          onOpenProduct={(id) => setOpenView({ kind: 'product', id })}
          onOpenStory={(id) => setOpenView({ kind: 'story', id })}
        />
      );
    }

    if (active === 'billing') return renderTab();

    return (
      <SubscriptionGuard onUpgrade={goToBilling}>
        {renderTab()}
      </SubscriptionGuard>
    );
  };

  const bottomNavItems = navItems.filter(
    (item) => item.bottomNav !== false
  );

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
              onClick={() => {
                setActive(item.key);
                setSearchQuery('');
                setOpenView(null);
              }}
              className={
                'ua-sidebar-link' +
                (active === item.key ? ' is-active' : '')
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
        <div
          className={
            'ua-header-wrap' + (showHeader ? '' : ' is-hidden')
          }
        >
          <UserHeader
            onOpenProfile={goToProfile}
            onOpenDeliveries={goToDeliveries}
            onSearch={handleSearch}
            scope={searchScope}
            onScopeChange={setSearchScope}
          />
        </div>

        <div className="ua-content" ref={contentRef}>
          {renderContent()}
        </div>
      </div>

      <nav
        className={
          'ua-bottom-nav' + (showBottom ? '' : ' is-hidden')
        }
      >
        {bottomNavItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setActive(item.key);
              setSearchQuery('');
              setOpenView(null);
            }}
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