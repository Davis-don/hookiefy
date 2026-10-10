// src/pages/engagement/useEngagement.ts

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  fetchEngagementStatus,
  toggleLike,
  toggleFollow,
  type EngagementStatus,
  type TargetKind,
  type ToggleResponse,
} from '../apis/engagementApi';

/* ============================================================
   QUERY KEYS
   ============================================================ */

export const engagementKeys = {
  status: (kind: TargetKind, id: number) =>
    ['engagement', 'status', kind, id] as const,
};

/* ============================================================
   useEngagementStatus — fetch current state
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
    // Only fetch if we have a valid id
    enabled: Number.isFinite(targetId) && targetId > 0,
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
      // Cancel in-flight fetches so they don't overwrite us
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

      // Fire animation #1 immediately
      callbacks.onOptimistic();

      return { previous };
    },

    // ── Server confirmed ─────────────────────────────────
    onSuccess: (data) => {
      // Write authoritative values back
      qc.setQueryData<EngagementStatus>(key, (current) => {
        if (!current) return current;
        return {
          ...current,
          liked: data.liked ?? current.liked,
          likes_count: data.likes_count,
          follows_count: data.follows_count,
        };
      });

      // Fire animation #2 — the "successful" burst
      callbacks.onConfirmed(data);
    },

    // ── Server rejected — roll back ──────────────────────
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData<EngagementStatus>(key, ctx.previous);
      }
      callbacks.onRollback();
    },
  });
}

/* ============================================================
   useToggleFollow — same pattern, no animation callback
   ============================================================ */

export function useToggleFollow(
  targetKind: TargetKind,
  targetId: number,
) {
  const qc = useQueryClient();
  const key = engagementKeys.status(targetKind, targetId);

  return useMutation<ToggleResponse, Error, void, { previous?: EngagementStatus }>({
    mutationFn: () => toggleFollow(targetKind, targetId),

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<EngagementStatus>(key);
      if (previous) {
        const nextFollowed = !previous.followed;
        qc.setQueryData<EngagementStatus>(key, {
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
      qc.setQueryData<EngagementStatus>(key, (current) => {
        if (!current) return current;
        return {
          ...current,
          followed: data.followed ?? current.followed,
          likes_count: data.likes_count,
          follows_count: data.follows_count,
        };
      });
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData<EngagementStatus>(key, ctx.previous);
    },
  });
}