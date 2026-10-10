# FoodGuard

**An Android tool for understanding packaged-food ingredient and nutrition labels.**

Take a clear label photo or upload one to understand ingredient functions, readable nutrition values and details worth checking. FoodGuard does not review brands or manufacturers and does not assign a food safety score.

[中文](README.md) · [Android preview downloads](https://github.com/KristenWilliams/FoodGuard/releases)

## Preview status

Version **1.2.2-preview** is in development. The APK is debug-signed for testing, not a store-ready release. It contains **no shared AI API Key or included AI credits**. AI interpretation can be wrong; always check the original label. A photo cannot detect contamination, pesticide residues or prove that food is safe.

## Features

- Camera and JPG/PNG/WebP uploads, up to 20 MB; non-food labels are rejected.
- Ingredient-first reports, optional nutrition charts and cards based on available values. Unreadable or missing nutrition data remains unknown, rather than being estimated.
- Separately selected quick and detailed models; both read the visible ingredients. Speed and quality depend on the provider and model.
- Chinese and English UI, regional references and explicit jurisdiction boundaries. Changing settings does not re-evaluate old reports.
- Up to 20 local history entries, search and configuration-aware image caching. Explicit re-analysis can incur another charge.
- An in-app assistant that explains the current report and finds entries in the local history supplied with the request. It has no access to other users' history.
- Regional food/nutrition updates with verifiable publication dates from the last 30 days; offline and empty states instead of invented news.
- Android background analysis for ordinary navigation/app switching; force stop, reboot, battery management and network loss can still interrupt it.

## Install and connect

1. Download the preview APK from [Releases](https://github.com/KristenWilliams/FoodGuard/releases). Check it against the release's `SHA256SUMS.txt`.
2. Install on Android 7.0 or later, allowing the selected installation source if prompted.
3. In Settings, enter a trusted public **HTTPS OpenAI-compatible provider URL and your own API Key**. Fetch the models, select quick/detailed models, test and log in.
4. Scan a legible food ingredient or nutrition label.

The provider must expose `/models` and `/chat/completions`. Analysis also requires image input and JSON output. The short connection test checks text only, not vision support. Tests, analysis and chat can incur provider fees. Key login is not an account or billing system; the upstream provider manages quotas and revocation.

The APK uses `https://foodguard.littlemelon.top` as its FoodGuard forwarding backend. The root is an API endpoint, **not a web app**; `{"error":"Not found"}` at `/` is expected. Availability of the public trial backend is not guaranteed. You may self-host and rebuild the app with your backend URL.

## Privacy boundary

History and analysis cache remain on the device. Android encrypts the Key and provider URL using Keystore AES-GCM; the development browser uses session storage only. Logout keeps history; clearing analysis cache keeps history, credentials and preferences. Uninstalling or clearing app data loses local history; there is no cloud synchronization.

Requests pass **through the FoodGuard backend**, which temporarily receives the Key and image before forwarding them to the chosen AI provider. Assistant requests contain local report summaries, not original photos. The app backend does not persist Keys, images, reports or conversations. Reverse-proxy buffering/logging and upstream retention are separate concerns: this is not an end-to-end zero-retention promise. Use trusted infrastructure. See [implementation and boundaries](docs/api-key-login.md) (Chinese).

## Develop

Node.js 22.12+, npm; Android also needs SDK 36 and JDK 21. React + TypeScript + Chakra UI + Capacitor, with a small Node HTTP backend and no required database.

```powershell
npm ci
npm --prefix server ci
Copy-Item .env.example .env.local
Copy-Item .env.server.example .env.server.local
npm run server:dev
```

In another terminal, run `npm run dev`. Never put a Key in a `VITE_*` variable: those values are bundled into the frontend. The backend needs no shared AI Key.

```powershell
npm run check:secrets -- --history
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npm test
npm run build
$env:VITE_FOODGUARD_API_URL='https://foodguard.littlemelon.top'
npm run android:sync
cd android
.\gradlew.bat assembleDebug testDebugUnitTest --no-daemon --console=plain
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`. For self-hosting, replace the URL and pass `-PFOODGUARD_API_HOST=your.domain` to Gradle. A production release needs a private release-signing key and a backup; never commit it. Differently signed APKs cannot directly upgrade each other.

Docker binds the backend to `127.0.0.1:18787`, with a 384 MB / 0.5 CPU container limit. Evaluate total VPS resources, including existing services. See [deployment](docs/friend-trial-guide.md). Existing `supabase/` files are legacy records, not the current history backend.

## Contribute and license

See [CONTRIBUTING](CONTRIBUTING.md), [SECURITY](SECURITY.md) and [third-party notices](THIRD_PARTY_NOTICES.md). Do not upload Keys, private photos or personal history in public issues.

The project license awaits the maintainer's decision. Public source is not an open-source license grant until a root `LICENSE` is added. Bundled fonts and dependencies retain their own licenses. Broad real-device, mainland-China network and label-accuracy evaluations are still pending; generated demos are not accuracy benchmarks.
