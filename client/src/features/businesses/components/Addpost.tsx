import { useState } from 'react';
import Newpost from './Newpost';
import Allposts from './Allposts';
import './addpost.css';

type View = 'new' | 'all';

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
  const [view, setView] = useState<View>('new');

  return (
    <div className="ap-shell">
      {/* ── Top bar: back ───────────────────────────── */}
      <div className="ap-topbar">
        <div className="ap-topbar-left">
          {onBack && (
            <button
              type="button"
              className="ap-icon-btn ap-icon-btn-back"
              onClick={onBack}
              aria-label="Back to business"
              title="Back"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          <span className="ap-topbar-crumb">
            {businessName ? `Posts · ${businessName}` : 'Posts'}
          </span>
        </div>
      </div>

      {/* ── Segmented switcher ─────────────────────── */}
      <div className="ap-switch" role="tablist" aria-label="Posts view">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'new'}
          className={'ap-switch-btn' + (view === 'new' ? ' is-active' : '')}
          onClick={() => setView('new')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New post</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={view === 'all'}
          className={'ap-switch-btn' + (view === 'all' ? ' is-active' : '')}
          onClick={() => setView('all')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="7" y1="9" x2="17" y2="9" />
            <line x1="7" y1="13" x2="17" y2="13" />
            <line x1="7" y1="17" x2="13" y2="17" />
          </svg>
          <span>All posts</span>
        </button>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="ap-content">
        {view === 'new' && (
          <Newpost
            businessId={businessId}
            businessName={businessName}
            onCreated={() => {
              onCreated?.();
              // After a successful post, switch to the list
              setView('all');
            }}
          />
        )}

        {view === 'all' && (
          <Allposts businessId={businessId} />
        )}
      </div>
    </div>
  );
}

export default Addpost;