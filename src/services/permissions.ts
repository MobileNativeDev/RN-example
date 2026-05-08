import notifee from '@notifee/react-native';
import { Alert } from '@utils/alert';

export const requestBatteryOptimizationPermission = async () => {
     const isBattOpt = await (notifee as any).isBatteryOptimizationEnabled?.();
    if (isBattOpt) {
      console.warn('Battery optimization is enabled. Opening settings...');
      Alert.alert('Battery Optimization Enabled', 'Please disable battery optimization for this app to ensure alarms work properly. Search for "example" in the settings.', [
        { text: 'OK', onPress: async () => { await notifee.openBatteryOptimizationSettings?.(); } }
      ]);
    }
 }