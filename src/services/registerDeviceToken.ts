import { Platform, NativeModules } from 'react-native';
import { registerDevice } from '@api/devices';

const getLocale = (): string => {
  try {
    if (Platform.OS === 'ios') {
      const settings = NativeModules['SettingsManager']?.settings;
      return (settings?.AppleLocale ?? settings?.AppleLanguages?.[0] ?? 'en-US').replace('_', '-');
    } else {
      return (NativeModules['I18nManager']?.localeIdentifier ?? 'en-US').replace('_', '-');
    }
  } catch {
    return 'en-US';
  }
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const APP_VERSION: string = require('../../package.json').version ?? '1.0.0';

export const registerDeviceToken = async (): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getMessaging, requestPermission, getToken, AuthorizationStatus, registerDeviceForRemoteMessages } = require('@react-native-firebase/messaging');
    const m = getMessaging();

    // iOS requires explicit registration before getToken can work
    if (Platform.OS === 'ios') {
      await registerDeviceForRemoteMessages(m);
    }

    const authStatus = await requestPermission(m);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) return;

    const pushToken = await getToken(m);
    
    if (!pushToken) return;

    await registerDevice({
      pushToken,
      deviceType: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
      appVersion: APP_VERSION,
      locale: getLocale(),
    });
  } catch (err) {
    console.warn('registerDeviceToken failed:', err);
  }
};
