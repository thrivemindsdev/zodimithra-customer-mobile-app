# WebView Network & Console Logging — Implementation Guide

A reusable pattern for surfacing browser-side logs and HTTP traffic into the native app console for any React Native WebView project.

---

## The Problem

When a React Native app wraps a web app in a WebView, all browser-side activity (console logs, fetch calls, API errors) is invisible to the native dev console. You have to guess what's happening inside the WebView.

---

## The Core Idea

Inject JavaScript into the WebView at load time that:
1. Intercepts `console.log / warn / error`
2. Intercepts `window.fetch` (modern HTTP)
3. Intercepts `XMLHttpRequest` (legacy HTTP / some libraries)

Each interceptor calls the original method normally, then posts a structured message to the native side via `window.ReactNativeWebView.postMessage(...)`.

The native message handler receives these messages and logs them with clear prefixes using the native logger (`console.log`, `console.warn`, etc.).

---

## Three Interceptors to Inject

### 1. Console Bridge

Wrap `console.log`, `console.warn`, and `console.error` to mirror browser logs into the native console.

```
Original call → do the real log → post { type: 'console_log', level, data } to native
```

### 2. Fetch Interceptor

Wrap `window.fetch`:

```
On call   → post { type: 'network_log', event: 'request', method, url, body }
On resolve → clone response → read body text → post { event: 'response', status, duration, body }
On reject  → post { event: 'error', error }
```

Key detail: **clone the response before reading the body**, otherwise the original consumer can't read it again.

### 3. XHR Interceptor

Patch `XMLHttpRequest.prototype.open` and `send`:

```
open()  → store method, url, startTime on the instance
send()  → post request log, attach 'load' and 'error' event listeners
load    → post { event: 'response', status, duration, responseText }
error   → post { event: 'error' }
```

---

## Message Format (Suggested)

```json
// Console
{ "type": "console_log", "level": "log|warn|error", "data": "message string" }

// Network request
{ "type": "network_log", "event": "request", "method": "POST", "url": "...", "body": "..." }

// Network response
{ "type": "network_log", "event": "response", "method": "POST", "url": "...", "status": 200, "duration": 142, "body": "..." }

// Network error
{ "type": "network_log", "event": "error", "method": "POST", "url": "...", "error": "..." }
```

---

## Native Side — Message Handler

Add a `network_log` case alongside your existing message switch:

```
'request'  → log [NET ▶] METHOD URL  (+ body if present)
'response' → log [NET ◀] STATUS METHOD URL (Xms)  (+ body if present)
'error'    → warn [NET ✗] METHOD URL — error
```

Use `console.warn` (not `console.error`) for errors and WebView error-level logs — `console.error` in Expo/RN dev mode shows a full red overlay with a stack trace, which is noisy and misleading since these aren't native crashes.

---

## Important Details

| Concern | Recommendation |
|---|---|
| Body size | Truncate to 500–1000 chars to avoid flooding the console |
| Circular refs | Wrap all `JSON.stringify` calls in try/catch |
| `postMessage` timing | Always call the original method first, then post — never block the original |
| XHR `this` binding | Store method/url/startTime on the XHR instance in `open`, not in `send` closure |
| Response body | Use `response.clone().text()` for fetch — never consume the original |

---

## Where to Place the Injected JS

Each framework has a different injection point:

| Framework | Where to inject |
|---|---|
| `react-native-webview` | `injectedJavaScript` prop (runs before page JS) |
| Android WebView | `webView.evaluateJavascript(...)` in `onPageStarted` |
| iOS WKWebView | `WKUserScript` with injection time `.atDocumentStart` |
| Capacitor / Cordova | Plugin or `webView.configuration.userContentController` |

---

## How to Read the Logs and Diagnose Issues

Once logging is in place, read the three log lines together — they always tell a complete story.

### The Three-Line Pattern

Every network call produces up to three log lines:

```
[NET ▶]  → the request left the WebView        (always appears)
[NET ◀]  → the server responded                (appears on success)
[NET ✗]  → the request never reached the server (appears on failure)
```

