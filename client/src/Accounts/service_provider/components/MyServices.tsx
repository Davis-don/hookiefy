// MyServices.tsx
import { useState } from 'react'
import './myservices.css'
import { FiPlusCircle, FiList } from 'react-icons/fi'
import AddService from './AddService'
import AllServices from './AllServices'

type TabId = 'list' | 'add'

const MyServices = () => {
  const [activeTab, setActiveTab] = useState<TabId>('list')

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'list',
      label: 'All Services',
      icon: <FiList className="mys-tab-icon" />,
    },
    {
      id: 'add',
      label: 'Add Service',
      icon: <FiPlusCircle className="mys-tab-icon" />,
    },
  ]

  return (
    <div className="mys-page">
      {/* ── Sticky tab bar ──────────────────────────────── */}
      <div className="mys-tabbar" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`mys-tab ${
              activeTab === tab.id ? 'mys-tab-active' : ''
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span className="mys-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────── */}
      <div className="mys-tab-content" role="tabpanel">
        {activeTab === 'list' && (
          <AllServices onAddClick={() => setActiveTab('add')} />
        )}

        {activeTab === 'add' && (
          <AddService
            onCreated={() => setActiveTab('list')}
            onCancel={() => setActiveTab('list')}
          />
        )}
      </div>
    </div>
  )
}

export default MyServices