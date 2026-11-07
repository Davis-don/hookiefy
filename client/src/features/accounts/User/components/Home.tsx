// src/pages/Home.tsx

import { useEffect, useState } from 'react';

import { useAuthStore } from '../../../../store/authStore';
import { useProfileStatus } from '../../../../features/accounts/hooks/useProfileStatus';
import Confirmprofilecomplete from '../../User/components/Confirmprofilecomplete';

import AllFeedSection from './sections/AllFeedSection';
import YoupataFeedSection from './sections/YoupataFeedSection';
import ProductsFeedSection from './sections/ProductsFeedSection';
import PostsFeedSection from './sections/PostsFeedSection';

import BusinessDetails from '../../../businesses/components/BusinessDetails';
import PostDetail from './feed/PostDetail';
import ProductDetail from './feed/ProductDetail';

import './home.css';

/* ============================================================
   TYPES
   ============================================================ */

type FeedTab = 'all' | 'youpata' | 'products' | 'posts';

type OpenView =
  | { kind: 'business'; id: number }
  | { kind: 'post'; id: number }
  | { kind: 'product'; id: number; youpata?: boolean }
  | null;

type HomeProps = {
  onOpenPayment: (productId: number) => void;
  onGoToProfile?: () => void;

  /**
   * Whether the parent's scroll listener considers the
   * account header visible. When `false`, the Home nav
   * slides up out of view too — the two bars move together.
   *
   * Defaults to `true` so `Home` works standalone (any page
   * that doesn't provide a scroll observer).
   */
  navVisible?: boolean;
};

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'youpata',  label: 'Youpata managed' },
  { key: 'products', label: 'Products' },
  { key: 'posts',    label: 'Posts' },
];

/* ============================================================
   HEADER OFFSET — where the fixed nav should sit
   ============================================================
   Reads the actual rendered height of `.ua-header-wrap` if
   it exists in the DOM (i.e. we're inside Useraccount), and
   uses it as the nav's fixed `top`. If no header exists
   (marketing Home, standalone, test page), the nav sits at
   `top: 0` — flush with the top of the viewport.

   Uses ResizeObserver so the offset updates if the header
   changes height (mobile vs desktop, avatar size, etc.).
   ============================================================ */

function useHeaderOffset() {
  const [top, setTop] = useState(0);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.ua-header-wrap');
    if (!header) {
      setTop(0);
      return;
    }

    const apply = () => {
      const h = header.getBoundingClientRect().height;
      setTop(Math.max(0, Math.round(h)));
    };

    apply();

    const ro = new ResizeObserver(apply);
    ro.observe(header);

    // Re-measure on viewport changes too — width changes can
    // change the header's height (line wrapping, etc.).
    window.addEventListener('resize', apply);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, []);

  return top;
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

function Home({
  onOpenPayment,
  onGoToProfile,
  navVisible = true,
}: HomeProps) {
  const access = useAuthStore((s) => s.access);

  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [openView, setOpenView] = useState<OpenView>(null);

  const {
    data: profileStatus,
    isLoading: profileLoading,
  } = useProfileStatus();

  // How far down from the top of the viewport the nav should
  // sit — the height of the fixed account header above it,
  // or 0 if there is no header.
  const navTop = useHeaderOffset();

  /* ── Detail views take over the whole page ─────────── */
  if (openView?.kind === 'business') {
    return (
      <BusinessDetails
        businessId={openView.id}
        onBack={() => setOpenView(null)}
      />
    );
  }

  if (openView?.kind === 'post') {
    return (
      <PostDetail
        postId={openView.id}
        onBack={() => setOpenView(null)}
        onOpenBusiness={(businessId) =>
          setOpenView({ kind: 'business', id: businessId })
        }
      />
    );
  }

  if (openView?.kind === 'product') {
    return (
      <ProductDetail
        productId={openView.id}
        isYoupataManaged={openView.youpata}
        onPurchase={(id) => onOpenPayment(id)}
        onBack={() => setOpenView(null)}
        onOpenBusiness={(businessId) =>
          setOpenView({ kind: 'business', id: businessId })
        }
      />
    );
  }

  /* ── Unauthenticated ──────────────────────────────── */
  if (!access) {
    return (
      <div className="home-state home-state-empty">
        <p className="home-empty-title">Sign in to see your feed</p>
        <p className="home-empty-sub">
          Posts and products from other businesses will appear here.
        </p>
      </div>
    );
  }

  /* ── Profile gate ─────────────────────────────────── */
  const requiredMissing =
    !profileLoading &&
    profileStatus !== undefined &&
    profileStatus.is_complete === false;

  if (requiredMissing) {
    return (
      <div className="home-state-locked">
        <div className="home-locked-wrap">
          <Confirmprofilecomplete
            missingLabels={profileStatus.missing_labels}
            completionPercent={profileStatus.completion_percent}
            onComplete={() => onGoToProfile?.()}
          />
        </div>
      </div>
    );
  }

  /* ── Navigators passed to every section ───────────── */
  const openBusiness = (id: number) =>
    setOpenView({ kind: 'business', id });
  const openPost = (id: number) =>
    setOpenView({ kind: 'post', id });
  const openProduct = (id: number, youpata?: boolean) =>
    setOpenView({ kind: 'product', id, youpata });

  /* ── Render ───────────────────────────────────────── */
  return (
    <div
      className="home-shell"
      style={{
        // Reserve space for the fixed nav: its top offset +
        // its own height (~44px) + a small gap.
        paddingTop: `${navTop + 64}px`,
      }}
    >
      <nav
        className={
          'home-nav' + (navVisible ? '' : ' is-hidden')
        }
        style={{ top: `${navTop}px` }}
        aria-label="Feed filters"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={
              'home-nav__tab' +
              (activeTab === tab.key ? ' is-active' : '')
            }
            aria-selected={activeTab === tab.key}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'all' && (
        <AllFeedSection
          onOpenBusiness={openBusiness}
          onOpenPost={openPost}
          onOpenProduct={openProduct}
          onPurchase={onOpenPayment}
        />
      )}
      {activeTab === 'youpata' && (
        <YoupataFeedSection
          onOpenBusiness={openBusiness}
          onOpenPost={openPost}
          onOpenProduct={openProduct}
          onPurchase={onOpenPayment}
        />
      )}
      {activeTab === 'products' && (
        <ProductsFeedSection
          onOpenBusiness={openBusiness}
          onOpenProduct={openProduct}
          onPurchase={onOpenPayment}
        />
      )}
      {activeTab === 'posts' && (
        <PostsFeedSection
          onOpenBusiness={openBusiness}
          onOpenPost={openPost}
        />
      )}
    </div>
  );
}

export default Home;