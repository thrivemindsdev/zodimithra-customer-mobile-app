# Customer App (Native) — Overview

An **Expo / React Native** shell that hosts the customer PWA inside a single
`react-native-webview` and bridges native device capabilities to it over a
`postMessage` channel. It is built with **Expo Router** and ships as native
iOS / Android binaries, with the embedded web content updatable over-the-air via
`hot-updater`.

> **The app is a thin container.** Product features live in the customer PWA.
> This project only owns: the WebView shell, the native bridge, OTA delivery,
> onboarding/offline/update UI, and store packaging.

- **Loads:** `https://app.zodimithra.howincloud.com` (hard-coded in `app/index.tsx`)
- **App name / slug:** `zodimithra` / `zodimithra`
- **Version:** `1.0.9` (iOS buildNumber `7`, Android versionCode `9`)
- **Bundle IDs:** iOS `com.hc.zodimithra` · Android `io.zodimithra.main`

---

## Tech stack (exact versions from `package.json`)

| Package | Version | Role |
|---|---|---|
| `expo` | `~54.0.33` | SDK / tooling |
| `react-native` | `0.81.5` | Runtime (new architecture enabled) |
| `react` / `react-dom` | `19.1.0` | React (React Compiler experiment on) |
| `expo-router` | `~6.0.23` | File-based routing |
| `react-native-webview` | `13.15.0` | Hosts the PWA |
| `@hot-updater/react-native` | `^0.30.2` | OTA bundle updates |
| `@react-native-community/netinfo` | `11.4.1` | Connectivity detection |
| `expo-secure-store` | `~15.0.8` | Onboarding flag (Keychain/Keystore) |
| `@react-native-async-storage/async-storage` | `^1.24.0` | Fresh-install detection |
| `expo-location` | `~19.0.8` | GPS + compass heading |
| `expo-camera` | `~17.0.10` | Camera permission |
| `expo-haptics` | `~15.0.8` | Haptic feedback |
| `expo-speech` | `~14.0.8` | Text-to-speech |
| `expo-sensors` | `~15.0.8` | Motion sensors (compass) |
| `lottie-react-native` | `~7.3.1` | Offline animation |

> **No `react-native-onesignal` here.** Push notifications are a **vendor-app-only**
> capability. This customer app has no push integration.

---

## Lifecycle: loader → WebView

The boot sequence is driven entirely by `app/index.tsx`. The native splash is
held open (`SplashScreen.preventAutoHideAsync()` in both `app/_layout.tsx` and
`app/index.tsx`) and only released once the cold-start check resolves.

1. **Root layout** (`app/_layout.tsx`)
   - Loads the `SpaceMono` font (returns `null` until loaded).
   - Wraps the tree in `ThemeProvider` → `MessageHandlerProvider` → a single
     `Stack.Screen name="index"` (header hidden).
   - Exports the layout **wrapped in `HotUpdater.wrap(...)`** — so an OTA check
     happens before the app renders (see *OTA updates* below).

2. **Cold-start detection** (`app/index.tsx`, runs once on mount)
   - Reads `install_initialized` from **AsyncStorage**. AsyncStorage is wiped on
     uninstall but SecureStore (Keychain) is **not**, so a missing flag means a
     fresh install → it deletes the stale `has_onboarded` key from SecureStore
     and sets the install flag.
   - Reads `has_onboarded` from **SecureStore**:
     - not onboarded → show the interactive **`Loader`** (onboarding splash).
     - onboarded **and** first mount this process (`_coldStartHandled` is a
       module-level flag) → show the non-interactive **`LoaderAuto`** once.
     - background→foreground remount → show nothing.
   - Hides the native splash.

3. **WebView load**
   - The `WebView` loads `currentUrl` (initially the base URL). `onLoadStart`
     sets `loading=true`; `onLoadEnd` clears loading + error and sets
     `initialLoadComplete`.
   - While loading (after loaders are dismissed) a brand-colour cover
     (`#6c1d13`) fills the screen so the user never sees a white flash.
   - **8-second safety net:** a timeout force-hides the splash/cover even if
     `onLoadEnd` never fires.

4. **Steady state** — the WebView is the whole UI; the bridge handles everything
   else.

---

## WebView configuration (`app/index.tsx`)

Key props on the `<WebView>`:

| Prop | Value | Why |
|---|---|---|
| `source` | `{ uri: currentUrl }` | The PWA URL (or a cache-busted retry URL) |
| `originWhitelist` | `["*"]` | Allow all origins |
| `injectedJavaScript` | see `webviewUtils.ts` | Viewport, status-bar CSS, console + network bridge |
| `onMessage` | `handleMessage` | Receives the `postMessage` bridge |
| `userAgent` | platform-specific | Spoofed mobile Safari / Chrome UA |
| `javaScriptEnabled`, `domStorageEnabled` | `true` | PWA needs JS + storage |
| `mediaPlaybackRequiresUserAction` | `false` | Autoplay audio/video |
| `allowsInlineMediaPlayback`, `allowsFullscreenVideo` | `true` | Video UX |
| `mixedContentMode` | `"always"` | Allow mixed content |
| `bounces` / `overScrollMode` | `false` / `"never"` | No rubber-banding |
| `onNavigationStateChange` | tracks `canGoBack` + `currentUrl` | Drives back-button logic |

