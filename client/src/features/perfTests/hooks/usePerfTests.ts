// src/features/perfTests/hooks/usePerfTests.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { runPerfTests } from '../api/perfTestsApi';

/* ============================================================
   MANUAL RUN — mutation only
   ============================================================
   The perf test only fires when the user explicitly calls
   `run()` from a button click. Nothing runs on mount, on
   refetch, on window focus, or on interval.
   ============================================================ */

export function usePerfTestsManual() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => runPerfTests(),
    onSuccess: (data) => {
      // Cache the result so it survives unmount/remount
      // without triggering another network call.
      qc.setQueryData(['perf-tests', 'manual-result'], data);
    },
  });
}

/* ============================================================
   LAST RESULT — read-only
   ============================================================
   Reads whatever the last successful run returned, if any.
   Returns `undefined` until the user runs the test once.
   No network call is made by this hook.
   ============================================================ */

export function useLastPerfResult() {
  const qc = useQueryClient();
  return qc.getQueryData(['perf-tests', 'manual-result']) as
    | ReturnType<typeof runPerfTests> extends Promise<infer R>
      ? R
      : unknown
    | undefined;
}