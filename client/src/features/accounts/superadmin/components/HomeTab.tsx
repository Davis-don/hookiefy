// src/pages/accounts/components/super/HomeTab.tsx

import SystemBalance from './SystemBalance';
import SystemUsers from './SystemUsers';
import SystemBusinesses from './SystemBusinesses';
import PerfTestsCard from '../../../../features/perfTests/components/PerfTestsCard';

import './homeTab.css';

function HomeTab() {
  return (
    <div className="sa-tab">
      <h1 className="sa-tab-title">Home</h1>

      <section className="sa-home-grid">
        <SystemBalance />
        <SystemUsers />
        <SystemBusinesses />
        <PerfTestsCard />
      </section>
    </div>
  );
}

export default HomeTab;