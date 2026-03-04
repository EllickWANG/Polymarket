# Vue 前端

- **技术栈**：Vue 3 + TypeScript + Vite + Vue Router
- **代理**：开发时 Vite 将 `/api` 代理到后端 `http://localhost:3000`，前端请求写 `fetch('/api/...')` 即可

## 使用方式

1. **启动后端**（在项目根目录）  
   ```bash
   pnpm dev
   ```  
   后端运行在 http://localhost:3000

2. **安装并启动前端**（首次需安装依赖）  
   ```bash
   cd frontend
   pnpm install
   pnpm dev
   ```  
   或在项目根目录执行：`pnpm dev:frontend`  

   前端运行在 http://localhost:5173，页面中的 `/api` 请求会通过 Vite 代理转发到 3000 端口。

## 页面说明

- **首页**：用户列表与余额
- **充值**：选择用户、金额，POST `/api/users/:id/deposit`
- **投注**：下单（用户、游戏 ID、金额）、订单列表、结算 / 取消
- **对账**：选择用户，GET `/api/admin/reconcile?userId=`
