import './admins.css'
import { IoMdAdd } from "react-icons/io";
import 'bootstrap/dist/css/bootstrap.min.css';
import AddAdmin from './AddAdmin';
import AllAdmins from './AllAdmins';
import { useState } from 'react';


function Admins() {
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  return (
    <div className="overall-admins-admin-container">
      <div className="admins-superuser-header-section">
        <div className="left-sidesuper-user-header">
          <h2>Admins Management</h2>
          <p>Manage your admins and their roles effectively.</p>
        </div>
        <div className="right-side-super-user-header">
          {!showAddAdmin?<button onClick={() => setShowAddAdmin(!showAddAdmin)} className='btn btn-primary'><IoMdAdd /> Add Admin</button>:<button onClick={() => setShowAddAdmin(!showAddAdmin)} className='btn btn-warning'><IoMdAdd />All Admins</button>}
        </div>
      </div>

      <div className="render-admins-data-superuser-container">
        {showAddAdmin? <AddAdmin /> : <AllAdmins />}
      </div>
    </div>
  )
}

export default Admins