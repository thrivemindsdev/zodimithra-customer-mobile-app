// Prevents white flash on splash-to-app transition by setting windowBackground
// on AppTheme to match the splash color instead of using windowIsTranslucent
// (which breaks Android 12+ splash screen in release builds).
const { withAndroidStyles } = require('@expo/config-plugins');

const SPLASH_BG_REF = '@color/splashscreen_background';

const withSplashTransitionFix = (config) => {
    return withAndroidStyles(config, async (config) => {
        config.modResults = await applyFix(config.modResults);
        return config;
    });
};

async function applyFix(styles) {
    const splashScreen = styles.resources.style.find(
        (style) => style.$.name === 'Theme.App.SplashScreen',
    );

    if (splashScreen) {
        // Remove windowIsTranslucent — it prevents the system splash from
        // rendering on Android 12+ (splash screen API skips translucent windows).
        splashScreen.item = splashScreen.item.filter(
            (item) => item.$.name !== 'android:windowIsTranslucent',
        );
    }

    const appTheme = styles.resources.style.find(
        (style) => style.$.name === 'AppTheme',
    );

    if (appTheme) {
        // Ensure windowBackground matches splash color so the transition is seamless.
        const existingBg = appTheme.item.find(
            (item) => item.$.name === 'android:windowBackground',
        );
        if (!existingBg) {
            const { AndroidConfig } = require('@expo/config-plugins');
            appTheme.item.push(
                AndroidConfig.Resources.buildResourceItem({
                    name: 'android:windowBackground',
                    value: SPLASH_BG_REF,
                }),
            );
        }
    }

    return styles;
}

module.exports = withSplashTransitionFix;
