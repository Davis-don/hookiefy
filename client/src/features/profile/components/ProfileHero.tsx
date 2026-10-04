// src/pages/accounts/profile/components/ProfileHero.tsx

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import { uploadProfileImage } from '../api/profileApi';
import './profileHero.css';

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */

type ProfileData = {
  avatarUrl: string | null;
  coverUrl: string | null;
};

type Props = {
  profile: ProfileData;
};

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/* ──────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────── */

function ProfileHero({ profile }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const access = useAuthStore((s) => s.access);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [coverError, setCoverError] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedUrl, setStagedUrl] = useState<string | null>(null);

  /* ── Upload mutation ──────────────────────────────── */
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProfileImage(file),

    onSuccess: (res) => {
      toast.success(res.message || 'Profile photo updated.');
      queryClient.invalidateQueries({ queryKey: ['current-user'] });

      // Clear staging
      if (stagedUrl) URL.revokeObjectURL(stagedUrl);
      setStagedFile(null);
      setStagedUrl(null);
      setCoverError(false);
    },

    onError: (err: any) => {
      toast.error(err?.message || 'Could not upload profile image.');
      // Keep the staged image so the user can retry
    },
  });

  const isUploading = uploadMutation.isPending;

  /* ── File picking ─────────────────────────────────── */
  const openPicker = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please choose a JPG, PNG, WEBP or GIF image.');
      return;
    }

    // Revoke any previous staged URL
    if (stagedUrl) URL.revokeObjectURL(stagedUrl);

    setStagedFile(file);
    setStagedUrl(URL.createObjectURL(file));
  };

  /* ── Confirm / cancel ─────────────────────────────── */
  const confirmUpload = () => {
    if (!stagedFile || isUploading) return;
    uploadMutation.mutate(stagedFile);
  };

  const cancelStaged = () => {
    if (isUploading) return;
    if (stagedUrl) URL.revokeObjectURL(stagedUrl);
    setStagedFile(null);
    setStagedUrl(null);
  };

  /* ── Which image to display ──────────────────────── */
  const shownCover =
    stagedUrl ?? (coverError ? null : profile.coverUrl) ?? null;
  const hasStaged = !!stagedFile;

  return (
    <section className="pf-hero">
      <div className="pf-hero-cover">
        {shownCover ? (
          <img
            src={shownCover}
            alt=""
            className="pf-hero-cover-img"
            onError={() => setCoverError(true)}
            draggable={false}
          />
        ) : (
          <div className="pf-hero-cover-fallback" aria-hidden="true">
            <span className="pf-hero-cover-hint">Add a photo</span>
          </div>
        )}

        {/* Uploading overlay */}
        {isUploading && (
          <div className="pf-hero-cover-uploading" aria-live="polite">
            <Spinner size={28} label="Uploading…" />
          </div>
        )}

        {/* + button — hidden while staging/uploading */}
        {!hasStaged && !isUploading && (
          <button
            type="button"
            className="pf-hero-cover-add"
            onClick={openPicker}
            disabled={!access}
            aria-label={
              profile.coverUrl ? 'Change photo' : 'Add photo'
            }
            title={profile.coverUrl ? 'Change photo' : 'Add photo'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.6"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}

        {/* Staged preview actions */}
        {hasStaged && (
          <div className="pf-hero-cover-actions">
            <button
              type="button"
              className="pf-hero-action pf-hero-action-ghost"
              onClick={cancelStaged}
              disabled={isUploading}
            >
              Cancel
            </button>

            <button
              type="button"
              className="pf-hero-action pf-hero-action-primary"
              onClick={confirmUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Spinner size={14} />
                  <span>Uploading…</span>
                </>
              ) : (
                'Upload'
              )}
            </button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="pf-hero-file"
          onChange={handleFile}
          disabled={isUploading}
        />
      </div>
    </section>
  );
}

export default ProfileHero;