// src/features/search/hooks/useSearch.ts

import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuthStore } from '../../../store/authStore';
import {
  searchStreaming,
  type SearchChunk,
  type SearchKind,
  type SearchRow,
  type SearchScope,
} from '../api/searchApi';

/* ============================================================
   CACHE — persists across component unmounts
   ============================================================ */

type CacheKey = string;

const SEARCH_CACHE = new Map<
  CacheKey,
  {
    state: State;
    hasAnyResult: boolean;
    isComplete: boolean;
    timestamp: number;
  }
>();

const CACHE_TTL_MS = 5 * 60_000;   // 5 minutes

function cacheKey(query: string, scope: SearchScope): CacheKey {
  return `${scope}::${query.trim().toLowerCase()}`;
}

function isFresh(ts: number): boolean {
  return Date.now() - ts < CACHE_TTL_MS;
}

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
   STATE SHAPE
   ============================================================ */

type KindBucket = {
  items: SearchRow<SearchKind>[];
  total: number;
  totalPages: number;
  page: number;
  hasMore: boolean;
  isFetching: boolean;
  arrived: boolean;
  error: string | null;
};

type State = Record<SearchKind, KindBucket>;

function emptyBucket(): KindBucket {
  return {
    items: [],
    total: 0,
    totalPages: 0,
    page: 1,
    hasMore: false,
    isFetching: false,
    arrived: false,
    error: null,
  };
}

