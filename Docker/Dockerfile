# syntax=docker/dockerfile:1
# 三角洲战术地图（map-tools）Docker 镜像
# 多阶段构建：Node 构建静态资源 → 零依赖 Node 中继服务器托管（静态 + 分享 API/SSE）
# 构建上下文为项目根目录：
#   docker build -f Docker/Dockerfile -t deltaforce-tactical-map:0.0.2 .

# ---- 构建阶段 ----
FROM node:22-alpine AS build
WORKDIR /app

# 先拷贝依赖清单，利用镜像层缓存
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 拷贝源码并构建（产物输出到 dist/）
COPY . .
RUN npm run build

# ---- 运行阶段 ----
FROM node:22-alpine
WORKDIR /app

# 静态产物 + 零依赖中继服务器（仅 node:http/fs/path，无需 npm 依赖）
COPY --from=build /app/dist ./dist
COPY server/ ./server/

ENV PORT=8781
EXPOSE 8781
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q -O /dev/null http://127.0.0.1:8781/api/share/health || exit 1

# STATIC_DIR 默认为 server/../dist（即 /app/dist），与上方目录布局一致
CMD ["node", "server/share-server.cjs"]
