// src/features/systemBalance/hooks/useSystemBalance.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchSystemBalance,
  initializeSystemBalance,
  adjustSystemBalance,
  setSystemBalance,
  type FetchSystemBalanceResponse,
  type InitializeSystemBalanceResponse,
  type AdjustSystemBalanceResponse,
  type AdjustAction,
} from '../api/systemBalanceApi';

const BALANCE_KEY = ['system-balance'];


/* ── Query: fetch current balance ────────────────────── */

export function useSystemBalance(enabled = true) {
  return useQuery<FetchSystemBalanceResponse>({
    queryKey: BALANCE_KEY,
    queryFn: fetchSystemBalance,
    enabled,
    staleTime: 30_000,
  });
}


/* ── Mutation: initialise the singleton row ──────────── */

export function useInitializeSystemBalance() {
  const queryClient = useQueryClient();

  return useMutation<InitializeSystemBalanceResponse, Error, void>({
    mutationFn: () => initializeSystemBalance(),
    onSuccess: (res) => {
      queryClient.setQueryData(BALANCE_KEY, {
        success: true,
        data: res.data,
      });
      queryClient.invalidateQueries({ queryKey: BALANCE_KEY });
    },
  });
}


/* ── Mutation: credit / debit ────────────────────────── */

export function useAdjustSystemBalance() {
  const queryClient = useQueryClient();

  return useMutation<
    AdjustSystemBalanceResponse,
    Error,
    { amount: string; action: AdjustAction }
  >({
    mutationFn: ({ amount, action }) => adjustSystemBalance(amount, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BALANCE_KEY });
    },
  });
}


/* ── Mutation: set exact value ───────────────────────── */

export function useSetSystemBalance() {
  const queryClient = useQueryClient();

  return useMutation<AdjustSystemBalanceResponse, Error, string>({
    mutationFn: (balance: string) => setSystemBalance(balance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BALANCE_KEY });
    },
  });
}