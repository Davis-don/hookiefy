import './profile.css'
import Generalinfoedit from './Generalinfoedit'
import Passwordedit from './Passwordedit'
import Dangerzone from './Dangerzone'

function Profile() {
  return (
    <div className="overall-profile-container">
        <div className="main-profile-header-container">
            <h3>Profile</h3>
            <p>Manage your personal profile here</p>
        </div>
        <div className="general-information-edit">
         <Generalinfoedit/>
        </div>
        <div className="password-edit-container">
            <Passwordedit/>
        </div>
        <div className="danger-zone-main">
            <Dangerzone/>
        </div>
    </div>
  )
}

export default Profile