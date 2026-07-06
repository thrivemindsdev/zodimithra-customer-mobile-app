import Constants from 'expo-constants';

export const getVersion = (): string | undefined => {
    return Constants.expoConfig?.version;
};
