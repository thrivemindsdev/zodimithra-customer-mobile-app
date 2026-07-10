import Loader from "@/components/Loader";
import LoaderAuto from "@/components/LoaderAuto";
import OfflinePage from "@/components/OfflinePage";
import { useMessageHandler } from "@/context/message-handler";
import {
  handleBackPress,
  handleNavigationStateChange,
  injectedJavaScript,
  userAgent,
} from "@/utils/webviewUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Constants from "expo-constants";
import { SplashScreen, useNavigation } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

SplashScreen.preventAutoHideAsync();

// Set once when the user taps "Begin Journey".
const ONBOARDED_KEY = "has_onboarded";
// AsyncStorage clears on uninstall; SecureStore (Keychain) does not.
// This flag lets us detect fresh installs and wipe stale Keychain data.
const INSTALL_FLAG_KEY = "install_initialized";

// Module-level: true only on the very first mount after the process was cold-started.
// Survives Android activity recreation (unlike component state), so bg→fg remounts
// won't re-trigger the loader.
let _coldStartHandled = false;

const isLocal = false;
const baseUrl = isLocal
  ? "https://customer.zodimithra.com"
  : "https://customer.zodimithra.com";

export default function App() {
  // Neither loader is visible until the SecureStore check completes.
  const [showLoader, setShowLoader] = useState(false);
  const [showAutoLoader, setShowAutoLoader] = useState(false);
  const [loaderFinished, setLoaderFinished] = useState(false);

  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(baseUrl);
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [lastBackPressedTime, setLastBackPressedTime] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { handleMessage, setWebViewRef } = useMessageHandler();
  const navigation = useNavigation();
  const splashHiddenRef = useRef(false);

  const hideSplash = useCallback(() => {
    if (!splashHiddenRef.current) {
      splashHiddenRef.current = true;
      setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 300);
    }
  }, []);

  // Cold-start logic:
  // - First-ever open → show onboarding Loader.
  // - Already-onboarded cold start → show LoaderAuto once.
  // - Background→foreground → do nothing (no loader).
  // _coldStartHandled is module-level so Android activity recreation
  // (which remounts the component) doesn't re-trigger the loader.
  useEffect(() => {
    (async () => {
      const installed = await AsyncStorage.getItem(INSTALL_FLAG_KEY);
      if (!installed) {
        await SecureStore.deleteItemAsync(ONBOARDED_KEY);
        await AsyncStorage.setItem(INSTALL_FLAG_KEY, "1");
      }
      const onboarded = await SecureStore.getItemAsync(ONBOARDED_KEY);
      if (!onboarded) {
        setShowLoader(true);
      } else if (!_coldStartHandled) {
        setShowAutoLoader(true);
      }
      _coldStartHandled = true;
      hideSplash();
    })();
  }, [hideSplash]);

  // Hide loadingCover when WebView finishes loading
  useEffect(() => {
    if (!loading) hideSplash();
  }, [loading, hideSplash]);

  // When offline or error: hide both native splash and loadingCover
  useEffect(() => {
    if (!isConnected || hasError) {
      hideSplash();
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [isConnected, hasError, hideSplash]);

  // Safety net: force-hide everything after 8s in case onLoadEnd never fires
  useEffect(() => {
    const timeout = setTimeout(() => {
      hideSplash();
      setLoading(false);
      setInitialLoadComplete(true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [hideSplash]);

  const backPressCallback = useCallback(
    () =>
      handleBackPress({
        currentUrl,
        canGoBack,
        lastBackPressedTime,
        setLastBackPressedTime,
        webViewRef,
      }),
    [canGoBack, currentUrl, lastBackPressedTime],
  );

  useEffect(() => {
    if (Platform.OS === "android") {
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backPressCallback,
      );
      return () => backHandler.remove();
    }
  }, [backPressCallback]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected!);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (webViewRef.current) {
      setWebViewRef(webViewRef as unknown as React.RefObject<WebView>);
    }
  }, [webViewRef]);

  const handleRetry = () => {
    setHasError(false);
    setLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    } else {
      setCurrentUrl(baseUrl + "?t=" + new Date().getTime());
    }
  };

  const handleLoaderFinish = () => {
    SecureStore.setItemAsync(ONBOARDED_KEY, "1");
    setLoaderFinished(true);
    setShowLoader(false);
  };

  const handleAutoLoaderFinish = () => {
    setShowAutoLoader(false);
  };

  const sendMessageToWebview = (type: string, payload: any): void => {
    const message = JSON.stringify({ type: type, payload: payload });
    webViewRef.current?.postMessage(message);
  };

  useEffect(() => {
    if (!loading) {
      const { width, height } = Dimensions.get("window");
      sendMessageToWebview("DEVICE_INFO", {
        isNativeApp: true,
        platform: Platform.OS,
        platformVersion: Platform.Version,
        statusBarHeight: Constants.statusBarHeight,
        screenWidth: width,
        screenHeight: height,
        appVersion: Constants.expoConfig?.version ?? null,
        deviceName: Constants.deviceName ?? null,
      });
    }
  }, [loading]);

  // Show brand-color cover while WebView loads (only after all loaders are gone).
  const showCover =
    !initialLoadComplete &&
    loading &&
    !showLoader &&
    !showAutoLoader &&
    !loaderFinished;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: "#000" }}
          keyboardVerticalOffset={Constants.statusBarHeight}
        >
          {!isConnected || hasError ? (
            <OfflinePage onRetry={handleRetry} />
          ) : (
            <WebView
              ref={webViewRef}
              style={[
                styles.webview,
                isDarkMode ? styles.darkBackground : styles.lightBackground,
              ]}
              source={{ uri: currentUrl }}
              originWhitelist={["*"]}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => {
                setInitialLoadComplete(true);
                setLoading(false);
                setHasError(false);
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn("WebView error: ", nativeEvent);
                setHasError(true);
                setLoading(false);
              }}
              injectedJavaScript={injectedJavaScript}
              onMessage={handleMessage}
              javaScriptEnabled
              domStorageEnabled
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback
              mixedContentMode="always"
              allowsFullscreenVideo
              userAgent={userAgent}
              scrollEnabled
              bounces={false}
              overScrollMode="never"
              onNavigationStateChange={(navState) =>
                handleNavigationStateChange({
                  navState,
                  setCanGoBack,
                  setCurrentUrl,
                })
              }
            />
          )}
        </KeyboardAvoidingView>

        {/* Brand-color fill while WebView is loading after loaders are dismissed */}
        {showCover && <View style={styles.loadingCover} />}

        {/* showAutoLoader takes full priority — never show Loader when AutoLoader is active */}
        {showLoader && !showAutoLoader && (
          <Loader onFinish={handleLoaderFinish} />
        )}
        {showAutoLoader && <LoaderAuto onFinish={handleAutoLoaderFinish} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
  darkBackground: { backgroundColor: "#000" },
  lightBackground: { backgroundColor: "#fff" },
  loadingCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#6c1d13",
  },
});
