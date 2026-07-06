// General event type
export type GeneralEvent<T = any> = {
    type: string;
    data: T;
    token?: string;
    [key: string]: any;
};



type HapticEvent = GeneralEvent<{
    hapticType: 'selection' | 'notification' | 'impact';
    style?: string;
}>;



type NotificationStyle = 'success' | 'error' | 'warning';
type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

