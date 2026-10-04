// src/pages/stories/components/MyStories.tsx

import { useState } from 'react';
import MineStories from './Minestories';
import AddStory from './AddStory';
import { useProfileStatus } from '../../../features/accounts/hooks/useProfileStatus';
import Confirmprofilecomplete from '../../accounts/User/components/Confirmprofilecomplete';
import './mystories.css';

type View = 'list' | 'add';

type MyStoriesProps = {
  /** Called when the user clicks "Complete now" on the profile banner. */
  onGoToProfile?: () => void;
};

function MyStories({ onGoToProfile }: MyStoriesProps) {
  const [view, setView] = useState<View>('list');

  const goToAdd = () => setView('add');
  const goToList = () => setView('list');

  const { data: status, isLoading } = useProfileStatus();

  // Required field(s) missing → hard block.
  const requiredMissing =
    !isLoading &&
    status !== undefined &&
    status.is_complete === false;

  // ── Hard block: profile must be complete ────────────────
  if (requiredMissing) {
    return (
      <div className="ms-shell ms-shell-locked">
        <Confirmprofilecomplete
          missingLabels={status.missing_labels}
          completionPercent={status.completion_percent}
          onComplete={() => onGoToProfile?.()}
        />
      </div>
    );
  }

  // ── Normal shell ────────────────────────────────────────
  return (
    <div className="ms-shell">
      {/* ── Segmented switcher ──────────────────────── */}
      <div className="ms-switch" role="tablist" aria-label="Stories view">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'list'}
          className={'ms-switch-btn' + (view === 'list' ? ' is-active' : '')}
          onClick={() => setView('list')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>My Stories</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={view === 'add'}
          className={'ms-switch-btn' + (view === 'add' ? ' is-active' : '')}
          onClick={() => setView('add')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Create Story</span>
        </button>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="ms-content">
        {view === 'list' && (
          <MineStories onAdd={goToAdd} />
        )}
        {view === 'add' && (
          <AddStory
            onCancel={goToList}
            onCreated={goToList}
          />
        )}
      </div>
    </div>
  );
}

export default MyStories;