The WebView is wrapped in a `KeyboardAvoidingView` with
`keyboardVerticalOffset={Constants.statusBarHeight}`.

---

## The native bridge

Two files implement the bridge: `utils/webviewUtils.ts` (web→native injection)
and `context/message-handler.tsx` (native message router + native→web pushes).

### Injected JavaScript (`utils/webviewUtils.ts`, `injectedJavaScript`)

Runs before page JS at every load. It performs four jobs:

1. **Viewport + context menu** — injects a fixed `viewport` meta
   (`maximum-scale=1.0, user-scalable=no`) and blocks the long-press context menu.
2. **Status-bar CSS** — injects `.p-status-t` / `.p-status-b` utility classes
   with `padding-top/bottom` equal to the native `Constants.statusBarHeight`, so
   the PWA can offset content under the notch.
3. **Console bridge** — wraps `console.log/error/warn` to also
   `postMessage({ type: 'console_log', level, data })`.
4. **Network bridge** — patches `window.fetch` **and** `XMLHttpRequest` to emit
   `{ type: 'network_log', event: 'request'|'response'|'error', ... }` (bodies
   truncated to 1000 chars). See `WEBVIEW_NETWORK_LOGGING.md` for the full
   rationale and diagnosis guide.

### Message types: web → native

Routed by the `switch` in `handleMessage` (`context/message-handler.tsx`).
All inbound messages are JSON with a `type` field.

| `type` | Payload fields | Native action |
|---|---|---|
| `on_login` | `token` | Stores the bearer token in a ref (used for location updates) |
| `haptic` | `data.hapticType` (`selection`/`notification`/`impact`), `data.style` | Triggers `expo-haptics` (see haptics table) |
| `console_log` | `level`, `data` | Mirrors to native console (`[WebView]` / `[WebView:WARN]` / `[WebView:ERR]`) |
| `network_log` | `event`, `method`, `url`, `status`, `duration`, `body`, `error` | Logs `[NET ▶]` / `[NET ◀]` / `[NET ✗]` |
| `alert` | `data` | Native `alert()` |
| `get_device_data` | — | Replies with `DEVICE_INFO` (native→web) |
| `keyboard_unfocus` | — | `Keyboard.dismiss()` |
| `request_location` | — | Requests foreground location permission; if a token exists, reverse-geocodes and POSTs `current_location` to the backend, else stores the position locally |
| `request_camera_permission` | — | Requests camera permission via `expo-camera` |
| `open_app_scheme` | `data` (URL) | `Linking.openURL`, falling back to browser |
| `speak_text` | `data` (string) | TTS via `expo-speech`; replies `SPEECH_DONE` on done/error |
| `stop_speak` | — | Stops TTS; replies `SPEECH_DONE` |
| `start_compass` | — | Subscribes to `Location.watchHeadingAsync`; streams `COMPASS_UPDATE` |
| `stop_compass` | — | Removes the heading subscription |
| *(unknown)* | — | Logged as `Unknown message type` |

### Message types: native → web

Sent via `webViewRef.current.postMessage(JSON.stringify({ type, ... }))`.

| `type` | Payload | When |
|---|---|---|
| `DEVICE_INFO` | `{ isNativeApp, platform, platformVersion, statusBarHeight, screenWidth, screenHeight, appVersion, deviceName }` | After first WebView load (in `index.tsx`) **and** on demand via `get_device_data` |
| `COMPASS_UPDATE` | `{ angle }` (rounded degrees, prefers `trueHeading`) | Continuously while a compass subscription is active |
| `SPEECH_DONE` | `{}` | When `speak_text` finishes/errors or on `stop_speak` |

### Haptics mapping (`utils/haptics-utils.ts`)

A `haptic` message with `data.hapticType` maps to `expo-haptics`:

| `hapticType` | `style` values | API |
|---|---|---|
| `selection` | — | `Haptics.selectionAsync()` |
| `notification` | `success` / `error` / `warning` | `Haptics.notificationAsync(...)` |
| `impact` | `light` / `medium` / `heavy` / `rigid` / `soft` | `Haptics.impactAsync(...)` |

### Location detail

`request_location` requests foreground permission, then:
- If an auth token was captured via `on_login`, it reverse-geocodes the current
  position and POSTs `{ current_location: "City, Region, Country" }` to
  `https://zodimithra.howincloud.com/api/profile/update` with a bearer token.
- Otherwise it just stores the position in component state.

`start_compass` uses `Location.watchHeadingAsync` and streams rounded
`COMPASS_UPDATE` angles (true heading preferred, magnetic fallback). The
subscription is torn down on `stop_compass` and on provider unmount.

