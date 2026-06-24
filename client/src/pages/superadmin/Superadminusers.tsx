import './superadminusers.css'
import { IoMdAdd } from "react-icons/io";
function Superadminusers() {
  return (
    <div className="overall-super-admin-users-container">
    <div className="header-section-user-super-admin">
      <div className="left-side-header-superadmin">
        <h3>Users</h3>
      <p>Manage your users</p>
      </div>
      <div className="right-side-header-super-admin-user">
        <button><IoMdAdd/> Users</button>
      </div>
    </div>
    <div className="users-body-section-container">
      
    </div>
    </div>
  )
}

export default Superadminusers