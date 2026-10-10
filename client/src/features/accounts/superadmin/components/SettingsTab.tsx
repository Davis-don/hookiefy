// src/pages/accounts/components/super/SettingsTab.tsx

import InitPayment from './InitPayment';

function SettingsTab() {
  return (
    <div className="sa-tab">
      <h1 className="sa-tab-title">Settings</h1>

      <section className="sa-settings-section">
        <InitPayment />
      </section>
    </div>
  );
}

export default SettingsTab;