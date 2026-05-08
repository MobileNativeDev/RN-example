import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getNextAlarm,
  getUpcomingAlarms,
  getPastAlarms,
  getSentAlarms,
  createSelfAlarm,
  deleteAlarm,
  updateSelfAlarm,
} from '../api/alarms';
import type { components } from '../api/types.generated';

export const useNextAlarm = (options?: any) => {
  const query = useQuery<components['schemas']['SelfAlarmResponseDto'] | components['schemas']['FriendAlarmResponseDto'] | null>({
    queryKey: ['alarms', 'next'],
    queryFn: getNextAlarm,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    ...options,
  });

  useEffect(() => {
    if (query.isSuccess && query.data !== undefined && options?.onSuccess) {
      options.onSuccess(query.data);
    }
  }, [query.isSuccess, query.data]);

  return query;
};

export const useUpcomingAlarms = (options?: any) => {
  const query = useQuery<components['schemas']['FriendAlarmResponseDto'][]>({
    queryKey: ['alarms', 'upcoming'],
    queryFn: getUpcomingAlarms,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
    ...options,
  });

  useEffect(() => {
    if (query.isSuccess && query.data !== undefined && options?.onSuccess) {
      options.onSuccess(query.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isSuccess, query.data]);

  return query;
};

export const usePastAlarms = (options?: any) => {
  const query = useQuery<components['schemas']['FriendAlarmResponseDto'][]>({
    queryKey: ['alarms', 'past'],
    queryFn: getPastAlarms,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
    ...options,
  });

  useEffect(() => {
    if (query.isSuccess && query.data !== undefined && options?.onSuccess) {
      options.onSuccess(query.data);
    }
  }, [query.isSuccess, query.data]);

  return query;
};

export const useSentAlarms = (options?: any) => {
  const query = useQuery<components['schemas']['FriendAlarmResponseDto'][]>({
    queryKey: ['alarms', 'sent'],
    queryFn: getSentAlarms,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
    ...options,
  });

  useEffect(() => {
    if (query.isSuccess && query.data !== undefined && options?.onSuccess) {
      options.onSuccess(query.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isSuccess, query.data]);

  return query;
};

export const useCreateSelfAlarm = (options?: any) => {
  const qc = useQueryClient();
  
  return useMutation<components['schemas']['SelfAlarmResponseDto'], unknown, components['schemas']['CreateSelfAlarmDto']>({
    mutationFn: createSelfAlarm,
    onSuccess: (data) => {
      // Optionally transform data; rely on invalidation only
      qc.invalidateQueries({ queryKey: ['alarms'] });
      options?.onSuccess?.(data);
    },
    ...options,
  });
};

export const useUpdateSelfAlarm = (options?: any) => {
  const qc = useQueryClient();
  
  return useMutation<components['schemas']['SelfAlarmResponseDto'], unknown, { id: string; payload: components['schemas']['UpdateAlarmDto'] }>({
    mutationFn: ({ id, payload }) => updateSelfAlarm(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: ['alarms'] });
      const previousUpcoming = qc.getQueryData<components['schemas']['FriendAlarmResponseDto'][]>(['alarms', 'upcoming']);
      const previousPast = qc.getQueryData<components['schemas']['FriendAlarmResponseDto'][]>(['alarms', 'past']);
      const previousSent = qc.getQueryData<components['schemas']['FriendAlarmResponseDto'][]>(['alarms', 'sent']);
      const previousNext = qc.getQueryData<components['schemas']['SelfAlarmResponseDto'] | components['schemas']['FriendAlarmResponseDto'] | null>(['alarms', 'next']);

      const applyUpdate = (list: any[] | undefined) =>
        (list || []).map((item: any) => {
          const itemId = item?.id || item?.alarmId || '';
          if (itemId === id) {
            return { ...item, ...payload };
          }
          return item;
        });

      if (previousUpcoming) qc.setQueryData(['alarms', 'upcoming'], applyUpdate(previousUpcoming));
      if (previousPast) qc.setQueryData(['alarms', 'past'], applyUpdate(previousPast));
      if (previousSent) qc.setQueryData(['alarms', 'sent'], applyUpdate(previousSent));

      if (previousNext) {
        const nextId = (previousNext as any)?.id || (previousNext as any)?.alarmId || '';
        if (nextId === id) qc.setQueryData(['alarms', 'next'], { ...(previousNext as any), ...payload });
      }

      return { previousUpcoming, previousPast, previousSent, previousNext };
    },
    onError: (err, _vars, context: any) => {
      if (context?.previousUpcoming) qc.setQueryData(['alarms', 'upcoming'], context.previousUpcoming);
      if (context?.previousPast) qc.setQueryData(['alarms', 'past'], context.previousPast);
      if (context?.previousSent) qc.setQueryData(['alarms', 'sent'], context.previousSent);
      if (context?.previousNext !== undefined) qc.setQueryData(['alarms', 'next'], context.previousNext);
      options?.onError?.(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['alarms'] });
      options?.onSettled?.();
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data);
    },
    ...options,
  });
};

export const useDeleteAlarm = (options?: any) => {
  const qc = useQueryClient();
  
  return useMutation<void, unknown, string | { id: string; comment?: string }>({
    mutationFn: (vars: string | { id: string; comment?: string }) => {
      if (typeof vars === 'string') return deleteAlarm(vars);
      return deleteAlarm(vars.id, { message: vars.comment });
    },
    onMutate: async (vars: string | { id: string; comment?: string }) => {
      const id = typeof vars === 'string' ? vars : vars.id;
      await qc.cancelQueries({ queryKey: ['alarms'] });
      
      const snapshot = {
        upcoming: qc.getQueryData<components['schemas']['FriendAlarmResponseDto'][]>(['alarms', 'upcoming']),
        past: qc.getQueryData<components['schemas']['FriendAlarmResponseDto'][]>(['alarms', 'past']),
        sent: qc.getQueryData<components['schemas']['FriendAlarmResponseDto'][]>(['alarms', 'sent']),
        next: qc.getQueryData<components['schemas']['SelfAlarmResponseDto'] | components['schemas']['FriendAlarmResponseDto'] | null>(['alarms', 'next']),
      };

      const removeById = (list: any[] | undefined) =>
        list?.filter((d: any) => (d?.id || d?.alarmId) !== id) ?? [];

      qc.setQueryData(['alarms', 'upcoming'], removeById(snapshot.upcoming));
      qc.setQueryData(['alarms', 'past'], removeById(snapshot.past));
      qc.setQueryData(['alarms', 'sent'], removeById(snapshot.sent));

      if (snapshot.next && ((snapshot.next as any)?.id || (snapshot.next as any)?.alarmId) === id) {
        qc.setQueryData(['alarms', 'next'], null);
      }


      return snapshot;
    },
    onError: (err, snapshot: any) => {
      if (snapshot) {
        if (snapshot.upcoming !== undefined) qc.setQueryData(['alarms', 'upcoming'], snapshot.upcoming);
        if (snapshot.past !== undefined) qc.setQueryData(['alarms', 'past'], snapshot.past);
        if (snapshot.sent !== undefined) qc.setQueryData(['alarms', 'sent'], snapshot.sent);
        if (snapshot.next !== undefined) qc.setQueryData(['alarms', 'next'], snapshot.next);
      }
      options?.onError?.(err);
    },
    onSuccess: (_data) => {
      options?.onSuccess?.();
    },
    onSettled: (_data, _error) => {
      options?.onSettled?.();
    },
    ...options,
  });
};
