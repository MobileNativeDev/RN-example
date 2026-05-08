import { useCallback, useEffect, useRef } from 'react';
import {
  PushNotificationData,
  PushNotificationType,
} from '@appTypes/pushNotification';
import { usePopup } from '@contexts/PopupContext';
import { useQueryClient } from '@tanstack/react-query';

function getMessagingModule() {
  try {
    return require('@react-native-firebase/messaging');
  } catch {
    return null;
  }
}

function extractData(remoteMessage: any): PushNotificationData {
  return (remoteMessage?.data ?? {}) as PushNotificationData;
}

function extractDisplay(remoteMessage: any): { title: string; body: string } {
  const title =
    remoteMessage?.notification?.title ??
    remoteMessage?.data?.title ??
    'New notification';
  const body =
    remoteMessage?.notification?.body ??
    remoteMessage?.data?.body ??
    '';
  return { title, body };
}

function getNotificationKey(remoteMessage: any): string {
  const data = extractData(remoteMessage);
  return JSON.stringify({
    messageId: remoteMessage?.messageId ?? null,
    sentTime: remoteMessage?.sentTime ?? null,
    type: data?.type ?? null,
    alarmId: data?.alarmId ?? null,
    friendId: data?.friendId ?? null,
    userId: data?.userId ?? null,
    title:
      remoteMessage?.notification?.title ??
      remoteMessage?.data?.title ??
      null,
    body:
      remoteMessage?.notification?.body ??
      remoteMessage?.data?.body ??
      null,
  });
}

function routeNotification(
  data: PushNotificationData,
  navigate: (name: string, params?: any) => void,
): void {
  const { type, alarmId } = data;
  const openNotifications = (params?: Record<string, any>) => {
    navigate('MainContentNavigation', {
      screen: 'NotificationsScreen',
      params: {
        ...(params ?? {}),
        pushNonce: Date.now(),
      },
    });
  };

  switch (type) {
    case PushNotificationType.FRIEND_INVITE_CONFIRMED:
      navigate('MyTabs', {
        screen: 'Friends',
      });
      break;

    case PushNotificationType.FRIEND_REQUEST_RECEIVED:
    case PushNotificationType.FRIEND_REQUEST_CONFIRMED:
    case PushNotificationType.FRIEND_REQUEST_REJECTED:
    case PushNotificationType.FRIEND_GOT_ALARM:
      openNotifications({
        sourceAlarmId: alarmId,
        sourcePushType: type,
      });
      break;

    case PushNotificationType.FRIEND_ALARM_REQUEST:
      openNotifications(
        alarmId
          ? {
              openAlarmId: alarmId,
              openEvent: type,
            }
          : undefined,
      );
      break;

    case PushNotificationType.FRIEND_ALARM_REJECTED:
    case PushNotificationType.FRIEND_ALARM_ACCEPTED:
      openNotifications({
        sourceAlarmId: alarmId,
        sourcePushType: type,
      });
      break;

    default:
      openNotifications({
        sourceAlarmId: alarmId,
        sourcePushType: type,
      });
      break;
  }
}

export function useNotificationRouting(
  navigate: (name: string, params?: any) => void,
) {
  const messaging = getMessagingModule();
  const { showBanner } = usePopup();
  const queryClient = useQueryClient();
  const recentNavigationRef = useRef<Record<string, number>>({});
  const suppressForegroundBannerUntilRef = useRef(0);

  const markNotificationNavigated = useCallback((key: string) => {
    recentNavigationRef.current[key] = Date.now();
  }, []);

  const wasNotificationNavigatedRecently = useCallback((key: string) => {
    const lastHandledAt = recentNavigationRef.current[key] ?? 0;
    const isRecent = Date.now() - lastHandledAt < 4000;

    if (!isRecent) {
      delete recentNavigationRef.current[key];
    }

    return isRecent;
  }, []);

  const routeRemoteMessage = useCallback(
    (remoteMessage: any, navImpl?: (name: string, params?: any) => void) => {
      const key = getNotificationKey(remoteMessage);

      if (wasNotificationNavigatedRecently(key)) {
        return;
      }

      markNotificationNavigated(key);
      const data = extractData(remoteMessage);
      routeNotification(data, navImpl ?? navigate);
    },
    [markNotificationNavigated, navigate, wasNotificationNavigatedRecently],
  );

  // ── 1. Foreground message handler ─────────────────────────────────────────
  useEffect(() => {
    if (!messaging) return;

    const m = messaging.getMessaging();
    const unsubscribe = messaging.onMessage(m, async (remoteMessage: any) => {
      console.log('[FCM] foreground message:', remoteMessage?.data);

      const key = getNotificationKey(remoteMessage);
      if (
        Date.now() < suppressForegroundBannerUntilRef.current ||
        wasNotificationNavigatedRecently(key)
      ) {
        return;
      }

      // Invalidate unread count so the badge updates immediately
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      const { title, body } = extractDisplay(remoteMessage);

      showBanner({
        title,
        message: body || undefined,
        durationMs: 3000,
        onPress: () => routeRemoteMessage(remoteMessage),
      });
    });

    return () => unsubscribe();
  }, [
    messaging,
    showBanner,
    queryClient,
    routeRemoteMessage,
    wasNotificationNavigatedRecently,
  ]);

  // ── 2. Background tap handler ──────────────────────────────────────────────
  useEffect(() => {
    if (!messaging) return;

    const m = messaging.getMessaging();
    const unsubscribe = messaging.onNotificationOpenedApp(
      m,
      (remoteMessage: any) => {
        console.log('[FCM] background tap:', remoteMessage?.data);
        suppressForegroundBannerUntilRef.current = Date.now() + 4000;
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        routeRemoteMessage(remoteMessage);
      },
    );

    return () => unsubscribe();
  }, [messaging, queryClient, routeRemoteMessage]);

  // ── 3. Cold-start: call inside NavigationContainer onReady ────────────────
  const handleInitialNotification = useCallback(
    async (navigationRef: any) => {
      if (!messaging) return;
      try {
        const m = messaging.getMessaging();
        const remoteMessage = await messaging.getInitialNotification(m);
        if (!remoteMessage) return;

        console.log('[FCM] cold-start notification:', remoteMessage?.data);
        suppressForegroundBannerUntilRef.current = Date.now() + 4000;
        
        const navImpl = (name: string, params?: any) =>
          navigationRef?.navigate(name, params);
        routeRemoteMessage(remoteMessage, navImpl);
      } catch (e) {
        console.warn('[FCM] getInitialNotification error', e);
      }
    },
    [messaging, routeRemoteMessage],
  );

  return { handleInitialNotification };
}
