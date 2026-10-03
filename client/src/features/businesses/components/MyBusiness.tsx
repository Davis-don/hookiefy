import { useState } from 'react';
import Allbusinesses from './Allbusinesses';
import AddBusiness from './AddBusiness';
import './mybusiness.css';

type View = 'list' | 'add';

function MyBusiness() {
  const [view, setView] = useState<View>('list');

  return (
    <div className="mb-shell">
      {/* ── Segmented switcher ──────────────────────── */}
      <div className="mb-switch" role="tablist" aria-label="Business view">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'list'}
          className={'mb-switch-btn' + (view === 'list' ? ' is-active' : '')}
          onClick={() => setView('list')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1.6" />
            <rect x="14" y="3" width="7" height="7" rx="1.6" />
            <rect x="3" y="14" width="7" height="7" rx="1.6" />
            <rect x="14" y="14" width="7" height="7" rx="1.6" />
          </svg>
          <span>All Businesses</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={view === 'add'}
          className={'mb-switch-btn' + (view === 'add' ? ' is-active' : '')}
          onClick={() => setView('add')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add</span>
        </button>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="mb-content">
        {view === 'list' && (
          <Allbusinesses onAdd={() => setView('add')} />
        )}
        {view === 'add' && (
          <AddBusiness
            onCancel={() => setView('list')}
            onCreated={() => setView('list')}
          />
        )}
      </div>
    </div>
  );
}

export default MyBusiness;