// AddData.tsx — creative surface with 4 tabs (Font Awesome icons)
import { useState } from 'react'
import type { ComponentType } from 'react'
import {
  FaRegFileAlt,
  FaPen,
  FaTools,
  FaPlus,
} from 'react-icons/fa'
import './addData.css'
import AddService from './AddService'
import AllServices from './AllServices'
import MyPosts from './MyPosts'
import AddPost from './AddPost'

interface AddDataProps {
  onClose?: () => void
}

interface AddTab {
  id: string
  label: string
  short: string
  icon: ComponentType<{ className?: string }>
  component: ComponentType<any>
}

const ADD_TABS: AddTab[] = [
  { id: 'my-posts',     label: 'My Posts',    short: 'Posts',    icon: FaRegFileAlt, component: MyPosts },
  { id: 'add-post',     label: 'Add Post',    short: 'Post',     icon: FaPen,        component: AddPost },
  { id: 'all-services', label: 'My Services', short: 'Services', icon: FaTools,      component: AllServices },
  { id: 'add-service',  label: 'Add Service', short: 'Service',  icon: FaPlus,       component: AddService },
]

function AddData(_props: AddDataProps) {
  const [activeTab, setActiveTab] = useState('my-posts')

  const active =
    ADD_TABS.find((t) => t.id === activeTab) ?? ADD_TABS[0]
  const ActiveComponent = active.component

  const goToAddService = () => setActiveTab('add-service')
  const goToAddPost    = () => setActiveTab('add-post')

  return (
    <div className="adx-root">
      {/* Sticky top bar — tab bar only, no title */}
      <div className="adx-topbar">
        <div className="adx-tabbar-wrap">
          <nav className="adx-tabbar" role="tablist">
            {ADD_TABS.map((tab) => {
              const Icon = tab.icon
              return (
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
                  <Icon className="adx-tab-icon" />
                  <span className="adx-tab-label">{tab.label}</span>
                  <span className="adx-tab-short">{tab.short}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Panel — content scrolls under the sticky top bar */}
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

        {activeTab !== 'my-posts' &&
          activeTab !== 'add-post' &&
          activeTab !== 'all-services' &&
          activeTab !== 'add-service' && <ActiveComponent />}
      </div>
    </div>
  )
}

export default AddData