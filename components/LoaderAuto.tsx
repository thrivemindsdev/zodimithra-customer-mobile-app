import React, { useEffect, useRef } from 'react';
import {
    Animated,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

const BG_COLOR = '#6c1d13';
const GOLD = '#c9972e';

interface LoaderAutoProps {
    onFinish?: () => void;
}

export default function LoaderAuto({ onFinish }: LoaderAutoProps) {
    const gifOpacity = useRef(new Animated.Value(0)).current;
    const gifScale = useRef(new Animated.Value(0.5)).current;

    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(16)).current;

    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const subtitleTranslateY = useRef(new Animated.Value(16)).current;

    const bottomOpacity = useRef(new Animated.Value(0)).current;

    const screenOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(gifOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.spring(gifScale, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
            ]),
            Animated.delay(350),
            Animated.parallel([
                Animated.timing(titleOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
                Animated.timing(titleTranslateY, { toValue: 0, duration: 550, useNativeDriver: true }),
            ]),
            Animated.delay(300),
            Animated.parallel([
                Animated.timing(subtitleOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
                Animated.timing(subtitleTranslateY, { toValue: 0, duration: 550, useNativeDriver: true }),
            ]),
            Animated.delay(300),
            Animated.timing(bottomOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
            // Pause so user can read all text, then fade out
            Animated.delay(700),
        ]).start(() => {
            Animated.timing(screenOpacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }).start(() => onFinish?.());
        });
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
            <Animated.View style={{ opacity: gifOpacity, transform: [{ scale: gifScale }] }}>
                <Image
                    source={require('../assets/images/logoloader.png')}
                    style={styles.gif}
                    contentFit="contain"
                />
            </Animated.View>

            <Animated.Text
                style={[
                    styles.title,
                    { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] },
                ]}
            >
                ZODI MITHRA
            </Animated.Text>

            <Animated.Text
                style={[
                    styles.subtitle,
                    { opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslateY }] },
                ]}
            >
                Your cosmic companion for balance, harmony,{'\n'}
                and inner light through the wisdom of the stars
            </Animated.Text>

            <Animated.Text style={[styles.bottomText, { opacity: bottomOpacity }]}>
                Astrology, Numerology, and the path to self-discovery
            </Animated.Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: BG_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    gif: {
        width: 120,
        height: 120,
    },
    title: {
        marginTop: 20,
        color: GOLD,
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 4,
        textAlign: 'center',
    },
    subtitle: {
        marginTop: 14,
        color: GOLD,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
        opacity: 0.9,
    },
    bottomText: {
        marginTop: 24,
        color: GOLD,
        fontSize: 11,
        textAlign: 'center',
        letterSpacing: 0.5,
        opacity: 0.7,
    },
});
