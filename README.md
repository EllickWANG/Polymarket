# ForecastingPlatform — 预测平台 (Forecasting Platform) 全栈技术测验

简化版类 Polymarket 的预测平台核心：账户余额管理、幂等性、状态机、追加式账本与对账。

## 项目结构

```
├── README.md           # 本说明（与各目录并列）
├── docs-and-plan/      # 文档与计划
├── frontend/           # 前端（Vue + Vite）
└── backend/            # 后端（Next.js + Prisma + SQLite）
```

- **docs-and-plan**：技术文档、使用说明与产品/迭代计划。
- **frontend**：前端应用，独立启动（见 `frontend/README.md`）。
- **backend**：API 与数据库，端口 3000（见下方运行步骤）。

## 技术栈

- **后端**: Next.js (App Router) + TypeScript，SQLite + Prisma
- **前端**: Vue + Vite
- **测试**: Vitest

## 运行步骤

```bash
# 1. 后端依赖与配置（首次或克隆后执行一次）
cd backend
pnpm install
cp .env.example .env
pnpm run db:migrate
pnpm run db:seed
cd ..

# 2. 启动后端（端口 3000）
pnpm dev
# 或：cd backend && pnpm dev

# 3. 另开终端启动前端（默认端口 5173）
pnpm run dev:frontend
```

- 后端：<http://localhost:3000>
- 前端：<http://localhost:5173>（Vite 默认）

## 测试

API 测试需先启动后端，再在项目根目录执行：

```bash
pnpm test
# 或：cd backend && pnpm test
```

可选环境变量：`API_BASE=http://localhost:3000`。

## API 说明

### 1. 充值 — POST /api/users/:id/deposit

- **Header**: `Idempotency-Key: <string>`（必填）
- **Body**: `{ "amount": number }`（正数）
- **成功**: 200，`{ "balance": number }`
- **幂等**: 相同 Key 且相同 body 多次请求只生效一次
- **冲突**: 相同 Key 但 body 不同返回 **409 Conflict**

### 2. 下注 — POST /api/bets

- **Header**: `Idempotency-Key: <string>`（必填）
- **Body**: `{ "userId": number, "gameId": string, "amount": number }`
- **成功**: 200，`{ "bet": {...}, "balance": number }`
- **余额不足**: **422**
- **幂等**: 同 Key 同 body 只创建一条 Bet；同 Key 不同 body 返回 **409**

### 3. 结算 — POST /api/bets/:id/settle

- **Body**: `{ "result": "WIN" | "LOSE" }`
- **WIN**: 本金 × 2 返还；**LOSE**: 不返还
- 仅 **PLACED** 可结算；**SETTLED** / **CANCELLED** 为终态

### 4. 取消 — POST /api/bets/:id/cancel

- 仅 **PLACED** 可取消；退款并置为 **CANCELLED**

### 5. 对账 — GET /api/admin/reconcile?userId=...

- 返回：数据库余额、账本推导余额、订单统计、异常列表

## 预置用户（种子数据）

| id | username | 初始 balance |
|----|----------|--------------|
| 1  | alice    | 0            |
| 2  | bob      | 0            |
| 3  | charlie  | 100          |

## Docker 运行

在 **backend** 目录构建并启动：

```bash
cd backend
docker compose up --build
```

访问 [http://localhost:3000](http://localhost:3000)。首次启动会自动执行 `prisma migrate deploy` 与种子数据。

## 常见问题

- **Cannot find module '.prisma/client/default'**：在 `backend` 目录执行 `pnpm exec prisma generate`，必要时再执行 `rm -rf .next` 后重新 `pnpm dev`。
- **The table main.User does not exist**：在 `backend` 目录执行 `pnpm exec prisma migrate deploy` 与 `pnpm run db:seed`。
