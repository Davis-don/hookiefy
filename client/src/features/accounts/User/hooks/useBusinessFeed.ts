// src/features/feed/hooks/useBusinessFeed.ts

import {
  useInfiniteQuery,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  fetchMyFeed,
  fetchTabFeed,
  type FeedItem,
  type FeedResponse,
  type FeedTab,
  type FetchFeedOptions,
} from '../api/feedApi';
import { useAuthStore } from '../../../../store/authStore';

/* ============================================================
   CACHE TUNING
   ============================================================ */

const STALE_TIME = 60_000;         // 60 s — instant on nav back
const GC_TIME    = 10 * 60_000;    // 10 min — survives page changes

/* ============================================================
   OPTIONS
   ============================================================ */

export type UseBusinessFeedOptions = FetchFeedOptions & {
  /**
   * Which feed tab to render. Each tab hits its own
   * dedicated backend endpoint:
   *
   *   'all'      → GET /feed/businesses/all/
   *   'youpata'  → GET /feed/businesses/youpata/
   *   'products' → GET /feed/businesses/products/
   *   'posts'    → GET /feed/businesses/posts/
   *
   * Defaults to 'all'. The `mine` flag switches to the
   * authenticated personalised feed instead.
   */
  tab?: FeedTab;

  /**
   * When true, fetch the user's personalised feed from
   * `/feed/businesses/mine/` and ignore `tab`. Used by any
   * page that shows "your feed" rather than a public feed.
   *
   * Requires auth — the hook auto-disables when no token
   * is present.
   */
  mine?: boolean;
};

/* ============================================================
   QUERY KEY
   ============================================================ */

function feedQueryKey(
  access: string | null,
  options: UseBusinessFeedOptions,
) {
  return [
    'business-feed',
    options.mine ? 'mine' : (options.tab ?? 'all'),
    options.kind ?? 'all',
    options.limit ?? 10,
    options.status ?? 'active',
    options.category ?? 'all',
    options.county ?? '',
    options.region ?? '',
    access ?? 'anon',
  ] as const;
}

/* ============================================================
   FETCH DISPATCH
   ============================================================ */

function fetchForOptions(
  access: string | null,
  options: UseBusinessFeedOptions,
  before: string | null,
) {
  const merged: FetchFeedOptions = { ...options, before };

  if (options.mine) {
    // Personalised feed — requires auth.
    return fetchMyFeed(access, merged);
  }

  // Public tab feed — hits its own dedicated endpoint.
  // `fetchTabFeed` does not require auth.
  return fetchTabFeed(options.tab ?? 'all', merged);
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
  options: UseBusinessFeedOptions = {},
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
      fetchForOptions(access, options, pageParam),

    initialPageParam: null,

    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,

    // The personalised (`mine`) feed needs a token; the
    // public tab feeds don't. Only gate on auth when the
    // caller asked for `mine`.
    enabled: options.mine ? !!access : true,

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