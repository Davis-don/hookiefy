// Superadmin.tsx
import { useState, useEffect } from 'react'
import './superadmin.css'
import SuperadminHeader from '../components/SuperadminHeader'
import SuperadminAnalytics from '../components/SuperadminAnalytics'
import SuperadminUsers from '../components/SuperadminUsers'
import SuperadminFinances from '../components/SuperadminFinances'
import SuperadminServices from '../components/SuperadminServices'
import SuperadminMessages from '../components/SuperadminMessages'
import SuperadminSettings from './SuperadminSettings'
import SuperadminProfile from '../components/SuperadminProfile'

const Superadmin = () => {
  const [activeTab, setActiveTab] = useState('analytics')
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  /* ── Full menu (sidebar) ─────────────────────────── */
  const menuItems = [
    {
      id: 'analytics',
      label: 'Analytics',
      icon: '📊',
      component: SuperadminAnalytics,
    },
    {
      id: 'users',
      label: 'Users',
      icon: '👥',
      component: SuperadminUsers,
    },
    {
      id: 'services',
      label: 'Services',
      icon: '🛠️',
      component: SuperadminServices,
    },
    {
      id: 'finances',
      label: 'Finances',
      icon: '💰',
      component: SuperadminFinances,
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: '💬',
      component: SuperadminMessages,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      component: SuperadminSettings,
    },
  ]

  const renderActiveComponent = () => {
    if (showProfile) return <SuperadminProfile />

    const activeItem = menuItems.find((item) => item.id === activeTab)
    const ActiveComponent = activeItem?.component || SuperadminAnalytics

    return <ActiveComponent />
  }

  const handleHeaderProfileClick = () => {
    setShowProfile(true)
    setActiveTab('')
  }

  const handleNavClick = (id: string) => {
    setShowProfile(false)
    setActiveTab(id)
  }

  const handleBrandClick = () => {
    setShowProfile(false)
    setActiveTab('analytics')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  /* ── Mobile bottom nav: only 3 icons ─────────────── */
  const mobileNavItems = [
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'messages', label: 'Messages', icon: '💬' },
  ]

  return (
    <div className="sa-dash-container">
      {/* ── Mobile top header ─────────────────────────────── */}
      {isMobile && (
        <SuperadminHeader
          onProfileClick={handleHeaderProfileClick}
          onBrandClick={handleBrandClick}
          onNavigate={(id) => {
            setShowProfile(false)
            setActiveTab(id)
          }}
          userName="SA"
        />
      )}

      {/* ── Desktop sidebar ────────────────────────────────── */}
      {!isMobile && (
        <aside
          className={`sa-dash-sidebar ${
            sidebarOpen ? 'sa-dash-sidebar-open' : ''
          }`}
        >
          <div className="sa-dash-sidebar-header">
            <h2
              className="sa-dash-sidebar-logo"
              onClick={handleBrandClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleBrandClick()
                }
              }}
              role="link"
              tabIndex={0}
              aria-label="Go to analytics"
            >
              <span className="sa-logo-you">You</span>
              <span className="sa-logo-p">p</span>
              <span className="sa-logo-ata">ata</span>
            </h2>

            <button
              className="sa-dash-sidebar-toggle"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
              type="button"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          <div className="sa-dash-sidebar-role">
            <span className="sa-role-chip">Superadmin</span>
          </div>

          <nav className="sa-dash-sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`sa-dash-sidebar-item ${
                  activeTab === item.id && !showProfile
                    ? 'sa-dash-sidebar-item-active'
                    : ''
                }`}
                onClick={() => handleNavClick(item.id)}
                type="button"
              >
                <span className="sa-dash-sidebar-icon">{item.icon}</span>
                <span className="sa-dash-sidebar-label">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sa-dash-sidebar-footer">
            <button
              className="sa-dash-user-info"
              onClick={handleHeaderProfileClick}
              aria-label="Open profile"
              type="button"
            >
              <div className="sa-dash-user-avatar">SA</div>
              <div className="sa-dash-user-details">
                <span className="sa-dash-user-name">Superadmin</span>
                <span className="sa-dash-user-status">Online</span>
              </div>
            </button>
          </div>
        </aside>
      )}

      {/* ── Main content ───────────────────────────────────── */}
      <main
        className={`sa-dash-main ${
          !isMobile && sidebarOpen ? 'sa-dash-main-shifted' : ''
        }`}
      >
        <div className="sa-dash-content-wrapper">
          {renderActiveComponent()}
        </div>
      </main>

      {/* ── Mobile bottom nav — 3 icons only ──────────────── */}
      {isMobile && (
        <nav className="sa-dash-bottom-nav">
          {mobileNavItems.map((item) => (
            <button
              key={item.id}
              className={`sa-dash-nav-item ${
                activeTab === item.id && !showProfile
                  ? 'sa-dash-nav-item-active'
                  : ''
              }`}
              onClick={() => handleNavClick(item.id)}
              aria-label={item.label}
              type="button"
            >
              <span className="sa-dash-nav-icon">{item.icon}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

export default Superadmin