// src/features/systemStats/hooks/useSystemStats.ts

import { useQuery } from '@tanstack/react-query';

import {
  fetchSystemUsersCount,
  fetchSystemBusinessesCount,
  type SystemUsersResponse,
  type SystemBusinessesResponse,
} from '../api/systemStatsApi';


/* ── Users ─────────────────────────────────────────── */

export function useSystemUsersCount(enabled = true) {
  return useQuery<SystemUsersResponse>({
    queryKey: ['system-users-count'],
    queryFn: fetchSystemUsersCount,
    enabled,
    staleTime: 60_000,
  });
}


/* ── Businesses ────────────────────────────────────── */

export function useSystemBusinessesCount(enabled = true) {
  return useQuery<SystemBusinessesResponse>({
    queryKey: ['system-businesses-count'],
    queryFn: fetchSystemBusinessesCount,
    enabled,
    staleTime: 60_000,
  });
}