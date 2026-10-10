// src/pages/accounts/User/components/UserHeader.tsx

import { useState } from 'react';
import { Link } from 'react-router-dom';

import Avatar from './Avatar';
import NotificationBell from './NotificationBell';
import NotificationsPanel from './NotificationsPanel';

import './UserHeader.css';

type UserHeaderProps = {
  /** Called when the avatar is clicked — e.g. to switch to the Profile tab. */
  onOpenProfile?: () => void;
};

function UserHeader({ onOpenProfile }: UserHeaderProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      <header className="ua-header">
        <Link to="/" className="ua-header-brand" aria-label="Youpata home">
          <span className="ua-header-logo-you">You</span>
          <span className="ua-header-logo-p">p</span>
          <span className="ua-header-logo-ata">ata</span>
        </Link>

        <div className="ua-header-right">
          <NotificationBell onClick={() => setPanelOpen(true)} />
          <Avatar size="md" onClick={onOpenProfile} />
        </div>
      </header>

      <NotificationsPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </>
  );
}

export default UserHeader;