function emptyState(): State {
  return {
    businesses: emptyBucket(),
    posts:      emptyBucket(),
    stories:    emptyBucket(),
    products:   emptyBucket(),
    users:      emptyBucket(),
  };
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
  hasAnyResult: boolean;
  isComplete: boolean;

  results: <K extends SearchKind>(kind: K) => SearchRow<K>[];
  counts: (kind: SearchKind) => number;
  hasMore: (kind: SearchKind) => boolean;
  isFetchingMore: (kind: SearchKind) => boolean;
  hasArrived: (kind: SearchKind) => boolean;
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

  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;
  const kinds = useMemo(() => kindsForScope(scope), [scope]);

  /* ── Initial state: try cache synchronously ────────── */
  const cached = enabled
    ? SEARCH_CACHE.get(cacheKey(trimmed, scope))
    : undefined;

  const useCache = !!cached && isFresh(cached.timestamp);

  const [state, setState] = useState<State>(
    useCache ? cached!.state : emptyState,
  );
  const [hasAnyResult, setHasAnyResult] = useState(
    useCache ? cached!.hasAnyResult : false,
  );
  const [isComplete, setIsComplete] = useState(
    useCache ? cached!.isComplete : false,
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const activeRequestRef = useRef(0);

  /* ── Fetch / read from cache ───────────────────────── */
  useEffect(() => {
    if (!enabled) {
      setState(emptyState());
      setHasAnyResult(false);
      setIsComplete(false);
      setIsStreaming(false);
      setIsError(false);
      setError(null);
      return;
    }

    const key = cacheKey(trimmed, scope);
    const hit = SEARCH_CACHE.get(key);

    /* Cache hit and fresh → no network at all */
    if (hit && isFresh(hit.timestamp)) {
      setState(hit.state);
      setHasAnyResult(hit.hasAnyResult);
      setIsComplete(hit.isComplete);
      setIsStreaming(false);
      setIsError(false);
      setError(null);
      return;
    }

    /* Cache miss → stream */
    const requestId = ++activeRequestRef.current;
    const ctrl = new AbortController();

    setState(emptyState());
    setHasAnyResult(false);
    setIsComplete(false);
    setIsStreaming(true);
    setIsError(false);
    setError(null);

    setState((prev) => {
      const next: State = { ...prev };
      for (const k of kinds) {
        next[k] = { ...next[k], isFetching: true };
      }
      return next;
    });

    let localState: State = emptyState();
    let localHasAny = false;

    searchStreaming(
      { q: trimmed, kind: scope, page: 1 },
      (chunk) => {
        if (requestId !== activeRequestRef.current) return;

        localState = applyChunk(localState, chunk);
        localHasAny = true;

        setState((prev) => applyChunk(prev, chunk));
        setHasAnyResult(true);
      },
      access,
      ctrl.signal,
    )
      .catch((err: Error) => {
        if (requestId !== activeRequestRef.current) return;
        if (err.name === 'AbortError') return;

        setIsError(true);
        setError(err);
      })
      .finally(() => {
        if (requestId !== activeRequestRef.current) return;

        setIsStreaming(false);
        setIsComplete(true);

        setState((prev) => {
          const next: State = { ...prev };
          for (const k of kinds) {
            next[k] = { ...next[k], isFetching: false };
          }
          return next;
        });

        /* Persist to cache */
        SEARCH_CACHE.set(key, {
          state: localState,
          hasAnyResult: localHasAny,
          isComplete: true,
          timestamp: Date.now(),
        });
      });

    return () => {
      ctrl.abort();
    };
  }, [trimmed, scope, access, enabled, kinds]);

  /* ── Load more ─────────────────────────────────────── */
  function loadMore(kind: SearchKind): void {
    const bucket = state[kind];
    if (!bucket || !bucket.hasMore || bucket.isFetching) return;

    const nextPage = bucket.page + 1;
    const requestId = activeRequestRef.current;
    const key = cacheKey(trimmed, scope);

    setState((prev) => ({
      ...prev,
      [kind]: { ...prev[kind], isFetching: true },
    }));

    searchStreaming(
      { q: trimmed, kind, page: nextPage },
      (chunk) => {
        if (requestId !== activeRequestRef.current) return;
        setState((prev) => applyChunk(prev, chunk));
      },
      access,
    )
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setState((prev) => ({
          ...prev,
          [kind]: { ...prev[kind], error: err.message },
        }));
      })
      .finally(() => {
        setState((prev) => {
          const next = {
            ...prev,
            [kind]: { ...prev[kind], isFetching: false },
          };
          /* Update cache with the extended page */
          SEARCH_CACHE.set(key, {
            state: next,
            hasAnyResult: true,
            isComplete: true,
            timestamp: Date.now(),
          });
          return next;
        });
      });
  }

  /* ── Accessors ─────────────────────────────────────── */
  function results<K extends SearchKind>(kind: K): SearchRow<K>[] {
    return state[kind].items as SearchRow<K>[];
  }

  function counts(kind: SearchKind): number {
    return state[kind].total;
  }

  function hasMore(kind: SearchKind): boolean {
    return state[kind].hasMore;
  }

  function isFetchingMore(kind: SearchKind): boolean {
    return state[kind].isFetching;
  }

  function hasArrived(kind: SearchKind): boolean {
    return state[kind].arrived;
  }

  return {
    kinds: kinds.map((kind) => ({ kind })),
    isLoading: isStreaming && !hasAnyResult,
    isFetching: isStreaming,
    isError,
    error,
    hasAnyResult,
    isComplete,
    results,
    counts,
    hasMore,
    isFetchingMore,
    hasArrived,
    loadMore,
  };
}

/* ============================================================
   HELPERS
   ============================================================ */

function applyChunk(prev: State, chunk: SearchChunk): State {
  const kind = chunk.kind;
  const current = prev[kind];

  const isFirstPage = chunk.page <= 1;
  const nextItems = isFirstPage
    ? (chunk.items as SearchRow<SearchKind>[])
    : [...current.items, ...(chunk.items as SearchRow<SearchKind>[])];

  return {
    ...prev,
    [kind]: {
      items: nextItems,
      total: chunk.total,
      totalPages: chunk.total_pages,
      page: chunk.page,
      hasMore: chunk.has_more,
      isFetching: false,
      arrived: true,
      error: chunk.error ?? null,
    },
  };
}