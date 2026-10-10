# Contributing

欢迎反馈食品标签解读、界面、无障碍和网络兼容问题。当前项目仍是预览版。

## 反馈

在 Issues 中说明版本、手机型号/Android 版本、操作步骤、预期与实际结果。网络问题可提供脱敏后的错误码，不要提供 Key、个人历史、完整服务器日志或私人照片。附图片时只使用可公开的标签，并遮住人物、个人信息和购买记录。

营养或标准相关问题请提供官方来源、版本、地区及标签可读原文。不要用 AI 生成标签作为真实食品证据，不要把不同地区规则混为一种标准。安全漏洞按 [SECURITY](SECURITY.md) 私密反馈。

## 开发与验证

先阅读 [README](README.md)、[登录与隐私边界](docs/api-key-login.md)、[营养与来源规则](docs/nutrition-and-sources.md)。改动应聚焦，保留本机历史、配置和严重过敏警示；不引入品牌评分或不可靠的营养估算。

```powershell
npm ci
npm --prefix server ci
npm run check:secrets -- --history
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npm test
npm run build
```

Android 改动还需 `npm run android:sync`，在 `android/` 运行 `gradlew.bat testDebugUnitTest assembleDebug`，并验证覆盖升级、后台任务和权限。提交截图前使用合成或可公开样品和隔离测试历史，不要提交私人状态。

提交 Pull Request 时说明改动、验证、未覆盖的边界；新资源注明来源和许可证。CI 不使用真实 AI Key，不把线上请求作为自动测试。密钥检测不能代替人工审查。

## 权利

请只提交你有权贡献的代码和资源。项目许可证尚待维护者确认；在正式许可证加入前，公开仓库不代表任意使用、再分发或商用许可。
