import { NativeModules } from 'react-native';


export async function requestExactAlarmPermission() {
  try {
    const module = NativeModules['ExactAlarm'];
    if (!module) {
      console.warn('ExactAlarm native module not available');
      return false;
    }

    const granted = await module.isExactAlarmPermissionGranted();
    if (granted) return true;

    await module.requestExactAlarmPermission();
    const nowGranted = await module.isExactAlarmPermissionGranted();
    return !!nowGranted;
  } catch (err) {
    console.warn('Failed to request ExactAlarm permission', err);
    return false;
  }
}