import type { BetStatus, LedgerType } from "@prisma/client";

export type { BetStatus, LedgerType };

export const BetStatusEnum = {
  PLACED: "PLACED",
  SETTLED: "SETTLED",
  CANCELLED: "CANCELLED",
} as const;

export const LedgerTypeEnum = {
  DEPOSIT: "DEPOSIT",
  BET_DEBIT: "BET_DEBIT",
  BET_CREDIT: "BET_CREDIT",
  BET_REFUND: "BET_REFUND",
} as const;
