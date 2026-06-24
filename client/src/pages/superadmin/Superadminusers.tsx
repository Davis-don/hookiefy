import './superadminusers.css';
import { IoMdAdd } from 'react-icons/io';
import FetchallUsers from './FetchallUsers';
import Addnewusercomponent from './Addnewusercomponent';
import { useMountStore } from './store/usermodalstore'

function Superadminusers() {
  const { mount, toggleMount } = useMountStore();

  return (
    <div className="overall-super-admin-users-container">
      <div className="header-section-user-super-admin">
        <div className="left-side-header-superadmin">
          <h3>Users</h3>
          <p>Manage your users</p>
        </div>

        <div className="right-side-header-super-admin-user">
          <button onClick={toggleMount}>
            <IoMdAdd /> Users
          </button>
        </div>
      </div>

      <div className="users-body-section-container">
        <div className="fetch-all-users-main-div">
          <FetchallUsers />
        </div>

        {mount && (
          <div className="add-new-user-main-form">
            <Addnewusercomponent />
          </div>
        )}
      </div>
    </div>
  );
}

export default Superadminusers;