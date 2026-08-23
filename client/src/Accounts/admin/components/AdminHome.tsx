// components/AdminHome.tsx
// ============================================================
// AdminHome.tsx - Admin Home Dashboard with Userfeed
// ============================================================

import './AdminHome.css'
import Userfeed from '../../clients/components/Userfeed'

function AdminHome() {
  return (
    <div className="overall-admin-home-container">
      <Userfeed />
    </div>
  )
}

export default AdminHome