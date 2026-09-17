// SuperadminServices.tsx
import { useState } from 'react'
import './superadminservices.css'
import { FiPlusCircle, FiList } from 'react-icons/fi'
import AddServiceCategory from './AddServiceCategory'
import AvailableCategories from './AvailableCategories'

type TabId = 'add' | 'list'

const SuperadminServices = () => {
  const [activeTab, setActiveTab] = useState<TabId>('list')

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'list',
      label: 'Available Categories',
      icon: <FiList className="sas-tab-icon" />,
    },
    {
      id: 'add',
      label: 'Add Category',
      icon: <FiPlusCircle className="sas-tab-icon" />,
    },
  ]

  return (
    <div className="sas-page">
      {/* ── Tab bar (Medium-style underline) ────────────── */}
      <div className="sas-tabbar" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`sas-tab ${
              activeTab === tab.id ? 'sas-tab-active' : ''
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span className="sas-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────── */}
      <div className="sas-tab-content" role="tabpanel">
        {activeTab === 'list' && (
          <AvailableCategories onAddClick={() => setActiveTab('add')} />
        )}

        {activeTab === 'add' && (
          <AddServiceCategory
            onCreated={() => setActiveTab('list')}
            onCancel={() => setActiveTab('list')}
          />
        )}
      </div>
    </div>
  )
}

export default SuperadminServices