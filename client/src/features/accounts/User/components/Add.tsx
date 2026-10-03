import { useState } from 'react';
import MyBusiness from '../../../businesses/components/MyBusiness';
import MyStories from '../../../stories/components/MyStories';
import { useProfileStatus } from '../../hooks/useProfileStatus';
import Confirmprofilecomplete from './Confirmprofilecomplete';
import './add.css';

type TabKey = 'business' | 'stories';

type AddTabProps = {
  onGoToProfile?: () => void;
};

function AddTab({ onGoToProfile }: AddTabProps) {
  const [active, setActive] = useState<TabKey>('business');

  const { data: status, isLoading } = useProfileStatus();

  // Required field(s) missing → hard block.
  const requiredMissing =
    !isLoading &&
    status !== undefined &&
    status.is_complete === false;

  // ── Hard block: hide the tabs entirely ──────────────────
  if (requiredMissing) {
    return (
      <div className="ua-tab">
        <Confirmprofilecomplete
          missingLabels={status.missing_labels}
          completionPercent={status.completion_percent}
          onComplete={() => onGoToProfile?.()}
        />
      </div>
    );
  }

  // ── Normal Add tab ──────────────────────────────────────
  return (
    <div className="ua-tab">
      <div className="ua-add-tabs" role="tablist" aria-label="Content type">
        <button
          type="button"
          role="tab"
          aria-selected={active === 'business'}
          className={
            'ua-add-tab' + (active === 'business' ? ' is-active' : '')
          }
          onClick={() => setActive('business')}
        >
          My Business
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={active === 'stories'}
          className={
            'ua-add-tab' + (active === 'stories' ? ' is-active' : '')
          }
          onClick={() => setActive('stories')}
        >
          My Stories
        </button>

        <span
          className={
            'ua-add-tab-underline' +
            (active === 'stories' ? ' is-right' : '')
          }
          aria-hidden="true"
        />
      </div>

      <div className="ua-add-content">
        {active === 'business' && <MyBusiness />}
        {active === 'stories' && <MyStories />}
      </div>
    </div>
  );
}

export default AddTab;