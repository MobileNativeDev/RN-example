import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getNotificationSettings, updateNotificationSettings } from '../api/notifications';

export const NOTIFICATION_SETTING_KEYS = [
  'notifyFriendRequestReceived',
  'notifyFriendRequestConfirmed',
  'notifyFriendRequestRejected',
  'notifyFriendGotAlarm',
  'notifyFriendJoined',
  'notifyFriendSuggestedChange',
  'notifyBeforeAlarmInfo',
  'notifyFriendDismissed',
  'notifyFriendSnoozed',
];

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<any>(null);

  const query = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: getNotificationSettings,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: () => query.refetch(),
  });

  useEffect(() => {
    if (query.data && !settings) setSettings(query.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const setAll = useCallback((value: boolean) => {
    const newSettings = { ...(settings ?? {}) };
    NOTIFICATION_SETTING_KEYS.forEach(k => {
      newSettings[k] = value;
    });
    setSettings(newSettings);
    mutation.mutate(newSettings);
  }, [settings, mutation]);

  const toggleKey = useCallback((key: string, value: boolean) => {
    const newSettings = { ...(settings ?? {}) };
    newSettings[key] = value;
    setSettings(newSettings);
    mutation.mutate(newSettings);
  }, [settings, mutation]);

  return {
    settings,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isMutating: (mutation as any).isLoading,
    setAll,
    toggleKey,
    refetch: query.refetch,
  } as const;
};

export default useNotificationSettings;
