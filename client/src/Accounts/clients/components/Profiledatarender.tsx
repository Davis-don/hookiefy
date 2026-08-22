import './profiledatarender.css'
import Addimageprofile from './Addimageprofile'
import Profiledetailfetchview from './Profiledetailfetchview'
function Profiledatarender() {
  return (
    <div className="profile-datarender-container-overall">
        <Addimageprofile/>
        <Profiledetailfetchview/>
    </div>
  )
}

export default Profiledatarender