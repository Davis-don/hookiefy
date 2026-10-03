import { useState } from 'react';
import MyBusiness from '../../../businesses/components/MyBusiness';
import MyStories from '../../../stories/components/MyStories';
import './add.css';

type TabKey = 'business' | 'stories';

function AddTab() {
  const [active, setActive] = useState<TabKey>('business');

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