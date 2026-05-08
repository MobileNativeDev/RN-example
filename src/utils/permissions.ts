import { PermissionsAndroid, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export async function requestNotificationPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'Allow notifications',
        message: 'Example needs permission to show alarm notifications',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Failed to request notification permission', err);
    return false;
  }
}

export async function requestContactsPermission() {
  try {
    if (Platform.OS === 'ios') {
      const contactPermission = PERMISSIONS.IOS.CONTACTS;
      const currentStatus = await check(contactPermission);

      if (
        currentStatus === RESULTS.GRANTED ||
        currentStatus === RESULTS.LIMITED
      ) {
        return true;
      }

      if (currentStatus === RESULTS.BLOCKED) {
        return false;
      }

      const requestedStatus = await request(contactPermission);
      return (
        requestedStatus === RESULTS.GRANTED ||
        requestedStatus === RESULTS.LIMITED
      );
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      {
        title: 'Contacts',
        message: 'This app would like to view your contacts.',
        buttonPositive: 'Please accept the permissions',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Error requesting contacts permission:', error);
    return false;
  }
}

export const requestAudioPermission = async () => {
  if (Platform.OS === 'android') {
    const permission =
      Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const granted = await PermissionsAndroid.request(permission, {
      title: 'Audio Permission',
      message: 'App needs access to your audio files to select a sound.',
      buttonPositive: 'OK',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } else if (Platform.OS === 'ios') {
    return true;
  }
  return true;
};

export const requestStoragePermission = async () => {
  if (Platform.OS === 'android') {
    try {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'App needs access to storage to save files.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
    } catch (err) {
      console.warn(err);
    }
  }
};
