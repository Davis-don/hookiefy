import './notificationcontent.css'
import Myhookups from '../../components/common/Myhookups'
import Myrequests from '../../components/common/Myrequests'
import 'bootstrap'
import { useState } from 'react'

function NotificationsContent() {
  const [activeTab, setActiveTab] = useState<'hookups' | 'requests'>('hookups')

  return (
    <div className="ntf-content-wrapper">
      <div className="ntf-header-section">
        <ul className="ntf-tab-list">
          <li className="ntf-tab-item">
            <button 
              className={`ntf-btn ${activeTab === 'hookups' ? 'ntf-btn-active' : 'ntf-btn-inactive'}`}
              onClick={() => setActiveTab('hookups')}
            >
              My Hookups
            </button>
          </li>
          <li className="ntf-tab-item">
            <button 
              className={`ntf-btn ${activeTab === 'requests' ? 'ntf-btn-active' : 'ntf-btn-inactive'}`}
              onClick={() => setActiveTab('requests')}
            >
              My Requests
            </button>
          </li>
        </ul>
      </div>
      <div className="ntf-content-area">
        {activeTab === 'hookups' ? <Myhookups /> : <Myrequests />}
      </div>
    </div>
  )
}

export default NotificationsContent