import './editclientprofile.css'
import Generalinfoedit from '../../common/components/Generalinfoedit'
import Passwordedit from '../../common/components/Passwordedit'
import Myuserprofile from './Myuserprofile'
import Myuserpreference from './Myuserpreference'
// import Dangerzone from './Dangerzone'

function Editclientprofile() {
  return (
   <div className="overall-edit-user-profile-container">
    <Generalinfoedit/>
    <Myuserprofile/>
    <Myuserpreference/>
    <Passwordedit/>
    {/* <Dangerzone/> */}
   </div>
  )
}

export default Editclientprofile