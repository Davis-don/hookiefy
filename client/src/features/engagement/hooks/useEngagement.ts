// src/pages/engagement/useEngagement.ts

import {
  useMutation,
  useQuery,
  useQueryClient,
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
   ============================================================ */

export const engagementKeys = {
  /** Status for content the user can LIKE (product / post / story). */
  status: (kind: TargetKind, id: number) =>
    ['engagement', 'status', kind, id] as const,

  /** Status for a BUSINESS the user can FOLLOW. */
  businessFollow: (businessId: number) =>
    ['engagement', 'business-follow', businessId] as const,
};

/* ============================================================
   useEngagementStatus — fetch current state for content
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
   useBusinessFollowStatus — fetch follow state for a business
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
   useToggleLike — optimistic + double-burst friendly
   ============================================================ */

export type ToggleLikeResult = {
  /** Fired instantly, before the request even leaves. */
  onOptimistic: () => void;
  /** Fired when the server confirms. */
  onConfirmed: (data: ToggleResponse) => void;
  /** Fired if the server rejects. */
  onRollback: () => void;
};

export function useToggleLike(
  targetKind: TargetKind,
  targetId: number,
  callbacks: ToggleLikeResult,
) {
  const qc = useQueryClient();
  const key = engagementKeys.status(targetKind, targetId);

  return useMutation<ToggleResponse, Error, void, { previous?: EngagementStatus }>({
    mutationFn: () => toggleLike(targetKind, targetId),

    // ── Optimistic update ────────────────────────────────
    onMutate: async () => {
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

      callbacks.onOptimistic();

      return { previous };
    },

    onSuccess: (data) => {
      qc.setQueryData<EngagementStatus>(key, (current) => {
        if (!current) return current;
        return {
          ...current,
          liked: data.liked ?? current.liked,
          likes_count: data.likes_count,
          follows_count: data.follows_count,
        };
      });

      callbacks.onConfirmed(data);
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData<EngagementStatus>(key, ctx.previous);
      }
      callbacks.onRollback();
    },
  });
}

/* ============================================================
   useToggleFollow — BUSINESS ONLY
   ============================================================
   The Follow button never targets a post/product/story anymore.
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

    onSuccess: (data) => {
      qc.setQueryData<BusinessFollowStatus>(key, (current) => {
        if (!current) return data;
        return {
          ...current,
          followed: data.followed ?? current.followed,
          follows_count: data.follows_count,
        };
      });
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData<BusinessFollowStatus>(key, ctx.previous);
      }
    },
  });
}