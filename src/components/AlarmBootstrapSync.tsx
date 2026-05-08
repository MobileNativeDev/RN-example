import { useCallback, useEffect, useRef } from 'react';

import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { selectUserId } from '@store/auth/selectors';
import { buildAlarmBootstrapSnapshot } from '@services/alarmBootstrap/alarmViewModel';
import {
  clearAlarmBootstrap,
  writeAlarmBootstrap,
} from '@services/alarmBootstrap/storage';
import {
  AlarmBootstrapQuerySource,
  AlarmBootstrapQueryStatus,
} from '@services/alarmBootstrap/types';

const getQuerySource = <T,>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
): AlarmBootstrapQuerySource<T> => {
  const state = queryClient.getQueryState<T>(queryKey);

  return {
    data: queryClient.getQueryData<T>(queryKey),
    status: (state?.status || 'pending') as AlarmBootstrapQueryStatus,
  };
};

export const AlarmBootstrapSync = () => {
  const queryClient = useQueryClient();
  const userId = useSelector(selectUserId);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  const flushSnapshot = useCallback(() => {
    if (!userId) return;

    const snapshot = buildAlarmBootstrapSnapshot(
      {
        next: getQuerySource(queryClient, ['alarms', 'next']),
        upcoming: getQuerySource(queryClient, ['alarms', 'upcoming']),
        past: getQuerySource(queryClient, ['alarms', 'past']),
        sent: getQuerySource(queryClient, ['alarms', 'sent']),
      },
      userId,
    );

    if (snapshot === undefined) {
      return;
    }

    if (snapshot === null) {
      clearAlarmBootstrap(userId);
      return;
    }

    writeAlarmBootstrap(snapshot);
  }, [queryClient, userId]);

  const scheduleFlush = useCallback(() => {
    if (!userId) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      flushSnapshot();
    }, 250);
  }, [flushSnapshot, userId]);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;

    if (previousUserId && previousUserId !== userId) {
      clearAlarmBootstrap(previousUserId);
    }

    previousUserIdRef.current = userId;

    if (!userId) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    flushSnapshot();
  }, [flushSnapshot, userId]);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(event => {
      const queryKey = event?.query?.queryKey;

      if (!Array.isArray(queryKey) || queryKey[0] !== 'alarms') {
        return;
      }

      scheduleFlush();
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, scheduleFlush]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    [],
  );

  return null;
};
