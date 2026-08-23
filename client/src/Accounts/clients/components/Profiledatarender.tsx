import './profiledatarender.css'
import Addimageprofile from './Addimageprofile'
import Profiledetailfetchview from './Profiledetailfetchview'
import Editclientprofile from './Editclientprofile'
import Profileheader from './Profileheader'
import Settings from './Settings'
import 'bootstrap/dist/css/bootstrap-grid.min.css'
import { useState } from 'react'

function Profiledatarender() {
  const [mountEdit, setMountedit] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const handleSettingsClick = () => {
    setShowSettings(true)
  }

  const handleSettingsBack = () => {
    setShowSettings(false)
  }

  // Render settings page when showSettings is true
  if (showSettings) {
    return (
      <div className="profile-datarender-container-overall">
        <Settings onBack={handleSettingsBack} />
      </div>
    )
  }

  return (
    <div className="profile-datarender-container-overall">
      {/* Profile Header with Settings and Logout */}
      <Profileheader onSettingsClick={handleSettingsClick} />

      <Addimageprofile/>
      {mountEdit ? <Editclientprofile/> : <Profiledetailfetchview/>}
      
      <div className="button-edit-profile-container">
        <button onClick={() => setMountedit(!mountEdit)} className={mountEdit ? 'btn-primary' : 'btn-secondary'}>
          {mountEdit ? "View Profile" : "Edit Profile"}
        </button>
      </div>
    </div>
  )
}

export default Profiledatarender