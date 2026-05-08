import { handleFcmBackgroundMessage } from '@services/notifications/fcmBackgroundHandler';
import { handleNotifeeBackgroundEvent } from '@services/notifications/notifeeBackgroundHandler';

export const registerBackgroundHandlers = () => {
  try {
    const notifee = require('@notifee/react-native').default;

    notifee.onBackgroundEvent(handleNotifeeBackgroundEvent);
  } catch {}

  try {
    const {
      getMessaging,
      setBackgroundMessageHandler,
    } = require('@react-native-firebase/messaging');

    setBackgroundMessageHandler(getMessaging(), handleFcmBackgroundMessage);
  } catch (e) {
    console.warn('FCM background handler setup error', e);
  }
};
