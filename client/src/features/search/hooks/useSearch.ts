// src/features/search/hooks/useSearch.ts

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import {
  searchStreaming,
  type SearchChunk,
  type SearchKind,
  type SearchRow,
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
   HOOK
   ============================================================ */

export function useSearch(
  query: string,
  scope: SearchScope,
): UseSearchResult {
  const access = useAuthStore((s) => s.access);
  const qc = useQueryClient();

  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;
  const kinds = useMemo(() => kindsForScope(scope), [scope]);

  /* Per-kind accumulated state. We track each kind independently
     so a "load more" on businesses doesn't disturb posts. */
  const [state, setState] = useState<
    Record<SearchKind, {
      items: SearchRow<SearchKind>[];
      total: number;
      totalPages: number;
      page: number;
      hasMore: boolean;
      isFetching: boolean;
      error: string | null;
    }>
  >(() => makeEmptyState());

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /* ── Initial fetch per query ──────────────────────── */
  useEffect(() => {
    if (!enabled) {
      setState(makeEmptyState());
      return;
    }

    const ctrl = new AbortController();
    let cancelled = false;

    setState(makeEmptyState());
    setIsLoading(true);
    setIsFetching(true);
    setIsError(false);
    setError(null);

    // Mark every kind in this scope as "loading" so sections can
    // render a spinner until their chunk arrives.
    setState((prev) => {
      const next = { ...prev };
      for (const k of kinds) {
        next[k] = { ...next[k], isFetching: true };
      }
      return next;
    });

    searchStreaming(
      { q: trimmed, kind: scope, page: 1 },
      (chunk) => {
        if (cancelled) return;
        setState((prev) => applyChunk(prev, chunk));
        setIsLoading(false);  // first chunk arrived
      },
      access,
      ctrl.signal,
    )
      .catch((err: Error) => {
        if (cancelled) return;
        setIsError(true);
        setError(err);
      })
      .finally(() => {
        if (cancelled) return;
        setIsFetching(false);
        setState((prev) => {
          const next = { ...prev };
          for (const k of kinds) {
            next[k] = { ...next[k], isFetching: false };
          }
          return next;
        });
      });

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [trimmed, scope, access, enabled, qc, kinds]);

  /* ── Accessors ────────────────────────────────────── */

  function results<K extends SearchKind>(kind: K): SearchRow<K>[] {
    const bucket = state[kind];
    return bucket ? (bucket.items as SearchRow<K>[]) : [];
  }

  function counts(kind: SearchKind): number {
    return state[kind]?.total ?? 0;
  }

  function hasMore(kind: SearchKind): boolean {
    return state[kind]?.hasMore ?? false;
  }

  function isFetchingMore(kind: SearchKind): boolean {
    return state[kind]?.isFetching ?? false;
  }

  function loadMore(kind: SearchKind): void {
    const bucket = state[kind];
    if (!bucket || !bucket.hasMore || bucket.isFetching) return;

    const nextPage = bucket.page + 1;

    setState((prev) => ({
      ...prev,
      [kind]: { ...prev[kind], isFetching: true },
    }));

    searchStreaming(
      { q: trimmed, kind, page: nextPage },
      (chunk) => {
        setState((prev) => applyChunk(prev, chunk));
      },
      access,
    )
      .catch((err: Error) => {
        setState((prev) => ({
          ...prev,
          [kind]: { ...prev[kind], error: err.message },
        }));
      })
      .finally(() => {
        setState((prev) => ({
          ...prev,
          [kind]: { ...prev[kind], isFetching: false },
        }));
      });
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

/* ============================================================
   INTERNAL HELPERS
   ============================================================ */

function makeEmptyState(): Record<SearchKind, {
  items: SearchRow<SearchKind>[];
  total: number;
  totalPages: number;
  page: number;
  hasMore: boolean;
  isFetching: boolean;
  error: string | null;
}> {
  const base = {
    items: [],
    total: 0,
    totalPages: 0,
    page: 1,
    hasMore: false,
    isFetching: false,
    error: null,
  };
  return {
    businesses: { ...base },
    posts:      { ...base },
    stories:    { ...base },
    products:   { ...base },
    users:      { ...base },
  };
}

function applyChunk(
  prev: ReturnType<typeof makeEmptyState>,
  chunk: SearchChunk,
): ReturnType<typeof makeEmptyState> {
  const kind = chunk.kind;
  const current = prev[kind];

  const isFirstPage = chunk.page <= 1;
  const nextItems = isFirstPage
    ? (chunk.items as SearchRow<SearchKind>[])
    : ([...current.items, ...(chunk.items as SearchRow<SearchKind>[])]);

  return {
    ...prev,
    [kind]: {
      items: nextItems,
      total: chunk.total,
      totalPages: chunk.total_pages,
      page: chunk.page,
      hasMore: chunk.has_more,
      isFetching: false,
      error: chunk.error ?? null,
    },
  };
}