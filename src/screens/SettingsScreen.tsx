import { useNavigation } from '@react-navigation/native';
import { Text, TouchableOpacity, View, Linking, Platform } from 'react-native';
import { Alert } from '@utils/alert';
import { AuthNavigationProp } from '../appTypes/navigationTypes';
import Arrow from '../../assets/svg/Arrow.svg';
import { useDispatch } from 'react-redux';
import { signOut } from '../store/auth/operations';
import { cancelAllAlarms } from '@services/ios-services';
import { cancelAllAlarmsAndroid } from '@services/alarmScheduler';
import { deleteDeviceToken } from '@services/deleteDeviceToken';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clear as clearAlarms } from '@store/alarms/slice';
import { clearQueue } from '@store/offlineQueue/slice';
import { useQueryClient } from '@tanstack/react-query';
import { clearAlarmBootstrap } from '@services/alarmBootstrap/storage';
import { clearGoogleSession } from '@services/auth/googleSession';

const NAVIGATION_OPTIONS = [
  { name: 'Change my username', screen: 'ChangeMyUsername' },
  { name: 'Notification settings', screen: 'NotificationSettings' },
  { name: 'Legal note', screen: 'LegalNote' },
  { name: 'Privacy policy', screen: 'PrivacyPolicy' },
  { name: 'Terms & Conditions', screen: 'TermsAndConditions' },
  { name: 'Talk to us', screen: 'TalkToUs' },
  { name: 'Help', screen: 'Help' },
  { name: 'Log out', screen: 'Logout' },
] as const;

export const SettingsScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const handleTalkToUs = async () => {
    const to = 'support@example.com';
    const subject = 'Support request';
    const body = 'Hello, I need help with...\n\n'; // можеш зробити динамічний

    const url = `mailto:${to}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('Failed to open mail', error);
      Alert.alert(
        'Unable to open mail',
        'No mail app found or unable to open composer. You can send email manually to support@example.com',
      );
    }
  };

  const handleLogOut = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              try {
                await clearGoogleSession();
              } catch (googleErr) {
                Alert.alert('Error', 'Failed to log out from Google account.');
                console.warn('Google sign out failed', googleErr);
              }
              if (Platform.OS === 'ios') {
                await cancelAllAlarms();
              } else {
                await cancelAllAlarmsAndroid();
              }
              await deleteDeviceToken();

              // Clear Redux state
              dispatch(clearAlarms());
              dispatch(clearQueue());

              // Clear React Query cache
              queryClient.clear();
              clearAlarmBootstrap();

              // Clear AsyncStorage cache
              try {
                const keys = await AsyncStorage.getAllKeys();
                const toRemove = keys.filter(
                  k => k === 'OFFLINE_MUTATIONS_V1' || k === 'RQ_CACHE_v1',
                );
                if (toRemove.length > 0) {
                  await AsyncStorage.multiRemove(toRemove);
                }
              } catch (e) {
                console.warn('Failed to clear cache on logout', e);
              }

              await dispatch(signOut() as any);
            } catch (e) {
              console.warn('Logout error', e);
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 px-4">
      {NAVIGATION_OPTIONS.map(item => (
        <TouchableOpacity
          key={item.screen}
          onPress={() => {
            if (item.name === 'Log out') {
              handleLogOut();
            } else if (item.name === 'Talk to us') {
              handleTalkToUs();
            } else
              navigation.navigate('MainContentNavigation', {
                screen: item.screen,
              });
          }}
          className="flex-row justify-between items-center border-b border-white py-4"
        >
          <Text
            className="text-white text-base font-regular"
            style={{ color: item.name === 'Log out' ? '#ff5f57' : 'white' }}
          >
            {item.name}
          </Text>
          {item.name !== 'Log out' && <Arrow />}
        </TouchableOpacity>
      ))}
    </View>
  );
};
