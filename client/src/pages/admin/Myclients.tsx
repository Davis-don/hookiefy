import './myclients.css'
import { IoMdAdd } from 'react-icons/io';
import { useMountStore } from '../superadmin/store/usermodalstore'
import Fetchalladminclients from './Fetchalladminclients';
import Addnewclientcomponent from './Addnewclientcomponet';
function Myclients() {
  const { mount, toggleMount } = useMountStore();
  return (
    <div className="overall-myclients-container">
        <div className="header-section-user-super-admin">
                <div className="left-side-header-superadmin">
                  <h3>Clients</h3>
                  <p>Manage your clients</p>
                </div>
        
                <div className="right-side-header-super-admin-user">
                  <button onClick={toggleMount}>
                    <IoMdAdd /> Client
                  </button>
                </div>
              </div>

                  <div className="users-body-section-container">
        <div className="fetch-all-users-main-div">
          <Fetchalladminclients />
        </div>

        {mount && (
          <div className="add-new-user-main-form">
            <Addnewclientcomponent />
          </div>
        )}
      </div>
    </div>
  )
}

export default Myclients