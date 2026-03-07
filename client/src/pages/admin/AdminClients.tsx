// AdminClients.jsx
import './adminclients.css';
import { IoMdAdd } from "react-icons/io";
import 'bootstrap/dist/css/bootstrap.min.css';
import AddClient from './AddClient';
import AllClients from './AllClients';
import { useState } from 'react';

function AdminClients() {
  const [showAddClient, setShowAddClient] = useState(false);
  
  return (
    <div className="overall-clients-admin-containerr">
      <div className="clients-superuser-header-section">
        <div className="left-sideclient-user-header">
          <h2>Clients Management</h2>
          <p>Manage your clients and their relationships effectively.</p>
        </div>
        <div className="right-side-client-user-header">
          {!showAddClient ? (
            <button onClick={() => setShowAddClient(!showAddClient)} className='btn btn-primary'>
              <IoMdAdd /> Add Client
            </button>
          ) : (
            <button onClick={() => setShowAddClient(!showAddClient)} className='btn btn-warning'>
              <IoMdAdd /> All Clients
            </button>
          )}
        </div>
      </div>

      <div className="render-clients-data-superuser-container">
        {showAddClient ? <AddClient /> : <AllClients />}
      </div>
    </div>
  );
}

export default AdminClients;