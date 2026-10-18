// src/features/perfTests/hooks/usePerfTests.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  runPerfTests,
  type PerfRunOptions,
} from '../api/perfTestsApi';

export function useRunPerfTests(options: PerfRunOptions = {}) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => runPerfTests(options),
    onSuccess: (data) => {
      qc.setQueryData(['perf-tests', 'last'], data);
    },
  });
}

export function usePerfTestsLive(
  options: PerfRunOptions = {},
  {
    enabled = true,
    intervalMs = 60_000,
  }: { enabled?: boolean; intervalMs?: number } = {},
) {
  return useQuery({
    queryKey: ['perf-tests', 'live', options],
    queryFn: () => runPerfTests(options),
    enabled,
    refetchInterval: intervalMs,
    staleTime: Math.max(0, intervalMs - 1_000),
    refetchOnWindowFocus: false,
  });
}