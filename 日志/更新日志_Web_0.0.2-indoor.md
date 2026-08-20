# 更新日志（Web 端）· 0.0.2-indoor（2026-08-19）

## 新增

- **分享模式（Web 独占）**：工具栏"分享"按钮（美术资源图标）→ 首次填写战术名 → 生成 6 位随机后缀并自动跳转 `?share=<后缀>`，当前战术保留在分享模式中。
  - 主机：显示"主机"标识、后缀与完整链接、战术名、访客数量与昵称列表；修改 500ms 防抖实时同步。
  - 访客：凭后缀访问，首访填写昵称（可修改）；只读（复用演示模式全套锁定）；分享菜单显示战术名与「主机于 X 秒前修改战术，已于 Y 同步」（静态文本）。
  - 过期：主机关标签页或停止共享即刻失效（15 秒心跳超时兜底），后续访问显示"该分享已过期"。
- **分享中继服务器** `server/share-server.cjs`（零依赖 Node http + SSE 房间制）：`npm run share:server` 启动；dev 走 Vite 代理 `/api/share → 8781`；Docker 运行阶段改为 Node 一体镜像（端口 8781）。
- GitHub Pages 静态托管下分享按钮置灰并提示部署方式。

## 同步的通用改动（与 Android 端同版本）

- 绘图组件锁定、锁定图标尺寸统一（1em 方案）、中键拖图、选中框缩放跟随、套索锁定保护、高阶菜单（Android 端显示）等共享代码同版本发布，详见《更新日志_Android_0.0.2-indoor》。

## 验证

- `tsc --noEmit`、`npm run build` 通过；中继服务器冒烟（建房/推送/SSE/访客统计/过期）全过。
- 浏览器双端联调（主机编辑 → 访客跟随、昵称修改、过期提示）需在部署中继的环境人工验证。

## 追加（2026-08-20）：Windows 桌面端自动构建

- CI 新增 desktop 任务（windows-latest + electron-builder NSIS）：每次提交自动产出 `deltaforce-tactical-map-0.0.2-indoor-setup.exe` 并发布 Release（`desktop-v0.0.2-indoor-b*` 标签），同版本旧 build 自动清理。
- 桌面端与 GitHub Pages 同款纯静态构建（Electron 内置静态服务器托管 dist），不含分享模式中继。
- 三个版本定位：纯静态版（Pages/Windows 桌面端）/ 网页版（需中继服务器，Docker 同）/ 手机版（Android APK，独占局域网协作与开屏视频）。
