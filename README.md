# Zodimithra Customer App (Native)

The **Expo / React Native** native shell for customers. It wraps the
[customer PWA](../zodimithra-customer-pwa) in a `WebView` and adds native device capabilities and
over-the-air updates, then ships to the App Store and Play Store.

> Part of the [Zodimithra platform](../README.md). Loads `https://app.zodimithra.howincloud.com`.

---

## What this app is (and isn't)

- **Is:** a thin native container around the customer PWA + a `postMessage` bridge to native device APIs +
  OTA update delivery.
- **Isn't:** the place where product features live. Customer-facing features are built in the
  [customer PWA](../zodimithra-customer-pwa). Change this project only for device capabilities, store
  concerns, or the native shell itself.

---

> **App:** `zodimithra` · v`1.0.9` · iOS `com.hc.zodimithra` · Android `io.zodimithra.main`
> · **No push** (push is vendor-app only).

---

## Tech stack (exact)

- **Expo `~54.0.33`** · **React Native `0.81.5`** · **React `19.1.0`** · **Expo Router `~6.0.23`**
- `react-native-webview` `13.15.0` — hosts the PWA
- `@hot-updater/react-native` `^0.30.2` — OTA bundle updates (wrapped in `app/_layout.tsx`)
- `@react-native-community/netinfo` `11.4.1` — connectivity
- `expo-secure-store` `~15.0.8` — onboarding flag (Keychain/Keystore)
- `expo-location` / `expo-camera` / `expo-haptics` / `expo-speech` — bridged device APIs

New architecture (`newArchEnabled`) and the React Compiler experiment are on, so
the app runs in a **dev client**, not Expo Go.

---

## Quick start

```bash
npm install
npx expo start          # press i / a, or scan the QR with Expo Go
```

Native builds & OTA:

```bash
npm run android         # expo run:android
npm run ios             # expo run:ios
npm run deploy          # OTA bundle via hot-updater
npm run ota:console     # hot-updater console
```

---

## Documentation

| Doc | Contents |
|---|---|
| [`docs/OVERVIEW.md`](./docs/OVERVIEW.md) | WebView shell, native bridge, OTA, structure |
| [`docs/SETUP.md`](./docs/SETUP.md) | Setup, builds, pointing at a local PWA, OTA deploy |
| [Play Store deployment](../docs/DEPLOY_PLAY_STORE.md) | prebuild → Gradle AAB, keystore signing, store listing, versioning |
| [App Store deployment](../docs/DEPLOY_APP_STORE.md) | prebuild → Xcode archive, TestFlight, signing, versioning |

---

## Native capabilities (via the bridge)

Compass/GPS sensor streaming · camera permissions · haptic feedback · speech synthesis · network detection ·
secure credential storage · device-info broadcast · Android back-button handling · OTA updates.

The bridge is implemented in `context/message-handler.tsx` (native router) and
`utils/webviewUtils.ts` (injected JS: viewport, status-bar CSS, console + network
logging). Web→native messages include `request_location`, `request_camera_permission`,
`haptic`, `speak_text`, `start_compass`, `open_app_scheme`, `on_login`; native→web
replies include `DEVICE_INFO`, `COMPASS_UPDATE`, `SPEECH_DONE`. See
[`docs/OVERVIEW.md`](./docs/OVERVIEW.md) for the full message table and
[`WEBVIEW_NETWORK_LOGGING.md`](./WEBVIEW_NETWORK_LOGGING.md) for the logging bridge.
