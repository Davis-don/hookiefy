// src/pages/accounts/components/AccountsTab.tsx

import { useState } from 'react';

import AccountsList from './AccountsList';
import NewAccount from './NewAccount';

import './AccountsTab.css';

type SubTab = 'all' | 'new';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'all', label: 'All accounts' },
  { key: 'new', label: 'New account' },
];

function AccountsTab() {
  const [subTab, setSubTab] = useState<SubTab>('all');

  const renderSubTab = () => {
    switch (subTab) {
      case 'all':
        return <AccountsList />;
      case 'new':
        return <NewAccount onCreated={() => setSubTab('all')} />;
      default:
        return <AccountsList />;
    }
  };

  return (
    <div className="sa-tab">
      <div className="sa-subnav" role="tablist" aria-label="Accounts views">
        {SUB_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={subTab === item.key}
            onClick={() => setSubTab(item.key)}
            className={
              'sa-subnav-link' + (subTab === item.key ? ' is-active' : '')
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="sa-subtab-body" role="tabpanel">
        {renderSubTab()}
      </div>
    </div>
  );
}

export default AccountsTab;