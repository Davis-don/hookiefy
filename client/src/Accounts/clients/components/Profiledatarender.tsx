import './profiledatarender.css'
import Addimageprofile from './Addimageprofile'
import Profiledetailfetchview from './Profiledetailfetchview'
import Editclientprofile from './Editclientprofile'
import 'bootstrap/dist/css/bootstrap-grid.min.css'
import { useState } from 'react'
function Profiledatarender() {
  const [mountEdit, setMountedit]=useState(false)
  return (
    <div className="profile-datarender-container-overall">
        <Addimageprofile/>
        {mountEdit ? <Editclientprofile/> : <Profiledetailfetchview/>}
        <div className="button-edit-profile-container">
      <button  onClick={()=>setMountedit(!mountEdit)} className={mountEdit?'btn btn-primary':"btn btn-secondary"}>{mountEdit ? "View Profile" : "Edit profile"}</button>
        </div>
        
    </div>
  )
}

export default Profiledatarender