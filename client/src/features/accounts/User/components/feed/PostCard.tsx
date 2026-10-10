// src/components/feed/PostCard.tsx

import { useState } from 'react';
import type { FeedItem } from '../../api/feedApi';
import LikeButton from '../../../../engagement/components/LikeButton';
import FollowButton from '../../../../engagement/components/FollowButton';
import './postcard.css';

type PostCardProps = {
  item: FeedItem;
  onOpenBusiness: (businessId: number) => void;
};

const CLAMP_LINES = 2;

function PostCard({ item, onOpenBusiness }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);

  const body = item.body ?? '';
  const isLong = body.length > CLAMP_LINES * 60;
  const clampClass = !expanded && isLong ? ' is-clamped' : '';

  const openBusiness = () => onOpenBusiness(item.business.id);

  return (
    <article className="post-card">
      {/* ── 1. Header: avatar + business name ───────── */}
      <header className="post-card__header">
        <button
          type="button"
          className="post-card__avatar"
          onClick={openBusiness}
          aria-label={`Open ${item.business.business_name}`}
          title={item.business.business_name}
        >
          {item.owner?.profile_image_url ? (
            <img
              src={item.owner.profile_image_url}
              alt={item.business.business_name}
              loading="lazy"
            />
          ) : (
            <span className="post-card__avatar-fallback">
              {(item.business.business_name || 'B').charAt(0).toUpperCase()}
            </span>
          )}
        </button>

        <button
          type="button"
          className="post-card__business"
          onClick={openBusiness}
        >
          {item.business.business_name}
        </button>
      </header>

      {/* ── 2. Cover image ──────────────────────────── */}
      {item.image_url && (
        <button
          type="button"
          className="post-card__cover"
          onClick={openBusiness}
          aria-label={`Open ${item.business.business_name}`}
        >
          <img
            src={item.image_url}
            alt={item.title ?? 'Post'}
            loading="lazy"
          />
        </button>
      )}

      {/* ── 3. Actions: like + follow ───────────────── */}
      <div className="post-card__actions">
        <LikeButton targetKind="post" targetId={item.id} />
        <FollowButton targetKind="post" targetId={item.id} />
      </div>

      {/* ── 4. Body ─────────────────────────────────── */}
      {(item.title || body) && (
        <div className="post-card__body">
          {item.title && (
            <button
              type="button"
              className="post-card__title"
              onClick={openBusiness}
            >
              {item.title}
            </button>
          )}

          {body && (
            <>
              <p className={`post-card__text${clampClass}`}>{body}</p>

              {isLong && (
                <button
                  type="button"
                  className="post-card__toggle"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}

export default PostCard;