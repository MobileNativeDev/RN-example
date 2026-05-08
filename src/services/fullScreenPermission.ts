import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform, Linking } from 'react-native';
import { Alert } from '@utils/alert';

const FullScreenIntentNative = (NativeModules as any)?.FullScreenIntentPermission;

type EnsureOptions = {
  showPrompt?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
};

export async function canUseFullScreenIntent(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (!FullScreenIntentNative || typeof FullScreenIntentNative.canUseFullScreenIntent !== 'function') {
    console.warn('FullScreenIntent native module is not available');
    return true;
  }

  try {
    const res = await FullScreenIntentNative.canUseFullScreenIntent();
    return !!res;
  } catch (e) {
    console.warn('canUseFullScreenIntent failed', e);
    return true;
  }
}

export async function openFullScreenIntentSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!FullScreenIntentNative || typeof FullScreenIntentNative.openFullScreenIntentSettings !== 'function') {
    console.warn('FullScreenIntent native module is not available');
    return false;
  }

  try {
    await FullScreenIntentNative.openFullScreenIntentSettings();
    return true;
  } catch (e) {
    console.warn('openFullScreenIntentSettings failed', e);
    return false;
  }
}

export async function ensureFullScreenIntentPermission(options?: EnsureOptions): Promise<boolean> {
  const { showPrompt = true, timeoutMs = 8000, pollIntervalMs = 500 } = options || {};

  if (Platform.OS !== 'android') return true;

  const allowed = await canUseFullScreenIntent();
  if (allowed) return true;

  let shouldOpen = true;
  if (showPrompt) {
    shouldOpen = await new Promise<boolean>(resolve => {
      Alert.alert(
        'Allow full-screen intent',
        'To wake the screen fully for alarms the app needs permission to use full-screen intents. Open settings to enable it?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Open settings', onPress: () => resolve(true) },
        ],
        { cancelable: true },
      );
    });
  }

  if (!shouldOpen) return false;

  const opened = await openFullScreenIntentSettings();
  if (!opened) return false;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    try {
      const stillAllowed = await canUseFullScreenIntent();
      if (stillAllowed) return true;
    } catch (e) {
    }
  }

  return false;
}

export async function ensureSpecialPermissions() {
  if (Platform.OS !== 'android' || Platform.Version < 34) return true;

  const hasSeen = await AsyncStorage.getItem('seen_android14_special_perms');
  if (hasSeen === 'true') return true;

  const shouldOpen = await new Promise<boolean>(resolve => {
    Alert.alert(
      'Important permissions for Android 14+',
      'To make alarm/timer/pop-up work on the lock screen and from background, you must manually enable:\n\n' +
      '• Show on lock screen\n' +
      '• Display pop-up while in background\n\n' +
      'After pressing "Settings", find these items in "Special access", "Other permissions", or your manufacturer security settings.',
      [
        { text: 'Later', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Settings', onPress: () => resolve(true) },
      ]
    );
  });

  if (shouldOpen) {
    await Linking.openSettings();
    await AsyncStorage.setItem('seen_android14_special_perms', 'true');
  }

  return shouldOpen;
}

export default {
  canUseFullScreenIntent,
  openFullScreenIntentSettings,
  ensureFullScreenIntentPermission,
  ensureSpecialPermissions
};
