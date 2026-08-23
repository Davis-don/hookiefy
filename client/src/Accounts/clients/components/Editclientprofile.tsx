import './editclientprofile.css'
import Generalinfoedit from './Generalinfoedit'
import Passwordedit from './Passwordedit'
import Dangerzone from './Dangerzone'

function Editclientprofile() {
  return (
   <div className="overall-edit-user-profile-container">
    <Generalinfoedit/>
    <Passwordedit/>
    <Dangerzone/>
   </div>
  )
}

export default Editclientprofile