import { Platform } from 'react-native';

import {
  scheduleLocalAlarm,
  scheduleRecurringAlarm,
} from '@services/alarmScheduler';

import {
  createLocalNotification,
  scheduleAlarm,
  Weekday,
} from '@services/ios-services';

import { getTodayTimestamp } from '@utils/time';
import { getNotificationSound } from '@utils/additionFunctions';

type Params = {
  createdId: string;
  payload: any;
  recurring: boolean;
  recurringDaysPayload: string[];
  notificationSound: string;
  notificationVideo: string | null;
  scheduledAtToUse: number;
  tz: string;
};

export async function scheduleAlarmLocally({
  createdId,
  payload,
  recurring,
  recurringDaysPayload,
  notificationSound,
  notificationVideo,
  scheduledAtToUse,
  tz,
}: Params) {
  const localWakeMethods = payload.wakeMethods.map((m: any) => m.type);

  // ---------------- ANDROID ----------------
  if (Platform.OS === 'android') {
    if (recurring) {
      const todayTs = getTodayTimestamp({
        time: payload.time || '00:00',
      });

      await scheduleRecurringAlarm({
        alarmId: createdId,
        scheduledAt: todayTs ?? `${payload.date}T${payload.time}:00`,
        timezone: tz,
        title: 'Wake up',
        body: 'Your alarm is ringing',
        wakeMethods: localWakeMethods,
        recurringDays: recurringDaysPayload,
        data: {
          sound:
            notificationSound === 'default'
              ? notificationVideo
              : notificationSound,
        },
      });

      return;
    }

    await scheduleLocalAlarm({
      alarmId: createdId,
      scheduledAt: scheduledAtToUse ?? `${payload.date}T${payload.time}:00`,
      timezone: tz,
      title: 'Wake up',
      body: 'Your alarm is ringing',
      wakeMethods: localWakeMethods,
      data: {
        sound:
          notificationSound === 'default'
            ? notificationVideo
            : notificationSound,
      },
    });

    return;
  }

  // ---------------- iOS ----------------
  if (Platform.OS === 'ios') {
    const soundToSchedule =
      notificationVideo ||
      (notificationSound !== 'default' ? notificationSound : null);

    let soundPath = 'default';

    if (soundToSchedule) {
      soundPath = await getNotificationSound(soundToSchedule, createdId);
    }

    const todayTs = getTodayTimestamp({
      time: payload.time || '00:00',
    });

    const notification = createLocalNotification({
      id: String(createdId),
      title: 'Wake up',
      body: 'Your alarm is ringing',
      soundPath,
      triggeredAt: scheduledAtToUse || Date.now() + 5000,
    });

    if (recurring) {
      notification.triggeredAt = todayTs || Date.now() + 5000;
      notification.weekdays = recurringDaysPayload as Weekday[];
    }

    await scheduleAlarm(notification);
  }
}