---

## Android back-button handling (`utils/webviewUtils.ts`, `handleBackPress`)

Registered only on Android (`BackHandler` in `index.tsx`):

- If the current URL ends with `/` or `/login` → **double-tap-to-exit**: a
  toast ("Press back again to exit the app"); a second press within 2 s calls
  `BackHandler.exitApp()`.
- Else if the WebView `canGoBack` → `webViewRef.goBack()`.
- Else → default behaviour.

`handleNavigationStateChange` keeps `canGoBack` and `currentUrl` in sync with the
WebView's navigation state.

---

## OTA updates (`hot-updater`)

OTA lets the embedded PWA shell update without an App Store / Play Store review.

- **Wrap (runtime):** `app/_layout.tsx` exports
  `HotUpdater.wrap({ baseURL: 'https://ota.howincloud.com/api', updateStrategy: 'appVersion', updateMode: 'auto', reloadOnForceUpdate: true, fallbackComponent: UpdateSplashScreen, ... })(RootLayout)`.
  Progress, completion, and errors are logged with a `[HOT_UPDATER]` prefix.
- **Plugin (build):** `app.json` registers `@hot-updater/react-native` with
  `channel: "production"`.
- **Deploy (CLI):** `hot-updater.config.ts` uses `@hot-updater/expo` for builds
  and `@hot-updater/standalone` storage + repository, both pointing at
  `https://ota.howincloud.com`, `updateStrategy: 'appVersion'`,
  `compressStrategy: 'zip'`.
- Native auto-updates are **disabled** in `app.json` (`"updates": { "enabled": false }`)
  because OTA is delivered exclusively through hot-updater.

The `UpdateSplashScreen` component (passed as `fallbackComponent`) renders the
splash background with a spinner, an "Updating app..." label when status is
`UPDATING`, and a percentage when progress is > 0.

---

## Components

| File | Purpose |
|---|---|
| `components/Loader.tsx` | First-run onboarding splash. Animated logo (`logoloader.png`) scale-in, then "ZODI MITHRA" title, subtitle, a gold **"Begin Your Journey"** button, and a bottom tagline. On press it fades out and calls `onFinish`, which writes `has_onboarded` to SecureStore. Brand colours `#6c1d13` / `#c9972e`. |
| `components/LoaderAuto.tsx` | Returning-user splash. Same visuals **minus the button** — it auto-sequences the animation, pauses ~700 ms, fades out, then calls `onFinish`. |
| `components/OfflinePage.tsx` | Shown when NetInfo reports offline **or** the WebView errors. Lottie `nonetwork.json` animation, "No Internet Connection" copy, and a **Try Again** button that calls `onRetry` (reloads the WebView / cache-busts the URL). |
| `components/UpdateSplashScreen.tsx` | `hot-updater` fallback during an OTA download — splash background, spinner, status text, percentage. |

`Loader` is suppressed whenever `LoaderAuto` is active; the offline page replaces
the WebView entirely while offline.

---

## Project structure

```
app/
  _layout.tsx           Root layout; wraps RootLayout in HotUpdater.wrap(...)
  index.tsx             Main WebView wrapper, loader lifecycle, back handling
  (tabs)/ modal.tsx     Expo-template leftovers (not used by the shell flow)
  +html.tsx +not-found.tsx
components/
  Loader.tsx            Onboarding splash (interactive)
  LoaderAuto.tsx        Returning-user splash (auto)
  OfflinePage.tsx       Offline / error fallback
  UpdateSplashScreen.tsx OTA download splash
context/
  message-handler.tsx   Native ↔ web postMessage bridge + provider
utils/
  webviewUtils.ts       Injected JS, back-press, nav-state, userAgent
  haptics-utils.ts      Haptic-event → expo-haptics mapping
types/types.ts          GeneralEvent / HapticEvent types
hot-updater.config.ts   OTA build/storage/repository config
app.json                Expo config (permissions, plugins, IDs)
react-native-device-info.ts  Tiny getVersion() helper
```

---

## Differences vs. the Vendor app

| Aspect | Customer | Vendor |
|---|---|---|
| Push (OneSignal) | **No** | **Yes** (`react-native-onesignal`, `onesignal-expo-plugin`) |
| `HotUpdater.wrap` in `_layout` | **Yes** | **No** (OTA plugin not wired into runtime) |
| WebView URL | `app.zodimithra.howincloud.com` | `zodimithra-vendor.howincloud.com` |
| `onesignal_login` bridge message | absent | present |
| Android package | `io.zodimithra.main` | `com.hc.zodimithravendor` |
| Expo name / slug | `zodimithra` / `zodimithra` | `Zodimithra Vendor` / `zodimithra-vendor` |

Everything else (bridge, injected JS, loaders, offline page, back handling, OTA
server, iOS bundle ID, versions) is identical between the two apps.
