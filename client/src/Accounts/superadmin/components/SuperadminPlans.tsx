// SuperadminPlans.tsx
import { useState } from 'react';
import './superadminplans.css';
import { FiGrid, FiPlusCircle, FiPhoneCall } from 'react-icons/fi';
import AllPlans from './AllPlans';
import AddPlan from './AddPlan';
import ContactFees from './ContactFees';

type TabId = 'all-plans' | 'add-plan' | 'contact-fees';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const TABS: Tab[] = [
  {
    id: 'all-plans',
    label: 'All Plans',
    icon: <FiGrid />,
    component: <AllPlans />,
  },
  {
    id: 'add-plan',
    label: 'Add Plan',
    icon: <FiPlusCircle />,
    component: <AddPlan />,
  },
  {
    id: 'contact-fees',
    label: 'Contact Fees',
    icon: <FiPhoneCall />,
    component: <ContactFees />,
  },
];

function SuperadminPlans() {
  const [activeTab, setActiveTab] = useState<TabId>('all-plans');

  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="sa-page-container sa-plans-page">
      {/* ── Tab bar ───────────────────────────────────── */}
      <div
        className="sa-plans-tabs"
        role="tablist"
        aria-label="Plans sections"
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`sa-plans-panel-${tab.id}`}
              id={`sa-plans-tab-${tab.id}`}
              className={`sa-plans-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="sa-plans-tab-icon">{tab.icon}</span>
              <span className="sa-plans-tab-label">{tab.label}</span>
              <span className="sa-plans-tab-underline" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {/* ── Active panel ──────────────────────────────── */}
      <div
        className="sa-plans-panel"
        role="tabpanel"
        id={`sa-plans-panel-${active.id}`}
        aria-labelledby={`sa-plans-tab-${active.id}`}
        key={active.id}
      >
        {active.component}
      </div>
    </div>
  );
}

export default SuperadminPlans;