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
   * Whether the account header is currently visible.
   *
   * When true  → the Home nav sits just below the header
   *              (at `top: headerHeight`).
   * When false → the header has slid up out of view; the
   *              Home nav slides up too and takes the
   *              header's place at `top: 0`.
   *
   * Either way the nav is always visible at the topmost
   * occupied slot — it never leaves an empty gap where
   * the header used to be.
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
   HEADER HEIGHT MEASUREMENT
   ============================================================
   Reads the actual rendered height of `.ua-header-wrap` if
   it exists (Useraccount context), or 0 if there's no
   header above us (standalone Home). The nav uses this to
   decide where to sit while the header is visible.
   ============================================================ */

function useHeaderHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.ua-header-wrap');
    if (!header) {
      setHeight(0);
      return;
    }

    const apply = () => {
      const h = header.getBoundingClientRect().height;
      setHeight(Math.max(0, Math.round(h)));
    };

    apply();

    const ro = new ResizeObserver(apply);
    ro.observe(header);
    window.addEventListener('resize', apply);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, []);

  return height;
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

  const headerHeight = useHeaderHeight();

  /* ── The nav's fixed `top`:
     - header visible  → top = headerHeight  (sits below header)
     - header hidden   → top = 0             (takes its place)
     When there's no header at all (`headerHeight === 0`),
     the nav is always at `top: 0`. */
  const navTop = navVisible ? headerHeight : 0;

  /* Reserved space above the first card.
     Exactly the two fixed bars that can be on top:
       headerHeight  ← fixed UserHeader (0 if absent)
     + navHeight     ← fixed Home nav (its own height
                        PLUS its 12px bottom margin, which
                        reserves breathing room between the
                        tab strip and the first card).

     No extra `+20` was added here: the 12px bottom margin
     on .home-nav (see home.css) is now the sole source of
     visual breathing room, so padding, flex gap, and
     margin aren't all stacking. */
  const navHeight = 56;          // tab strip height + 12px bottom margin
  const contentTop = headerHeight + navHeight;

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
      style={{ paddingTop: `${contentTop}px` }}
    >
      <nav
        className="home-nav"
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