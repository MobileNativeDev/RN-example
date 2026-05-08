import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { MainNavigation } from '../navigation/MainNavigation';
import { useNotificationRouting } from '@hooks/useNotificationRouting';
import logger from '@utils/logger';

const TransparentTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent' },
} as const;

type AppInnerProps = {
  navigate: (...args: any[]) => void;
  navigationRef: any;
  flushPending: () => void;
  handleOnReadyAlarm: () => Promise<void>;
  handleInitialDeepLink: (ref: any) => Promise<void>;
};

export function AppInner({
  navigate,
  navigationRef,
  flushPending,
  handleOnReadyAlarm,
  handleInitialDeepLink,
}: AppInnerProps) {
  const { handleInitialNotification } = useNotificationRouting(navigate);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={TransparentTheme}
      onReady={async () => {
        try {
          await handleOnReadyAlarm();
          await handleInitialDeepLink(navigationRef);
          await handleInitialNotification(navigationRef);
        } catch (e) {
          logger.warn('navigation onReady bootstrap error', e);
        }

        try {
          flushPending();
        } catch (e) {
          logger.warn('flushPending error', e);
        }
      }}
    >
      <MainNavigation />
    </NavigationContainer>
  );
}
