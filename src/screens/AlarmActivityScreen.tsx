import { getAlarm, snoozeAlarm, triggeredAlarm } from '@api/alarms';
import { Alarm } from '@appTypes/types';
import {
  CommonActions,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { CustomButton } from '@components/customComponents/CustomButton';
import { CountdownButton } from '@components/CountdownButton';
import {
  formatDateString,
  formatLocalDate,
  formatLocalTime,
  formatTimeString,
} from '@utils/time';
import BigClock from '@assets/svg/BigClock.svg';
import UserIcon from '@assets/svg/UserIcon.svg';
import { NativeModules, BackHandler, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Immersive from 'react-native-immersive';
import { scheduleLocalAlarm } from '@services/alarmScheduler';
import { AuthNavigationProp } from '@appTypes/navigationTypes';
import { useSelector } from 'react-redux';
import { selectAccessToken, selectUserId } from '@store/auth/selectors';
import { useQueryClient } from '@tanstack/react-query';
import RNFS from 'react-native-fs';
import SoundPlayer from 'react-native-sound-player';
import {
  createLocalNotification,
  rescheduleAlarm,
} from '@services/ios-services/iosNativeWrappers';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isIos } from '@utils/condition';
import { stopPlayer } from '@services/ios-services/nativePlayer';
import LogoIconSvg from '@assets/svg/LogoIconSvg.svg';
import LinearGradient from 'react-native-linear-gradient';
import { renderWakeMethodActivity } from './previewAlarms/components/WakeMethodActivityContent';
import logger from '@utils/logger';
import { skipNextPrimaryAlarmsRefetch } from '@utils/alarmRefetchGate';
import { parseServerScheduled } from '@utils/createAlarmUtils';

const AUTO_WAKE_COMPLETE_AFTER_MS = 30 * 60 * 1000;

const resolveAlarmScheduledMs = (
  value: Alarm['scheduledAt'] | string | number | Date | null | undefined,
) => {
  if (value instanceof Date) {
    const ts = value.getTime();
    return Number.isFinite(ts) ? ts : undefined;
  }

  return parseServerScheduled(value);
};

const getAlarmStableId = (alarm: any) =>
  String(alarm?.id || alarm?.alarmId || '');

export const AlarmActivityScreen = () => {
  const route = useRoute();
  const myUserId = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);
  const navigation = useNavigation<AuthNavigationProp>();
  const { id } = (route.params ?? {}) as { id: string };
  const [alarmData, setAlarmData] = useState<Alarm | null>(null);
  const [completed, setCompleted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const queryClient = useQueryClient();
  const [closingLoader, setClosingLoader] = useState(false);

  useEffect(() => {
    const loadAlarm = async () => {
      if (!id) {
        logger.warn('[AlarmActivityScreen] No id provided, cannot load alarm');
        return;
      }
      try {
        try {
          const cacheKey = `alarm_cache_${id}`;
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            setAlarmData(parsed as Alarm);
          } else {
            const dto = await getAlarm(id);
            setAlarmData(dto);
          }
        } catch (cacheErr) {
          logger.warn(
            '[AlarmActivityScreen] Cache read failed, falling back to backend',
            cacheErr,
          );
          const dto = await getAlarm(id);
          setAlarmData(dto);
        }
      } catch (error) {
        logger.error('[AlarmActivityScreen] Error loading alarm:', error);
      }
    };

    loadAlarm();
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);

      if (Platform.OS === 'android') {
        try {
          Immersive.on();
        } catch {}
      }

      return () => {
        sub.remove();

        if (Platform.OS === 'android') {
          try {
            Immersive.off();
          } catch {}
        }
      };
    }, []),
  );

  useEffect(() => {
    const firstMethod: any = Array.isArray(alarmData?.wakeMethods)
      ? (alarmData!.wakeMethods as any[])[0]
      : null;

    if (firstMethod?.type === 'VIDEO') {
      try {
        const { AlarmSound } = NativeModules as any;
        if (AlarmSound && typeof AlarmSound.stopSound === 'function') {
          AlarmSound.stopSound();
        } else {
          logger.warn('AlarmSound native module not available');
        }
      } catch (e) {
        logger.warn('Failed to stop alarm service', e);
      }
    }
  }, [alarmData]);

  const handlePuzzleComplete = useCallback(() => {
    setCompleted(true);
  }, [setCompleted]);

  const syncCompletedAlarmInCache = useCallback(
    (alarm: Alarm | null) => {
      const rawAlarm = alarm as Record<string, any> | null;
      const alarmId = String(rawAlarm?.id || rawAlarm?.alarmId || id || '');

      if (!rawAlarm || !alarmId) {
        return;
      }

      const filterOutAlarm = (list: any[] | undefined) =>
        Array.isArray(list)
          ? list.filter(
              item => String(item?.id || item?.alarmId || '') !== alarmId,
            )
          : [];

      queryClient.setQueryData(
        ['alarms', 'upcoming'],
        (prev: any[] | undefined) => filterOutAlarm(prev),
      );

      queryClient.setQueryData(['alarms', 'next'], (prev: any) => {
        const nextId = String(prev?.id || prev?.alarmId || '');
        return nextId === alarmId ? null : prev;
      });

      if (!rawAlarm?.recurring) {
        queryClient.setQueryData(
          ['alarms', 'past'],
          (prev: any[] | undefined) => [rawAlarm, ...filterOutAlarm(prev)],
        );
      }
    },
    [id, queryClient],
  );

  const navigateToMyAlarmScreen = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['alarms', 'upcoming'],
    });
    queryClient.invalidateQueries({
      queryKey: ['alarms', 'past'],
    });
    queryClient.invalidateQueries({
      queryKey: ['alarms', 'next'],
    });
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'MyTabs',
            params: {
              screen: 'My Alarms',
              params: {
                screen: 'MyAlarmsMain',
              },
            },
          },
        ],
      }),
    );
  }, [navigation, queryClient]);

  const scheduled = String(alarmData?.scheduledAt ?? new Date().toISOString());

  const wakeUps: any[] = Array.isArray(alarmData?.wakeMethods)
    ? (alarmData!.wakeMethods as any[])
    : ([] as any[]);

  const currentMethod: any = wakeUps[currentIndex];

  const puzzleUri = useMemo(
    () => ({
      imageUri:
        currentMethod?.localPuzzleImagePath ||
        currentMethod?.puzzleUrl?.imageUrl ||
        alarmData?.puzzleImageUrl ||
        null,
      soundUri:
        currentMethod?.localPuzzleSoundPath ||
        currentMethod?.puzzleUrl?.soundUrl ||
        null,
    }),
    [
      alarmData?.puzzleImageUrl,
      currentMethod?.localPuzzleImagePath,
      currentMethod?.localPuzzleSoundPath,
      currentMethod?.puzzleUrl?.imageUrl,
      currentMethod?.puzzleUrl?.soundUrl,
    ],
  );

  const getWakeMethodAutoPlay = (type: string) => {
    if (isIos) return true;
    if (type === 'VIDEO') return true;

    const firstWakeMethod = wakeUps[0];
    const firstType =
      typeof firstWakeMethod === 'string'
        ? String(firstWakeMethod).toUpperCase()
        : String(firstWakeMethod?.type || '').toUpperCase();

    return !(currentIndex === 0 && firstType === type);
  };

  const currentWakeMethodType =
    typeof currentMethod === 'string'
      ? currentMethod.toUpperCase()
      : String(currentMethod?.type || '').toUpperCase();

  const currentWakeMethodContent = currentMethod
    ? renderWakeMethodActivity(currentMethod, alarmData, {
        puzzleUri,
        onPuzzleComplete: handlePuzzleComplete,
        autoPlay: getWakeMethodAutoPlay(currentWakeMethodType),
      })
    : null;

  const handleSnooze = async (minutes: 5 | 10 | 15) => {
    try {
      const alarmId = alarmData?.id || id;

      if (!alarmId) {
        logger.warn(
          '[AlarmActivityScreen] Missing alarm id, cannot snooze alarm',
        );
        return;
      }

      const snoozeBaseMs =
        resolveAlarmScheduledMs(alarmData?.scheduledAt) ?? Date.now();
      const newMs = snoozeBaseMs + minutes * 60 * 1000;
      const newScheduledAt = new Date(newMs).toISOString();
      const nextSelfDate =
        formatLocalDate(newScheduledAt) || newScheduledAt.slice(0, 10);
      const nextSelfTime =
        formatLocalTime(newScheduledAt) || newScheduledAt.slice(11, 16);
      const localScheduledAtOverrideUpdatedAt = Date.now();
      const alarmType = String(alarmData?.type || '').toUpperCase();
      logger.debug('snoozeBaseMs', snoozeBaseMs);
      logger.debug('newMs', newMs);

      const cacheKey = `alarm_cache_${alarmId}`;

      const localWakeMethods = Array.isArray(alarmData?.wakeMethods)
        ? alarmData.wakeMethods.map((m: any) =>
            typeof m === 'string' ? m.toUpperCase() : m.type,
          )
        : typeof alarmData?.wakeMethods === 'string'
        ? [alarmData.wakeMethods.toUpperCase()]
        : [];

      if (Platform.OS === 'android') {
        const snoozePayload = {
          alarmId,
          scheduledAt: newMs,
          timezone: alarmData?.timezone,
          title: 'Wake up',
          body: 'Your alarm is ringing',
          wakeMethods: localWakeMethods || [],
          data: {
            sound: alarmData ? alarmData?.localNotificationSound : 'default',
          },
        };
        logger.debug('snoozePayload', snoozePayload);
        logger.debug('alarmData', alarmData);

        await scheduleLocalAlarm(snoozePayload);

        const { AlarmSound } = NativeModules as any;
        if (AlarmSound && typeof AlarmSound.stopSound === 'function') {
          AlarmSound.stopSound();
        } else {
          logger.warn('AlarmSound native module not available');
        }
      } else if (Platform.OS === 'ios') {
        // Use only filename for iOS notifications (sound should be in Library/Sounds/)
        const soundFileName = alarmData?.localNotificationSound || 'default';
        logger.debug('soundFileName', soundFileName);
        logger.debug('alarmData', alarmData);

        const notification = createLocalNotification({
          id: String(alarmId),
          title: 'Wake up',
          body: 'Your alarm is ringing',
          soundPath: soundFileName,
          triggeredAt: newMs,
        });
        await rescheduleAlarm(notification);
      }

      try {
        let cachedAlarmData: Alarm | null = alarmData;

        if (!cachedAlarmData) {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            cachedAlarmData = JSON.parse(cached) as Alarm;
          }
        }

        if (cachedAlarmData) {
          const nextAlarmData = {
            ...cachedAlarmData,
            scheduledAt: newScheduledAt as any,
            localScheduledAtOverride: newScheduledAt,
            localScheduledAtOverrideUpdatedAt,
            ...(alarmType === 'SELF'
              ? {
                  date: nextSelfDate,
                  time: nextSelfTime,
                }
              : {}),
          };

          setAlarmData(nextAlarmData);

          await AsyncStorage.setItem(cacheKey, JSON.stringify(nextAlarmData));
        }
      } catch (cacheError) {
        logger.warn(
          '[AlarmActivityScreen] Failed to update alarm cache after snooze',
          cacheError,
        );
      }

      const updateAlarmTime = (item: any) => {
        if (!item) return item;

        const itemId = getAlarmStableId(item);
        if (itemId !== alarmId) {
          return item;
        }

        return {
          ...item,
          scheduledAt: newScheduledAt,
          localScheduledAtOverride: newScheduledAt,
          localScheduledAtOverrideUpdatedAt,
          ...(String(item?.type || alarmType).toUpperCase() === 'SELF'
            ? {
                date: nextSelfDate,
                time: nextSelfTime,
              }
            : {}),
        };
      };

      const sortAlarmListByScheduledAt = (list: any[]) =>
        [...list].sort((a, b) => {
          const aTs =
            resolveAlarmScheduledMs(
              a?.localScheduledAtOverride ?? a?.scheduledAt,
            ) ?? Number.MAX_SAFE_INTEGER;
          const bTs =
            resolveAlarmScheduledMs(
              b?.localScheduledAtOverride ?? b?.scheduledAt,
            ) ?? Number.MAX_SAFE_INTEGER;
          return aTs - bTs;
        });

      const buildSnoozedAlarmRecord = (seed?: any) =>
        updateAlarmTime(
          seed ?? {
            ...(alarmData as any),
            id: alarmId,
            alarmId: alarmData?.alarmId ?? alarmId,
          },
        );

      const upsertAlarmList = (list: any[] | undefined) => {
        const nextList = Array.isArray(list) ? [...list] : [];
        const existingIndex = nextList.findIndex(
          item => getAlarmStableId(item) === alarmId,
        );

        if (existingIndex >= 0) {
          nextList[existingIndex] = buildSnoozedAlarmRecord(
            nextList[existingIndex],
          );
        } else {
          nextList.push(buildSnoozedAlarmRecord());
        }

        return sortAlarmListByScheduledAt(nextList);
      };

      queryClient.setQueryData(['alarms', 'next'], (prev: any) => {
        if (!prev) {
          return buildSnoozedAlarmRecord();
        }

        const prevId = getAlarmStableId(prev);
        if (prevId === alarmId) {
          return buildSnoozedAlarmRecord(prev);
        }

        const prevTs = resolveAlarmScheduledMs(
          prev?.localScheduledAtOverride ?? prev?.scheduledAt,
        );

        return !prevTs || newMs <= prevTs ? buildSnoozedAlarmRecord() : prev;
      });
      queryClient.setQueryData(
        ['alarms', 'upcoming'],
        (prev: any[] | undefined) => upsertAlarmList(prev),
      );
      queryClient.setQueryData(['alarms', 'sent'], (prev: any[] | undefined) =>
        Array.isArray(prev) ? prev.map(updateAlarmTime) : prev,
      );
      queryClient.setQueryData(['alarms', 'past'], (prev: any[] | undefined) =>
        Array.isArray(prev)
          ? prev.filter(item => getAlarmStableId(item) !== alarmId)
          : prev,
      );

      const syncSnoozePromise = snoozeAlarm(alarmId, { minutes });

      void syncSnoozePromise
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['alarms'] });
        })
        .catch(error => {
          const responseStatus = (error as any)?.response?.status;
          const responseData = (error as any)?.response?.data;
          const requestUrl = (error as any)?.config?.url;

          logger.warn(
            '[AlarmActivityScreen] Snooze synced locally but backend update failed',
            {
              alarmId,
              minutes,
              requestUrl,
              responseStatus,
              responseData,
              hasAccessToken: Boolean(accessToken),
              currentUserId: myUserId,
              alarmType: alarmData?.type ?? null,
              alarmOwnerId: alarmData?.ownerId ?? null,
              alarmCreatedById: alarmData?.createdById ?? null,
              alarmApprovalStatus: alarmData?.approvalStatus ?? null,
              syncStrategy:
                alarmType === 'SELF' ? 'updateSelfAlarm' : 'snoozeAlarm',
              error,
            },
          );
        });

      skipNextPrimaryAlarmsRefetch();
      navigation.goBack();
    } catch (e) {
      logger.warn('[AlarmActivityScreen] Failed to schedule snooze', e);
    }
  };
  const handleWakeUpComplete = async () => {
    try {
      const { AlarmSound } = NativeModules as any;
      if (AlarmSound && typeof AlarmSound.stopSound === 'function') {
        AlarmSound.stopSound();
      } else {
        logger.warn('AlarmSound native module not available');
      }
    } catch (e) {
      logger.warn('Failed to stop alarm service', e);
    }
    if (currentIndex < wakeUps.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      if (isIos) {
        stopPlayer();
      } else SoundPlayer.stop();

      if (!id || !alarmData) {
        logger.warn(
          '[AlarmActivityScreen] Missing alarm context on wake complete, returning to MyAlarmScreen',
          { id, hasAlarmData: !!alarmData },
        );
        navigateToMyAlarmScreen();
        return;
      }

      try {
        await triggeredAlarm(id);
      } catch (error) {
        logger.warn('Failed to trigger alarm:', error);
      }

      syncCompletedAlarmInCache(alarmData);

      if (
        alarmData?.ownerId === myUserId ||
        alarmData?.createdById === myUserId
      ) {
        try {
          setClosingLoader(true);
          if (!alarmData?.recurring) {
            const cacheKey = `alarm_cache_${id}`;

            try {
              const cached = await AsyncStorage.getItem(cacheKey);
              if (cached) {
                const alarm = JSON.parse(cached);
                const filesToDelete: string[] = [];

                if (alarm.localNotificationSound) {
                  filesToDelete.push(
                    alarm.localNotificationSound.replace('file://', ''),
                  );
                  if (Array.isArray(alarm.wakeMethods)) {
                    alarm.wakeMethods.forEach((method: any) => {
                      if (method.localVideoPath) {
                        filesToDelete.push(
                          method.localVideoPath.replace('file://', ''),
                        );
                      }
                      if (method.localVoicePath) {
                        filesToDelete.push(
                          method.localVoicePath.replace('file://', ''),
                        );
                      }
                      if (method.localSongPath) {
                        filesToDelete.push(
                          method.localSongPath.replace('file://', ''),
                        );
                      }
                      if (method.localPuzzleImagePath) {
                        filesToDelete.push(
                          method.localPuzzleImagePath.replace('file://', ''),
                        );
                      }
                      if (method.localPuzzleSoundPath) {
                        filesToDelete.push(
                          method.localPuzzleSoundPath.replace('file://', ''),
                        );
                      }
                      if (method.localSongPath) {
                        filesToDelete.push(
                          method.localSongPath.replace('file://', ''),
                        );
                      }
                    });
                  }
                }

                await Promise.all(
                  filesToDelete.map(async path => {
                    try {
                      const exists = await RNFS.exists(path);
                      if (exists) {
                        await RNFS.unlink(path);
                        logger.debug(
                          '[AlarmActivityScreen] Deleted media file:',
                          path,
                        );
                      }
                    } catch (err) {
                      logger.warn(
                        '[AlarmActivityScreen] Failed to delete file:',
                        path,
                        err,
                      );
                    }
                  }),
                );
              }
            } catch (err) {
              logger.warn(
                '[AlarmActivityScreen] Failed to delete media files',
                err,
              );
            }

            await AsyncStorage.removeItem(cacheKey);
            logger.debug(
              '[AlarmActivityScreen] Deleted alarm cache:',
              cacheKey,
            );
          }
        } catch (e) {
          logger.warn('[AlarmActivityScreen] Failed to delete alarm cache', e);
        } finally {
          setClosingLoader(false);
        }
        navigateToMyAlarmScreen();
      } else {
        if (alarmData) {
          navigation.replace('ShareAlarmScreen', {
            id: alarmData?.id || '',
            alarmData: alarmData || undefined,
          });
        }
      }
    }
  };

  useEffect(() => {
    if (!id) return;

    const timeout = setTimeout(() => {
      logger.debug(
        '[AlarmActivityScreen] Auto-closing alarm screen after 30 minutes',
        { alarmId: id },
      );

      try {
        const { AlarmSound } = NativeModules as any;
        if (AlarmSound && typeof AlarmSound.stopSound === 'function') {
          AlarmSound.stopSound();
        }
      } catch (e) {
        logger.warn(
          '[AlarmActivityScreen] Failed to stop alarm service on auto-close',
          e,
        );
      }

      try {
        if (isIos) {
          stopPlayer();
        } else {
          SoundPlayer.stop();
        }
      } catch (e) {
        logger.warn(
          '[AlarmActivityScreen] Failed to stop playback on auto-close',
          e,
        );
      }

      navigateToMyAlarmScreen();
    }, AUTO_WAKE_COMPLETE_AFTER_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [id, navigateToMyAlarmScreen]);
  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <View className="flex-1 w-full pb-9">
        <LinearGradient
          colors={['#3C1053', '#550844']}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View className="items-center">
            {/* <Image source={require('@assets/img/Logo.png')} /> */}
            <LogoIconSvg />
          </View>
          {!alarmData ? (
            <View
              className={`mb-4 m-4 p-[10px] h-[370px] border border-border2Color rounded-xl flex-row ${'justify-center'}`}
              style={{ backgroundColor: 'rgba(72, 23, 96, 0.2)' }}
            >
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : (
            <View className="mx-4 mt-4">
              <View key={`wakemethod-${currentIndex}-${currentWakeMethodType}`}>
                {currentWakeMethodContent}
              </View>
            </View>
          )}
          {!alarmData ? (
            <View
              className={`mb-4 m-4 p-[10px] h-[73px] border border-border2Color rounded-xl flex-row ${'justify-center'}`}
              style={{ backgroundColor: 'rgba(72, 23, 96, 0.2)' }}
            >
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : (
            <View
              className={`mb-4 m-4 p-[10px] border border-border2Color rounded-xl flex-row ${
                alarmData?.friendUserId ? '' : 'justify-center'
              }`}
              style={{ backgroundColor: 'rgba(72, 23, 96, 0.2)' }}
            >
              {alarmData?.friendUserId && (
                <View className="w-[54px] h-[54px] mr-[10px] rounded-full bg-white/10 items-center justify-center">
                  <UserIcon />
                </View>
              )}
              <View
                className={`${alarmData?.friendUserId ? '' : 'items-center'}`}
              >
                <Text className="text-white6Color font-regular text-xs">
                  {formatDateString(scheduled)}
                </Text>
                <View className="flex-row items-center justify-center gap-1">
                  <BigClock width={24} height={24} />

                  <Text className="text-white text-3xl mt-1 font-regular">
                    {formatTimeString(scheduled)}
                  </Text>
                </View>
              </View>
            </View>
          )}
          <View className="flex-1 justify-end px-4">
            <CountdownButton
              initialSeconds={15}
              completed={completed}
              onPress={handleWakeUpComplete}
              loading={closingLoader}
            />

            <View className="flex-row items-center justify-center my-4">
              <View className="border-t border-border2Color flex-1" />
              <Text className="mx-4 font-semibold text-base text-border2Color">
                Remind
              </Text>
              <View className="border-t border-border2Color flex-1" />
            </View>

            <View className="flex-row" style={{ gap: 12 }}>
              <CustomButton
                title="+ 5 min"
                onPress={() => {
                  handleSnooze(5);
                }}
                style="border-white flex-1 bg-whiteWithTransparentColor"
                textStyle="text-white text-[17px] font-semibold"
              />
              <CustomButton
                title="+ 10 min"
                onPress={() => {
                  handleSnooze(10);
                }}
                style="border-white flex-1 bg-whiteWithTransparentColor"
                textStyle="text-white text-[17px] font-semibold"
              />
              <CustomButton
                title="+ 15 min"
                onPress={() => {
                  handleSnooze(15);
                }}
                style="border-white flex-1 bg-whiteWithTransparentColor"
                textStyle="text-white text-[17px] font-semibold"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
