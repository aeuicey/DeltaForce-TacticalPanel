@echo off
REM 构建三角洲战术地图 Docker 镜像（在任意位置运行均可，自动切到项目根目录）
cd /d "%~dp0\.."
docker build -f Docker/Dockerfile -t deltaforce-tactical-map:0.0.1 .
if %errorlevel% neq 0 (
    echo 构建失败
    exit /b %errorlevel%
)
echo.
echo 构建完成。运行：docker run -d -p 8080:80 --name deltaforce-tactical-map deltaforce-tactical-map:0.0.1
echo 访问：http://localhost:8080/
