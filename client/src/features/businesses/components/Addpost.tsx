import { useState } from 'react';
import Allposts from './Allposts';
import Allproducts from './Allproducts';
import Newpost from './Newpost';
import Newproduct from './Newproduct';
import './addpost.css';

type View = 'posts' | 'products';
type Composer = 'none' | 'post' | 'product';

type AddpostProps = {
  businessId: number;
  businessName?: string;
  onBack?: () => void;
  onCreated?: () => void;
};

function Addpost({
  businessId,
  businessName,
  onBack,
  onCreated,
}: AddpostProps) {
  const [view, setView] = useState<View>('posts');
  const [composer, setComposer] = useState<Composer>('none');

  // Close the composer and return to the tab we came from
  const closeComposer = () => {
    const cameFrom = composer === 'post' ? 'posts' : 'products';
    setComposer('none');
    setView(cameFrom);
    onCreated?.();
  };

  const crumbLabel =
    view === 'posts' ? 'Posts' : 'Products';

  return (
    <div className="ap-shell">
      {/* ── Top bar: back + crumb ───────────────────── */}
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back</span>
            </button>
          )}

          <span className="ap-topbar-crumb">
            {businessName ? `${crumbLabel} · ${businessName}` : crumbLabel}
          </span>
        </div>
      </div>

      {/* ── Segmented switcher (hidden while composing) ── */}
      {composer === 'none' && (
        <div className="ap-switch" role="tablist" aria-label="Posts view">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'posts'}
            className={'ap-switch-btn' + (view === 'posts' ? ' is-active' : '')}
            onClick={() => setView('posts')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="7" y1="9" x2="17" y2="9" />
              <line x1="7" y1="13" x2="17" y2="13" />
              <line x1="7" y1="17" x2="13" y2="17" />
            </svg>
            <span>Posts</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={view === 'products'}
            className={'ap-switch-btn' + (view === 'products' ? ' is-active' : '')}
            onClick={() => setView('products')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <path d="M21 8l-9-5-9 5 9 5 9-5z" />
              <path d="M3 8v8l9 5 9-5V8" />
              <path d="M12 13v8" />
            </svg>
            <span>Products</span>
          </button>
        </div>
      )}

      {/* ── Content ─────────────────────────────────── */}
      <div className="ap-content">
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

        {composer === 'none' && view === 'posts' && (
          <Allposts
            businessId={businessId}
            onAdd={() => setComposer('post')}
          />
        )}

        {composer === 'none' && view === 'products' && (
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