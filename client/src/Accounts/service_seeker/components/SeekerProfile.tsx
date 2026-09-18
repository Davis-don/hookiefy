// SeekerProfile.tsx
import Generalinfoedit from '../../common/components/Generalinfoedit';
import Addimageprofile from '../../common/components/Addimageprofile';
import Biodata from '../../service_provider/components/Biodata';
import Passwordedit from '../../common/components/Passwordedit';
import './seekerprofile.css';

const SeekerProfile = () => {
  return (
    <div className="ss-profile-page">
      <Addimageprofile/>
      <Generalinfoedit />
      <Biodata/>
      <Passwordedit/>
    </div>
  );
};

export default SeekerProfile;