import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';
import './UserHeader.css';

type UserHeaderProps = {
  /** Called when the avatar is clicked — e.g. to switch to the Profile tab. */
  onOpenProfile?: () => void;
};

function UserHeader({ onOpenProfile }: UserHeaderProps) {
  return (
    <header className="ua-header">
      <Link to="/" className="ua-header-brand" aria-label="Youpata home">
        <span className="ua-header-logo-you">You</span>
        <span className="ua-header-logo-p">p</span>
        <span className="ua-header-logo-ata">ata</span>
      </Link>

      <div className="ua-header-right">
        <NotificationBell onClick={() => { /* open notifications panel */ }} />
        <Avatar size="md" onClick={onOpenProfile} />
      </div>
    </header>
  );
}

export default UserHeader;