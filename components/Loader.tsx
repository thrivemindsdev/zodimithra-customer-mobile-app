import React, { useEffect, useRef } from 'react';
import {
    Text,
    Animated,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

const BG_COLOR = '#6c1d13';
const GOLD = '#c9972e';

interface LoaderProps {
    onFinish?: () => void;
}

export default function Loader({ onFinish }: LoaderProps) {
    // --- animated values ---
    const gifOpacity = useRef(new Animated.Value(0)).current;
    const gifScale = useRef(new Animated.Value(0.5)).current;

    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(16)).current;

    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const subtitleTranslateY = useRef(new Animated.Value(16)).current;

    const buttonOpacity = useRef(new Animated.Value(0)).current;
    const buttonTranslateY = useRef(new Animated.Value(16)).current;

    const bottomOpacity = useRef(new Animated.Value(0)).current;

    // fade-out wrapper for dismissal
    const screenOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([
            // 1. GIF scales in
            Animated.parallel([
                Animated.timing(gifOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.spring(gifScale, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
            ]),
            // 2. Title
            Animated.delay(350),
            Animated.parallel([
                Animated.timing(titleOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
                Animated.timing(titleTranslateY, { toValue: 0, duration: 550, useNativeDriver: true }),
            ]),
            // 3. Subtitle
            Animated.delay(300),
            Animated.parallel([
                Animated.timing(subtitleOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
                Animated.timing(subtitleTranslateY, { toValue: 0, duration: 550, useNativeDriver: true }),
            ]),
            // 4. Button
            Animated.delay(300),
            Animated.parallel([
                Animated.timing(buttonOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
                Animated.timing(buttonTranslateY, { toValue: 0, duration: 550, useNativeDriver: true }),
            ]),
            // 5. Bottom tagline
            Animated.delay(300),
            Animated.timing(bottomOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleBegin = () => {
        Animated.timing(screenOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
        }).start(() => onFinish?.());
    };

    return (
        <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
            {/* GIF logo */}
            <Animated.View style={{ opacity: gifOpacity, transform: [{ scale: gifScale }] }}>
                <Image
                    source={require('../assets/images/logoloader.png')}
                    style={styles.gif}
                    contentFit="contain"
                />
            </Animated.View>

            {/* ZODI MITHRA title */}
            <Animated.Text
                style={[
                    styles.title,
                    { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] },
                ]}
            >
                ZODI MITHRA
            </Animated.Text>

            {/* Subtitle */}
            <Animated.Text
                style={[
                    styles.subtitle,
                    { opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslateY }] },
                ]}
            >
                Your cosmic companion for balance, harmony,{'\n'}
                and inner light through the wisdom of the stars
            </Animated.Text>

            {/* CTA button */}
            <Animated.View
                style={[
                    styles.buttonWrapper,
                    { opacity: buttonOpacity, transform: [{ translateY: buttonTranslateY }] },
                ]}
            >
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleBegin}
                    activeOpacity={0.85}
                >
                    <Text style={styles.buttonText}>Begin Your Journey</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Bottom tagline */}
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
    buttonWrapper: {
        marginTop: 32,
        width: width * 0.62,
    },
    button: {
        backgroundColor: GOLD,
        borderRadius: 30,
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonText: {
        color: BG_COLOR,
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.5,
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
