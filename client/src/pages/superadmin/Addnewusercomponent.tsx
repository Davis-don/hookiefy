import './addnewusercomponent.css'
import { IoMdClose } from "react-icons/io";
import 'bootstrap/dist/css/bootstrap.min.css'
import { useMountStore } from './store/usermodalstore'
function Addnewusercomponent() {
   const {toggleMount } = useMountStore();
  return (
    <div className="overall-add-new-user-form">
        <div className="add-users-header-form">
            <div className="add-user-form-left">
                <h3>Add Users</h3>
            </div>
            <div className="add-user-right-form">
                <IoMdClose onClick={toggleMount} className="close-icon" />
            </div>
        </div>
        <div className="add-user-form-div-actual">
           <form className='form-component-div-actual' action="">
              <input
                type="text"
                placeholder="Enter First Name"
                className="form-control p-3"
                required
              />

              <input
                type="text"
                placeholder="Enter Last Name"
                className="form-control p-3"
                required
              />

              <input
                type="email"
                placeholder="Email Address"
                className="form-control p-3"
                required
              />

              <input
                type="text"
                placeholder="Enter Phone Number"
                className="form-control p-3"
                required
              />

              <select
                className="form-control p-3"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select Gender
                </option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>

              <select
                className="form-control p-3"
                defaultValue="user"
                required
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>

              <input
                type="password"
                placeholder="Enter Password"
                className="form-control p-3"
                required
              />

              <input
                type="password"
                placeholder="Confirm Password"
                className="form-control p-3"
                required
              />

              <div className="submit-user-button">
                <button className='btn confirm'>Confirm</button>
                <button className='btn btn-danger close' onClick={toggleMount}>close</button>
              </div>
           </form>
        </div>
    </div>
  )
}

export default Addnewusercomponent