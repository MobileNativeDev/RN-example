import { NativeModules, Platform } from 'react-native';

export enum NotificationPermissionStatus {
  AUTHORIZED = 'authorized',
  DENIED = 'denied',
  NOT_DETERMINED = 'notDetermined',
  PROVISIONAL = 'provisional',
  EPHEMERAL = 'ephemeral',
  UNKNOWN = 'unknown',
}

export type Weekday = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

export interface LocalNotification {
  id: string;
  title?: string;
  body?: string;
  soundPath: string;
  triggeredAt: number;
  weekdays?: Weekday[];
}

const {
  AudioExtractorModule,
  SchedulingModule,
  SettingsModule,
  NotificationModule,
  PreferencesModule,
} = NativeModules;

export type PreferencesNative = {
  saveAlarm(alarmJSON: string): Promise<boolean>;
  removeAlarm(alarmId: string): Promise<boolean>;
  getLastAlarmId(): Promise<string | null>;
  removeLastAlarmId(): Promise<boolean>;
  saveLastAlarmId(alarmId?: string | null): Promise<boolean>;
};

export async function extractNotificationSound(
  mediaPath: string,
  outputFileName: string,
): Promise<string> {
  if (Platform.OS !== 'ios') {
    throw new Error('AudioExtractorModule is only available on iOS');
  }

  try {
    const outputPath = await AudioExtractorModule.extractNotificationSound(
      mediaPath,
      outputFileName,
    );
    return outputPath;
  } catch (error) {
    console.warn('Failed to extract notification sound:', error);
    throw error;
  }
}

export async function scheduleAlarm(
  notification: LocalNotification,
): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    throw new Error('SchedulingModule is only available on iOS');
  }

  try {
    const alarmJSON = JSON.stringify(notification);
    const result = await SchedulingModule.schedule(alarmJSON);
    return result;
  } catch (error) {
    console.error('Failed to schedule alarm:', error);
    throw error;
  }
}

export async function scheduleRecurringNotification(params: {
  id: string;
  title?: string;
  body?: string;
  soundPath: string;
  triggeredAt: number;
  weekdays: string[];
}): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    throw new Error('SchedulingModule is only available on iOS');
  }

  const VALID: Weekday[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const weekdays = Array.isArray(params.weekdays)
    ? params.weekdays
        .map(String)
        .map(w => w.toUpperCase())
        .filter((w): w is Weekday => VALID.includes(w as Weekday))
    : [];

  const notification: LocalNotification = {
    id: params.id,
    title: params.title,
    body: params.body,
    soundPath: params.soundPath,
    triggeredAt: params.triggeredAt,
    weekdays: weekdays,
  };
  console.log("notification",notification);
  

  return scheduleAlarm(notification);
}

export async function rescheduleAlarm(
  notification: LocalNotification,
): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    throw new Error('SchedulingModule is only available on iOS');
  }

  try {
    if (!notification) {
      throw new Error(`Notification data for alarm not found`);
    }

    console.log("notification",notification);
    
    const result = await SchedulingModule.schedule(JSON.stringify(notification));
    return result;
  } catch (error) {
    console.error('Failed to reschedule alarm:', error);
    throw error;
  }
}


export function cancelAlarms(id: string): void {
  try {
    SchedulingModule.cancelAlarm(id);
  } catch (error) {
    console.error('Failed to cancel alarms:', error);
    throw error;
  }
}

export function cancelRecurringAlarm(alarmId: string): void {
  if (Platform.OS !== 'ios') {
    console.warn('SchedulingModule is only available on iOS');
    return;
  }

  try {
    SchedulingModule.cancelRecurringAlarm(alarmId);
  } catch (error) {
    console.error('Failed to cancel recurring alarm:', error);
    throw error;
  }
}

export function cancelAllAlarms(): void {
  if (Platform.OS !== 'ios') {
    console.warn('SchedulingModule is only available on iOS');
    return;
  }

  try {
    if (typeof SchedulingModule.cancelAll === 'function') {
      SchedulingModule.cancelAll();
    } else if (typeof SchedulingModule.cancelAllAlarms === 'function') {
      SchedulingModule.cancelAllAlarms();
    } else {
      throw new Error('cancelAll native method not available');
    }
  } catch (error) {
    console.error('Failed to cancel all alarms:', error);
    throw error;
  }
}

export function openAppSettings(): void {
  if (Platform.OS !== 'ios') {
    console.warn('SettingsModule is only available on iOS');
    return;
  }

  try {
    SettingsModule.openAppSettings();
  } catch (error) {
    console.error('Failed to open app settings:', error);
    throw error;
  }
}

export function openNotificationSettings(): void {
  if (Platform.OS !== 'ios') {
    console.warn('SettingsModule is only available on iOS');
    return;
  }

  try {
    SettingsModule.openNotificationSettings();
  } catch (error) {
    console.error('Failed to open notification settings:', error);
    throw error;
  }
}

export async function checkNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS !== 'ios') {
    throw new Error('NotificationModule is only available on iOS');
  }

  try {
    const status = await NotificationModule.checkPermissionStatus();
    return status as NotificationPermissionStatus;
  } catch (error) {
    console.error('Failed to check notification permission status:', error);
    throw error;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (Platform.OS !== 'ios') {
    throw new Error('NotificationModule is only available on iOS');
  }

  try {
    const status = await NotificationModule.requestPermission();
    return status as NotificationPermissionStatus;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    throw error;
  }
}

export async function saveAlarm(
  notification: LocalNotification,
): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    throw new Error('PreferencesModule is only available on iOS');
  }

  try {
    const alarmJSON = JSON.stringify(notification);
    const result = await PreferencesModule.saveAlarm(alarmJSON);
    return result;
  } catch (error) {
    console.error('Failed to save alarm:', error);
    throw error;
  }
}

export async function removeAlarm(alarmId: string): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    throw new Error('PreferencesModule is only available on iOS');
  }

  try {
    const result = await PreferencesModule.removeAlarm(alarmId);
    return result;
  } catch (error) {
    console.error('Failed to remove alarm:', error);
    throw error;
  }
}

export function dateToUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function unixTimestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

export function createLocalNotification(params: {
  id: string;
  triggeredAt: number;
  soundPath: string;
  title?: string;
  body?: string;
  weekdays?: Weekday[];
}): LocalNotification {
  return {
    id: params.id,
    title: params.title,
    body: params.body,
    soundPath: params.soundPath,
    triggeredAt: params.triggeredAt,
    weekdays: params.weekdays,
  };
}
