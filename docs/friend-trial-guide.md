# 朋友试用与部署

新版由朋友填写自己的 HTTPS OpenAI 兼容接口地址和 API Key 才能使用 AI，不限定使用你的地址或 Key。不要把 Key 写进 APK。服务已部署时，把 APK 发给朋友；如果你提供调用额度，再单独提供对应的地址和个人限额 Key。安装后打开设置，填写地址和 Key、拉取模型，分别选择快速与深度模型并测试，然后登录。没有 Key 仍可看本机历史与发现。
[完整的登录、隐私及开源说明](api-key-login.md)

## 部署后端
在已有 Docker VPS 上使用一个独立目录，例如 `/opt/foodguard-api`，不要覆盖其他服务、数据库或 Nginx 站点。目录需包含 `server/`、`shared/`、`Dockerfile.server`、`docker-compose.yml` 和 `.env.server.example`。开始前检查端口、Docker 容器、可用内存/磁盘和现有反向代理；下面是部署样例，不证明你的服务器已经完成这些步骤。
```bash
cp .env.server.example .env.server.local
# 设置默认上游 URL，不设置共享 Key；用户可以在应用中更换上游
docker compose up -d --build foodguard-api
curl http://127.0.0.1:18787/health
```
模型由用户所选上游返回；朋友的余额、期限和调用权限由上游 Key 管理。接口须支持 `/models` 与 `/chat/completions`，食品分析还需要模型支持图片和 JSON 输出。仅支持公开 HTTPS 地址，禁止内网地址和跳转，防止 Key 被带到其他网站。后端不保存图片、扫描历史或 Key，不运行数据库。容器限额是 384MB/0.5CPU；服务器容量应计入其他全部服务。

## 反向代理
示例把 FoodGuard 绑定到 `127.0.0.1:18787`，不直接占用已有 443/8080/8081；若 18787 已使用，请另选空闲端口，并同步修改代理目标。只配置自己的 FoodGuard 站点，不更改其他站点。可在该站点设置以下参数，先检查已有配置、备份并验证 Nginx 配置语法再重载：
```nginx
client_max_body_size 50m;
proxy_connect_timeout 200s;
proxy_send_timeout 200s;
proxy_read_timeout 200s;
send_timeout 200s;
```
Cloudflare 使用 Full (strict)，源站需要有效 HTTPS 证书。不要对分析 POST 开启缓存，不在日志中记录 Authorization、请求正文或响应正文。

`deploy/nginx/foodguard.littlemelon.top.conf` 仅为 HTTP 到本机容器的参考片段，不含 TLS 证书配置，不能直接作为 Full (strict) 的完整配置。通过你的现有面板为这个独立站点配置 HTTPS 和证书，不覆盖其他站点。检查客户端到域名的 `/health`、无 Key 的 `/api/models` 应返回 401，以及应用内真实连通测试。域名根路径不是网页版 App。

## Android 包
```powershell
$env:VITE_FOODGUARD_API_URL='https://foodguard.littlemelon.top'
npm run android:sync
cd android
.\gradlew.bat assembleDebug --no-daemon --console=plain
```
测试 APK：`android/app/build/outputs/apk/debug/app-debug.apk`。朋友允许当前文件管理器安装未知来源应用后安装；覆盖安装使用同一签名会保留历史。正式分发需改为你自己签名的 release 包，签名文件永不提交 GitHub。

换成自己的后端时，将环境变量设为自己的 HTTPS 域名，并添加 Gradle 参数 `-PFOODGUARD_API_HOST=你的域名`，供原生后台任务校验后端。仅填写上游 URL 不会替换 APK 内的 FoodGuard 转发服务。发布前检查 APK 没有本地测试地址、Key 或私人样品；向朋友单独提供个人限额 Key，不共享管理员 Key。GitHub Actions 的调试构建可能每次签名不同，仅用于测试，不作为已有安装的升级包。
历史只在本机，最多 20 条；卸载、清除应用数据和换手机不自动同步。设置中的“清理缓存”只删分析缓存，保留历史、Key 和设置。主动“重新分析”会绕过缓存，确认后可能再次计费。Key 的测试会产生一条短文本请求，可能消耗少量额度；连通不代表模型支持图片。
