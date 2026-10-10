// src/pages/accounts/components/PlansTab.tsx

import { useState } from 'react';

import PlansList from './PlansList';
import PlanForm from './PlanForm';

import './planstab.css';

type View = 'list' | 'create';

function PlansTab() {
  const [view, setView] = useState<View>('list');
  const [reloadKey, setReloadKey] = useState(0);

  const showForm = () => setView('create');
  const showList = () => setView('list');

  const handleCreated = () => {
    // Bump the key so PlansList remounts and refetches
    setReloadKey((k) => k + 1);
    setView('list');
  };

  if (view === 'create') {
    return (
      <PlanForm
        onCancel={showList}
        onCreated={handleCreated}
      />
    );
  }

  return (
    <div className="planstab">
      <PlansList
        key={reloadKey}
        onAddPlan={showForm}
      />

      {/* Floating + button — always visible on the list view,
          rendered here so nothing can hide it. */}
      <button
        type="button"
        className="planstab-fab"
        onClick={showForm}
        aria-label="Add a plan"
        title="Add a plan"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}

export default PlansTab;