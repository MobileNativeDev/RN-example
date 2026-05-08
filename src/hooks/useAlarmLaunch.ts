import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';

export function useAlarmLaunch(
  navigate: (name: string, params?: any) => void,
  navigationRef: any,
  initialAlarmIdProp: string | null,
) {
  const [initialAlarmId, setInitialAlarmId] = useState(initialAlarmIdProp);

  // Keep a ref so that handleOnReadyAlarm (passed as onReady) always sees the
  // latest value without needing to be recreated on every render.
  const initialAlarmIdRef = useRef(initialAlarmId);
  useEffect(() => {
    initialAlarmIdRef.current = initialAlarmId;
  }, [initialAlarmId]);

  // AppState / native-event listener that detects alarm launches at runtime.
  useEffect(() => {
    let currentState = AppState.currentState;

    if (Platform.OS === 'android') {
      const sub = AppState.addEventListener('change', async nextState => {
        if (
          currentState.match(/inactive|background/) &&
          nextState === 'active'
        ) {
          const alarmId = await NativeModules?.[
            'AlarmLaunch'
          ]?.getLaunchAlarmId?.();

          const pendingId = alarmId || initialAlarmIdRef.current;

          if (pendingId) {
            await NativeModules?.['AlarmLaunch']?.clearPendingAlarmId?.();
            setInitialAlarmId(null);
            navigationRef?.navigate('AlarmActivityScreen', { id: pendingId });
          }
        }
        currentState = nextState;
      });
      return () => sub.remove();
    } else if (Platform.OS === 'ios') {
      const { EventEmitter: NativeEventEmitterModule } = NativeModules;
      const nativeEmitter = new NativeEventEmitter(NativeEventEmitterModule);
      const { PreferencesModule } = NativeModules as any;
      const Preferences = PreferencesModule as {
        getLastAlarmId(): Promise<string | null>;
        removeLastAlarmId(): Promise<boolean>;
      };

      let isMounted = true;

      const init = async () => {
        try {
          const last = await Preferences.getLastAlarmId();
          console.log('iOS last alarm ID', last);
          if (last) {
            await Preferences.removeLastAlarmId();
            if (isMounted) navigate('AlarmActivityScreen', { id: last });
          }
        } catch (e) {
          console.warn('Preferences getLastAlarmId error', e);
        }
      };

      init();

      const sub = nativeEmitter.addListener(
        'ALARM_LAUNCH_EVENT',
        ({ alarmId }: { alarmId?: string }) => {
          try {
            console.log('ALARM_LAUNCH_EVENT alarmId', alarmId);
            if (alarmId) {
              Preferences.removeLastAlarmId().catch(() => {});
              if (isMounted) navigate('AlarmActivityScreen', { id: alarmId });
            }
          } catch (e) {
            console.warn('ALARM_LAUNCH_EVENT handler error', e);
          }
        },
      );

      return () => {
        isMounted = false;
        try {
          sub.remove();
        } catch {}
      };
    }
    // navigationRef is a stable ref object; navigate is memoised in RootNavigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationRef, navigate]);

  /**
   * Call this inside NavigationContainer's onReady to handle cold-start alarm IDs.
   */
  const handleOnReadyAlarm = useCallback(async () => {
    // 1. Prop-based alarm ID (passed from native before RN started)
    const propAlarmId = initialAlarmIdRef.current;
    if (propAlarmId) {
      setInitialAlarmId(null);
      await NativeModules?.['AlarmLaunch']?.clearPendingAlarmId?.();
      navigationRef?.navigate('AlarmActivityScreen', { id: propAlarmId });
    }

    // 2. Native module alarm ID (set after RN started but before navigation was ready)
    try {
      const launchId = await NativeModules?.[
        'AlarmLaunch'
      ]?.getLaunchAlarmId?.();
      if (launchId) {
        await NativeModules['AlarmLaunch']?.clearPendingAlarmId?.();
        navigationRef?.navigate('AlarmActivityScreen', { id: launchId });
      }
    } catch (e) {
      console.warn('AlarmLaunch getLaunchAlarmId error', e);
    }
  }, [navigationRef]);

  return { handleOnReadyAlarm };
}
