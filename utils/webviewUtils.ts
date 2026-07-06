// src/utils/webviewUtils.ts
import WebView, { WebViewNavigation } from "react-native-webview";

import { Platform, BackHandler, ToastAndroid } from "react-native";
import React from "react";
import Constants from "expo-constants";

export type NavigationStateHandlerProps = {
    navState: WebViewNavigation;
    setCanGoBack: React.Dispatch<React.SetStateAction<boolean>>;
    setCurrentUrl: React.Dispatch<React.SetStateAction<string>>;
};

export type BackPressHandlerProps = {
    currentUrl: string;
    canGoBack: boolean;
    lastBackPressedTime: number;
    setLastBackPressedTime: React.Dispatch<React.SetStateAction<number>>;
    webViewRef: React.RefObject<WebView>;
};

export const handleBackPress = ({
    currentUrl,
    canGoBack,
    lastBackPressedTime,
    setLastBackPressedTime,
    webViewRef,
}: BackPressHandlerProps): boolean => {
    const currentTime = Date.now();

    if (currentUrl.endsWith("/") || currentUrl.endsWith("/login")) {
        if (lastBackPressedTime && currentTime - lastBackPressedTime < 2000) {
            BackHandler.exitApp();
        } else {
            ToastAndroid.show("Press back again to exit the app", ToastAndroid.SHORT);
            setLastBackPressedTime(currentTime);
        }
        return true;
    } else if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
    }
    return false;
};

export const handleNavigationStateChange = ({
    navState,
    setCanGoBack,
    setCurrentUrl,
}: NavigationStateHandlerProps): void => {
    setCanGoBack(navState.canGoBack);
    setCurrentUrl(navState.url);
};

export const injectedJavaScript = `
  (function() {
      var meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.getElementsByTagName('head')[0].appendChild(meta);

      document.addEventListener('contextmenu', function(event) {
          event.preventDefault();
      });
  })();

  (function() {
        var statusBarHeight = ${Constants.statusBarHeight};
        var style = document.createElement('style');
        style.innerHTML = \`
            .p-status-t{
                padding-top: \${statusBarHeight}px;
            }
            .p-status-b{
                padding-bottom: \${statusBarHeight}px;
            }
        \`;
        document.head.appendChild(style);
  })();

  (function() {
      var oldLog = console.log;
      console.log = function() {
          try {
              var message = arguments[0];
              var messageString = typeof message === 'string' ? message : JSON.stringify(message);
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'console_log', level: 'log', data: messageString }));
          } catch (e) {
              // Ignore circular references or stringify errors
          }
          oldLog.apply(console, arguments);
      };
      var oldError = console.error;
      console.error = function() {
          try {
              var message = arguments[0];
              var messageString = typeof message === 'string' ? message : JSON.stringify(message);
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'console_log', level: 'error', data: messageString }));
          } catch (e) {}
          oldError.apply(console, arguments);
      };
      var oldWarn = console.warn;
      console.warn = function() {
          try {
              var message = arguments[0];
              var messageString = typeof message === 'string' ? message : JSON.stringify(message);
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'console_log', level: 'warn', data: messageString }));
          } catch (e) {}
          oldWarn.apply(console, arguments);
      };
  })();

  (function() {
      var originalFetch = window.fetch;
      window.fetch = function(input, init) {
          var url = typeof input === 'string' ? input : (input && input.url) || String(input);
          var method = (init && init.method) || (input && input.method) || 'GET';
          var startTime = Date.now();
          try {
              var reqBody = init && init.body ? String(init.body).substring(0, 1000) : null;
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'network_log', event: 'request', method: method, url: url, body: reqBody }));
          } catch (e) {}
          return originalFetch.apply(this, arguments).then(function(response) {
              var duration = Date.now() - startTime;
              var status = response.status;
              response.clone().text().then(function(body) {
                  try {
                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'network_log', event: 'response', method: method, url: url, status: status, duration: duration, body: body.substring(0, 1000) }));
                  } catch (e) {}
              }).catch(function() {});
              return response;
          }).catch(function(error) {
              try {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'network_log', event: 'error', method: method, url: url, error: String(error) }));
              } catch (e) {}
              throw error;
          });
      };
  })();

  (function() {
      var XHR = XMLHttpRequest.prototype;
      var origOpen = XHR.open;
      var origSend = XHR.send;
      XHR.open = function(method, url) {
          this._netMethod = method;
          this._netUrl = url;
          this._netStart = Date.now();
          return origOpen.apply(this, arguments);
      };
      XHR.send = function(body) {
          var self = this;
          try {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'network_log', event: 'request', method: self._netMethod, url: self._netUrl, body: body ? String(body).substring(0, 1000) : null }));
          } catch (e) {}
          this.addEventListener('load', function() {
              try {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'network_log', event: 'response', method: self._netMethod, url: self._netUrl, status: self.status, duration: Date.now() - self._netStart, body: self.responseText ? self.responseText.substring(0, 1000) : null }));
              } catch (e) {}
          });
          this.addEventListener('error', function() {
              try {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'network_log', event: 'error', method: self._netMethod, url: self._netUrl, error: 'XHR network error' }));
              } catch (e) {}
          });
          return origSend.apply(this, arguments);
      };
  })();

  true;
`;

export const userAgent = Platform.select({
    ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
    android:
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.50 Mobile Safari/537.36",
    default:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
});
