// src/pages/engagement/useEngagement.ts

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import {
  fetchEngagementStatus,
  fetchBusinessFollowStatus,
  toggleLike,
  toggleFollowBusiness,
  type EngagementStatus,
  type BusinessFollowStatus,
  type TargetKind,
  type ToggleResponse,
} from '../apis/engagementApi';

/* ============================================================
   QUERY KEYS
   ============================================================
   These keys are the single source of truth. Every place that
   reads or writes engagement state must reference them via
   these helpers — never hand-construct the array elsewhere,
   or components will miss cache updates.
   ============================================================ */

export const engagementKeys = {
  all: ['engagement'] as const,

  /** Status for content that can be LIKED (product / post / story). */
  status: (kind: TargetKind, id: number) =>
    ['engagement', 'status', kind, id] as const,

  /** Status for a BUSINESS that can be FOLLOWED. */
  businessFollow: (businessId: number) =>
    ['engagement', 'business-follow', businessId] as const,
};

/* ============================================================
   LIST KEYS — invalidated on mutation so lists stay fresh
   ============================================================
   If any page renders `likes_count` or `follows_count` from
   a cached list (feed, business profile posts/products, etc.),
   invalidating these on success forces those pages to refresh.
   Add or remove keys here to match your app's queries.
   ============================================================ */

const LIST_KEYS_TO_INVALIDATE = [
  ['feed'],
  ['business-posts'],
  ['business-products'],
  ['business-feed'],
  ['feed-businesses'],
];

function invalidateLists(qc: QueryClient) {
  for (const key of LIST_KEYS_TO_INVALIDATE) {
    qc.invalidateQueries({ queryKey: key });
  }
}

/* ============================================================
   useEngagementStatus — read current state (post/product/story)
   ============================================================ */

export function useEngagementStatus(
  targetKind: TargetKind,
  targetId: number,
) {
  return useQuery<EngagementStatus, Error>({
    queryKey: engagementKeys.status(targetKind, targetId),
    queryFn: () => fetchEngagementStatus(targetKind, targetId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled: Number.isFinite(targetId) && targetId > 0,
  });
}

/* ============================================================
   useBusinessFollowStatus — read follow state for a business
   ============================================================ */

export function useBusinessFollowStatus(businessId: number) {
  return useQuery<BusinessFollowStatus, Error>({
    queryKey: engagementKeys.businessFollow(businessId),
    queryFn: () => fetchBusinessFollowStatus(businessId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled: Number.isFinite(businessId) && businessId > 0,
  });
}

/* ============================================================
   useToggleLike — optimistic + confirmed + rollback
   ============================================================ */

export type ToggleLikeResult = {
  onOptimistic?: () => void;
  onConfirmed?: (data: ToggleResponse) => void;
  onRollback?: () => void;
};

export function useToggleLike(
  targetKind: TargetKind,
  targetId: number,
  callbacks: ToggleLikeResult = {},
) {
  const qc = useQueryClient();
  const key = engagementKeys.status(targetKind, targetId);

  return useMutation<
    ToggleResponse,
    Error,
    void,
    { previous?: EngagementStatus }
  >({
    mutationFn: () => toggleLike(targetKind, targetId),

    /* ── Optimistic update ─────────────────────────────── */
    onMutate: async () => {
      // Cancel in-flight refetches so they don't clobber us
      await qc.cancelQueries({ queryKey: key });

      const previous = qc.getQueryData<EngagementStatus>(key);

      if (previous) {
        const nextLiked = !previous.liked;
        qc.setQueryData<EngagementStatus>(key, {
          ...previous,
          liked: nextLiked,
          likes_count: nextLiked
            ? previous.likes_count + 1
            : Math.max(0, previous.likes_count - 1),
        });
      }

      callbacks.onOptimistic?.();

      return { previous };
    },

    /* ── Server confirmed ──────────────────────────────── */
    onSuccess: (data) => {
      // Write authoritative values into the cache
      qc.setQueryData<EngagementStatus>(key, (current) => {
        if (!current) return current;
        return {
          ...current,
          liked: data.liked ?? current.liked,
          likes_count:
            typeof data.likes_count === 'number'
              ? data.likes_count
              : current.likes_count,
          follows_count:
            typeof data.follows_count === 'number'
              ? data.follows_count
              : current.follows_count,
        };
      });

      // Any page that renders counts from a list should refetch
      invalidateLists(qc);

      callbacks.onConfirmed?.(data);
    },

    /* ── Server rejected — roll back ───────────────────── */
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData<EngagementStatus>(key, ctx.previous);
      }
      callbacks.onRollback?.();
    },
  });
}

/* ============================================================
   useToggleFollowBusiness — BUSINESS ONLY
   ============================================================
   The Follow button never targets a post/product/story.
   It always follows the business that owns the item.
   ============================================================ */

export function useToggleFollowBusiness(businessId: number) {
  const qc = useQueryClient();
  const key = engagementKeys.businessFollow(businessId);

  return useMutation<
    BusinessFollowStatus,
    Error,
    void,
    { previous?: BusinessFollowStatus }
  >({
    mutationFn: () => toggleFollowBusiness(businessId),

    /* ── Optimistic update ─────────────────────────────── */
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });

      const previous = qc.getQueryData<BusinessFollowStatus>(key);

      if (previous) {
        const nextFollowed = !previous.followed;
        qc.setQueryData<BusinessFollowStatus>(key, {
          ...previous,
          followed: nextFollowed,
          follows_count: nextFollowed
            ? previous.follows_count + 1
            : Math.max(0, previous.follows_count - 1),
        });
      }

      return { previous };
    },

    /* ── Server confirmed ──────────────────────────────── */
    onSuccess: (data) => {
      qc.setQueryData<BusinessFollowStatus>(key, (current) => {
        if (!current) return data;
        return {
          ...current,
          followed: data.followed ?? current.followed,
          follows_count:
            typeof data.follows_count === 'number'
              ? data.follows_count
              : current.follows_count,
        };
      });

      // Any page rendering business follows_count should refetch
      invalidateLists(qc);
    },

    /* ── Server rejected — roll back ───────────────────── */
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData<BusinessFollowStatus>(key, ctx.previous);
      }
    },
  });
}