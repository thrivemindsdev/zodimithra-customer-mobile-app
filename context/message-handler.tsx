// src/contexts/MessageHandlerContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ToastAndroid, Linking, Keyboard, Dimensions, Platform } from "react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { handleHapticFeedback } from "@/utils/haptics-utils";
import { WebView } from "react-native-webview";
import { useCameraPermissions } from "expo-camera";
import { useRef } from "react";
import { GeneralEvent } from "@/types/types";
import Constants from "expo-constants";


type MessageHandlerContextType = {
    handleMessage: (event: { nativeEvent: { data: string } }) => void;
    setWebViewRef: (ref: React.RefObject<WebView | null>) => void;
};

const MessageHandlerContext = createContext<
    MessageHandlerContextType | undefined
>(undefined);

export const MessageHandlerProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    const [location, setLocation] = useState<Location.LocationObject | null>(
        null
    );
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const webViewRef = useRef<React.RefObject<WebView | null> | null>(null);
    const authTokenRef = useRef<string | null>(null);

    const setWebViewRef = useCallback((ref: React.RefObject<WebView | null>) => {
        webViewRef.current = ref;
    }, []);

    const _subscribe = async () => {
        // Only check — permission is requested on HomePage via request_location
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") {
            setErrorMsg("Permission to access location was denied");
            return;
        }

        const headingSubscription = await Location.watchHeadingAsync((data) => {
            const { trueHeading, magHeading } = data;
            // Prefer trueHeading if available, otherwise magHeading
            const angle = trueHeading !== -1 ? trueHeading : magHeading;

            // Send back to webview
            if (webViewRef.current?.current) {
                webViewRef.current.current.postMessage(
                    JSON.stringify({
                        type: "COMPASS_UPDATE",
                        angle: Math.round(angle),
                    })
                );
            }
        });
        setSubscription(headingSubscription);
    };

    const _unsubscribe = () => {
        if (subscription && typeof subscription.remove === 'function') {
            subscription.remove();
        }
        setSubscription(null);
    };

    useEffect(() => {
        return () => _unsubscribe();
    }, []);

    async function getCurrentLocation() {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;
        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);
    }

    const [permission, requestPermission] = useCameraPermissions();



    const openAppScheme = async (url: string) => {
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                console.warn(`App not installed or URL invalid: ${url}`);
                openInBrowser(url);
            }
        } catch (error) {
            console.error(`Failed to open app scheme URL: ${url}`, error);
        }
    };

    const openInBrowser = async (url: string) => {
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                console.error(`Cannot open URL even in browser: ${url}`);
            }
        } catch (error) {
            console.error(`Failed to open URL in browser: ${url}`, error);
        }
    };



    const updateUserLocation = async (token: string) => {
        try {
            let { status } = await Location.getForegroundPermissionsAsync();
            if (status !== "granted") return;

            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const geocode = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });


            if (geocode.length > 0) {
                const place = geocode[0];
                const city = place.city || place.district || place.subregion;
                const locationString = [city, place.region, place.country]
                    .filter(Boolean)
                    .join(", ");
                if (locationString) {
                    await fetch("https://zodimithra.howincloud.com/api/profile/update", {
                        method: "POST",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`,
                        },
                        body: JSON.stringify({ current_location: locationString }),
                    });
                    console.log("Updated location to:", locationString);
                }
            }
        } catch (error) {
            console.error("Error updating location:", error);
        }
    };

    const sendMessageToWebview = (type: string, payload: any): void => {
        const message = JSON.stringify({ type: type, payload: payload });
        webViewRef.current?.current?.postMessage(message);
    };


    const handleMessage = useCallback(
        (event: { nativeEvent: { data: string } }) => {
            const message = JSON.parse(event.nativeEvent.data) as GeneralEvent;
            console.log("Received message:", message);

            switch (message.type) {
                case "on_login":
                    if (message.token) {
                        authTokenRef.current = message.token;
                    }
                    break;
                case "haptic":
                    handleHapticFeedback(message);
                    break;
                case "console_log":
                    if (message.level === 'error') {
                        console.warn(`[WebView:ERR] ${message.data}`);
                    } else if (message.level === 'warn') {
                        console.warn(`[WebView:WARN] ${message.data}`);
                    } else {
                        console.log(`[WebView] ${message.data}`);
                    }
                    break;
                case "network_log":
                    if (message.event === 'request') {
                        console.log(`[NET ▶] ${message.method} ${message.url}${message.body ? `\n  body: ${message.body}` : ''}`);
                    } else if (message.event === 'response') {
                        console.log(`[NET ◀] ${message.status} ${message.method} ${message.url} (${message.duration}ms)${message.body ? `\n  body: ${message.body}` : ''}`);
                    } else if (message.event === 'error') {
                        console.warn(`[NET ✗] ${message.method} ${message.url} — ${message.error}`);
                    }
                    break;
                case "alert":
                    alert(message.data);
                    break;

                case "get_device_data":
                    const { width, height } = Dimensions.get('window');
                    sendMessageToWebview('DEVICE_INFO', {
                        isNativeApp: true,
                        platform: Platform.OS,
                        platformVersion: Platform.Version,
                        statusBarHeight: Constants.statusBarHeight,
                        screenWidth: width,
                        screenHeight: height,
                        appVersion: Constants.expoConfig?.version ?? null,
                        deviceName: Constants.deviceName ?? null,
                    });
                    break;
                case "keyboard_unfocus":
                    Keyboard.dismiss();
                    console.log("Keyboard dismissed");

                    break;
                case "request_location":
                    (async () => {
                        const { status } = await Location.requestForegroundPermissionsAsync();
                        if (status !== "granted") return;
                        if (authTokenRef.current) {
                            updateUserLocation(authTokenRef.current);
                        } else {
                            getCurrentLocation();
                        }
                    })();
                    break;
                case "request_camera_permission":
                    requestPermission();
                    break;

                case "open_app_scheme":
                    openAppScheme(message.data);
                    break;
                case "speak_text":
                    if (message.data) {
                        Speech.stop();
                        Speech.speak(String(message.data), {
                            onDone: () => sendMessageToWebview('SPEECH_DONE', {}),
                            onError: () => sendMessageToWebview('SPEECH_DONE', {}),
                        });
                    }
                    break;
                case "stop_speak":
                    Speech.stop();
                    sendMessageToWebview('SPEECH_DONE', {});
                    break;
                case "start_compass":
                    _subscribe();
                    break;
                case "stop_compass":
                    _unsubscribe();
                    break;

                default:
                    console.log("Unknown message type:", message.type);
            }
        },
        []
    );


    return (
        <MessageHandlerContext.Provider value={{ handleMessage, setWebViewRef }}>
            {children}
        </MessageHandlerContext.Provider>
    );
};

export const useMessageHandler = () => {
    const context = useContext(MessageHandlerContext);
    if (!context) {
        throw new Error(
            "useMessageHandler must be used within a MessageHandlerProvider"
        );
    }
    return context;
};


