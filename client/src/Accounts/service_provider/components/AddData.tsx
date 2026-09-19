// AddData.tsx — creative "add anything" surface with 4 tabs
import { useState } from 'react'
import type { ComponentType } from 'react'
import './addData.css'
import AddService from './AddService'
import AllServices from './AllServices'
import MyPosts from './MyPosts'
import AddPost from './AddPost'

interface AddDataProps {
  /* onClose is kept optional for compatibility but no longer
     rendered — the bottom nav handles navigation. */
  onClose?: () => void
}

interface AddTab {
  id: string
  label: string       // shown on desktop / tablet
  short: string       // shown on small screens (icon-only anyway)
  emoji: string
  component: ComponentType<any>
}

const ADD_TABS: AddTab[] = [
  { id: 'my-posts',     label: 'My Posts',    short: 'Posts',    emoji: '📝', component: MyPosts },
  { id: 'add-post',     label: 'Add Post',    short: 'Post',     emoji: '✍️', component: AddPost },
  { id: 'all-services', label: 'My Services', short: 'Services', emoji: '🛠️', component: AllServices },
  { id: 'add-service',  label: 'Add Service', short: 'Service',  emoji: '➕', component: AddService },
]

function AddData(_props: AddDataProps) {
  const [activeTab, setActiveTab] = useState('my-posts')

  const active =
    ADD_TABS.find((t) => t.id === activeTab) ?? ADD_TABS[0]
  const ActiveComponent = active.component

  /* Jump helpers */
  const goToAddService = () => setActiveTab('add-service')
  const goToAddPost    = () => setActiveTab('add-post')

  return (
    <div className="adx-root">
      {/* Header — title only, no close button */}
      <header className="adx-header">
        <h2 className="adx-title">Create</h2>
      </header>

      {/* Top underline tab bar */}
      <div className="adx-tabbar-wrap">
        <nav className="adx-tabbar" role="tablist">
          {ADD_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-label={tab.label}
              title={tab.label}
              className={`adx-tab ${
                activeTab === tab.id ? 'adx-tab-active' : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="adx-tab-emoji">{tab.emoji}</span>
              <span className="adx-tab-label">{tab.label}</span>
              <span className="adx-tab-short">{tab.short}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Active component panel — props wired per tab */}
      <div className="adx-panel" role="tabpanel">
        {activeTab === 'my-posts' && <MyPosts />}

        {activeTab === 'add-post' && (
          <AddPost
            onCreated={() => setActiveTab('my-posts')}
            onCancel={goToAddPost}
          />
        )}

        {activeTab === 'all-services' && (
          <AllServices onAddClick={goToAddService} />
        )}

        {activeTab === 'add-service' && (
          <AddService
            onCreated={() => setActiveTab('all-services')}
            onCancel={goToAddService}
          />
        )}

        {/* Fallback for any new tab added to ADD_TABS without a block above */}
        {activeTab !== 'my-posts' &&
          activeTab !== 'add-post' &&
          activeTab !== 'all-services' &&
          activeTab !== 'add-service' && <ActiveComponent />}
      </div>
    </div>
  )
}

export default AddData