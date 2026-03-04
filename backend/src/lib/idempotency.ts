import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export function hashRequest(body: unknown): string {
  return JSON.stringify(body);
}

export async function findIdempotencyKey(key: string, tx: Tx | null = null) {
  const client = tx ?? prisma;
  return client.idempotencyKey.findUnique({
    where: { key },
  });
}

export async function saveIdempotencyKey(
  params: {
    key: string;
    userId?: number;
    requestHash: string;
    responseStatus: number;
    responseBody: string;
  },
  tx: Tx | null = null
) {
  const client = tx ?? prisma;
  return client.idempotencyKey.create({
    data: {
      key: params.key,
      userId: params.userId ?? null,
      requestHash: params.requestHash,
      responseStatus: params.responseStatus,
      responseBody: params.responseBody,
    },
  });
}
