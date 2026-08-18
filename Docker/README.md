# Docker 部署说明

将三角洲战术地图（map-tools 0.0.2-indoor）打包为 Docker 镜像，由**零依赖 Node 中继服务器**（`server/share-server.cjs`）托管 Vite 构建产物，并同时提供网页端分享模式的 API 与 SSE 推送。

## 文件

- `Dockerfile` — 多阶段构建（Node 22 构建 → Node 22 运行 `server/share-server.cjs`），构建上下文为**项目根目录**
- `docker-compose.yml` — 一键编排（可选，非必需）
- `build-image.bat` — Windows 双击构建脚本
- `nginx.conf` — 旧版 Nginx 静态托管配置（当前 Dockerfile 不再使用，仅留作参考）

## 构建

```bash
# 在项目根目录执行
docker build -f Docker/Dockerfile -t deltaforce-tactical-map:0.0.2 .
```

或直接双击 `build-image.bat`。

## 运行

```bash
docker run -d -p 8080:8781 --name deltaforce-tactical-map deltaforce-tactical-map:0.0.2
# 访问 http://localhost:8080/
```

或使用 compose：

```bash
cd Docker
docker compose up -d --build
```

## 说明

- 容器内运行零依赖 Node 中继服务器（仅 `node:http/fs/path`）：托管 `dist/` 静态站点（SPA fallback），并提供分享模式接口（`/api/share/*`：建房 / 状态推送 / 心跳 / SSE 访客订阅 / 关房过期）。
- 容器内端口为 **8781**（环境变量 `PORT` 可覆盖），compose 默认映射 `8080:8781`，按需修改。
- 分享房间数据保存在内存中，容器重启后房间即失效；地图本地数据仍保存在浏览器 localStorage。
- 健康检查走 `http://127.0.0.1:8781/api/share/health`。
- 项目根目录的 `.dockerignore` 已排除 `node_modules`、`android`、`JDK21` 等无关内容，保证构建上下文最小。
- 国内环境拉取 `node:22-alpine` 基础镜像若超时，请先配置 Docker 镜像加速器或代理。
