// src/features/perfTests/hooks/usePerfTests.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { runPerfTests } from '../api/perfTestsApi';

/* ============================================================
   MUTATION — one-shot run
   ============================================================ */

export function useRunPerfTests() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => runPerfTests(),
    onSuccess: (data) => {
      qc.setQueryData(['perf-tests', 'last'], data);
    },
  });
}

/* ============================================================
   QUERY — live auto-refresh card
   ============================================================ */

export function usePerfTestsLive(
  {
    enabled = true,
    intervalMs = 60_000,
  }: { enabled?: boolean; intervalMs?: number } = {},
) {
  return useQuery({
    queryKey: ['perf-tests', 'live'],
    queryFn: () => runPerfTests(),
    enabled,
    refetchInterval: intervalMs,
    staleTime: Math.max(0, intervalMs - 1_000),
    refetchOnWindowFocus: false,
  });
}