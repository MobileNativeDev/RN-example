import { NativeModules, Platform } from 'react-native';
import { ScheduleParams } from '@appTypes/types';


export const scheduleLocalAlarm = async (opts: ScheduleParams) => {
  const { alarmId, scheduledAt, title, body, data, timezone, wakeMethods } = opts;
  
  const soundUri = data?.['sound'];
    
  let ts = typeof scheduledAt === 'number' ? scheduledAt : new Date(scheduledAt).getTime();
  if (!isFinite(ts)) {
    console.warn('scheduleLocalAlarm: invalid timestamp', scheduledAt);
    return;
  }
  if (ts <= Date.now()) {
    console.warn('scheduleLocalAlarm: timestamp in the past, adjusting by +60s', ts, new Date(ts).toISOString());
    ts = Date.now() + 60_000;
  }

  try {
    if (Platform.OS === 'android' && NativeModules['AlarmSchedule']?.scheduleAlarm) {
      const path = typeof soundUri === 'string' ? soundUri.replace('file://', '') : '';
      
      await NativeModules['AlarmSchedule'].scheduleAlarm(path, String(alarmId), ts);
      console.log('Scheduled native alarm', alarmId, new Date(ts).toISOString());
      try {
        if (opts.persist !== false && NativeModules['AlarmStore']) {
          const toSave = { alarmId, scheduledAt: ts, title, body, timezone, data, wakeMethods };
          await NativeModules['AlarmStore'].saveAlarm(JSON.stringify(toSave));
        }
      } catch (e) {
        console.warn('Failed to persist alarm natively', e);
      }
    } else {
      console.warn('AlarmSchedule native module not available; skipping scheduling.');
    }
  } catch (err) {
    console.warn('scheduleLocalAlarm failed', err);
  }
};

export const cancelLocalAlarm = async (alarmId: string) => {
  try {
    try {
      if (Platform.OS === 'android' && NativeModules['AlarmStore']) {
       await NativeModules['AlarmStore'].removeAlarm(alarmId);        
      }
      if (Platform.OS === 'android' && NativeModules['AlarmSchedule']) {
        await NativeModules['AlarmSchedule'].cancelAlarm(alarmId);
      }
    } catch (e) {
      console.warn('Failed to remove persisted alarm', e);
    }
  } catch (err) {
    console.warn('cancelLocalAlarm failed', err);
  }
};
export const scheduleRecurringAlarm = async (opts: ScheduleParams & { recurringDays?: string[] }) => {
  const { alarmId, scheduledAt, title, body, data, timezone, wakeMethods, recurringDays } = opts;

  const soundUri = data?.['sound'];
  console.log("data",data);
  

  let ts = typeof scheduledAt === 'number' ? scheduledAt : new Date(scheduledAt).getTime();
  if (!isFinite(ts)) {
    console.warn('scheduleRecurringAlarm: invalid timestamp', scheduledAt);
    return;
  }

  try {
    if (Platform.OS === 'android' && NativeModules['AlarmSchedule']?.scheduleRecurringAlarm) {
      const path = soundUri || '';
      console.log("path",path);
      
      const days = Array.isArray(recurringDays) ? recurringDays.map(String) : [];

      await NativeModules['AlarmSchedule'].scheduleRecurringAlarm(path, String(alarmId), ts, days);

      try {
        if ((opts as any).persist !== false && NativeModules['AlarmStore']) {
          const toSave = { alarmId, scheduledAt: ts, title, body, timezone, data, wakeMethods, recurringDays: days };
          await NativeModules['AlarmStore'].saveAlarm(JSON.stringify(toSave));
        }
      } catch (e) {
        console.warn('Failed to persist recurring alarm natively', e);
      }
    } else {
      console.warn('AlarmSchedule.scheduleRecurringAlarm native method not available; skipping scheduling.');
    }
  } catch (err) {
    console.warn('scheduleRecurringAlarm failed', err);
  }
};
export const cancelRecurringAlarm = async (alarmId: string) => {
  try {
    try {
      if (Platform.OS === 'android' && NativeModules['AlarmSchedule']) {
        await NativeModules['AlarmSchedule'].cancelRecurringAlarm(alarmId);
      }
      if (Platform.OS === 'android' && NativeModules['AlarmStore']) {
       await NativeModules['AlarmStore'].removeAlarm(alarmId);        
      }
    } catch (e) {
      console.warn('Failed to remove persisted alarm', e);
    }
  } catch (err) {
    console.warn('cancelLocalAlarm failed', err);
  }
};

export const cancelAllAlarmsAndroid = async () => {
  try {
    if (Platform.OS === 'android' && NativeModules['AlarmSchedule']?.cancelAll) {
      await NativeModules['AlarmSchedule'].cancelAll();
      console.log('Cancelled all native alarms');
    } else {
      console.warn('AlarmSchedule.cancelAll native method not available');
    }
  } catch (err) {
    console.warn('cancelAllAlarmsAndroid failed', err);
  }
};


export default {
  scheduleLocalAlarm,
  cancelLocalAlarm,
  scheduleRecurringAlarm,
};
