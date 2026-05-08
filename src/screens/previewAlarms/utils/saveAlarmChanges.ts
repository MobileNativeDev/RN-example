import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alarm } from '@appTypes/types';
import {
  normalizeDate,
  normalizeTime,
  buildLocalTimestamp,
  getNextDateStringForRecurring,
} from '@utils/time';
import {
  copySoundToAppStorage,
  copyVideoToAppStorage,
  getNotificationSound,
  normalizeUri,
} from '@utils/additionFunctions';
import { cacheWakeMethodsLocally } from '@utils/cacheWakeMethods';
import {
  scheduleLocalAlarm,
  scheduleRecurringAlarm,
} from '@services/alarmScheduler';
import {
  cancelAlarms,
  cancelRecurringAlarm,
  createLocalNotification,
  rescheduleAlarm,
  Weekday,
} from '@services/ios-services/iosNativeWrappers';
import { processWakeMethods } from './processWakeMethods';
import { WakeMethodMediaOverride } from './wakeMethodOverrides';

import { Alert } from '@utils/alert';

export class AlarmChangesSavedWithWarningError extends Error {
  updatedData: any;

  constructor(message: string, updatedData: any, cause?: unknown) {
    super(message);
    this.name = 'AlarmChangesSavedWithWarningError';
    this.updatedData = updatedData;
    if (cause !== undefined) {
      (this as any).cause = cause;
    }
  }
}

export interface SaveAlarmParams {
  chosenAlarm: Alarm;
  alarmData: Alarm | null;
  chosenDate: string;
  chosenTime: string;
  recurring: boolean;
  recurringDays: string[];
  imageUri: string | null;
  puzzleSoundUri: string | number | null;
  puzzleSongName: string | null;
  voiceUri: string | number | null;
  voiceName: string | null;
  voiceOverrides?: Record<string, WakeMethodMediaOverride>;
  songUri: string | number | null;
  songName: string | null;
  songOverrides?: Record<string, WakeMethodMediaOverride>;
  videoUri: string | null;
  voiceDeleted: boolean;
  songDeleted: boolean;
  puzzleDeleted: boolean;
  videoDeleted: boolean;
  uploadAssets: (alarmId: string, wakeMethods: any[]) => Promise<any[]>;
  updateMutation: any;
  onSuccess: (updatedData: any) => void;
}

