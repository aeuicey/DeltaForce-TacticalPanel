# syntax=docker/dockerfile:1
# 三角洲战术地图（map-tools）Docker 镜像
# 多阶段构建：Node 构建静态资源 → Nginx 托管
# 构建上下文为项目根目录：
#   docker build -f Docker/Dockerfile -t deltaforce-tactical-map:0.0.1 .

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
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY Docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
