import { prisma } from "./prisma";
import { appendLedger, getBalanceFromLedger, setUserBalance } from "./ledgerService";
import { findIdempotencyKey, saveIdempotencyKey, hashRequest } from "./idempotency";

export class UserNotFoundError extends Error {
  constructor(userId: number) {
    super(`User not found: ${userId}`);
    this.name = "UserNotFoundError";
  }
}

export class InsufficientBalanceError extends Error {
  constructor() {
    super("Insufficient balance");
    this.name = "InsufficientBalanceError";
  }
}

export type DepositResult =
  | { kind: "success"; balance: number }
  | { kind: "idempotent"; responseStatus: number; responseBody: unknown }
  | { kind: "conflict" };

export async function deposit(
  userId: number,
  amount: number,
  idempotencyKey: string
): Promise<DepositResult> {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  const requestHash = hashRequest({ amount });

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new UserNotFoundError(userId);

    const existing = await findIdempotencyKey(idempotencyKey, tx);
    if (existing) {
      if (existing.requestHash === requestHash) {
        return {
          kind: "idempotent",
          responseStatus: existing.responseStatus,
          responseBody: JSON.parse(existing.responseBody ?? "{}"),
        };
      }
      return { kind: "conflict" };
    }

    const ledgerBalance = await getBalanceFromLedger(userId, tx);
    const newBalance = ledgerBalance + amount;

    await appendLedger(
      {
        userId,
        type: "DEPOSIT",
        amount,
        referenceType: "Deposit",
        referenceId: idempotencyKey,
      },
      tx
    );
    await setUserBalance(userId, newBalance, tx);

    const responseBody = { balance: newBalance };
    await saveIdempotencyKey(
      {
        key: idempotencyKey,
        userId,
        requestHash,
        responseStatus: 200,
        responseBody: JSON.stringify(responseBody),
      },
      tx
    );

    return { kind: "success", balance: newBalance };
  });
}
