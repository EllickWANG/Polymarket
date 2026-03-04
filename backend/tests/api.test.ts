import { describe, test, expect } from "vitest";

/**
 * Core API tests. Run with: npm run test
 * Ensure the dev server is running (npm run dev) so API_BASE points to it,
 * or set API_BASE=http://localhost:3000
 */
const API_BASE = process.env.API_BASE ?? "http://localhost:3000";

function api(path: string, options: RequestInit = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

function randomIdempotencyKey() {
  return `key-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

describe("Deposit API", () => {
  test("1. 充值成功后余额正确增加", async () => {
    const key = randomIdempotencyKey();
    const res = await api("/api/users/1/deposit", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({ amount: 50 }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { balance: number };
    expect(typeof data.balance).toBe("number");
    const reconcileRes = await api(
      `/api/admin/reconcile?userId=1`
    );
    expect(reconcileRes.status).toBe(200);
    const rec = (await reconcileRes.json()) as {
      databaseBalance: number;
      ledgerBalance: number;
      balanceMatch: boolean;
    };
    expect(rec.balanceMatch).toBe(true);
    expect(rec.databaseBalance).toBeGreaterThanOrEqual(50);
  });

  test("2. 充值幂等性：同一 Idempotency-Key 多次请求只生效一次", async () => {
    const key = randomIdempotencyKey();
    const amount = 25;
    const res1 = await api("/api/users/2/deposit", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({ amount }),
    });
    expect(res1.status).toBe(200);
    const data1 = (await res1.json()) as { balance: number };
    const balanceAfterFirst = data1.balance;

    const res2 = await api("/api/users/2/deposit", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({ amount }),
    });
    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as { balance: number };
    expect(data2.balance).toBe(balanceAfterFirst);

    const res3 = await api("/api/users/2/deposit", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({ amount }),
    });
    expect(res3.status).toBe(200);
    const data3 = (await res3.json()) as { balance: number };
    expect(data3.balance).toBe(balanceAfterFirst);
  });
});

describe("Bet API", () => {
  test("3. 余额不足时下注应当失败", async () => {
    const key = randomIdempotencyKey();
    const res = await api("/api/bets", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({
        userId: 1,
        gameId: "game-insufficient",
        amount: 1_000_000,
      }),
    });
    expect(res.status).toBe(422);
    const data = (await res.json()) as { error?: string };
    expect(data.error).toMatch(/insufficient|balance/i);
  });

  test("4. 下注操作的幂等性验证", async () => {
    const key = randomIdempotencyKey();
    const res1 = await api("/api/bets", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({
        userId: 3,
        gameId: "game-idempotent",
        amount: 10,
      }),
    });
    expect(res1.status).toBe(200);
    const data1 = (await res1.json()) as { bet: { id: number }; balance: number };
    const betId = data1.bet.id;
    const balanceAfterFirst = data1.balance;

    const res2 = await api("/api/bets", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({
        userId: 3,
        gameId: "game-idempotent",
        amount: 10,
      }),
    });
    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as { bet: { id: number }; balance: number };
    expect(data2.bet.id).toBe(betId);
    expect(data2.balance).toBe(balanceAfterFirst);
  });
});

describe("Settle API", () => {
  test("5. 结算为 WIN 时余额正确增加", async () => {
    const betKey = randomIdempotencyKey();
    const placeRes = await api("/api/bets", {
      method: "POST",
      headers: { "Idempotency-Key": betKey },
      body: JSON.stringify({
        userId: 3,
        gameId: "game-win-test",
        amount: 20,
      }),
    });
    expect(placeRes.status).toBe(200);
    const placeData = (await placeRes.json()) as { bet: { id: number }; balance: number };
    const balanceBeforeSettle = placeData.balance;
    const betId = placeData.bet.id;

    const settleRes = await api(`/api/bets/${betId}/settle`, {
      method: "POST",
      body: JSON.stringify({ result: "WIN" }),
    });
    expect(settleRes.status).toBe(200);
    const settleData = (await settleRes.json()) as { balance: number };
    expect(settleData.balance).toBeGreaterThan(balanceBeforeSettle);
    expect(settleData.balance).toBe(balanceBeforeSettle + 20 * 2);
  });

  test("6. 已结算订单不允许重复结算", async () => {
    const betKey = randomIdempotencyKey();
    const placeRes = await api("/api/bets", {
      method: "POST",
      headers: { "Idempotency-Key": betKey },
      body: JSON.stringify({
        userId: 3,
        gameId: "game-no-double-settle",
        amount: 15,
      }),
    });
    expect(placeRes.status).toBe(200);
    const placeData = (await placeRes.json()) as { bet: { id: number }; balance: number };
    const betId = placeData.bet.id;
    const balanceAfterFirstSettle = (
      await (
        await api(`/api/bets/${betId}/settle`, {
          method: "POST",
          body: JSON.stringify({ result: "LOSE" }),
        })
      ).json()
    ).balance;

    const secondSettleRes = await api(`/api/bets/${betId}/settle`, {
      method: "POST",
      body: JSON.stringify({ result: "WIN" }),
    });
    expect(secondSettleRes.status).toBe(409);
    const recRes = await api(`/api/admin/reconcile?userId=3`);
    const rec = (await recRes.json()) as { databaseBalance: number };
    expect(rec.databaseBalance).toBe(balanceAfterFirstSettle);
  });
});
