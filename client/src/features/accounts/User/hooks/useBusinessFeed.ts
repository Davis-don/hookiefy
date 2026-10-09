// src/features/feed/hooks/useBusinessFeed.ts

import { useQuery } from '@tanstack/react-query';
import {
  fetchMyFeed,
  type FetchFeedOptions,
} from '../api/feedApi';
import { useAuthStore } from '../../../../store/authStore';

export function useBusinessFeed(options: FetchFeedOptions = {}) {
  const access = useAuthStore((s) => s.access);

  return useQuery({
    queryKey: ['business-feed', 'mine', options, access],
    queryFn: () => fetchMyFeed(access, options),
    enabled: !!access,          // wait until the user is logged in
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}