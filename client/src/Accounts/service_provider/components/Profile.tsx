import Addimageprofile from "../../common/components/Addimageprofile"
import Premiumexpire from "./Premiumexpire"
import Generalinfoedit from "../../common/components/Generalinfoedit"
import Passwordedit from "../../common/components/Passwordedit"
import Biodata from "./Biodata"

function Profile() {
  return (
    <div className="ocerall-profile-container">
      <Premiumexpire/>
      <Addimageprofile/>
      <Generalinfoedit/>
      <Biodata/>
      <Passwordedit/>
    </div>
  )
}

export default Profile