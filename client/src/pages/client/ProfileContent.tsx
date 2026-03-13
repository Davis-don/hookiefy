import Uploadclientimg from "./Uploadclientimg"
import Clientbioupload from "./Clientbioupload"

function ProfileContent() {
  return (
    <div className="overall-profile-container-client">
      <Uploadclientimg/>
      <Clientbioupload/>
    </div>
  )
}

export default ProfileContent