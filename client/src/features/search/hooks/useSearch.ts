// src/features/search/hooks/useSearch.ts

import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import {
  searchEverything,
  type SearchKind,
  type SearchResponse,
  type SearchRow,
  type SearchResults,
  type SearchScope,
} from '../api/searchApi';

/* ============================================================
   WHICH KINDS EACH SCOPE TOUCHES
   ============================================================ */

const ALL_KINDS: SearchKind[] = [
  'businesses',
  'posts',
  'stories',
  'products',
  'users',
];

function kindsForScope(scope: SearchScope): SearchKind[] {
  switch (scope) {
    case 'all':        return ALL_KINDS;
    case 'businesses': return ['businesses'];
    case 'posts':      return ['posts'];
    case 'stories':    return ['stories'];
    case 'products':   return ['products'];
    case 'users':      return ['users'];
    default:           return ALL_KINDS;
  }
}

/* ============================================================
   PUBLIC HOOK SURFACE
   ============================================================ */

export type UseSearchResult = {
  kinds: { kind: SearchKind }[];

  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;

  results: <K extends SearchKind>(kind: K) => SearchRow<K>[];

  counts: (kind: SearchKind) => number;
  hasMore: (kind: SearchKind) => boolean;
  isFetchingMore: (kind: SearchKind) => boolean;
  loadMore: (kind: SearchKind) => void;
};

/* ============================================================
   HOOK — one infinite query per kind
   ============================================================ */

export function useSearch(
  query: string,
  scope: SearchScope,
): UseSearchResult {
  const access = useAuthStore((s) => s.access);
  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;
  const kinds = kindsForScope(scope);

  /* Safe in a loop: `kinds` is stable for a given `scope`. */
  const queries = kinds.map((kind) =>
    useInfiniteQuery<SearchResponse, Error>({
      queryKey: ['search', trimmed, scope, kind, access],
      queryFn: ({ pageParam }) =>
        searchEverything(
          {
            q: trimmed,
            kind: scope,
            page: typeof pageParam === 'number' ? pageParam : 1,
          },
          access,
        ),
      enabled,
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.has_more[kind] ? lastPage.page + 1 : undefined,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    }),
  );

  /* ── Aggregate loading/error ─────────────────────── */

  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);
  const isError = queries.some((q) => q.isError);

  const error =
    (queries.find((q) => q.error)?.error as Error | undefined) ?? null;

  /* ── Per-kind accessor ───────────────────────────── */

  function results<K extends SearchKind>(kind: K): SearchRow<K>[] {
    const idx = kinds.indexOf(kind);
    if (idx < 0) return [];

    const q = queries[idx];
    if (!q.data) return [];

    /* Cast the whole bucket to SearchResults so `results[kind]`
       resolves to a concrete array type, then index normally.
       This sidesteps the generic-union issue in `flatMap`. */
    const out: SearchRow<K>[] = [];

    for (const page of q.data.pages) {
      const bucket = page.results as SearchResults;
      const rows = bucket[kind] as SearchRow<K>[];
      for (const row of rows) out.push(row);
    }

    return out;
  }

  function counts(kind: SearchKind): number {
    const idx = kinds.indexOf(kind);
    if (idx < 0) return 0;

    const q = queries[idx];
    if (!q.data || q.data.pages.length === 0) return 0;

    const last = q.data.pages[q.data.pages.length - 1];
    return last.counts[kind];
  }

  function hasMore(kind: SearchKind): boolean {
    const idx = kinds.indexOf(kind);
    if (idx < 0) return false;
    return queries[idx].hasNextPage ?? false;
  }

  function isFetchingMore(kind: SearchKind): boolean {
    const idx = kinds.indexOf(kind);
    if (idx < 0) return false;
    return queries[idx].isFetchingNextPage;
  }

  function loadMore(kind: SearchKind): void {
    const idx = kinds.indexOf(kind);
    if (idx < 0) return;

    const q = queries[idx];
    if (q.hasNextPage && !q.isFetchingNextPage) {
      q.fetchNextPage();
    }
  }

  return {
    kinds: kinds.map((kind) => ({ kind })),
    isLoading,
    isFetching,
    isError,
    error,
    results,
    counts,
    hasMore,
    isFetchingMore,
    loadMore,
  };
}