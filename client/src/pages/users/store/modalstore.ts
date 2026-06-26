import { create } from "zustand";

interface PaymentModalStore {
  isMount: boolean;
  hookupId: string | null;

  isSuccessPayment: boolean;
  isFailedPayment: boolean;
  isLoadingPayment: boolean;

  open: (hookupId: string) => void;
  close: () => void;

  setIsMount: (value: boolean) => void;
  setHookupId: (hookupId: string | null) => void;

  setIsSuccessPayment: (value: boolean) => void;
  setIsFailedPayment: (value: boolean) => void;
  setIsLoadingPayment: (value: boolean) => void;
}

export const usePaymentModalStore = create<PaymentModalStore>((set) => ({
  isMount: false,
  hookupId: null,

  isSuccessPayment: false,
  isFailedPayment:false,
  isLoadingPayment: false,

  open: (hookupId) =>
    set({
      isMount: true,
      hookupId,
      isSuccessPayment: false,
      isFailedPayment: false,
      isLoadingPayment: false,
    }),

  close: () =>
    set({
      isMount: false,
      hookupId: null,
      isSuccessPayment: false,
      isFailedPayment: false,
      isLoadingPayment: false,
    }),

  setIsMount: (value) =>
    set({
      isMount: value,
      isSuccessPayment: value ? false : false,
      isFailedPayment: value ? false : false,
      isLoadingPayment: value ? false : false,
    }),

  setHookupId: (hookupId) =>
    set({
      hookupId,
    }),

  setIsSuccessPayment: (value) =>
    set({
      isSuccessPayment: value,
      isMount: value ? false : false,
      isFailedPayment: value ? false : false,
      isLoadingPayment: value ? false : false,
    }),

  setIsFailedPayment: (value) =>
    set({
      isFailedPayment: value,
      isMount: value ? false : false,
      isSuccessPayment: value ? false : false,
      isLoadingPayment: value ? false : false,
    }),

  setIsLoadingPayment: (value) =>
    set({
      isLoadingPayment: value,
      isMount: value ? false : false,
      isSuccessPayment: value ? false : false,
      isFailedPayment: value ? false : false,
    }),
}));