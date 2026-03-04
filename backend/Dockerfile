# 使用 ARG 支持动态选择基础镜像，默认使用阿里云镜像
ARG BASE_IMAGE=registry.cn-hangzhou.aliyuncs.com/ellicksy/public:node.base.20_latest
FROM ${BASE_IMAGE} AS build

WORKDIR /app

# 安装 pnpm 并安装依赖（使用锁文件保证可重复构建）
# 提前复制 Prisma 配置、schema 以及 .env，保证安装阶段的 postinstall 能正常执行
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY .env ./.env
RUN npm i -g pnpm && pnpm install --frozen-lockfile

# 复制项目源代码（包含 app 代码等）
COPY . .

# 生成 Prisma Client（保险起见再次执行一次）
RUN npx prisma generate

# 构建 Next 应用
RUN npm run build

# 使用 ARG 支持动态选择基础镜像，默认使用阿里云镜像
ARG BASE_IMAGE=registry.cn-hangzhou.aliyuncs.com/ellicksy/public:node.base.20_latest
FROM ${BASE_IMAGE} AS production

WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Asia/Shanghai
# 与示例保持一致，使用 6100 端口，并让 Next 监听该端口
ENV PORT=6100

# 复制构建产物和运行所需文件
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/.env ./.env

EXPOSE 6100

# 生产环境启动 Next 应用
CMD ["npm", "run", "start"]
