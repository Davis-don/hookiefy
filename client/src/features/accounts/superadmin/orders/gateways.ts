// src/pages/accounts/components/orders/gateways.ts

import type { ManualGateway } from '../api/orderApi';

export const MANUAL_GATEWAY_LABELS: Record<ManualGateway, string> = {
  manual_cash: 'Cash',
  manual_cheque: 'Cheque',
  manual_bank: 'Bank transfer',
  manual_other: 'Other',
};

export type { ManualGateway };