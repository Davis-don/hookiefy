// src/pages/accounts/profile/components/ProfileBio.tsx

import { useState } from 'react';
import EditBio from './EditBio';
import './profileBio.css';

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */

type ProfileBioProps = {
  profile: {
    name: string;
    handle: string;
    bio: string;
    location: string | null;
    role: 'superadmin' | 'user';
    authProvider: 'local' | 'google';
    isGoogleUser: boolean;
    hasProfileImage: boolean;

    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    gender: 'M' | 'F' | 'O' | '' | null;

    counts: {
      businesses: number;
      posts: number;
      products: number;
      stories: number;
    };
  };
};

/* ──────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────── */

function compact(n: number): string {
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return String(n);
}

/* ──────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────── */

function ProfileBio({ profile }: ProfileBioProps) {
  const {
    name,
    handle,
    bio,
    location,
    firstName,
    lastName,
    phoneNumber,
    email,
    gender,
    counts,
  } = profile;

  const [editing, setEditing] = useState(false);

  return (
    <section className="pf-bio">
      {/* ── Header row — always visible ─────────────────── */}
      <div className="pf-bio-toprow">
        <div className="pf-bio-head">
          <h1 className="pf-bio-name">{name}</h1>
          <p className="pf-bio-handle">{handle}</p>
        </div>

        <button
          type="button"
          className={'pf-bio-edit-btn' + (editing ? ' is-active' : '')}
          onClick={() => setEditing((v) => !v)}
          aria-label={editing ? 'Close editor' : 'Edit profile'}
          aria-expanded={editing}
          title={editing ? 'Close' : 'Edit profile'}
        >
          {editing ? (
            <svg width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Body — editor OR read-only info ─────────────── */}
      {editing ? (
        <div className="pf-bio-editor">
          <EditBio
            initialFirstName={firstName}
            initialLastName={lastName}
            initialPhone={phoneNumber}
            initialEmail={email}
            initialGender={gender}
            onClose={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="pf-bio-readonly">
          <p className="pf-bio-desc">{bio}</p>

          {location && (
            <p className="pf-bio-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{location}</span>
            </p>
          )}

          <ul className="pf-bio-counts" role="list">
            <CountItem value={counts.businesses} label="Businesses" />
            <CountItem value={counts.posts}      label="Posts" />
            <CountItem value={counts.products}   label="Products" />
            <CountItem value={counts.stories}    label="Stories" />
          </ul>
        </div>
      )}
    </section>
  );
}

function CountItem({ value, label }: { value: number; label: string }) {
  return (
    <li className="pf-bio-count" role="listitem">
      <span className="pf-bio-count-value">{compact(value)}</span>
      <span className="pf-bio-count-label">{label}</span>
    </li>
  );
}

export default ProfileBio;