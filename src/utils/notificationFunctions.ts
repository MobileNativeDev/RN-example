import {
  confirmFriendAlarm,
  getAlarm,
  getUpcomingAlarms,
  rejectFriendAlarm,
} from '@api/alarms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { acceptFriend, declineFriend } from '@api/friends';
import { markNotificationRead } from '@api/notifications';
import { Notification } from '@appTypes/types';
import {
  scheduleLocalAlarm,
  scheduleRecurringAlarm,
} from '@services/alarmScheduler';
import type { QueryClient } from '@tanstack/react-query';
import {
  copySoundToAppStorage,
  copyVideoToAppStorage,
  getNotificationSound,
  normalizeUri,
  sleep,
} from './additionFunctions';
import { formatLocalDate, formatLocalTime, parseReceivedLocal } from './time';
import { isDuplicateAlarm } from './createAlarmUtils';
import { DateTime } from 'luxon';
import { Platform } from 'react-native';
import {
  createLocalNotification,
  scheduleAlarm,
} from '@services/ios-services/iosNativeWrappers';
import { Alert } from '@utils/alert';
import logger from './logger';

let moduleQueryClient: QueryClient | null = null;

export const setReactQueryClient = (c: QueryClient | null) => {
  moduleQueryClient = c;
};

export const handleAccept = async (friendshipId: string, refetch: any) => {
  logger.debug('handleAccept');
  await acceptFriend(friendshipId);
  if (moduleQueryClient)
    await moduleQueryClient.invalidateQueries({ queryKey: ['friends'] });
  await refetch();
};
export const handleDecline = async (
  friendshipId: string,
  refetch: () => Promise<void>,
) => {
  logger.debug('handleDecline');
  await declineFriend(friendshipId);
  if (moduleQueryClient)
    await moduleQueryClient.invalidateQueries({ queryKey: ['friends'] });
  await refetch();
};

export const handleDetailAlarm = (
  alarm: Notification,
  localTime: any,
  navigation: any,
) => {
  const data = {
    alarmId: alarm.alarmId,
    owner: alarm.actor,
    scheduledAt: localTime?.localIso || alarm.scheduledAt,
    friendshipId: alarm.alarmId,
  };
  logger.debug('data111', data);

  navigation.navigate('MainContentNavigation', {
    screen: 'NotificationAlarmDetailScreen',
    params: { alarm: data },
  });
};

export const handleDeclineAlarm = async (
  alarmId: string,
  refetch: () => Promise<void>,
) => {
  logger.debug('handleDeclineAlarm');
  await rejectFriendAlarm(alarmId);
  if (moduleQueryClient)
    await moduleQueryClient.invalidateQueries({
      queryKey: ['alarms', 'upcoming'],
    });
  await refetch();
};
export const readNotification = async (id: string) => {
  await markNotificationRead(id);

  if (moduleQueryClient) {
    await moduleQueryClient.invalidateQueries({ queryKey: ['notifications'] });
    await moduleQueryClient.invalidateQueries({
      queryKey: ['notifications', 'unreadCount'],
    });
  } else {
    logger.warn(
      '[notificationFunctions] queryClient not set — skipping notifications invalidation',
    );
  }
};

type AlarmLike = {
  scheduledAt?: string | number | null;
  timezone?: string | null;
};
export function scheduledAtToLocal(alarm: AlarmLike, targetZone?: string) {
  const scheduled = alarm?.scheduledAt;
  if (scheduled == null) return null;

  const tz = alarm?.timezone || 'UTC';
  const target = targetZone || DateTime.local().zoneName;

  try {
    const s = String(scheduled);

    const naiveMatch = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    const naive = naiveMatch ? naiveMatch[1] : s;

    let dt = DateTime.fromISO(naive, { zone: tz });

    if (!dt.isValid) {
      if (/^\d+$/.test(s)) {
        dt = DateTime.fromMillis(parseInt(s, 10), { zone: 'utc' }).setZone(tz);
      } else {
        dt = DateTime.fromISO(s, { zone: 'utc' }).setZone(tz);
      }
    }

    const utc = dt.toUTC();
    const local = utc.setZone(target);

    return {
      utcIso: utc.toISO(),
      localIso: local.toISO(),
      date: local.toISODate(),
      time: local.toFormat('HH:mm'),
      valid: dt.isValid,
    };
  } catch (e) {
    return null;
  }
}
export function scheduledAtToLocalFromUTC(
  alarm: AlarmLike,
  targetZone?: string,
) {
  const scheduled = alarm?.scheduledAt;
  if (scheduled == null) return null;

  const tz = alarm?.timezone || 'UTC';
  const target = targetZone || DateTime.local().zoneName;

  try {
    const s = String(scheduled);

    const naiveMatch = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    const naive = naiveMatch ? naiveMatch[1] : s;

    // Parse the incoming value as a UTC instant (the function expects zone 00 input).
    let dt = DateTime.fromISO(naive, { zone: 'utc' });

    if (!dt.isValid) {
      if (/^\d+$/.test(s)) {
        dt = DateTime.fromMillis(parseInt(s, 10), { zone: 'utc' });
      } else {
        dt = DateTime.fromISO(s, { zone: 'utc' });
      }
    }

    // Determine the alarm owner's timezone offset (in minutes) at this instant,
    // then add that offset to the received UTC time (i.e. "add time considering the zone").
    const tzOffsetMin = dt.setZone(tz).offset || 0;
    const ownerInstant = dt.plus({ minutes: tzOffsetMin });

    const utc = ownerInstant.toUTC();
    const local = ownerInstant.setZone(target);

    return {
      utcIso: utc.toISO(),
      localIso: local.toISO(),
      date: local.toISODate(),
      time: local.toFormat('HH:mm'),
      valid: ownerInstant.isValid,
    };
  } catch (e) {
    return null;
  }
}

