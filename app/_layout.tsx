import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { MessageHandlerProvider } from '@/context/message-handler';
import { HotUpdater } from '@hot-updater/react-native';
import { UpdateSplashScreen } from '@/components/UpdateSplashScreen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const router = usePathname();

  useEffect(() => {
    console.log('Current route:', router);
  }, [router]);

  // Splash is controlled by index.tsx (hides after WebView loads)


  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <MessageHandlerProvider>
        <Stack>
          <Stack.Screen name="index" options={{
            headerShown: false,
          }} />
        </Stack>
      </MessageHandlerProvider>
    </ThemeProvider>
  );
}

export default HotUpdater.wrap({
  baseURL: 'https://ota.howincloud.com/api',
  updateStrategy: 'appVersion',
  updateMode: 'auto',
  reloadOnForceUpdate: true,
  fallbackComponent: UpdateSplashScreen,
  onProgress: (progress) => {
    console.log(`[HOT_UPDATER] Download progress: ${Math.round(progress * 100)}%`);
  },
  onUpdateProcessCompleted: (response) => {
    console.log('[HOT_UPDATER] Update process completed:', response.status);
  },
  onError: (error) => {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.log('[HOT_UPDATER] Error:', message);
  },
})(RootLayout);
