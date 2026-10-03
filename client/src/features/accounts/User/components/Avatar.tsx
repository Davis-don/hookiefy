import { useAuthStore } from '../../../../store/authStore';
import './Avatar.css';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = {
  size?: AvatarSize;
  /** Optional click handler — e.g. to open a profile menu */
  onClick?: () => void;
};

function initialsOf(
  user: { first_name?: string; last_name?: string; email?: string } | null
): string {
  if (!user) return '?';
  const f = user.first_name?.trim();
  const l = user.last_name?.trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f) return f[0].toUpperCase();
  if (user.email) return user.email[0].toUpperCase();
  return '?';
}

function Avatar({ size = 'md', onClick }: AvatarProps) {
  const user = useAuthStore((s) => s.user);

  const url = user?.profile_image_url || '';
  const initials = initialsOf(user);

  const content = url ? (
    <img className="ua-avatar-img" src={url} alt="Profile" loading="lazy" />
  ) : (
    <span className="ua-avatar-initials" aria-hidden="true">{initials}</span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`ua-avatar ua-avatar-${size} ua-avatar-btn`}
        onClick={onClick}
        aria-label="Open profile menu"
      >
        {content}
      </button>
    );
  }

  return (
    <span className={`ua-avatar ua-avatar-${size}`} aria-hidden="true">
      {content}
    </span>
  );
}

export default Avatar;