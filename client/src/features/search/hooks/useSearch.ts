// src/features/search/hooks/useSearch.ts

import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import {
  searchEverything,
  type SearchResponse,
  type SearchScope,
} from '../api/searchApi';

/* ============================================================
   LIVE SEARCH — fires on every debounced keystroke
   ============================================================
   - enabled only when `query.trim().length >= 2`
   - short staleTime so results stay fresh
   - previous results are kept while fetching the next
     query → no flashing empty state
   - cached by [q, kind] so flipping between scopes is instant
   ============================================================ */

export function useSearch(query: string, kind: SearchScope) {
  const access = useAuthStore((s) => s.access);

  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;

  return useQuery<SearchResponse, Error>({
    queryKey: ['search', trimmed, kind, access],
    queryFn: () => searchEverything({ q: trimmed, kind }, access),
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,   // keep last results visible
    retry: 1,
  });
}