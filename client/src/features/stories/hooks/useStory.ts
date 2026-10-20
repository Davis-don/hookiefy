// src/features/stories/hooks/useStory.ts

import { useQuery } from '@tanstack/react-query';
import {
  fetchStoryPublic,
  type Story,
} from '../api/storiesApi';

/* ============================================================
   PUBLIC STORY DETAIL — cached by id
   ============================================================
   - Refetches only if stale (5 min)
   - Keeps previous data while refetching (no empty flash)
   - Cached by ['story', id] — return-visits are instant
   ============================================================ */

export function useStory(storyId: number) {
  return useQuery<Story, Error>({
    queryKey: ['story', storyId],
    queryFn: () => fetchStoryPublic(storyId),
    enabled: Number.isFinite(storyId) && storyId > 0,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    retry: 1,
  });
}