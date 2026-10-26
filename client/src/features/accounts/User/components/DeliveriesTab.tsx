// src/features/accounts/User/components/DeliveriesTab.tsx

import { useAuthStore } from '../../../../store/authStore';

import DeliveriesList from './DeliveriesList';

import './deliveriesTab.css';

function DeliveriesTab() {
  const access = useAuthStore((s) => s.access);

  if (!access) {
    return (
      <div className="dlv-tab-state">
        <p>Sign in to see your deliveries.</p>
      </div>
    );
  }

  return <DeliveriesList />;
}

export default DeliveriesTab;