If you see `[NET ▶]` followed by `[NET ✗]` with **no** `[NET ◀]` in between, the problem is **before the server** — the request never arrived.

---

### Diagnosis Decision Tree

```
[NET ▶] fired?
│
├── NO  → The interceptor didn't load. Check that injectedJavaScript runs
│         before the page JS (use atDocumentStart / injectedJavaScript prop).
│
└── YES
    │
    ├── [NET ◀] fired?
    │   │
    │   ├── YES → status 2xx → success, check response body for logic errors
    │   │         status 4xx → bad request or auth (401, 403, 404, 422)
    │   │         status 5xx → server crash, check server logs
    │   │
    │   └── NO → [NET ✗] fired (XHR network error / fetch rejected)
    │             ↓
    │             The TCP connection failed — request never reached the server.
    │             Common causes:
    │             • URL is 127.0.0.1 or localhost — on a real device this
    │               means the device itself, not your dev machine. Use the
    │               machine's LAN IP (e.g. 192.168.x.x) instead.
    │             • Wrong port / server not running
    │             • HTTPS certificate error (self-signed cert on device)
    │             • Device not on same Wi-Fi as server
    │             • Firewall blocking the port
    │
    └── [WebView:ERR] also fired?
        └── YES → read that message — it's the JS-side catch block telling
                  you exactly what the app thinks went wrong (e.g.
                  "Failed to send OTP:", "Network Error", "CORS error")
```

---

### Real Example — Diagnosing the 127.0.0.1 Error

These were the actual logs:

```
LOG  [NET ▶] POST http://127.0.0.1:8000/api/send-otp
       body: {"phone":"+918458888888"}

WARN [WebView:ERR] Failed to send OTP:

WARN [NET ✗] POST http://127.0.0.1:8000/api/send-otp — XHR network error
```

**Reading it:**
- `[NET ▶]` fired → the WebView sent the request
- `[NET ◀]` never appeared → the server never responded
- `[NET ✗]` appeared → TCP connection was refused
- URL is `127.0.0.1` → on a physical iPhone, that is the iPhone itself, not the dev Mac

**Root cause:** The web app was configured to call `127.0.0.1:8000` (localhost). That works in a browser on the same machine, but on a real device `127.0.0.1` is the device's own loopback — the server isn't there.

**Fix:** Change the API base URL to the dev machine's LAN IP address (e.g. `192.168.x.x:8000`) so the device can reach it over Wi-Fi.

---

### Quick Reference — What Each Pattern Means

| Log pattern | Meaning |
|---|---|
| `▶` then `◀ 200` | Success |
| `▶` then `◀ 401` | Auth token missing or expired |
| `▶` then `◀ 403` | Authenticated but not authorized |
| `▶` then `◀ 404` | Wrong URL / endpoint removed |
| `▶` then `◀ 422` | Validation failed — check request body |
| `▶` then `◀ 500` | Server crashed — check server logs |
| `▶` then `✗` | Never reached the server — network/URL problem |
| `▶` only (no ◀ or ✗) | Request hung / timed out |
| No `▶` at all | Interceptor not loaded or request made before injection |

---

## What You Get in the Console

```
LOG  [NET ▶] POST https://api.example.com/login
       body: {"phone":"+91XXXXXXXX"}

LOG  [NET ◀] 200 POST https://api.example.com/login (138ms)
       body: {"token":"eyJ..."}

WARN [NET ✗] POST http://127.0.0.1:8000/api/send-otp — XHR network error

LOG  [WebView] User clicked submit
WARN [WebView:ERR] Failed to send OTP:
```

---

## What This Does NOT Cover

- **Native-side HTTP calls** made directly from the RN app (use a fetch/axios interceptor on the JS side of RN itself)
- **WebSocket traffic** — needs a separate `WebSocket` prototype patch
- **Production builds** — gate the injection behind a `__DEV__` flag so it doesn't ship to users
