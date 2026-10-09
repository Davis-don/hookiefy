// src/components/feed/PostCard.tsx

import { useState } from 'react';
import type { FeedItem } from '../../api/feedApi';
import LikeButton from '../engagement/LikeButton';
import FollowButton from '../engagement/FollowButton';
import './postcard.css';

type PostCardProps = {
  item: FeedItem;
};

/** Show this many lines before clamping. */
const CLAMP_LINES = 2;

function PostCard({ item }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);

  const body = item.body ?? '';
  // Rough check: assume ~60 chars fit per line at the current font size.
  const isLong = body.length > CLAMP_LINES * 60;
  const clampClass = !expanded && isLong ? ' is-clamped' : '';

  return (
    <article className="post-card">
      {/* ── 1. Header: avatar + business name ───────── */}
      <header className="post-card__header">
        <div className="post-card__avatar">
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
        </div>

        <span className="post-card__business">
          {item.business.business_name}
        </span>
      </header>

      {/* ── 2. Cover image ──────────────────────────── */}
      {item.image_url && (
        <div className="post-card__cover">
          <img
            src={item.image_url}
            alt={item.title ?? 'Post'}
            loading="lazy"
          />
        </div>
      )}

      {/* ── 3. Actions: like + follow ───────────────── */}
      <div className="post-card__actions">
        <LikeButton targetKind="post" targetId={item.id} />
        <FollowButton businessId={item.business.id} />
      </div>

      {/* ── 4. Body: title + clamped description ────── */}
      {(item.title || body) && (
        <div className="post-card__body">
          {item.title && (
            <h4 className="post-card__title">{item.title}</h4>
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