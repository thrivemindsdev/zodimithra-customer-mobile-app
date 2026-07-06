# Customer App (Native) — Setup

## Prerequisites

- **Node.js** ≥ 20 LTS, **npm** ≥ 10
- **Expo CLI** via `npx expo` (no global install needed)
- For native builds: **Xcode** (iOS, deployment target 15.1) and/or
  **Android Studio** (compileSdk/targetSdk 35, minSdk 24, build-tools 35.0.0)
- A custom **dev client** build — this app uses `expo-dev-client`, native
  modules (`expo-secure-store`, `expo-location`, `react-native-webview`, etc.)
  and `newArchEnabled: true`, so **Expo Go cannot run the full app**. Use
  `expo run:*` or EAS dev builds.

## Install & run

```bash
npm install            # runs postinstall: node scripts/patch-esm-deps.js
npx expo start         # Metro dev server (use a dev client, not Expo Go)
npm run android        # expo run:android — build + install dev client
npm run ios            # expo run:ios     — build + install dev client
```

> `npm install` runs a `postinstall` hook (`scripts/patch-esm-deps.js`). The
> `package.json` also pins several transitive deps via `overrides` (notably a
> local `oxc-transform` shim in `shims/oxc-transform` and `execa@^5.1.1` for the
> hot-updater toolchain) — keep these when bumping versions.

## Scripts (`package.json`)

| Script | Command | Purpose |
|---|---|---|
| `npm start` | `expo start` | Start Metro |
| `npm run android` | `expo run:android` | Local native Android build |
| `npm run ios` | `expo run:ios` | Local native iOS build |
| `npm run web` | `expo start --web` | Web preview |
| `npm run lint` | `expo lint` | ESLint (`eslint-config-expo`) |
| `npm run deploy` | `npx hot-updater deploy` | OTA bundle (both platforms) |
| `npm run deploy:ios` | `npx hot-updater deploy --platform ios` | OTA, iOS only |
| `npm run deploy:android` | `npx hot-updater deploy --platform android` | OTA, Android only |
| `npm run ota:console` | `npx hot-updater console` | Inspect OTA releases |
| `npm run reset-project` | `node ./scripts/reset-project.js` | Reset to template |

## Key config (`app.json`)

| Field | Value |
|---|---|
| `name` / `slug` | `zodimithra` / `zodimithra` |
| `version` | `1.0.9` |
| `scheme` | `zodimithra` |
| `ios.bundleIdentifier` | `com.hc.zodimithra` |
| `ios.appleTeamId` | `83A23C4482` |
| `ios.buildNumber` | `7` |
| `android.package` | `io.zodimithra.main` |
| `android.versionCode` | `9` |
| `android.usesCleartextTraffic` | `true` |
| `newArchEnabled` | `true` |
| `updates.enabled` | `false` (OTA via hot-updater only) |

### Android permissions (`app.json`)

`INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_COARSE_LOCATION`,
`ACCESS_FINE_LOCATION`, `CAMERA`, `RECORD_AUDIO`, `VIBRATE`.

### Plugins (`app.json`)

`expo-router`, `expo-location` (with usage strings), `expo-camera` (camera +
mic), `expo-sensors` (motion), `expo-build-properties` (SDK levels),
`./translucent-default-splash-screen-config`, `expo-dev-client`
(`launchMode: most-recent`), `@hot-updater/react-native` (`channel: production`),
and `expo-secure-store`.

> **No OneSignal plugin** — that is vendor-app only.

## Changing the WebView URL / pointing at a local PWA

The URL is hard-coded near the top of `app/index.tsx`:

```ts
const isLocal = false;
const baseUrl = isLocal
    ? "https://app.zodimithra.howincloud.com"
    : "https://app.zodimithra.howincloud.com";
```

Both branches currently point at production. To develop against a local PWA, set
`baseUrl` to your machine's **LAN IP** dev server (e.g. `http://192.168.1.20:5173`)
— not `localhost`/`127.0.0.1`, which on a device resolves to the device itself.
`android.usesCleartextTraffic` is already `true`, so plain HTTP works on Android;
for iOS you may need an ATS exception for cleartext.

## Building for stores

There is **no `eas.json`** committed. Either add one and use EAS Build:

```bash
npx eas build --platform ios
npx eas build --platform android
```

…or produce local release binaries with `expo run:ios --variant release` /
`expo run:android --variant release`. Signing and IDs come from `app.json`
(bundle identifiers, Apple Team ID `83A23C4482`).

When you ship a new store build, bump `version`, `ios.buildNumber`, and
`android.versionCode` in `app.json`.

## OTA deploy (`hot-updater`)

```bash
npm run deploy            # both platforms
npm run deploy:ios        # iOS only
npm run deploy:android    # Android only
npm run ota:console       # inspect / roll back releases
```

- **OTA server:** `https://ota.howincloud.com` (runtime `baseURL`
  `https://ota.howincloud.com/api`).
- **Strategy:** `appVersion` (a bundle targets a specific app version), `zip`
  compression, channel `production`.
- Config lives in `hot-updater.config.ts` (`@hot-updater/expo` build +
  `@hot-updater/standalone` storage/repository).
- The runtime wrap is in `app/_layout.tsx` (`HotUpdater.wrap`), so an update
  check runs on launch with `UpdateSplashScreen` as the fallback UI.

## WebView network / console logging

The injected JS in `utils/webviewUtils.ts` mirrors the PWA's `console.*` and all
`fetch`/`XHR` traffic into the native console (`[WebView]`, `[NET ▶]`,
`[NET ◀]`, `[NET ✗]`). See `WEBVIEW_NETWORK_LOGGING.md` for the full reference
and a diagnosis decision tree. Gate this behind `__DEV__` before shipping if you
don't want it in production.

## Troubleshooting

- **Stale UI after an OTA:** clear app data or check `npm run ota:console`; the
  cached bundle may need a forced reload.
- **Blank screen for ≤8 s then content:** normal — the 8 s safety-net timeout in
  `index.tsx` force-hides the splash if `onLoadEnd` is slow.
- **Device can't reach a local PWA:** use the LAN IP, same Wi-Fi, correct port;
  read the `[NET ✗]` logs (often a `127.0.0.1` mistake — see the logging doc).
- **Camera/location not prompting:** confirm the OS permission and that the PWA
  is sending `request_camera_permission` / `request_location` over the bridge.
- **Expo Go fails to load the app:** expected — build a dev client
  (`expo run:android` / `expo run:ios`).
