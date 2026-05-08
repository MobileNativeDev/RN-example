import { NativeModules, Platform, Linking } from 'react-native';

const { ShowOnLockScreenPermission } = NativeModules as any;

export async function needsShowOnLockScreenPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!ShowOnLockScreenPermission || typeof ShowOnLockScreenPermission.needsShowOnLockScreenPermission !== 'function') {
    return false;
  }
  try {
    const res = await ShowOnLockScreenPermission.needsShowOnLockScreenPermission();
    return Boolean(res);
  } catch (e) {
    console.warn('needsShowOnLockScreenPermission failed', e);
    return false;
  }
}

export async function openShowOnLockScreenSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (ShowOnLockScreenPermission && typeof ShowOnLockScreenPermission.openShowOnLockScreenSettings === 'function') {
    try {
      const res = await ShowOnLockScreenPermission.openShowOnLockScreenSettings();
      return Boolean(res);
    } catch (e) {
      console.warn('openShowOnLockScreenSettings failed, falling back to app settings', e);
    }
  }

  try {
    await Linking.openSettings();
    return true;
  } catch (e) {
    console.warn('Linking.openSettings failed', e);
    return false;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function ensureShowOnLockScreenPermission(
  opts?: { pollIntervalMs?: number; timeoutMs?: number },
): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const pollIntervalMs = opts?.pollIntervalMs ?? 1000;
  const timeoutMs = opts?.timeoutMs ?? 5000;

  try {
    const needs = await needsShowOnLockScreenPermission();
    if (!needs) return true;

    const opened = await openShowOnLockScreenSettings();
    if (!opened) return false;

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await sleep(pollIntervalMs);
      try {
        const stillNeeds = await needsShowOnLockScreenPermission();
        if (!stillNeeds) return true;
      } catch (e) {
      }
    }
    return false;
  } catch (e) {
    console.warn('ensureShowOnLockScreenPermission failed', e);
    return false;
  }
}

export default {
  needsShowOnLockScreenPermission,
  openShowOnLockScreenSettings,
  ensureShowOnLockScreenPermission,
};
