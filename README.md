# FoodGuard

**面向包装食品的配料与营养标签解读工具。**

拍摄或上传食品标签，查看配料用途、营养数据及需要留意的细节。FoodGuard 不评价品牌或厂家，不给食品打“安全分”；看不清的内容不应被补成确定结论。

[English](README.en.md) · [下载 Android 测试版](https://github.com/KristenWilliams/FoodGuard/releases) · [试用与部署](docs/friend-trial-guide.md)

> 当前版本：**1.2.2-preview**，仍在开发。APK 是调试签名的预览包，不是应用商店正式版。应用不附送 API Key 或 AI 额度，用户需要填写自己的接口地址与 Key。

## 能做什么

- **扫描食品标签**：相机或上传 JPG、PNG、WebP，原始图片最大 20 MB；拒绝人物、药品、洗护用品等非食品标签。
- **解读配料与营养**：配料详情优先展示；营养图表按需展开，提示卡片按实际识别到的营养项生成。缺失或模糊的营养数据明确标记，不用常见食品数值补齐。
- **快速 / 深度分析**：分别选择模型。快速模式解释较简短，深度模式解释较完整；两者都需识别可读配料，不保证固定速度或准确率。
- **地区与语言**：中文、英文界面，按报告的地区匹配参考依据。中国地区使用中国依据，其他地区可以分别比较不同地区的指南；切换设置不会重判旧报告。
- **本机历史**：最多 20 条，可按配料或提示搜索。重复图片在配置及规则相同、缓存有效时复用结果；主动重新分析可能再次计费。
- **应用内小助理**：解读当前报告、查找此次提供的本机历史。没有其他用户历史的查询接口；动画支持眨眼、视线与休息状态。
- **发现**：按地区获取食品与营养资讯，近期资讯只展示有可核验发布日期的近 30 天内容；获取失败时显示离线或空状态，不编造新闻。
- **Android 后台任务**：正常切换页面或应用后继续分析，完成后进入本机历史；强停、重启、省电限制或网络中断仍可能中止任务。

## 下载后怎么用

1. 在 [Releases](https://github.com/KristenWilliams/FoodGuard/releases) 下载 APK，可用同一发布页的 `SHA256SUMS.txt` 校验文件。
2. Android 7.0 及以上安装，按系统提示允许本次安装来源。调试签名测试包仅建议用于试用。
3. 打开设置，填写**你信任的 HTTPS OpenAI 兼容接口地址**和对应 API Key，拉取模型。
4. 选择快速与深度模型，短测连通后登录，再拍摄或上传清晰的配料表、营养表。

接口需要提供 `/models`、`/chat/completions`，分析模型还须支持**图片输入和 JSON 输出**。文本连通测试不代表模型支持图片；测试、分析及助理对话均可能产生上游费用。

APK 默认使用 `https://foodguard.littlemelon.top` 作为 FoodGuard 转发后端。它是 API 服务，不是浏览器网页版应用，访问根路径出现 `{"error":"Not found"}` 不代表 APK 无法使用。公共测试服务没有长期可用或无限额度保证；可自行部署后端并重新构建 APK。

## 数据与 Key

**源码、APK 不内置公共 AI Key。** “Key 登录”是验证上游调用权限，不是注册 FoodGuard 账号；额度、余额、到期和撤销由上游管理。

| 数据 | 保存与传输方式 |
| --- | --- |
| API Key、上游地址 | Android Keystore AES-GCM 加密保存；浏览器开发预览只放会话存储 |
| 分析历史、缓存 | 仅本机；历史最多 20 条，缓存最长 7 天、最多 20 项 |
| 图片和 Key | 调用时经过 FoodGuard 后端转发给你选择的上游 AI |
| 小助理上下文 | 请求时发送当前报告及本机历史摘要，不发送原照片，不查询其他人的历史 |

FoodGuard 应用后端不把 Key、照片、报告或对话写入文件、数据库或日志；代理临时缓冲及上游自身留存政策需另行检查。**这不是手机直接请求上游，也不是整条链路的零留存承诺。** 请只使用信任的后端与上游。

退出登录保留历史；“清理缓存”不删除历史、Key 或设置。卸载、清除应用数据或换手机会失去本机历史，目前没有云同步。详细边界见 [登录与隐私](docs/api-key-login.md)。

## 参考与限制

参考包括 GB 2760、GB 2761、GB 2762、GB 2763，以及中国与美国等地区的官方膳食参考资料。来源和营养换算规则见 [营养与来源](docs/nutrition-and-sources.md)。

AI 可能识别或解释错误，请核对包装原文。标签照片不能检测农药残留、污染物、霉菌毒素或证明食品安全；来源入口也不等于每一条 AI 解释都获得官方认可。严重过敏警示应遵循包装原文及专业指导。表情只提示关注程度，不是医学判断或安全认证。

本项目未完成广泛真机、中国大陆运营商网络或识别准确率评测。生成的样品图只用于交互测试，不能替代真实标签验证。

## 本地开发

环境：Node.js 22.12+、npm；Android 构建还需 Android SDK 36 和 JDK 21。技术栈：React、TypeScript、Chakra UI、Capacitor、轻量 Node HTTP 后端。

```powershell
npm ci
npm --prefix server ci
Copy-Item .env.example .env.local
Copy-Item .env.server.example .env.server.local
npm run server:dev
```

另开终端：

```powershell
npm run dev
```

开发地址使用 `.env.example` 中的本机 API。**不要向任何 `VITE_*` 变量写 Key**，它们会进入前端包。后端也不需要共享 Key；用户在应用内填写自己的配置。

```powershell
npm run check:secrets -- --history
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npm test
npm run build
```

密钥检查是规则及本机凭证比对，不能代替人工审查。GitHub Actions 运行前端检查、后端测试和 Android 测试构建，不使用真实 AI Key。

## Android 与自托管

```powershell
$env:VITE_FOODGUARD_API_URL='https://foodguard.littlemelon.top'
npm run android:sync
cd android
.\gradlew.bat assembleDebug testDebugUnitTest --no-daemon --console=plain
```

生成包：`android/app/build/outputs/apk/debug/app-debug.apk`。自托管时替换后端 URL，并向 Gradle 传入 `-PFOODGUARD_API_HOST=你的域名`。正式发行需单独配置私有 release 签名并备份，不能公开签名文件。不同签名不能直接覆盖升级。

后端使用 Docker，不需要数据库；示例仅绑定 `127.0.0.1:18787`，容器上限 384 MB / 0.5 CPU。它不是实际占用保证，部署前要与 VPS 上其他全部服务合并评估。HTTPS、50 MB 代理上传限制、200 秒超时、健康检查步骤见 [部署指南](docs/friend-trial-guide.md)。

## 项目结构

| 路径 | 用途 |
| --- | --- |
| `src/`、`public/` | 界面、标签报告、本机历史、字体和演示资源 |
| `android/` | 原生后台任务、加密凭证、启动动画、Android 构建 |
| `server/` | 上游转发、模型列表、助理、地区资讯；无历史数据库 |
| `shared/` | 数据校验、营养计算、缓存和助理上下文规则 |
| `supabase/` | 旧实现存档，当前客户端不连接云历史，旧分析函数返回 410 |
| `docs/`、`deploy/` | 功能边界、部署样例和发布说明 |

## 参与与许可

问题反馈见 [Issues](https://github.com/KristenWilliams/FoodGuard/issues)；提交方式见 [CONTRIBUTING](CONTRIBUTING.md)，发布安排见 [发布与分工](docs/publishing.md)。不要在公开反馈中贴 Key、人物照片或个人历史；安全问题见 [SECURITY](SECURITY.md)。

软件许可证尚待维护者确认；在根目录正式加入 `LICENSE` 前，不将公开源码视为已授予开源许可。字体及其他第三方资源遵循原许可证，见 [第三方说明](THIRD_PARTY_NOTICES.md)。
