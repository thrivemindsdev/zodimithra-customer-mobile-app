import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  progress: number;
  status: string;
  message: string | null;
};

export function UpdateSplashScreen({ progress, status }: Props) {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6c1d13" translucent />
      <ImageBackground
        style={styles.background}
        source={require('../assets/images/splash.png')}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#000" style={styles.spinner} />
          {status === 'UPDATING' && (
            <Text style={styles.text}>Updating app...</Text>
          )}
          {progress > 0 && (
            <Text style={styles.progress}>{Math.round(progress * 100)}%</Text>
          )}
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: '#6c1d13',
  },
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 80,
  },
  spinner: {
    marginBottom: 16,
  },
  text: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  progress: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
});
