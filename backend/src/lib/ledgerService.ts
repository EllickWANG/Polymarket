import type { LedgerType } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

function getClient(tx: Tx | null): Tx {
  return tx ?? prisma;
}

/**
 * Append a ledger entry (append-only). Call within a transaction when updating balance.
 */
export async function appendLedger(
  params: {
    userId: number;
    type: LedgerType;
    amount: number;
    referenceType?: string;
    referenceId?: string;
  },
  tx: Tx | null = null
) {
  const client = getClient(tx);
  return client.ledger.create({
    data: {
      userId: params.userId,
      type: params.type,
      amount: params.amount,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
    },
  });
}

/**
 * Compute user balance from ledger entries only (for reconciliation).
 */
export async function getBalanceFromLedger(
  userId: number,
  tx: Tx | null = null
): Promise<number> {
  const client = getClient(tx);
  const rows = await client.ledger.findMany({
    where: { userId },
    select: { type: true, amount: true },
  });
  let sum = 0;
  for (const row of rows) {
    if (
      row.type === "DEPOSIT" ||
      row.type === "BET_CREDIT" ||
      row.type === "BET_REFUND"
    ) {
      sum += row.amount;
    } else if (row.type === "BET_DEBIT") {
      sum -= row.amount;
    }
  }
  return sum;
}

/**
 * Update User.balance to match the given newBalance. Must be called inside a transaction
 * after appending ledger entries so that User.balance stays in sync with ledger sum.
 */
export async function setUserBalance(
  userId: number,
  newBalance: number,
  tx: Tx | null = null
) {
  const client = getClient(tx);
  return client.user.update({
    where: { id: userId },
    data: { balance: newBalance },
  });
}