export const saveAlarmChanges = async (params: SaveAlarmParams) => {
  const {
    chosenAlarm,
    alarmData,
    chosenDate,
    chosenTime,
    recurring,
    recurringDays,
    imageUri,
    puzzleSoundUri,
    puzzleSongName,
    voiceUri,
    voiceName,
    voiceOverrides,
    songUri,
    songName,
    songOverrides,
    videoUri,
    voiceDeleted,
    songDeleted,
    puzzleDeleted,
    videoDeleted,
    uploadAssets,
    updateMutation,
    onSuccess,
  } = params;

  let originalLocalPaths: any[] = [];

  let tz =
    Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone || 'Europe/Kyiv';
  if (tz === 'Europe/Kiev') tz = 'Europe/Kyiv';

  const normalizedDate = normalizeDate(chosenDate);
  const normalizedTime = normalizeTime(chosenTime);

  if ((chosenDate && !normalizedDate) || (chosenTime && !normalizedTime)) {
    Alert.alert(
      'Invalid date/time',
      'Please select a valid date and time before saving.',
    );
    throw new Error('Invalid date/time');
  }

  const wakeMethods =
    Array.isArray(alarmData?.wakeMethods) && alarmData.wakeMethods.length > 0
      ? alarmData.wakeMethods
      : Array.isArray(chosenAlarm.wakeMethods)
      ? chosenAlarm.wakeMethods
      : [];

  let baseWakeMethods = processWakeMethods(wakeMethods, {
    imageUri,
    puzzleSoundUri,
    puzzleSongName,
    voiceUri,
    voiceName,
    voiceOverrides,
    songUri,
    songName,
    songOverrides,
    videoUri,
    voiceDeleted,
    songDeleted,
    puzzleDeleted,
    videoDeleted,
  });

  const hasPuzzle = wakeMethods.some(
    (m: any) =>
      (typeof m === 'string' && m.toUpperCase() === 'PUZZLE') ||
      m.type === 'PUZZLE',
  );

  originalLocalPaths = baseWakeMethods.map((m: any, idx: number) => {
    const cachedMethod: any = wakeMethods[idx] || {};
    return {
      type: m.type,
      _originalLocalPath: m._originalLocalPath,
      _originalLocalImagePath: m._originalLocalImagePath,
      _originalLocalSoundPath: m._originalLocalSoundPath,
      _existingLocalVoicePath:
        !m._originalLocalPath &&
        cachedMethod.localVoicePath?.startsWith('file://')
          ? cachedMethod.localVoicePath
          : null,
      _existingLocalSongPath:
        !m._originalLocalPath &&
        cachedMethod.localSongPath?.startsWith('file://')
          ? cachedMethod.localSongPath
          : null,
      _existingLocalVideoPath:
        !m._originalLocalPath &&
        cachedMethod.localVideoPath?.startsWith('file://')
          ? cachedMethod.localVideoPath
          : null,
      _existingLocalPuzzleImagePath:
        !m._originalLocalImagePath &&
        cachedMethod.localPuzzleImagePath?.startsWith('file://')
          ? cachedMethod.localPuzzleImagePath
          : null,
      _existingLocalPuzzleSoundPath:
        !m._originalLocalSoundPath &&
        cachedMethod.localPuzzleSoundPath?.startsWith('file://')
          ? cachedMethod.localPuzzleSoundPath
          : null,
    };
  });

  console.log(
    '[saveAlarmChanges] Original local paths saved:',
    originalLocalPaths,
  );

  let updatedNotificationSound: string | null =
    alarmData?.localNotificationSound || null;
  let updatedNotificationVideo: string | null = null;

  if (baseWakeMethods.length > 0) {
    const firstMethod = baseWakeMethods[0];
    const firstType = firstMethod.type?.toUpperCase();

    let mediaChanged = false;
    let newMediaUri: string | null = null;

    if (firstType === 'VOICE' && firstMethod._originalLocalPath) {
      mediaChanged = true;
      newMediaUri = firstMethod._originalLocalPath;
    } else if (firstType === 'SONG' && firstMethod._originalLocalPath) {
      mediaChanged = true;
      newMediaUri = firstMethod._originalLocalPath;
    } else if (firstType === 'VIDEO' && firstMethod._originalLocalPath) {
      mediaChanged = true;
      newMediaUri = firstMethod._originalLocalPath;
    } else if (firstType === 'PUZZLE' && firstMethod._originalLocalSoundPath) {
      mediaChanged = true;
      newMediaUri = firstMethod._originalLocalSoundPath;
    }

    if (mediaChanged && newMediaUri) {
      try {
        if (firstType === 'VIDEO') {
          updatedNotificationVideo = await copyVideoToAppStorage(
            normalizeUri(newMediaUri),
          );
          updatedNotificationSound = null;
        } else {
          updatedNotificationSound = await copySoundToAppStorage(
            normalizeUri(newMediaUri),
          );
          updatedNotificationVideo = null;
        }
        console.log('[saveAlarmChanges] Updated notification media:', {
          type: firstType,
          sound: updatedNotificationSound,
          video: updatedNotificationVideo,
        });
      } catch (err) {
        console.warn(
          '[saveAlarmChanges] Failed to copy notification media:',
          err,
        );
      }
    }
  }

  baseWakeMethods = baseWakeMethods.map((m: any) => {
    const {
      _originalLocalPath,
      _originalLocalImagePath,
      _originalLocalSoundPath,
      ...rest
    } = m;
    return rest;
  });

  try {
    baseWakeMethods = (await uploadAssets(
      chosenAlarm.id,
      baseWakeMethods as any,
    )) as any[];
  } catch (assetErr) {
    console.warn('Asset upload failed (skipping)', assetErr);
  }

  const VALID_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  if (recurring && (!recurringDays || recurringDays.length === 0)) {
    Alert.alert(
      'Missing recurring days',
      'Please select at least one day for a recurring alarm.',
    );
    throw new Error('Missing recurring days');
  }

  const recurringDaysPayload = recurring
    ? recurringDays
        .map(d => String(d).toUpperCase())
        .filter(d => VALID_DAYS.includes(d))
    : [];

  const timeForCalc = normalizedTime || chosenAlarm.time || '00:00';
  const localTsForChosen = buildLocalTimestamp(normalizedDate, timeForCalc);
  let dateForPayload = normalizedDate || undefined;
  if (recurring) {
    if (!localTsForChosen || localTsForChosen <= Date.now()) {
      dateForPayload = getNextDateStringForRecurring(
        recurringDaysPayload,
        timeForCalc,
      );
    }
  }

  const payload: any = {
    date: dateForPayload || undefined,
    time: normalizedTime || undefined,
    timezone: tz,
    recurring,
    wakeMethods: baseWakeMethods,
    recurringDays: recurringDaysPayload,
  };
  if (hasPuzzle) {
    payload.pieces = 2;
  }

  const updated = await updateMutation.mutateAsync({
    id: chosenAlarm.id,
    payload,
  });

  if (Array.isArray(updated?.wakeMethods) && Array.isArray(baseWakeMethods)) {
    updated.wakeMethods = updated.wakeMethods.map(
      (method: any, idx: number) => {
        const nextMethod = baseWakeMethods[idx];
        const type = String(method?.type || '').toUpperCase();

        if (type === 'VOICE' && !method?.voiceName && nextMethod?.voiceName) {
          return {
            ...method,
            voiceName: nextMethod.voiceName,
          };
        }

        if (type === 'SONG' && !method?.songName && nextMethod?.songName) {
          return {
            ...method,
            songName: nextMethod.songName,
          };
        }

        if (type === 'PUZZLE' && !method?.songName && nextMethod?.songName) {
          return {
            ...method,
            songName: nextMethod.songName,
          };
        }

        return method;
      },
    );
  }

  console.log('updated', updated);

  const serverScheduled =
    (updated as any)?.scheduledAt || alarmData?.scheduledAt;

  const parseServerScheduled = (v: any): number | undefined => {
    if (v == null) return undefined;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      if (/^\d+$/.test(v)) return parseInt(v, 10);
      const parsed = Date.parse(v);
      if (!isNaN(parsed)) return parsed;
    }
    return undefined;
  };

  const localTs = buildLocalTimestamp(payload.date, payload.time);
  if (typeof localTs !== 'number' || isNaN(localTs)) {
    Alert.alert(
      'Invalid date/time',
      'The selected date and time are invalid. Please correct them before saving.',
    );
    throw new Error('Invalid date/time');
  }

  const serverTs = parseServerScheduled(serverScheduled);
  const scheduledAtToUse = localTs ?? serverTs;
  const newScheduled =
    typeof scheduledAtToUse === 'number' && isFinite(scheduledAtToUse)
      ? scheduledAtToUse
      : Date.now();

  updated.scheduledAt = new Date(newScheduled).toISOString();
  updated.timezone = tz;

  const localWakeMethods = Array.isArray(updated.wakeMethods)
    ? updated.wakeMethods.map((m: any) =>
        typeof m === 'string' ? m.toUpperCase() : m.type,
      )
    : typeof updated.wakeMethods === 'string'
    ? [updated.wakeMethods.toUpperCase()]
    : [];

  const editPayload = {
    alarmId: alarmData?.id || '',
    scheduledAt: newScheduled,
    timezone: alarmData?.timezone,
    title: 'Wake up',
    body: 'Your alarm is ringing',
    wakeMethods: localWakeMethods || [],
    data: {
      sound: updatedNotificationSound || 'default',
    },
  };

  let localSyncError: unknown = null;

  try {
    if (Platform.OS === 'android') {
      if (recurring) {
        const sound =
          updatedNotificationSound ||
          alarmData?.localNotificationSound ||
          'default';

        await scheduleRecurringAlarm({
          alarmId: alarmData?.id || '',
          scheduledAt: newScheduled,
          timezone: tz,
          title: 'Wake up',
          body: 'Your alarm is ringing',
          wakeMethods: localWakeMethods,
          recurringDays: recurringDaysPayload,
          data: {
            sound: alarmData ? sound : 'default',
          },
        });
      } else {
        await scheduleLocalAlarm(editPayload);
      }
    } else {
      let soundPath =
        updatedNotificationSound || updatedNotificationVideo || null;

      if (updatedNotificationVideo) {
        soundPath = await getNotificationSound(
          updatedNotificationVideo,
          alarmData?.id,
        );
      } else if (
        updatedNotificationSound &&
        updatedNotificationSound !== 'default'
      ) {
        if (!updatedNotificationSound.includes('.caf')) {
          soundPath = await getNotificationSound(
            updatedNotificationSound,
            alarmData?.id,
          );
        } else {
          soundPath = updatedNotificationSound;
        }
      }

      const notification = createLocalNotification({
        id: String(alarmData?.id),
        title: 'Wake up',
        body: 'Your alarm is ringing',
        soundPath: soundPath || 'default',
        triggeredAt: newScheduled,
      });

      try {
        if (alarmData?.recurring) {
          await cancelRecurringAlarm(String(alarmData?.id));
          notification.weekdays = recurringDaysPayload as Weekday[];
        } else {
          await cancelAlarms(String(alarmData?.id));
        }
      } catch (cancelErr) {
        console.warn(
          '[saveAlarmChanges] Failed to cancel existing alarm before reschedule',
          cancelErr,
        );
      }

      await rescheduleAlarm(notification);
    }
  } catch (syncErr) {
    localSyncError = syncErr;
    console.warn(
      '[saveAlarmChanges] Remote update succeeded but local alarm sync failed',
      syncErr,
    );
  }

  await updateAlarmCache({
    chosenAlarm,
    alarmData,
    updated,
    updatedNotificationSound,
    updatedNotificationVideo,
    originalLocalPaths,
  });

  if (localSyncError) {
    throw new AlarmChangesSavedWithWarningError(
      'Alarm updated, but local alarm sync failed.',
      updated,
      localSyncError,
    );
  }

  onSuccess(updated);
};

