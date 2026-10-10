# FoodGuard 项目协作指令

1. 用户不是程序员，程序相关技术栈由 Codex 推荐并决定。
2. 涉及时效和时间的信息，先联网搜索确认，避免使用过期信息。
3. 用户电脑是 Windows 11，内存 24G，GPU RTX 5060 Ti，CPU Ryzen 5700X，已安装 Docker。
4. 指令不明确时要指出并澄清，不要默默猜测。
5. 禁止删除或泄露用户个人信息。
6. 尽一切可能满足用户需求。
7. 后期网站部署目标是 2 核 CPU、2G 内存、40G 硬盘 VPS，使用 Docker，方案不能超过该 VPS 承载能力。

## 本项目性能约定

- 优先读取 `src`、`server`、`supabase`、`docs`、`package.json`、`docker-compose.yml` 等源码和配置。
- 不要主动扫描 `node_modules`、`dist`、Android 构建产物、截图、测试图片、压缩包和日志，除非用户明确要求。
- 不要把 `.env.local`、`.env.server.local` 或其他本地密钥内容发到聊天里。
