// src/features/accounts/User/components/UserHeader.tsx

import { useState } from 'react';
import { Link } from 'react-router-dom';

import Avatar from './Avatar';
import NotificationBell from './NotificationBell';
import NotificationsPanel from './NotificationsPanel';
import SearchBar, { type SearchScope } from '../../../search/components/SearchBar';

import './UserHeader.css';

type UserHeaderProps = {
  onOpenProfile?: () => void;
  onSearch?: (query: string, scope: SearchScope) => void;
  scope: SearchScope;
  onScopeChange: (scope: SearchScope) => void;
};

function UserHeader({
  onOpenProfile,
  onSearch,
  scope,
  onScopeChange,
}: UserHeaderProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      <header className="ua-header">
        <Link to="/" className="ua-header-brand" aria-label="Youpata home">
          <span className="ua-header-logo-you">You</span>
          <span className="ua-header-logo-p">p</span>
          <span className="ua-header-logo-ata">ata</span>
        </Link>

        <div className="ua-header-search">
          <SearchBar
            scope={scope}
            onScopeChange={onScopeChange}
            onSearch={(q, s) => onSearch?.(q, s)}
            onClear={() => onSearch?.('', scope)}
          />
        </div>

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