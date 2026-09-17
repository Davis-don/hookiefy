import Addimageprofile from '../../common/components/Addimageprofile'
import Generalinfoedit from '../../common/components/Generalinfoedit'
import Passwordedit from '../../common/components/Passwordedit'
import './superadminprofile.css'

function SuperadminProfile() {
  return (
    <div className="overall-superadmin-profile">
      <Addimageprofile/>
      <Generalinfoedit/>
      <Passwordedit/>
    </div>
  )
}

export default SuperadminProfile