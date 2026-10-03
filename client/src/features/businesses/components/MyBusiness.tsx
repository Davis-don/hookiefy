import { useState } from 'react';
import Allbusinesses from './Allbusinesses';
import AddBusiness from './AddBusiness';
import { useProfileStatus } from '../../../features/accounts/hooks/useProfileStatus';
import Confirmprofilecomplete from '../../accounts/User/components/Confirmprofilecomplete';
import './mybusiness.css';

type View = 'list' | 'add';

type MyBusinessProps = {
  /** Called when the user clicks "Complete now" on the profile banner. */
  onGoToProfile?: () => void;
};

function MyBusiness({ onGoToProfile }: MyBusinessProps) {
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
      <div className="mb-shell mb-shell-locked">
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
    <div className="mb-shell">
      {/* Intro header — text only, no button */}
      {view === 'list' && (
        <header className="mb-page-head">
          <h1 className="mb-page-title">Manage your businesses</h1>
          <p className="mb-page-sub">
            Everything customers can see about the businesses you own.
          </p>
        </header>
      )}

      {/* Content */}
      <div className="mb-content">
        {view === 'list' && <Allbusinesses onAdd={goToAdd} />}

        {view === 'add' && (
          <AddBusiness
            onCancel={goToList}
            onCreated={goToList}
          />
        )}
      </div>
    </div>
  );
}

export default MyBusiness;