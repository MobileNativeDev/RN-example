export const handleNotifeeBackgroundEvent = async ({ detail }: any) => {
  try {
    const { NativeModules } = require('react-native');
    const alarmId = (detail?.notification?.data || {})['alarmId'];
    const soundPath = detail?.notification?.data?.['sound'];

    if (!alarmId) {
      return;
    }

    try {
      if (
        typeof soundPath === 'string' &&
        (soundPath.startsWith('file://') || soundPath.startsWith('content://'))
      ) {
        if (
          NativeModules &&
          NativeModules.AlarmSound &&
          typeof NativeModules.AlarmSound.startSound === 'function'
        ) {
          try {
            await NativeModules.AlarmLaunch?.openActivity?.(alarmId);
            await NativeModules.AlarmSound.startSound(soundPath);
          } catch (nativeErr) {
            console.warn('AlarmSound.startSound threw:', nativeErr);
            throw nativeErr;
          }
        } else {
          console.warn('AlarmSound native module not available');
          throw new Error('AlarmSound native module not available');
        }
      } else {
        console.log('Invalid stored sound');
        throw new Error('Invalid stored sound');
      }
    } catch (e) {
      console.warn('Fallback sound used:', e);
    }
  } catch (e) {
    console.warn('Notifee background handler error', e);
  }
};
