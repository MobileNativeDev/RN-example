import React, { useState, useMemo } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  View,
  I18nManager,
} from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import storePkg from './src/store/store';
import { setAuthHeader } from './src/api/clientBridge';
import { fetchMeAndSave } from './src/store/auth/operations';
import { enableScreens } from 'react-native-screens';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useGoogleSignin } from '@hooks/useGoogleSignin';
import { NetworkProvider } from '@providers/NetworkContext';
import { PopupProvider } from '@contexts/PopupContext';
import { useAlarmLaunch } from '@hooks/useAlarmLaunch';
import { useAppPermissions } from '@hooks/useAppPermissions';
import { useDeepLinkHandler } from '@hooks/useDeepLinkHandler';
import { AlarmBootstrapSync } from '@components/AlarmBootstrapSync';
import { AppInner } from '@components/AppInner';

enableScreens();

try {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
} catch (e) {}

const AppBackground = React.memo(() => (
  <LinearGradient
    colors={['#3C1053', '#550844']}
    style={StyleSheet.absoluteFill}
  />
));

function App(props: any) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  const { navigationRef, navigate, flushPending } = useMemo(() => {
    try {
      return require('./src/navigation/RootNavigation');
    } catch {
      return {
        navigate: () => {},
        navigationRef: null,
        flushPending: () => {},
      };
    }
  }, []);

  const { handleOnReadyAlarm } = useAlarmLaunch(
    navigate,
    navigationRef,
    props?.alarmId ?? null,
  );
  const { handleInitialDeepLink } = useDeepLinkHandler(navigate);
  useAppPermissions();
  useGoogleSignin();

  return (
    <PopupProvider>
      <NetworkProvider>
        <Provider store={storePkg.store}>
          <PersistGate
            loading={null}
            persistor={storePkg.persistor}
            onBeforeLift={() => {
              const token = storePkg.store.getState().auth.accessToken;
              setAuthHeader(token ?? null);
              if (token)
                setTimeout(
                  () => storePkg.store.dispatch(fetchMeAndSave() as any),
                  100,
                );
            }}
          >
            <View style={styles.root}>
              <AppBackground />
              <SafeAreaView
                edges={Platform.OS === 'android' ? ['top', 'bottom'] : ['top']}
                className="flex-1"
              >
                <StatusBar
                  barStyle="light-content"
                  translucent
                  backgroundColor="transparent"
                />
                <QueryClientProvider client={qc}>
                  <AlarmBootstrapSync />
                  <AppInner
                    navigate={navigate}
                    navigationRef={navigationRef}
                    flushPending={flushPending}
                    handleOnReadyAlarm={handleOnReadyAlarm}
                    handleInitialDeepLink={handleInitialDeepLink}
                  />
                </QueryClientProvider>
              </SafeAreaView>
            </View>
          </PersistGate>
        </Provider>
      </NetworkProvider>
    </PopupProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#3C1053' },
});

export default App;
