import './AdminProfile.css'
import Addimageprofile from '../../common/components/Addimageprofile'
import Passwordedit from '../../common/components/Passwordedit'
import Generalinfoedit from '../../common/components/Generalinfoedit'

function AdminProfile() {
  return (
   <div className="overall-admin-profile-container">
    <Addimageprofile/>
    <Generalinfoedit/>
<Passwordedit/>
   </div>
  )
}

export default AdminProfile