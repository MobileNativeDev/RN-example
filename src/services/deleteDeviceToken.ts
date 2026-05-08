import { Platform } from 'react-native';
import { deleteToken, getMessaging, isDeviceRegisteredForRemoteMessages, unregisterDeviceForRemoteMessages } from '@react-native-firebase/messaging';

export const deleteDeviceToken = async (): Promise<void> => {
  try {
    const messaging = getMessaging();

    await deleteToken(messaging);

    if (
      Platform.OS === 'ios' &&
      typeof isDeviceRegisteredForRemoteMessages === 'function' &&
      isDeviceRegisteredForRemoteMessages(messaging)
    ) {
      await unregisterDeviceForRemoteMessages(messaging);
    }
  } catch (err) {
    console.warn('deleteDeviceToken failed:', err);
  }
};
