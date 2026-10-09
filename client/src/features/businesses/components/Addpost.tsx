// src/features/businesses/pages/Addpost.tsx

import { useState, useEffect, useRef } from 'react';
import Allposts from './Allposts';
import Allproducts from './Allproducts';
import Newpost from './Newpost';
import Newproduct from './Newproduct';
import './addpost.css';

// ============================================================
// TYPES
// ============================================================

type View = 'post' | 'product';
type Composer = 'none' | 'post' | 'product';

type AddpostProps = {
  businessId: number;
  businessName?: string;
  onBack?: () => void;
  onCreated?: () => void;
};

// ============================================================
// SCROLL PARENT HELPER
// ============================================================

function findScrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node = el?.parentElement ?? null;

  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const canScroll =
      overflowY === 'auto' ||
      overflowY === 'scroll' ||
      overflowY === 'overlay';

    if (canScroll && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }

  return window;
}

// ============================================================
// COMPONENT
// ============================================================

function Addpost({
  businessId,
  businessName,
  onBack,
  onCreated,
}: AddpostProps) {
  const [view, setView] = useState<View>('post');
  const [composer, setComposer] = useState<Composer>('none');
  const [compact, setCompact] = useState(false);

  const topbarRef = useRef<HTMLDivElement | null>(null);

  // ── Compact-on-scroll ────────────────────────────────
  useEffect(() => {
    const bar = topbarRef.current;
    if (!bar) return;

    const scrollTarget = findScrollParent(bar);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const y =
          scrollTarget instanceof Window
            ? scrollTarget.scrollY
            : scrollTarget.scrollTop;

        setCompact(y > 32);
        ticking = false;
      });
    };

    const target: HTMLElement | Window =
      scrollTarget instanceof Window ? window : scrollTarget;

    target.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      target.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Close the composer and return to the tab we came from
  const closeComposer = () => {
    const cameFrom: View = composer === 'post' ? 'post' : 'product';
    setComposer('none');
    setView(cameFrom);
    onCreated?.();
  };

  // Section label — no brand prefix
  const sectionLabel = (() => {
    if (composer === 'post') return 'New Post';
    if (composer === 'product') return 'New Product';
    return view === 'post' ? 'Posts' : 'Products';
  })();

  return (
    <div className="ap-shell">
      {/* ── Sticky header: topbar + switcher ──────── */}
      <div
        ref={topbarRef}
        className={'ap-sticky' + (compact ? ' is-compact' : '')}
      >
        {/* Top bar: back + crumb */}
        <div className="ap-topbar">
          <div className="ap-topbar-left">
            {onBack && composer === 'none' && (
              <button
                type="button"
                className="ap-back-btn"
                onClick={onBack}
                aria-label="Back to business"
                title="Back"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Back</span>
              </button>
            )}

            <span className="ap-topbar-crumb">
              <span className="ap-crumb-section">{sectionLabel}</span>
              {businessName && (
                <>
                  <span className="ap-crumb-sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="ap-crumb-business">{businessName}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Segmented switcher — hidden while composing */}
        {composer === 'none' && (
          <div
            className="ap-switch"
            role="tablist"
            aria-label="Post or product"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === 'post'}
              className={
                'ap-switch-btn' + (view === 'post' ? ' is-active' : '')
              }
              onClick={() => setView('post')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="7" y1="9" x2="17" y2="9" />
                <line x1="7" y1="13" x2="17" y2="13" />
                <line x1="7" y1="17" x2="13" y2="17" />
              </svg>
              <span>Post</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={view === 'product'}
              className={
                'ap-switch-btn' + (view === 'product' ? ' is-active' : '')
              }
              onClick={() => setView('product')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 8l-9-5-9 5 9 5 9-5z" />
                <path d="M3 8v8l9 5 9-5V8" />
                <path d="M12 13v8" />
              </svg>
              <span>Product</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="ap-content" key={composer + '-' + view}>
        {composer === 'post' && (
          <Newpost
            businessId={businessId}
            businessName={businessName}
            onBack={() => setComposer('none')}
            onCreated={closeComposer}
          />
        )}

        {composer === 'product' && (
          <Newproduct
            businessId={businessId}
            businessName={businessName}
            onBack={() => setComposer('none')}
            onCreated={closeComposer}
          />
        )}

        {composer === 'none' && view === 'post' && (
          <Allposts
            businessId={businessId}
            onAdd={() => setComposer('post')}
          />
        )}

        {composer === 'none' && view === 'product' && (
          <Allproducts
            businessId={businessId}
            onAdd={() => setComposer('product')}
          />
        )}
      </div>
    </div>
  );
}

export default Addpost;