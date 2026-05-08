import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  uploadFiles,
  notificationSoundSetup,
  getRecurringDaysPayload,
  parseServerScheduled,
} from '@utils/createAlarmUtils';
import { getNotificationSound } from '@utils/additionFunctions';
import { Platform } from 'react-native';

import { cacheWakeMethodsLocally } from '@utils/cacheWakeMethods';
import { scheduleAlarmLocally } from './scheduleAlarmLocally';

import {
  buildLocalTimestamp,
  formatLocalDate,
  formatLocalTime,
  getNextDateStringForRecurring,
} from '@utils/time';

import { buildWakeMethodsPayload } from './buildAlarmPayload';
import { AlarmFlowError } from './errors';
import { setFriendAlarm } from '@api/alarms';
import logger from '@utils/logger';
import { getUserFriendlyErrorMessage } from '@utils/networkErrors';

type Params = {
  isForMe: boolean;
  wakeUpWith: any[];
  recurring: boolean;
  recurringDays: string[];
  chosenDate: string;
  chosenTime: string;

  createSelfMutation: any;
  chosenFriend?: string;
};

export async function createAlarmFlow({
  isForMe,
  wakeUpWith,
  recurring,
  recurringDays,
  chosenDate,
  chosenTime,
  createSelfMutation,
  chosenFriend,
}: Params) {
  const tz =
    Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone || 'Europe/Kyiv';

  // ----------------------------
  // 1) Upload media
  // ----------------------------
  let wakeMethodsWithUrls: any[];

  try {
    wakeMethodsWithUrls = await uploadFiles(wakeUpWith);
  } catch (e) {
    throw new AlarmFlowError(
      'UPLOAD_FAILED',
      'Some media files could not be uploaded.',
      e,
    );
  }

  // ----------------------------
  // 2) Build wakeMethods payload
  // ----------------------------
  const wakeMethodsPayload = buildWakeMethodsPayload(wakeMethodsWithUrls);

  logger.debug('wakeMethodsPayload', wakeMethodsPayload);

  if (wakeMethodsPayload.length === 0) {
    throw new AlarmFlowError(
      'UPLOAD_FAILED',
      'No media uploaded successfully.',
    );
  }

  // ----------------------------
  // 3) Notification sound/video setup
  // ----------------------------
  let notificationSound = 'default';
  let notificationVideo: string | null = null;

  try {
    if (wakeUpWith.length > 0) {
      const first = wakeUpWith[0];
      const setup = await notificationSoundSetup(first);

      notificationSound = setup.notificationSound;
      notificationVideo = setup.notificationVideo;
    }
  } catch (e) {
    throw new AlarmFlowError(
      'UNKNOWN',
      'Failed to prepare notification media.',
      e,
    );
  }

  // ----------------------------
  // 4) Recurring days payload
  // ----------------------------
  const recurringDaysPayload =
    (await getRecurringDaysPayload(recurring, recurringDays)) ?? [];

  // ----------------------------
  // 5) Build backend payload
  // ----------------------------
  const payload: any = {
    date: formatLocalDate(chosenDate),
    time: formatLocalTime(chosenTime),
    timezone: tz,
    recurring,
    recurringDays: recurringDaysPayload,
    wakeMethods: wakeMethodsPayload,
  };
  logger.debug('payload', payload);

  // ----------------------------
  // 6) Create alarm on backend
  // ----------------------------
  let created: any;

  try {
    if (isForMe) {
      created = await createSelfMutation.mutateAsync(payload);
      logger.debug('created', created);
    } else if (chosenFriend) {
      const friendPayload = {
        friendUserId: chosenFriend,
        pieces: 2,
        ...payload,
      };
      logger.debug('friendPayload', friendPayload);

      await setFriendAlarm(friendPayload as any);
    } else {
      throw new AlarmFlowError('UNKNOWN', 'No friend selected for alarm.');
    }
  } catch (e: any) {
    throw new AlarmFlowError(
      'BACKEND_FAILED',
      getUserFriendlyErrorMessage(e, 'Server failed to create alarm.'),
      e,
    );
  }

  if (isForMe && !created?.id) {
    throw new AlarmFlowError(
      'BACKEND_FAILED',
      'Alarm was not created properly.',
    );
  }

  if (Array.isArray(created?.wakeMethods) && wakeMethodsPayload.length > 0) {
    created.wakeMethods = created.wakeMethods.map(
      (method: any, index: number) => {
        const payloadMethod = wakeMethodsPayload[index];
        const type = String(method?.type || '').toUpperCase();

        if (
          type === 'VOICE' &&
          payloadMethod?.type === 'VOICE' &&
          'voiceName' in payloadMethod
        ) {
          return {
            ...method,
            voiceName: payloadMethod.voiceName || method?.voiceName || null,
          };
        }

        if (
          type === 'SONG' &&
          payloadMethod?.type === 'SONG' &&
          'songName' in payloadMethod
        ) {
          return {
            ...method,
            songName: payloadMethod.songName || method?.songName || null,
          };
        }

        if (
          type === 'PUZZLE' &&
          payloadMethod?.type === 'PUZZLE' &&
          'songName' in payloadMethod
        ) {
          return {
            ...method,
            songName: payloadMethod.songName || method?.songName || null,
          };
        }

        return method;
      },
    );
  }

  const normalizationDate =
    recurring && payload.time
      ? getNextDateStringForRecurring(recurringDaysPayload, payload.time)
      : payload.date;
  const normalizedScheduledTs = buildLocalTimestamp(
    normalizationDate,
    payload.time,
  );

  if (
    isForMe &&
    typeof normalizedScheduledTs === 'number' &&
    isFinite(normalizedScheduledTs)
  ) {
    created = {
      ...created,
      scheduledAt: new Date(normalizedScheduledTs).toISOString(),
      timezone: tz,
    };
  }

  // ----------------------------
  // 7) Cache locally
  // ----------------------------
  if (isForMe) {
    try {
      const cachedAlarm = JSON.parse(JSON.stringify(created));

      if (Array.isArray(cachedAlarm.wakeMethods)) {
        await cacheWakeMethodsLocally(cachedAlarm.wakeMethods);
      }

      // Attach local notification sound/video paths to cached alarm
      try {
        if (notificationSound && notificationSound !== 'default') {
          if (Platform.OS === 'android') {
            (cachedAlarm as any).localNotificationSound = notificationSound;
          } else if (Platform.OS === 'ios') {
            const soundPath = await getNotificationSound(
              notificationSound,
              created.id,
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
              created.id,
            );
            (cachedAlarm as any).localNotificationSound = soundPath;
          }
        }
      } catch (e) {
        logger.warn(
          '[createAlarmFlow] Failed to attach local notification media to cache',
          e,
        );
      }

      await AsyncStorage.setItem(
        `alarm_cache_${created.id}`,
        JSON.stringify(cachedAlarm),
      );
    } catch (e) {
      throw new AlarmFlowError(
        'CACHE_FAILED',
        'Alarm created but failed to cache locally.',
        e,
      );
    }

    // ----------------------------
    // 8) Schedule locally
    // ----------------------------
    try {
      const localTs = normalizedScheduledTs;
      const serverTs = parseServerScheduled(created.scheduledAt);

      const scheduledAtToUse = localTs ?? serverTs ?? Date.now() + 5000;

      await scheduleAlarmLocally({
        createdId: created.id,
        payload,
        recurring,
        recurringDaysPayload,
        notificationSound,
        notificationVideo,
        scheduledAtToUse,
        tz,
      });
    } catch (e) {
      throw new AlarmFlowError(
        'SCHEDULE_FAILED',
        'Alarm created but notification scheduling failed.',
        e,
      );
    }
  }

  return created;
}
