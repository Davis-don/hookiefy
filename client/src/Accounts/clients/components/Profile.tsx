// ============================================================
// Profile.tsx  (main profile page)
// ============================================================

import { useState } from 'react';
import Userprofileimg from './Userprofileimg';
import Userfetchuserinfo from './Userfetchuserinfo';
import Edituserprofile from './Edituserprofile';
import 'bootstrap/dist/css/bootstrap.min.css';
import './userprofile.css';

function Profile() {
  const [montedit, setmountedit] = useState<boolean>(false);

  return (
    <div className="overall-user-profile-container">
      <div className="top-user-profile-section">
        <div className="left-side-img-prof">
          <Userprofileimg />
        </div>
        <div className="right-side-user-meta-data">
          <Userfetchuserinfo />
        </div>
      </div>
      <div className="eidt-button-user-prof">
        <button onClick={() => setmountedit(!montedit)} className="btn btn-secondary fs-4">
          {montedit ? 'Close Profile' : 'Edit Profile'}
        </button>
      </div>
      {montedit && (
        <div className="content-display-on-button-usrr-clickd">
          <Edituserprofile />
        </div>
      )}
    </div>
  );
}

export default Profile;