const isAcceptedFriendAlarm = (alarm: any) =>
  String(alarm?.approvalStatus || '').toUpperCase() === 'ACCEPTED';

const getAcceptedAlarmAfterConfirmError = async (alarmId: string) => {
  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const refreshedAlarm = await getAlarm(alarmId);
      if (isAcceptedFriendAlarm(refreshedAlarm)) {
        return refreshedAlarm;
      }
    } catch (refreshErr) {
      logger.warn(
        '[handleAcceptAlarm] Failed to refetch alarm after confirm error',
        refreshErr,
      );
    }

    if (attempt < attempts) {
      await sleep(350);
    }
  }

  return null;
};

export const handleAcceptAlarm = async (
  alarmId: string,
  refetch?: () => Promise<void>,
  onDuplicate?: () => void,
) => {
  let dto = await getAlarm(alarmId);

  let localTime = scheduledAtToLocal({
    scheduledAt: dto?.scheduledAt,
    timezone: dto?.timezone,
  });

  try {
    const scheduledMillis = parseReceivedLocal(localTime?.localIso);
    if (
      !dto.recurring &&
      typeof scheduledMillis === 'number' &&
      scheduledMillis < Date.now()
    ) {
      Alert.alert(
        'Alarm time passed',
        'This alarm time has already passed and cannot be accepted.',
        [{ text: 'OK', style: 'default' }],
      );
      if (refetch) await refetch();
      return;
    }
  } catch {}

  try {
    const upcoming =
      moduleQueryClient?.getQueryData<any[]>(['alarms', 'upcoming']) ??
      (await getUpcomingAlarms());
    const duplicateDate = formatLocalDate(localTime?.localIso);
    const duplicateTime = formatLocalTime(localTime?.localIso);

    if (
      duplicateDate &&
      duplicateTime &&
      isDuplicateAlarm(duplicateDate, duplicateTime, upcoming || [])
    ) {
      Alert.alert(
        'Cancelled',
        'You already have an alarm for this time',
        onDuplicate
          ? [
              {
                text: 'Change time',
                style: 'default',
                onPress: onDuplicate,
              },
              { text: 'OK', style: 'cancel' },
            ]
          : [{ text: 'OK', style: 'default' }],
      );
      if (refetch) await refetch();
      return;
    }
  } catch (duplicateCheckErr) {
    logger.warn(
      '[handleAcceptAlarm] Failed to check duplicate alarm time',
      duplicateCheckErr,
    );
  }

  try {
    try {
      await confirmFriendAlarm(alarmId);
    } catch (confirmErr: any) {
      const acceptedAlarm = await getAcceptedAlarmAfterConfirmError(alarmId);

      if (!acceptedAlarm) {
        throw confirmErr;
      }

      dto = acceptedAlarm;
      localTime = scheduledAtToLocal({
        scheduledAt: dto?.scheduledAt,
        timezone: dto?.timezone,
      });

      logger.warn(
        '[handleAcceptAlarm] confirmFriendAlarm returned an error, but the alarm is already ACCEPTED. Continuing with local scheduling.',
        confirmErr?.response?.status,
        confirmErr?.response?.data,
      );
    }

    const wmArr: any[] = Array.isArray(dto?.wakeMethods) ? dto.wakeMethods : [];

    const wakeMethods = wmArr.map((w: any) =>
      typeof w === 'string'
        ? w.toUpperCase()
        : String(w?.type || '').toUpperCase(),
    ) as Array<'VOICE' | 'VIDEO' | 'SONG' | 'PUZZLE'>;

    let notificationSound: string = 'default';
    let notificationVideo: string | null = null;
    if (wmArr.length > 0) {
      const first = wmArr[0];
      const t = String(first.type || '').toUpperCase();

      if (t === 'VOICE') {
        const src = first.voiceUrl || first.voiceUri;
        if (src) {
          notificationSound = await copySoundToAppStorage(normalizeUri(src));
        }
      } else if (t === 'SONG') {
        const src = first.songUrl || first.songUri;
        if (src) {
          notificationSound = await copySoundToAppStorage(normalizeUri(src));
        }
      } else if (t === 'PUZZLE') {
        const src =
          (first.puzzleUrl && first.puzzleUrl.soundUrl) ||
          (first.puzzleUri && first.puzzleUri.soundUri);
        if (src) {
          notificationSound = await copySoundToAppStorage(normalizeUri(src));
        }
      } else if (t === 'VIDEO') {
        const src = first.videoUrl || first.videoUri;
        if (src) {
          notificationVideo = await copyVideoToAppStorage(normalizeUri(src));
        }
      }
    }

    try {
      const cacheKey = `alarm_cache_${alarmId}`;
      const cachedAlarm = JSON.parse(JSON.stringify(dto));
      logger.debug('dto', dto);

      try {
        if (localTime && localTime.localIso) {
          (cachedAlarm as any).scheduledAt = localTime.localIso;
        }
      } catch (e) {}

      if (Array.isArray(cachedAlarm.wakeMethods)) {
        await Promise.all(
          cachedAlarm.wakeMethods.map(async (method: any) => {
            try {
              const t = String(method.type || '').toUpperCase();
              if (t === 'VIDEO' && (method.videoUrl || method.videoUri)) {
                const src = method.videoUrl || method.videoUri;
                const localPath = await copyVideoToAppStorage(
                  normalizeUri(src),
                );
                method.localVideoPath = localPath;
              } else if (
                t === 'VOICE' &&
                (method.voiceUrl || method.voiceUri)
              ) {
                const src = method.voiceUrl || method.voiceUri;
                const localPath = await copySoundToAppStorage(
                  normalizeUri(src),
                );
                method.localVoicePath = localPath;
              } else if (t === 'SONG' && (method.songUrl || method.songUri)) {
                const src = method.songUrl || method.songUri;
                const localPath = await copySoundToAppStorage(
                  normalizeUri(src),
                );
                method.localSongPath = localPath;
              }
            } catch (cacheErr) {
              logger.warn(
                `[handleAcceptAlarm] Failed to cache ${method.type} locally:`,
                cacheErr,
              );
            }
          }),
        );
      }

      if (notificationSound && notificationSound !== 'default') {
        if (Platform.OS === 'android') {
          (cachedAlarm as any).localNotificationSound = notificationSound;
        } else if (Platform.OS === 'ios') {
          const soundPath = await getNotificationSound(
            notificationSound,
            alarmId,
          );
          (cachedAlarm as any).localNotificationSound = soundPath;
        }
      }
      if (notificationVideo) {
        if (Platform.OS === 'android') {
          (cachedAlarm as any).localNotificationVideo = notificationVideo;
        } else if (Platform.OS === 'ios') {
          const soundPath = await getNotificationSound(
            notificationVideo,
            alarmId,
          );
          (cachedAlarm as any).localNotificationSound = soundPath;
        }
      }

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedAlarm));
      logger.debug(
        '[notificationFunctions] Cached alarm with local media under',
        cacheKey,
      );
    } catch (setErr) {
      logger.warn('[notificationFunctions] Failed to cache alarm', setErr);
    }

    const scheduledAt =
      parseReceivedLocal(localTime?.localIso) ?? Date.now() + 60_000;
    logger.debug('Scheduled at:', scheduledAt);

    if (Platform.OS === 'android') {
      if (dto.recurring) {
        await scheduleRecurringAlarm({
          alarmId,
          scheduledAt,
          timezone:
            dto?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          title: 'Wake up',
          body: 'Your alarm is ringing',
          wakeMethods,
          recurringDays: dto.recurringDays || [],
          data: {
            sound:
              notificationSound === 'default'
                ? notificationVideo
                : notificationSound,
          },
        });
      } else {
        await scheduleLocalAlarm({
          alarmId,
          scheduledAt,
          timezone:
            dto?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          title: 'Wake up',
          body: 'Your alarm is ringing',
          wakeMethods,
          data: {
            sound:
              notificationSound === 'default'
                ? notificationVideo
                : notificationSound,
          },
        });
      }
    } else {
      if (Platform.OS === 'ios') {
        const soundPath = await getNotificationSound(
          notificationSound === 'default'
            ? notificationVideo ?? 'default'
            : notificationSound ?? 'default',
          alarmId,
        );

        const notification = createLocalNotification({
          id: String(alarmId),
          title: 'Wake up',
          body: 'Your alarm is ringing',
          soundPath: soundPath,
          triggeredAt: scheduledAt || Date.now() + 5000,
        });
        if (dto.recurring) {
          notification.weekdays = dto.recurringDays || [];
        }

        logger.debug('Notification created ios:', notification);
        const result = await scheduleAlarm(notification);

        logger.debug('Alarm scheduled result ios:', result);
      }
    }
  } catch (e) {
    logger.warn('Failed to schedule accepted friend alarm locally', e);
  }
  if (refetch) {
    await refetch();
  }
};
