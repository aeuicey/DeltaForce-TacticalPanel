#!/usr/bin/env bash
# 三角洲战术地图 一键部署脚本（远程机器只需 Docker，无需克隆仓库）
#
# 用法（一行命令）：
#   curl -fsSL https://raw.githubusercontent.com/aeuicey/delta-force/main/Docker/deploy.sh | bash
# 可选参数：
#   PORT=8080 IMAGE=ghcr.io/aeuicey/delta-force:latest bash deploy.sh

set -e

IMAGE="${IMAGE:-ghcr.io/aeuicey/delta-force:latest}"
PORT="${PORT:-8080}"
NAME="deltaforce-tactical-map"

if ! command -v docker >/dev/null 2>&1; then
  echo "错误：未检测到 Docker，请先安装：https://docs.docker.com/get-docker/"
  exit 1
fi

echo "==> 拉取镜像 $IMAGE"
docker pull "$IMAGE"

echo "==> 清理旧容器（如有）"
docker rm -f "$NAME" >/dev/null 2>&1 || true

echo "==> 启动容器（端口 $PORT -> 8781）"
docker run -d --name "$NAME" --restart unless-stopped -p "$PORT:8781" "$IMAGE"

echo ""
echo "部署完成！访问：http://<本机IP>:$PORT/"
echo "停止：docker stop $NAME    删除：docker rm -f $NAME"
