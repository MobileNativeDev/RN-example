import { Platform } from 'react-native';
import { getUpcomingAlarms } from '@api/alarms';
import {
  scheduleLocalAlarm,
  scheduleRecurringAlarm,
} from '@services/alarmScheduler';
import {
  createLocalNotification,
  scheduleAlarm,
  Weekday,
} from '@services/ios-services';
import {
  copySoundToAppStorage,
  copyVideoToAppStorage,
  getNotificationSound,
  normalizeUri,
} from '@utils/additionFunctions';
import { getTodayTimestamp, buildLocalTimestamp } from '@utils/time';
import { scheduledAtToLocal } from '@utils/notificationFunctions';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function rescheduleAllAlarms(): Promise<void> {
  try {
    console.log('=================================');
    console.log('🔄 RESCHEDULE ALL ALARMS - STARTING');
    console.log(`Platform: ${Platform.OS}`);
    console.log(`Current time: ${new Date().toISOString()}`);
    console.log('=================================');

    // Fetch all upcoming alarms from the database
    const alarms = await getUpcomingAlarms();

    if (!alarms || alarms.length === 0) {
      console.log('⚠️  No upcoming alarms to reschedule');
      console.log('=================================');
      return;
    }

    console.log(`📋 Found ${alarms.length} alarms to reschedule`);

    // Process each alarm
    for (const alarm of alarms) {
      try {
        // Get alarm ID (handle both SELF and FRIEND alarm types)
        const alarmId = (alarm as any).alarmId || (alarm as any).id;

        if (!alarmId) {
          console.warn('Skipping alarm - no ID found');
          continue;
        }

        console.log('=================================');
        console.log(`Processing alarm ID: ${alarmId}`);
        console.log('Alarm data:', JSON.stringify(alarm, null, 2));

        // Try to get cached alarm data
        let cachedAlarm: any = null;
        try {
          const cacheKey = `alarm_cache_${alarmId}`;
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            cachedAlarm = JSON.parse(cached);
            console.log('✅ Found cached alarm data');
            console.log(
              'Cached localNotificationSound:',
              cachedAlarm.localNotificationSound,
            );
          } else {
            console.log('⚠️  No cache found for this alarm');
          }
        } catch (cacheErr) {
          console.warn('Failed to read alarm cache:', cacheErr);
        }

        // Skip friend alarms that are not accepted
        if (alarm.type === 'FRIEND' && alarm.approvalStatus !== 'ACCEPTED') {
          console.log(
            `❌ Skipping alarm ${alarmId} - status: ${alarm.approvalStatus}`,
          );
          continue;
        }

        const isRecurring = alarm.frequency === 'RECURRING';
        const scheduledAt = alarm.scheduledAt;
        const timezone = alarm.timezone || 'UTC';

        console.log(`Alarm type: ${isRecurring ? 'RECURRING' : 'ONE-TIME'}`);
        console.log(`Original scheduledAt from server: ${scheduledAt}`);
        console.log(`Timezone: ${timezone}`);

        // Convert scheduledAt from server to local time considering timezone
        const localTime = scheduledAtToLocal({
          scheduledAt,
          timezone,
        });

        console.log(
          'Local time conversion:',
          JSON.stringify(localTime, null, 2),
        );

        if (!localTime || !localTime.date || !localTime.time) {
          console.warn(`❌ Failed to convert time for alarm ${alarmId}`);
          continue;
        }

        // Build timestamp from local date and time
        const timestamp = buildLocalTimestamp(localTime.date, localTime.time);

        if (!timestamp) {
          console.warn(`❌ Failed to build timestamp for alarm ${alarmId}`);
          continue;
        }

        const wakeMethods = Array.isArray(alarm.wakeMethods)
          ? alarm.wakeMethods
          : [];

        const apiVideoUrl =
          typeof (alarm as any).videoUrl === 'string'
            ? (alarm as any).videoUrl
            : wakeMethods.find((m: any) => {
                const type = String(m?.type || '').toUpperCase();
                return Boolean(
                  type === 'VIDEO' && (m?.videoUrl || m?.videoUri),
                );
              })?.videoUrl ||
              wakeMethods.find((m: any) => {
                const type = String(m?.type || '').toUpperCase();
                return Boolean(
                  type === 'VIDEO' && (m?.videoUrl || m?.videoUri),
                );
              })?.videoUri;

        const apiSongUrl =
          typeof (alarm as any).songUrl === 'string'
            ? (alarm as any).songUrl
            : wakeMethods.find((m: any) => {
                const type = String(m?.type || '').toUpperCase();
                return Boolean(type === 'SONG' && (m?.songUrl || m?.songUri));
              })?.songUrl ||
              wakeMethods.find((m: any) => {
                const type = String(m?.type || '').toUpperCase();
                return Boolean(type === 'SONG' && (m?.songUrl || m?.songUri));
              })?.songUri;

        const apiVoiceUrl =
          typeof (alarm as any).voiceUrl === 'string'
            ? (alarm as any).voiceUrl
            : wakeMethods.find((m: any) => {
                const type = String(m?.type || '').toUpperCase();
                return Boolean(
                  type === 'VOICE' && (m?.voiceUrl || m?.voiceUri),
                );
              })?.voiceUrl ||
              wakeMethods.find((m: any) => {
                const type = String(m?.type || '').toUpperCase();
                return Boolean(
                  type === 'VOICE' && (m?.voiceUrl || m?.voiceUri),
                );
              })?.voiceUri;

        const apiPuzzleSoundUrl =
          wakeMethods.find((m: any) => {
            const type = String(m?.type || '').toUpperCase();
            return Boolean(
              type === 'PUZZLE' &&
                (m?.puzzleUrl?.soundUrl ||
                  m?.soundUrl ||
                  m?.localPuzzleSoundPath),
            );
          })?.puzzleUrl?.soundUrl ||
          wakeMethods.find((m: any) => {
            const type = String(m?.type || '').toUpperCase();
            return Boolean(
              type === 'PUZZLE' &&
                (m?.puzzleUrl?.soundUrl ||
                  m?.soundUrl ||
                  m?.localPuzzleSoundPath),
            );
          })?.soundUrl ||
          wakeMethods.find((m: any) => {
            const type = String(m?.type || '').toUpperCase();
            return Boolean(
              type === 'PUZZLE' &&
                (m?.puzzleUrl?.soundUrl ||
                  m?.soundUrl ||
                  m?.localPuzzleSoundPath),
            );
          })?.localPuzzleSoundPath;

        // Determine which media to use for notification sound
        // Priority: use cached localNotificationSound if available
        let notificationSound: string | null = null;
        let notificationVideo: string | null = null;

        if (cachedAlarm?.localNotificationSound) {
          // Use cached notification sound (already local path for iOS, URI for Android)
          notificationSound = cachedAlarm.localNotificationSound;
          console.log('Using cached notification sound:', notificationSound);
        } else if (cachedAlarm?.localNotificationVideo) {
          // For Android - cached video
          notificationVideo = cachedAlarm.localNotificationVideo;
          console.log('Using cached notification video:', notificationVideo);
        } else {
          // Fallback: Priority: video > song > voice > puzzle sound from API/wakeMethods
          if (apiVideoUrl && typeof apiVideoUrl === 'string') {
            notificationVideo = apiVideoUrl;
            console.log('Using API video URL:', notificationVideo);
          } else if (apiSongUrl && typeof apiSongUrl === 'string') {
            notificationSound = apiSongUrl;
            console.log('Using API song URL:', notificationSound);
          } else if (apiVoiceUrl && typeof apiVoiceUrl === 'string') {
            notificationSound = apiVoiceUrl;
            console.log('Using API voice URL:', notificationSound);
          } else if (
            apiPuzzleSoundUrl &&
            typeof apiPuzzleSoundUrl === 'string'
          ) {
            notificationSound = apiPuzzleSoundUrl;
            console.log('Using API puzzle sound URL:', notificationSound);
          }
        }

        console.log(`Local timestamp (ms): ${timestamp}`);
        console.log(
          `Local scheduled date: ${new Date(timestamp).toLocaleString()}`,
        );
        console.log(`Current time: ${new Date().toISOString()}`);
        console.log(
          `Time difference: ${((timestamp - Date.now()) / 1000 / 60).toFixed(
            2,
          )} minutes`,
        );

        // Skip alarms that are in the past (for non-recurring alarms)
        if (!isRecurring && timestamp < Date.now()) {
          console.log(
            `❌ Skipping alarm ${alarmId} - scheduled time is in the past`,
          );
          continue;
        }

        // Get wake methods
        const wakeMethodTypes = Array.isArray(wakeMethods)
          ? wakeMethods
              .map((m: any) => (typeof m === 'string' ? m : m?.type))
              .filter(Boolean)
          : [];
        console.log(`Wake methods: ${wakeMethodTypes.join(', ') || 'none'}`);

        // ============ ANDROID ============
        if (Platform.OS === 'android') {
          console.log('📱 Scheduling for ANDROID');

          // For Android, use the sound/video from cache or fallback to API URLs
          let soundUri =
            cachedAlarm?.localNotificationSound ||
            cachedAlarm?.localNotificationVideo ||
            (notificationSound === 'default'
              ? notificationVideo
              : notificationSound);

          if (typeof soundUri === 'string' && /^https?:\/\//i.test(soundUri)) {
            try {
              soundUri =
                notificationSound && notificationSound !== 'default'
                  ? await copySoundToAppStorage(normalizeUri(soundUri))
                  : await copyVideoToAppStorage(normalizeUri(soundUri));
              console.log(
                'Downloaded remote media for Android alarm:',
                soundUri,
              );
            } catch (mediaErr) {
              console.warn(
                'Failed to localize remote media for Android alarm',
                mediaErr,
              );
            }
          }

          console.log(`Sound URI to use: ${soundUri || 'default'}`);

          if (isRecurring) {
            // Get recurring days
            const recurringDays = (alarm as any).recurringDays || [];
            console.log(`Recurring days: ${recurringDays.join(', ')}`);

            // Calculate today's timestamp for the alarm time using LOCAL time
            const todayTs = getTodayTimestamp({
              time: localTime.time,
            });

            const finalTimestamp = todayTs ?? timestamp;
            console.log(`Final scheduled timestamp: ${finalTimestamp}`);
            console.log(
              `Final scheduled date: ${new Date(
                finalTimestamp,
              ).toLocaleString()}`,
            );

            await scheduleRecurringAlarm({
              alarmId,
              scheduledAt: finalTimestamp,
              timezone,
              title: 'Wake up',
              body: 'Your alarm is ringing',
              wakeMethods: wakeMethodTypes,
              recurringDays: recurringDays.map(String),
              data: {
                sound: soundUri || undefined,
              },
            });

            console.log(`✅ Successfully scheduled RECURRING alarm ${alarmId}`);
            console.log(
              `   Will ring at: ${new Date(finalTimestamp).toLocaleString()}`,
            );
            console.log(`   Days: ${recurringDays.join(', ')}`);
          } else {
            // One-time alarm
            console.log(
              `Scheduling ONE-TIME alarm for: ${new Date(
                timestamp,
              ).toLocaleString()}`,
            );
            console.log(`Date: ${localTime.date}, Time: ${localTime.time}`);

            await scheduleLocalAlarm({
              alarmId,
              scheduledAt: timestamp,
              timezone,
              title: 'Wake up',
              body: 'Your alarm is ringing',
              wakeMethods: wakeMethodTypes,
              data: {
                sound: soundUri || undefined,
              },
            });

            console.log(`✅ Successfully scheduled ONE-TIME alarm ${alarmId}`);
            console.log(
              `   Will ring at: ${new Date(timestamp).toLocaleString()}`,
            );
          }
        }

        // ============ iOS ============
        if (Platform.OS === 'ios') {
          console.log('🍎 Scheduling for iOS');

          let soundPath = 'default';

          // If we have cached sound path, use it directly
          if (cachedAlarm?.localNotificationSound) {
            soundPath = cachedAlarm.localNotificationSound;
            console.log('Using cached sound path:', soundPath);
          } else {
            // Otherwise, determine and get the sound
            const soundToSchedule =
              notificationVideo ||
              (notificationSound && notificationSound !== 'default'
                ? notificationSound
                : null);

            if (soundToSchedule) {
              soundPath = await getNotificationSound(soundToSchedule, alarmId);
              console.log('Generated sound path from URL:', soundPath);
            }
          }

          if (isRecurring) {
            // Get recurring days
            const recurringDays = (alarm as any).recurringDays || [];
            console.log(`Recurring days: ${recurringDays.join(', ')}`);

            // Calculate today's timestamp for the alarm time using LOCAL time
            const todayTs = getTodayTimestamp({
              time: localTime.time,
            });

            const finalTimestamp = todayTs || timestamp;
            console.log(`Final scheduled timestamp: ${finalTimestamp}`);
            console.log(
              `Final scheduled date: ${new Date(
                finalTimestamp,
              ).toLocaleString()}`,
            );

            const notification = createLocalNotification({
              id: alarmId,
              title: 'Wake up',
              body: 'Your alarm is ringing',
              soundPath,
              triggeredAt: finalTimestamp,
            });

            notification.weekdays = recurringDays.map((day: string) =>
              day.toUpperCase(),
            ) as Weekday[];

            console.log(
              `Notification object:`,
              JSON.stringify(notification, null, 2),
            );

            await scheduleAlarm(notification);

            console.log(`✅ Successfully scheduled RECURRING alarm ${alarmId}`);
            console.log(
              `   Will ring at: ${new Date(finalTimestamp).toLocaleString()}`,
            );
            console.log(`   Days: ${recurringDays.join(', ')}`);
          } else {
            // One-time alarm
            console.log(
              `Scheduling ONE-TIME alarm for: ${new Date(
                timestamp,
              ).toLocaleString()}`,
            );
            console.log(`Date: ${localTime.date}, Time: ${localTime.time}`);

            const notification = createLocalNotification({
              id: alarmId,
              title: 'Wake up',
              body: 'Your alarm is ringing',
              soundPath,
              triggeredAt: timestamp,
            });

            console.log(
              `Notification object:`,
              JSON.stringify(notification, null, 2),
            );

            await scheduleAlarm(notification);

            console.log(`✅ Successfully scheduled ONE-TIME alarm ${alarmId}`);
            console.log(
              `   Will ring at: ${new Date(timestamp).toLocaleString()}`,
            );
          }
        }
      } catch (error) {
        const alarmId =
          (alarm as any).alarmId || (alarm as any).id || 'unknown';
        console.error('=================================');
        console.error(`❌ Failed to reschedule alarm ${alarmId}`);
        console.error('Error details:', error);
        console.error('Alarm data:', alarm);
        console.error('=================================');
        // Continue with next alarm even if one fails
      }
    }

    console.log('=================================');
    console.log('✅ Finished rescheduling all alarms');
    console.log('=================================');
  } catch (error) {
    console.error('=================================');
    console.error('❌ FATAL: Failed to reschedule alarms');
    console.error('Error:', error);
    console.error('=================================');
    // Don't throw - we don't want to break login/startup
  }
}
