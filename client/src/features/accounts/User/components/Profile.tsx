// src/pages/accounts/User/components/ProfileTab.tsx

import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../../store/authStore';
import { Spinner } from '../../../../components/spinner/Spinner';
import { fetchCurrentUser } from '../../../profile/api/profileApi';

import ProfileHero from '../../../profile/components/ProfileHero';
import ProfileBio from '../../../profile/components/ProfileBio';

import './profileTab.css';

function ProfileTab() {
  const access = useAuthStore((s) => s.access);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['current-user', access],
    queryFn: fetchCurrentUser,
    enabled: !!access,
    staleTime: 60_000,
  });

  /* ── Loading ──────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="ua-tab pf-shell pf-shell-state">
        <Spinner size={22} color="#2563EB" label="Loading your profile…" />
      </div>
    );
  }

  /* ── Error ────────────────────────────────────────── */
  if (isError || !data?.user) {
    return (
      <div className="ua-tab pf-shell pf-shell-state pf-shell-error">
        <p className="pf-shell-error-text">
          {(error as Error)?.message || 'Could not load your profile.'}
        </p>
        <button
          type="button"
          className="pf-shell-retry"
          onClick={() => refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  const { user, counts } = data;

  /* ── Hero — just the image ────────────────────────── */
  const heroProfile = {
    avatarUrl: user.profile_image_url ?? null,
    coverUrl: user.profile_image_url ?? null,
  };

  /* ── Bio — identity + raw fields + counts ─────────── */
  const bioProfile = {
    name: user.full_name || user.email,
    handle: `@${user.email.split('@')[0]}`,
    bio:
      [user.first_name, user.last_name].filter(Boolean).join(' ') ||
      'Tell people a little about yourself.',
    location: user.phone_number ?? null,
    role: user.role,
    authProvider: user.auth_provider,
    isGoogleUser: user.is_google_user,
    hasProfileImage: user.has_profile_image,

    firstName: user.first_name ?? '',
    lastName: user.last_name ?? '',
    phoneNumber: user.phone_number ?? '',
    email: user.email ?? '',
    gender: user.gender ?? '',

    counts,
  };

  /* ── Ready ────────────────────────────────────────── */
  return (
    <div className="ua-tab pf-shell">
      <ProfileHero profile={heroProfile} />
      <ProfileBio profile={bioProfile} />
    </div>
  );
}

export default ProfileTab;