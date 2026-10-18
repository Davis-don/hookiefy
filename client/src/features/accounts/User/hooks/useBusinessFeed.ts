// src/features/feed/hooks/useBusinessFeed.ts

import {
  useInfiniteQuery,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  fetchMyFeed,
  type FeedItem,
  type FeedResponse,
  type FetchFeedOptions,
} from '../api/feedApi';
import { useAuthStore } from '../../../../store/authStore';

/* ============================================================
   CACHE TUNING
   ============================================================ */

const STALE_TIME = 60_000;         // 60 s — instant on nav back
const GC_TIME    = 10 * 60_000;    // 10 min — survives page changes

/* ============================================================
   QUERY KEY
   ============================================================ */

function feedQueryKey(
  access: string | null,
  options: FetchFeedOptions,
) {
  return [
    'business-feed',
    'mine',
    options.kind ?? 'all',
    options.limit ?? 10,
    options.status ?? 'active',
    options.category ?? 'all',
    access ?? 'anon',
  ] as const;
}

/* ============================================================
   PUBLIC SHAPE  (what Home.tsx sees)
   ============================================================ */

export type UseBusinessFeedResult = {
  data:
    | {
        results: FeedItem[];
        has_more: boolean;
        next_cursor: string | null;
      }
    | undefined;

  isLoading: boolean;
  isFetching: boolean;
  isFetchingMore: boolean;
  isError: boolean;
  error: Error | null;

  refetch: () => Promise<unknown>;
  loadMore: () => void;
};

/* ============================================================
   HOOK
   ============================================================ */

export function useBusinessFeed(
  options: FetchFeedOptions = {},
): UseBusinessFeedResult {
  const access = useAuthStore((s) => s.access);

  const query = useInfiniteQuery<
    FeedResponse,
    Error,
    InfiniteData<FeedResponse>,
    ReturnType<typeof feedQueryKey>,
    string | null
  >({
    queryKey: feedQueryKey(access, options),

    queryFn: ({ pageParam }) =>
      fetchMyFeed(access, { ...options, before: pageParam }),

    initialPageParam: null,

    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,

    enabled: !!access,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  /* ── Flatten + dedupe pages ──────────────────────── */
  const seen = new Set<string>();
  const flat: FeedItem[] = [];

  if (query.data) {
    for (const page of query.data.pages) {
      for (const item of page.results) {
        const key = `${item.kind}-${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        flat.push(item);
      }
    }
  }

  const lastPage = query.data?.pages[query.data.pages.length - 1];

  return {
    data: query.data
      ? {
          results: flat,
          has_more: !!lastPage?.has_more,
          next_cursor: lastPage?.next_cursor ?? null,
        }
      : undefined,

    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingMore: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,

    refetch: () => query.refetch(),

    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    },
  };
}