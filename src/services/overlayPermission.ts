import { NativeModules, Platform } from 'react-native';
import { Alert } from '@utils/alert';

const OverlayPermissionNative = (NativeModules as any)?.OverlayPermission;

type EnsureOptions = {
  showPrompt?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
};

async function needsOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!OverlayPermissionNative || typeof OverlayPermissionNative.needsOverlayPermission !== 'function') {
    console.warn('OverlayPermission native module is not available');
    return false;
  }

  try {
    const needed = await OverlayPermissionNative.needsOverlayPermission();
    return !!needed;
  } catch (e) {
    console.warn('needsOverlayPermission failed', e);
    return false;
  }
}

async function openOverlaySettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!OverlayPermissionNative || typeof OverlayPermissionNative.openOverlaySettings !== 'function') {
    console.warn('OverlayPermission native module is not available');
    return false;
  }

  try {
    await OverlayPermissionNative.openOverlaySettings();
    return true;
  } catch (e) {
    console.warn('openOverlaySettings failed', e);
    return false;
  }
}


export async function ensureOverlayPermission(options?: EnsureOptions): Promise<boolean> {
  const { showPrompt = true, timeoutMs = 15000, pollIntervalMs = 500 } = options || {};

  if (Platform.OS !== 'android') return true;

  const needed = await needsOverlayPermission();
  if (!needed) return true;

  let shouldOpen = true;
  if (showPrompt) {
    shouldOpen = await new Promise<boolean>(resolve => {
      Alert.alert(
        'Allow appear on top',
        'To show alarms and overlays the app needs permission to appear on top of other apps. Open settings to enable it?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Open settings', onPress: () => resolve(true) },
        ],
        { cancelable: true },
      );
    });
  }

  if (!shouldOpen) return false;

  const opened = await openOverlaySettings();
  if (!opened) return false;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

      const stillNeeded = await needsOverlayPermission();
    if (!stillNeeded) return true;
  }

  return false;
}

export default {
  needsOverlayPermission,
  openOverlaySettings,
  ensureOverlayPermission,
};
