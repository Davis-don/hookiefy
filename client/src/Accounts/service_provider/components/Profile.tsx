import Addimageprofile from "../../common/components/Addimageprofile"
import Premiumexpire from "./Premiumexpire"
import Generalinfoedit from "../../common/components/Generalinfoedit"

function Profile() {
  return (
    <div className="ocerall-profile-container">
      <Premiumexpire/>
      <Addimageprofile/>
      <Generalinfoedit/>
    </div>
  )
}

export default Profile