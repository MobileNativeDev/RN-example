import { useEffect } from 'react';
import { Platform } from 'react-native';
import { ensureOverlayPermission } from '@services/overlayPermission';
import { ensureShowOnLockScreenPermission } from '@services/showOnLockScreen';
import {
  ensureFullScreenIntentPermission,
  ensureSpecialPermissions,
} from '@services/fullScreenPermission';
import { ensureNotificationPermission } from '@services/ios-services/notificationService';
import { requestNotificationPermission } from '@utils/permissions';
import { requestExactAlarmPermission } from '@utils/exactAlarmsPermission';
import {
  checkAndRequestPermissions,
  openNotSettings,
} from '@services/ios-services/iosNativeFunctions';

export function useAppPermissions() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      const run = async () => {
        await requestNotificationPermission();
        await ensureOverlayPermission({ showPrompt: true });
        await ensureShowOnLockScreenPermission();
        await requestExactAlarmPermission();
        if (Number(Platform.Version) >= 34 && Number(Platform.Version) < 36) {
          await ensureFullScreenIntentPermission();
          await ensureSpecialPermissions();
        }
      };
      run();
    } else if (Platform.OS === 'ios') {
      const run = async () => {
        await ensureNotificationPermission();
        await checkAndRequestPermissions();
        await openNotSettings();
      };
      run();
    }
  }, []);
}
