// Stories.tsx
import { useState } from 'react';
import './stories.css';
import IdeasTips from './IdeasTips';
import SuccessStories from './SuccessStories';
import Fun from './Fun';

interface StoryTab {
  id: string;
  label: string;
  emoji: string;
  component: React.ComponentType;
}

const STORY_TABS: StoryTab[] = [
  { id: 'ideas',    label: 'Ideas & Tips',    emoji: '💡', component: IdeasTips },
  { id: 'success',  label: 'Success Stories', emoji: '🚀', component: SuccessStories },
  { id: 'fun',      label: 'Fun',             emoji: '😂', component: Fun },
];

function Stories() {
  const [activeTab, setActiveTab] = useState('ideas');

  const active = STORY_TABS.find((t) => t.id === activeTab) ?? STORY_TABS[0];
  const ActiveComponent = active.component;

  return (
    <div className="stories-root">
      {/* Top tab bar */}
      <div className="stories-tabbar-wrap">
        <nav className="stories-tabbar" role="tablist">
          {STORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`stories-tab ${activeTab === tab.id ? 'stories-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="stories-tab-emoji">{tab.emoji}</span>
              <span className="stories-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Active component */}
      <div className="stories-panel" role="tabpanel">
        <ActiveComponent />
      </div>
    </div>
  );
}

export default Stories;