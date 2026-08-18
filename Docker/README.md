# Docker 部署说明

将三角洲战术地图（map-tools 0.0.1）打包为 Docker 镜像，Nginx 托管 Vite 构建产物。

## 文件

- `Dockerfile` — 多阶段构建（Node 22 构建 → Nginx 1.27 托管），构建上下文为**项目根目录**
- `nginx.conf` — SPA 路由回退、静态资源缓存、gzip
- `docker-compose.yml` — 一键编排（可选，非必需）
- `build-image.bat` — Windows 双击构建脚本

## 构建

```bash
# 在项目根目录执行
docker build -f Docker/Dockerfile -t deltaforce-tactical-map:0.0.1 .
```

或直接双击 `build-image.bat`。

## 运行

```bash
docker run -d -p 8080:80 --name deltaforce-tactical-map deltaforce-tactical-map:0.0.1
# 访问 http://localhost:8080/
```

或使用 compose：

```bash
cd Docker
docker compose up -d --build
```

## 说明

- 容器为纯静态站点（约 几 MB 产物 + Nginx），无后端依赖；数据保存在浏览器 localStorage，容器重启不影响。
- 端口映射按需修改（compose 默认 `8080:80`）。
- 项目根目录的 `.dockerignore` 已排除 `node_modules`、`android`、`JDK21` 等无关内容，保证构建上下文最小。
- 国内环境拉取 `node:22-alpine` / `nginx:1.27-alpine` 基础镜像若超时，请先配置 Docker 镜像加速器或代理。
