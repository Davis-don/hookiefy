// src/components/feed/PostCard.tsx

import { useRef, useState } from 'react';
import type { FeedItem } from '../../api/feedApi';
import FollowButton from '../../../../engagement/components/FollowButton';
import LikeCount from '../../../../engagement/components/LikeCount';
import FollowCount from '../../../../engagement/components/FollowCount';
import HeartBurst, {
  type HeartBurstHandle,
} from '../../../../engagement/components/HeartBurst';
import { useToggleLike } from '../../../../engagement/hooks/useEngagement';
import { useDoubleTap } from '../../../../engagement/hooks/useDoubleTap';
import './postcard.css';

type PostCardProps = {
  item: FeedItem;
  onOpenBusiness: (businessId: number) => void;
  onOpenPost: (postId: number) => void;
};

const CLAMP_LINES = 2;

function PostCard({ item, onOpenBusiness, onOpenPost }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);

  /* ── Image loading state ────────────────────────── */
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const body = item.body ?? '';
  const isLong = body.length > CLAMP_LINES * 60;
  const clampClass = !expanded && isLong ? ' is-clamped' : '';

  const openBusiness = () => onOpenBusiness(item.business.id);
  const openPost = () => onOpenPost(item.id);

  const burstRef = useRef<HeartBurstHandle>(null);

  const likeMutation = useToggleLike('post', item.id, {
    onOptimistic: () => {},
    onConfirmed: () => {},
    onRollback: () => {},
  });

  const gesture = useDoubleTap({
    onSingle: openPost,
    onDouble: (point) => {
      if (likeMutation.isPending) return;

      burstRef.current?.burst(point.x, point.y, false);

      likeMutation.mutate(undefined, {
        onSuccess: () => {
          burstRef.current?.burst(point.x, point.y, true);
        },
      });
    },
  });

  const hasImage = !!item.image_url;
  const showSkeleton = hasImage && !imageLoaded && !imageError;

  return (
    <article className="post-card">
      <HeartBurst ref={burstRef} />

      <header className="post-card__header">
        <button
          type="button"
          className="post-card__avatar"
          onClick={(e) => {
            e.stopPropagation();
            openBusiness();
          }}
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
          onClick={(e) => {
            e.stopPropagation();
            openBusiness();
          }}
        >
          {item.business.business_name}
        </button>

        <FollowButton
          businessId={item.business.id}
          businessName={item.business.business_name}
          onOpenBusiness={openBusiness}
        />
      </header>

      {/* ── Cover with skeleton loader ────────────────── */}
      <div
        className={
          'post-card__cover' +
          (showSkeleton ? ' is-loading' : '') +
          (imageError ? ' is-error' : '')
        }
        role="button"
        tabIndex={0}
        aria-label={item.title ? `Open ${item.title}` : 'Open post'}
        {...gesture}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPost();
          }
        }}
      >
        {/* Skeleton + spinner — visible until image loads */}
        {showSkeleton && (
          <div className="post-card__cover-skeleton" aria-hidden="true">
            <div className="post-card__cover-shimmer" />
            <div className="post-card__cover-spinner">
              <span className="post-card__spinner-ring" />
            </div>
          </div>
        )}

        {/* Image fades in after load */}
        {hasImage && !imageError && (
          <img
            src={item.image_url ?? ''}
            alt={item.title ?? 'Post'}
            loading="lazy"
            className={
              'post-card__cover-img' +
              (imageLoaded ? ' is-loaded' : '')
            }
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}

        {/* Fallback if image fails */}
        {imageError && (
          <div className="post-card__cover-error" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
              <line x1="3" y1="3" x2="21" y2="21" />
            </svg>
            <span>Image unavailable</span>
          </div>
        )}
      </div>

      {(item.title || body) && (
        <div className="post-card__body" {...gesture}>
          {item.title && <h3 className="post-card__title">{item.title}</h3>}

          {body && (
            <>
              <p className={`post-card__text${clampClass}`}>{body}</p>

              {isLong && (
                <button
                  type="button"
                  className="post-card__toggle"
                  onPointerDown={(e) => e.stopPropagation()}
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

      <footer className="post-card__footer">
        <LikeCount
          targetKind="post"
          targetId={item.id}
          className="post-card__like-count"
        />
        <span className="post-card__footer-dot" aria-hidden="true">
          ·
        </span>
        <FollowCount
          businessId={item.business.id}
          className="post-card__follow-count"
        />
      </footer>
    </article>
  );
}

export default PostCard;