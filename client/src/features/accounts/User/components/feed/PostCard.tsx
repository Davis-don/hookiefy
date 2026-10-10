// src/components/feed/PostCard.tsx

import { useState } from 'react';
import type { FeedItem } from '../../api/feedApi';
import LikeButton from '../../../../engagement/components/LikeButton';
import FollowButton from '../../../../engagement/components/FollowButton';
import './postcard.css';

type PostCardProps = {
  item: FeedItem;
  onOpenBusiness: (businessId: number) => void;
  onOpenPost: (postId: number) => void;
};

const CLAMP_LINES = 2;

function PostCard({ item, onOpenBusiness, onOpenPost }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);

  const body = item.body ?? '';
  const isLong = body.length > CLAMP_LINES * 60;
  const clampClass = !expanded && isLong ? ' is-clamped' : '';

  const openBusiness = () => onOpenBusiness(item.business.id);
  const openPost = () => onOpenPost(item.id);

  return (
    <article className="post-card">
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

      {item.image_url && (
        <button
          type="button"
          className="post-card__cover"
          onClick={openPost}
          aria-label={item.title ? `Open ${item.title}` : 'Open post'}
        >
          <img
            src={item.image_url}
            alt={item.title ?? 'Post'}
            loading="lazy"
          />
        </button>
      )}

      <div className="post-card__actions">
        <LikeButton targetKind="post" targetId={item.id} />
        <FollowButton targetKind="post" targetId={item.id} />
      </div>

      {(item.title || body) && (
        <div className="post-card__body">
          {item.title && (
            <button
              type="button"
              className="post-card__title"
              onClick={openPost}
            >
              {item.title}
            </button>
          )}

          {body && (
            <>
              <p
                className={`post-card__text${clampClass}`}
                onClick={openPost}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') openPost();
                }}
              >
                {body}
              </p>

              {isLong && (
                <button
                  type="button"
                  className="post-card__toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((v) => !v);
                  }}
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