async function updateAlarmCache({
  chosenAlarm,
  alarmData,
  updated,
  updatedNotificationSound,
  updatedNotificationVideo,
  originalLocalPaths,
}: {
  chosenAlarm: Alarm;
  alarmData: Alarm | null;
  updated: any;
  updatedNotificationSound: string | null;
  updatedNotificationVideo: string | null;
  originalLocalPaths: any[];
}) {
  try {
    const cacheKey = `alarm_cache_${updated?.id || chosenAlarm.id}`;
    const existing = await AsyncStorage.getItem(cacheKey);
    let existingObj: any = null;
    try {
      existingObj = existing ? JSON.parse(existing) : null;
    } catch (e) {
      existingObj = null;
    }

    const ownerIdValue =
      (updated &&
        ((updated as any).ownerId ||
          (updated as any).createdById ||
          (updated as any).createdBy)) ||
      alarmData?.ownerId ||
      existingObj?.ownerId ||
      chosenAlarm?.ownerId ||
      chosenAlarm?.createdBy ||
      null;

    let updatedWakeMethods = Array.isArray(updated.wakeMethods)
      ? JSON.parse(JSON.stringify(updated.wakeMethods))
      : [];

    const existingWakeMethods = Array.isArray(existingObj?.wakeMethods)
      ? existingObj.wakeMethods
      : [];

    updatedWakeMethods = updatedWakeMethods.map((method: any, idx: number) => {
      const existingMethod = existingWakeMethods[idx];
      const originalPaths = originalLocalPaths[idx]; // Оригінальні локальні шляхи
      const type = typeof method === 'string' ? method : method.type;

      if (originalPaths) {
        if (type === 'VOICE' && originalPaths._originalLocalPath) {
          method.localVoicePath = originalPaths._originalLocalPath;
          method._hasLocalCache = true;
          console.log(
            '[updateAlarmCache] Using original local path for VOICE:',
            originalPaths._originalLocalPath,
          );
          return method;
        } else if (type === 'SONG' && originalPaths._originalLocalPath) {
          method.localSongPath = originalPaths._originalLocalPath;
          method._hasLocalCache = true;
          return method;
        } else if (type === 'VIDEO' && originalPaths._originalLocalPath) {
          method.localVideoPath = originalPaths._originalLocalPath;
          method._hasLocalCache = true;
          console.log(
            '[updateAlarmCache] Using original local path for VIDEO:',
            originalPaths._originalLocalPath,
          );
          return method;
        } else if (type === 'PUZZLE') {
          if (originalPaths._originalLocalImagePath) {
            method.localPuzzleImagePath = originalPaths._originalLocalImagePath;
          }
          if (originalPaths._originalLocalSoundPath) {
            method.localPuzzleSoundPath = originalPaths._originalLocalSoundPath;
          }
          if (
            originalPaths._originalLocalImagePath ||
            originalPaths._originalLocalSoundPath
          ) {
            method._hasLocalCache = true;
            return method;
          }
        }

        if (type === 'VOICE' && originalPaths._existingLocalVoicePath) {
          method.localVoicePath = originalPaths._existingLocalVoicePath;
          method._hasLocalCache = true;
          console.log(
            '[updateAlarmCache] Restoring existing local path for VOICE:',
            originalPaths._existingLocalVoicePath,
          );
          return method;
        } else if (type === 'SONG' && originalPaths._existingLocalSongPath) {
          method.localSongPath = originalPaths._existingLocalSongPath;
          method._hasLocalCache = true;
          return method;
        } else if (type === 'VIDEO' && originalPaths._existingLocalVideoPath) {
          method.localVideoPath = originalPaths._existingLocalVideoPath;
          method._hasLocalCache = true;
          console.log(
            '[updateAlarmCache] Restoring existing local path for VIDEO:',
            originalPaths._existingLocalVideoPath,
          );
          return method;
        } else if (type === 'PUZZLE') {
          let hasCache = false;
          if (originalPaths._existingLocalPuzzleImagePath) {
            method.localPuzzleImagePath =
              originalPaths._existingLocalPuzzleImagePath;
            hasCache = true;
          }
          if (originalPaths._existingLocalPuzzleSoundPath) {
            method.localPuzzleSoundPath =
              originalPaths._existingLocalPuzzleSoundPath;
            hasCache = true;
          }
          if (hasCache) {
            method._hasLocalCache = true;
            return method;
          }
        }
      }

      if (existingMethod && existingMethod.type === type) {
        if (type === 'VOICE') {
          if (!method.voiceName && existingMethod.voiceName) {
            method.voiceName = existingMethod.voiceName;
          }
          if (
            method.voiceUrl === existingMethod.voiceUrl &&
            existingMethod.localVoicePath
          ) {
            method.localVoicePath = existingMethod.localVoicePath;
            method._hasLocalCache = true; // Помічаємо що вже є кеш
          }
        } else if (type === 'SONG') {
          if (!method.songName && existingMethod.songName) {
            method.songName = existingMethod.songName;
          }
          if (
            method.songUrl === existingMethod.songUrl &&
            existingMethod.localSongPath
          ) {
            method.localSongPath = existingMethod.localSongPath;
            method._hasLocalCache = true;
          }
        } else if (type === 'VIDEO') {
          if (
            method.videoUrl === existingMethod.videoUrl &&
            existingMethod.localVideoPath
          ) {
            method.localVideoPath = existingMethod.localVideoPath;
            method._hasLocalCache = true;
          }
        } else if (type === 'PUZZLE') {
          if (!method.songName && existingMethod.songName) {
            method.songName = existingMethod.songName;
          }
          if (
            method.puzzleUrl?.imageUrl === existingMethod.puzzleUrl?.imageUrl &&
            existingMethod.localPuzzleImagePath
          ) {
            method.localPuzzleImagePath = existingMethod.localPuzzleImagePath;
          }
          if (
            method.puzzleUrl?.soundUrl === existingMethod.puzzleUrl?.soundUrl &&
            existingMethod.localPuzzleSoundPath
          ) {
            method.localPuzzleSoundPath = existingMethod.localPuzzleSoundPath;
          }
          if (
            existingMethod.localPuzzleImagePath ||
            existingMethod.localPuzzleSoundPath
          ) {
            method._hasLocalCache = true;
          }
        }
      }

      return method;
    });

    try {
      const methodsToCache = updatedWakeMethods.filter(
        (m: any) => !m._hasLocalCache,
      );
      console.log(
        '[updateAlarmCache] Methods to cache:',
        methodsToCache.length,
        'out of',
        updatedWakeMethods.length,
      );
      if (methodsToCache.length > 0) {
        const localPathsBeforeCache = methodsToCache.map((m: any) => ({
          type: m.type,
          id: m.id,
          localVoicePath: m.localVoicePath,
          localSongPath: m.localSongPath,
          localVideoPath: m.localVideoPath,
          localPuzzleImagePath: m.localPuzzleImagePath,
          localPuzzleSoundPath: m.localPuzzleSoundPath,
        }));

        await cacheWakeMethodsLocally(methodsToCache);

        methodsToCache.forEach((method: any, idx: number) => {
          const savedPaths = localPathsBeforeCache[idx];
          if (
            savedPaths.localVoicePath &&
            savedPaths.localVoicePath.startsWith('file://')
          ) {
            method.localVoicePath = savedPaths.localVoicePath;
          }
          if (
            savedPaths.localSongPath &&
            savedPaths.localSongPath.startsWith('file://')
          ) {
            method.localSongPath = savedPaths.localSongPath;
          }
          if (
            savedPaths.localVideoPath &&
            savedPaths.localVideoPath.startsWith('file://')
          ) {
            method.localVideoPath = savedPaths.localVideoPath;
          }
          if (
            savedPaths.localPuzzleImagePath &&
            savedPaths.localPuzzleImagePath.startsWith('file://')
          ) {
            method.localPuzzleImagePath = savedPaths.localPuzzleImagePath;
          }
          if (
            savedPaths.localPuzzleSoundPath &&
            savedPaths.localPuzzleSoundPath.startsWith('file://')
          ) {
            method.localPuzzleSoundPath = savedPaths.localPuzzleSoundPath;
          }
        });

        updatedWakeMethods = updatedWakeMethods.map((method: any) => {
          const cached = methodsToCache.find(
            (m: any) =>
              m.type === method.type &&
              (m.id === method.id ||
                JSON.stringify(m) === JSON.stringify(method)),
          );
          if (cached) {
            console.log(
              '[updateAlarmCache] Updating method with cached data:',
              cached.type,
              {
                localVoicePath: cached.localVoicePath,
                localSongPath: cached.localSongPath,
                localVideoPath: cached.localVideoPath,
              },
            );
            return { ...method, ...cached };
          }
          return method;
        });
      }

      updatedWakeMethods = updatedWakeMethods.map((m: any) => {
        const { _hasLocalCache, ...rest } = m;
        return rest;
      });
    } catch (cacheErr) {
      console.warn(
        '[updateAlarmCache] Failed to cache wake methods locally:',
        cacheErr,
      );
    }

    const toCache = {
      ...(updated || {}),
      ownerId: ownerIdValue,
      localNotificationSound:
        updatedNotificationSound ||
        updatedNotificationVideo ||
        alarmData?.localNotificationSound ||
        existingObj?.localNotificationSound ||
        null,
      wakeMethods: updatedWakeMethods,
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(toCache));
  } catch (cacheErr) {
    console.warn('[updateAlarmCache] Failed to update cache', cacheErr);
  }
}
