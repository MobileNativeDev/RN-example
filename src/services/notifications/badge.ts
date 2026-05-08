import notifee from '@notifee/react-native';
import { Platform } from 'react-native';
import logger from '@utils/logger';

export const clearAppIconBadge = async () => {
  try {
    if (Platform.OS === 'ios') {
      await notifee.setBadgeCount(0);
      return;
    }

    if (Platform.OS === 'android') {
      await notifee.cancelDisplayedNotifications();
    }
  } catch (error) {
    logger.warn('[notifications] failed to clear notification indicator', error);
  }
};
