import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  openAppSettings,
  checkNotificationPermissionStatus,
  requestNotificationPermission,
  NotificationPermissionStatus,
  openNotificationSettings,
} from './iosNativeWrappers';
import { Alert } from '@utils/alert';

export async function checkAndRequestPermissions() {
  try {
    const currentStatus = await checkNotificationPermissionStatus();
    console.log('Current permission status:', currentStatus);
    
    if (currentStatus === NotificationPermissionStatus.NOT_DETERMINED) {
      const newStatus = await requestNotificationPermission();
      console.log('New permission status:', newStatus);
      
      if (newStatus === NotificationPermissionStatus.AUTHORIZED) {
        console.log('Permission granted!');
        return true;
      } else if (newStatus === NotificationPermissionStatus.DENIED) {
        console.log('Permission denied. Opening settings...');
        openAppSettings();
        return false;
      }
    } else if (currentStatus === NotificationPermissionStatus.DENIED) {
      console.log('Permission previously denied. Opening settings...');
      openAppSettings();
      return false;
    }
    
    return currentStatus === NotificationPermissionStatus.AUTHORIZED;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

const IOS_BANNER_HINT_KEY = 'ios_banner_style_hint_shown';

export const openNotSettings = async (): Promise<void> => {
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    const hasSeen = await AsyncStorage.getItem(IOS_BANNER_HINT_KEY);
    if (hasSeen === 'true') {
      return;
    }

    await new Promise<void>(resolve => {
      Alert.alert(
        'Notification banners',
        'In iOS notification settings you can change Banner Style from Temporary (default) to Persistent so alarm banners stay on screen until dismissed.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(),
          },
          {
            text: 'Open settings',
            onPress: () => {
              openNotificationSettings();
              resolve();
            },
          },
        ],
        { cancelable: true },
      );
    });

    await AsyncStorage.setItem(IOS_BANNER_HINT_KEY, 'true');
  } catch (error) {
    console.error('Failed to handle iOS notification banner hint:', error);
  }
};
