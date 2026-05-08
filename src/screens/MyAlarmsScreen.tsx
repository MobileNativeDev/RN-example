import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthNavigationProp } from '../appTypes/navigationTypes';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  AppState,
} from 'react-native';
import { Alert } from '@utils/alert';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { EmptyAlarms } from '../components/myAlarms/EmptyAlarms';
import ClockAddAlarmIcon from '../../assets/svg/ClockAddAlarmIcon.svg';
import LinearGradient from 'react-native-linear-gradient';
import { NextAlarm } from '@components/myAlarms/NextAlarm';
import { UpcomingAlarms } from '@components/myAlarms/UpcomingAlarms';
import { PastAlarms } from '@components/myAlarms/PastAlarms';
import { SentAlarms } from '@components/myAlarms/SentAlarms';
import {
  useNextAlarm,
  useUpcomingAlarms,
  usePastAlarms,
  useSentAlarms,
  useDeleteAlarm,
} from '../hooks/useAlarms';
import { Alarm } from '@appTypes/types';
import {
  cancelLocalAlarm,
  cancelRecurringAlarm as cancelRecurringAlarmAndroid,
} from '../services/alarmScheduler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoaderModal } from '../components/LoaderModal';
import { requestBatteryOptimizationPermission } from '@services/permissions';
import SoundPlayer from 'react-native-sound-player';
import { cancelAlarms, removeAlarm } from '@services/ios-services';
import { cancelRecurringAlarm as cancelRecurringAlarmIos } from '@services/ios-services/iosNativeWrappers';
import { useSelector } from 'react-redux';
import { selectAuthUser, selectUserId } from '@store/auth/selectors';
import { useAlarmBootstrapSnapshot } from '@hooks/useAlarmBootstrapSnapshot';
import { MyAlarmsInitialState } from '@components/myAlarms/MyAlarmsInitialState';
import { mapAlarmDtoToViewModel } from '@services/alarmBootstrap/alarmViewModel';
import { consumePrimaryAlarmsRefetchSkip } from '@utils/alarmRefetchGate';
import { parseServerScheduled } from '@utils/createAlarmUtils';
import { formatLocalDate, formatLocalTime } from '@utils/time';

const ALARM_CREATED_POPUP_KEY = 'alarm_created_popup_pending';
const LOCAL_ALARM_CACHE_PREFIX = 'alarm_cache_';
const LOCAL_SNOOZE_OVERRIDE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const UUID_LIKE_VALUE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeTextValue = (value: unknown) => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isLikelyOpaqueUserId = (value: string | null) =>
  Boolean(value && UUID_LIKE_VALUE_RE.test(value));

const resolveAlarmCreatedBy = (
  primaryAlarm: Partial<Alarm> | null | undefined,
  secondaryAlarm: Partial<Alarm> | Record<string, any> | null | undefined,
  currentUserId?: string | null,
  currentUserName?: string | null,
) => {
  const knownIds = new Set(
    [
      primaryAlarm?.ownerId,
      primaryAlarm?.createdById,
      secondaryAlarm?.ownerId,
      secondaryAlarm?.createdById,
    ]
      .map(value => normalizeTextValue(value))
      .filter((value): value is string => Boolean(value)),
  );

  const preferredDisplayName = [
    normalizeTextValue(primaryAlarm?.createdBy),
    normalizeTextValue(primaryAlarm?.owner),
    normalizeTextValue(secondaryAlarm?.createdBy),
    normalizeTextValue(secondaryAlarm?.owner),
  ].find(
    value => value && !knownIds.has(value) && !isLikelyOpaqueUserId(value),
  );

  if (preferredDisplayName) {
    return preferredDisplayName;
  }

  const normalizedCurrentUserName = normalizeTextValue(currentUserName);
  const normalizedCurrentUserId = normalizeTextValue(currentUserId);
  const alarmType = String(
    primaryAlarm?.type || secondaryAlarm?.type || '',
  ).toUpperCase();
  const isCurrentUserAlarm = Boolean(
    (normalizedCurrentUserId && knownIds.has(normalizedCurrentUserId)) ||
      alarmType === 'SELF',
  );

  if (isCurrentUserAlarm && normalizedCurrentUserName) {
    return normalizedCurrentUserName;
  }

  return (
    [
      normalizeTextValue(primaryAlarm?.createdBy),
      normalizeTextValue(primaryAlarm?.owner),
      normalizeTextValue(secondaryAlarm?.createdBy),
      normalizeTextValue(secondaryAlarm?.owner),
    ].find(value => value && !isLikelyOpaqueUserId(value)) || 'Unknown'
  );
};

const wakeMethodsSignature = (alarm: Alarm) =>
  (Array.isArray(alarm.wakeMethods) ? alarm.wakeMethods : [alarm.wakeMethods])
    .filter(Boolean)
    .map(method =>
      String(typeof method === 'string' ? method : (method as any)?.type || ''),
    )
    .join('|');

const shallowEqualAlarm = (a: Alarm, b: Alarm) =>
  a.id === b.id &&
  a.time === b.time &&
  a.date === b.date &&
  a.createdBy === b.createdBy &&
  a.status === b.status &&
  a.recurring === b.recurring &&
  (a.days || '') === (b.days || '') &&
  wakeMethodsSignature(a) === wakeMethodsSignature(b);

const getAlarmStableId = (alarm: Partial<Alarm> | Record<string, any> | null) =>
  String(alarm?.id || alarm?.alarmId || '');

const getAlarmScheduledMs = (
  alarm: Partial<Alarm> | Record<string, any> | null | undefined,
) => {
  if (!alarm) return undefined;

  const parsedScheduledAt = parseServerScheduled(
    (alarm as any)?.localScheduledAtOverride ?? alarm?.scheduledAt,
  );
  if (
    typeof parsedScheduledAt === 'number' &&
    Number.isFinite(parsedScheduledAt)
  ) {
    return parsedScheduledAt;
  }

  const date = typeof alarm?.date === 'string' ? alarm.date : '';
  const time = typeof alarm?.time === 'string' ? alarm.time : '';
  if (!date || !time) return undefined;

  const parsedDateTime = Date.parse(`${date}T${time}:00`);
  return Number.isNaN(parsedDateTime) ? undefined : parsedDateTime;
};

const sortAlarmsByScheduledAt = (alarms: Alarm[]) =>
  [...alarms].sort((a, b) => {
    const aTs = getAlarmScheduledMs(a) ?? Number.MAX_SAFE_INTEGER;
    const bTs = getAlarmScheduledMs(b) ?? Number.MAX_SAFE_INTEGER;
    return aTs - bTs;
  });

const mergeAlarmWithLocalOverride = (
  alarm: Alarm | null,
  localOverrideMap: Map<string, Alarm>,
  currentUserId?: string | null,
  currentUserName?: string | null,
) => {
  if (!alarm) return null;

  const localOverride = localOverrideMap.get(getAlarmStableId(alarm));
  if (!localOverride) return alarm;

  return {
    ...alarm,
    ...localOverride,
    createdBy: resolveAlarmCreatedBy(
      alarm,
      localOverride,
      currentUserId,
      currentUserName,
    ),
  };
};

const mergeAlarmListWithLocalOverrides = (
  alarmList: Alarm[],
  localOverrides: Alarm[],
  currentUserId?: string | null,
  currentUserName?: string | null,
) => {
  const localOverrideMap = new Map(
    localOverrides.map(alarm => [getAlarmStableId(alarm), alarm]),
  );

  const mergedList = alarmList.map(
    alarm =>
      mergeAlarmWithLocalOverride(
        alarm,
        localOverrideMap,
        currentUserId,
        currentUserName,
      ) ?? alarm,
  );

  const existingIds = new Set(mergedList.map(alarm => getAlarmStableId(alarm)));

  for (const localAlarm of localOverrides) {
    const localId = getAlarmStableId(localAlarm);
    if (!localId || existingIds.has(localId)) continue;
    mergedList.push({
      ...localAlarm,
      createdBy: resolveAlarmCreatedBy(
        localAlarm,
        null,
        currentUserId,
        currentUserName,
      ),
    });
  }

  return sortAlarmsByScheduledAt(
    mergedList.filter(
      alarm => alarm.status !== 'Pending' && alarm.status !== 'Declined',
    ),
  );
};

const useStableMappedAlarms = (
  dtoList: any[] | undefined,
  mapFn: (d: any) => Alarm,
) => {
  const cacheRef = useRef<Map<string, Alarm>>(new Map());
  return useMemo(() => {
    const next = new Map<string, Alarm>();
    const result = (dtoList || []).map(d => {
      const mapped = mapFn(d);
      const prev = cacheRef.current.get(mapped.id);
      if (prev && shallowEqualAlarm(prev, mapped)) {
        next.set(mapped.id, prev);
        return prev;
      }
      next.set(mapped.id, mapped);
      return mapped;
    });
    cacheRef.current = next;
    return result;
  }, [dtoList, mapFn]);
};

export const MyAlarmsScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const userId = useSelector(selectUserId);
  const authUser = useSelector(selectAuthUser);
  const bootstrapSnapshot = useAlarmBootstrapSnapshot(userId);

  const deleteMutation = useDeleteAlarm();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localSnoozedAlarms, setLocalSnoozedAlarms] = useState<Alarm[]>([]);

  const {
    data: upcomingDto,
    refetch: refetchUpcoming,
    isFetching: isFetchingUpcoming,
    isError: isUpcomingError,
  } = useUpcomingAlarms();

  const {
    data: pastDto,
    refetch: refetchPast,
    isFetching: isFetchingPast,
    isError: isPastError,
  } = usePastAlarms();
  const {
    data: sentDto,
    refetch: refetchSent,
    isFetching: isFetchingSent,
    isError: isSentError,
  } = useSentAlarms();
  const {
    data: nextDto,
    refetch: refetchNext,
    status: nextStatus,
  } = useNextAlarm();

  const [refreshing, setRefreshing] = useState(false);

  const loadLocalSnoozedAlarms = useCallback(async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key =>
        key.startsWith(LOCAL_ALARM_CACHE_PREFIX),
      );

      if (cacheKeys.length === 0) {
        setLocalSnoozedAlarms([]);
        return;
      }

      const cacheEntries = await AsyncStorage.multiGet(cacheKeys);
      const now = Date.now();
      const nextLocalSnoozedAlarms = cacheEntries
        .map(([, rawValue]) => {
          if (!rawValue) return null;

          try {
            const cachedAlarm = JSON.parse(rawValue) as Record<string, any>;
            const localScheduledAtOverride =
              cachedAlarm?.localScheduledAtOverride;
            const localScheduledAtOverrideUpdatedAt = Number(
              cachedAlarm?.localScheduledAtOverrideUpdatedAt ?? 0,
            );
            const scheduledTs = parseServerScheduled(localScheduledAtOverride);

            if (
              !localScheduledAtOverride ||
              (localScheduledAtOverrideUpdatedAt > 0 &&
                now - localScheduledAtOverrideUpdatedAt >
                  LOCAL_SNOOZE_OVERRIDE_MAX_AGE_MS) ||
              typeof scheduledTs !== 'number' ||
              !Number.isFinite(scheduledTs) ||
              scheduledTs <= now
            ) {
              return null;
            }

            const mappedAlarm = mapAlarmDtoToViewModel({
              ...cachedAlarm,
              scheduledAt: localScheduledAtOverride,
              date:
                formatLocalDate(String(localScheduledAtOverride)) ||
                cachedAlarm?.date,
              time:
                formatLocalTime(String(localScheduledAtOverride)) ||
                cachedAlarm?.time,
            });

            if (!mappedAlarm?.id) {
              return null;
            }

            return {
              ...mappedAlarm,
              createdBy: resolveAlarmCreatedBy(
                mappedAlarm,
                cachedAlarm as Partial<Alarm>,
                userId,
                authUser?.name ?? null,
              ),
              scheduledAt: String(localScheduledAtOverride) as any,
            } as Alarm;
          } catch (error) {
            console.warn(
              '[MyAlarmsScreen] Failed to parse local snoozed alarm cache',
              error,
            );
            return null;
          }
        })
        .filter((alarm): alarm is Alarm => Boolean(alarm));

      setLocalSnoozedAlarms(sortAlarmsByScheduledAt(nextLocalSnoozedAlarms));
    } catch (error) {
      console.warn(
        '[MyAlarmsScreen] Failed to load local snoozed alarms',
        error,
      );
    }
  }, [authUser?.name, userId]);

  const refetchPrimaryAlarmLists = useCallback(async () => {
    if (deletingId) return;
    if (consumePrimaryAlarmsRefetchSkip()) {
      await loadLocalSnoozedAlarms();
      return;
    }

    const tasks: Promise<any>[] = [];
    if (refetchUpcoming) tasks.push(refetchUpcoming());
    if (refetchNext) tasks.push(refetchNext());
    await Promise.all(tasks);
    await loadLocalSnoozedAlarms();
  }, [deletingId, loadLocalSnoozedAlarms, refetchNext, refetchUpcoming]);

  const refetchAllAlarmLists = useCallback(async () => {
    if (deletingId) return;

    const tasks: Promise<any>[] = [];
    if (refetchUpcoming) tasks.push(refetchUpcoming());
    if (refetchPast) tasks.push(refetchPast());
    if (refetchSent) tasks.push(refetchSent());
    if (refetchNext) tasks.push(refetchNext());
    await Promise.all(tasks);
  }, [deletingId, refetchNext, refetchPast, refetchSent, refetchUpcoming]);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refetchAllAlarmLists();
      await loadLocalSnoozedAlarms();
    } catch (e) {
      console.warn('Failed to refresh alarms', e);
    } finally {
      setRefreshing(false);
    }
  }, [loadLocalSnoozedAlarms, refetchAllAlarmLists, refreshing]);

  useEffect(() => {
    void loadLocalSnoozedAlarms();
  }, [loadLocalSnoozedAlarms]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && !deletingId) {
        void refetchPrimaryAlarmLists();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [deletingId, refetchPrimaryAlarmLists]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const showPendingAlarmCreatedPopup = async () => {
        try {
          const shouldShow = await AsyncStorage.getItem(
            ALARM_CREATED_POPUP_KEY,
          );
          if (!isActive || shouldShow !== 'true') return;

          await AsyncStorage.removeItem(ALARM_CREATED_POPUP_KEY);

          Alert.alert('Alarm Created!', 'Your alarm has been created.', [
            { text: 'Ok' },
          ]);
        } catch (e) {
          console.warn('Failed to show pending alarm-created popup', e);
        }
      };

      if (!deletingId) {
        void refetchPrimaryAlarmLists();
      }
      showPendingAlarmCreatedPopup();

      return () => {
        isActive = false;
      };
    }, [deletingId, refetchPrimaryAlarmLists]),
  );

  const rawUpcomingAlarmList = useStableMappedAlarms(
    upcomingDto,
    mapAlarmDtoToViewModel,
  );

  const upcomingAlarmList = useMemo(
    () =>
      rawUpcomingAlarmList.filter(
        a => a.status !== 'Pending' && a.status !== 'Declined',
      ),
    [rawUpcomingAlarmList],
  );
  const pastAlarmList = useStableMappedAlarms(pastDto, mapAlarmDtoToViewModel);
  const sentAlarmList = useStableMappedAlarms(sentDto, mapAlarmDtoToViewModel);

  const nextAlarm = useMemo(() => {
    const mapped = nextDto ? mapAlarmDtoToViewModel(nextDto as any) : null;
    return mapped && mapped.status === 'Pending' ? null : mapped;
  }, [nextDto]);

  const hasBootstrapData = useMemo(
    () =>
      Boolean(
        bootstrapSnapshot &&
          (bootstrapSnapshot.next ||
            bootstrapSnapshot.counts.upcoming > 0 ||
            bootstrapSnapshot.counts.past > 0 ||
            bootstrapSnapshot.counts.sent > 0),
      ),
    [bootstrapSnapshot],
  );

  const hasLiveUpcomingData = upcomingDto !== undefined;
  const hasLivePastData = pastDto !== undefined;
  const hasLiveSentData = sentDto !== undefined;
  const hasLiveNextData = nextDto !== undefined || nextStatus === 'success';

  const baseDisplayedNext = hasLiveNextData
    ? nextAlarm
    : bootstrapSnapshot?.next || null;
  const baseDisplayedUpcoming = hasLiveUpcomingData
    ? upcomingAlarmList
    : bootstrapSnapshot?.upcoming || [];
  const mergedDisplayedNext = useMemo(
    () =>
      mergeAlarmWithLocalOverride(
        baseDisplayedNext,
        new Map(
          localSnoozedAlarms.map(alarm => [getAlarmStableId(alarm), alarm]),
        ),
        userId,
        authUser?.name ?? null,
      ),
    [authUser?.name, baseDisplayedNext, localSnoozedAlarms, userId],
  );
  const mergedDisplayedUpcoming = useMemo(
    () =>
      mergeAlarmListWithLocalOverrides(
        baseDisplayedUpcoming,
        localSnoozedAlarms,
        userId,
        authUser?.name ?? null,
      ),
    [authUser?.name, baseDisplayedUpcoming, localSnoozedAlarms, userId],
  );
  const displayedNext = useMemo(() => {
    const nextCandidates = [
      ...(mergedDisplayedNext ? [mergedDisplayedNext] : []),
      ...mergedDisplayedUpcoming,
    ];

    return sortAlarmsByScheduledAt(nextCandidates)[0] || null;
  }, [mergedDisplayedNext, mergedDisplayedUpcoming]);
  const displayedUpcoming = mergedDisplayedUpcoming;
  const displayedPast = hasLivePastData
    ? pastAlarmList
    : bootstrapSnapshot?.pastPreview || [];
  const displayedSent = hasLiveSentData
    ? sentAlarmList
    : bootstrapSnapshot?.sentPreview || [];

  const hasDisplayedListItems =
    displayedUpcoming.length + displayedPast.length + displayedSent.length > 0;
  const hasDisplayedContent = hasDisplayedListItems || !!displayedNext;

  const showEmptyState =
    hasLiveUpcomingData &&
    hasLivePastData &&
    hasLiveSentData &&
    nextStatus === 'success' &&
    upcomingAlarmList.length + pastAlarmList.length + sentAlarmList.length ===
      0 &&
    !nextAlarm;

  const showErrorState =
    !hasBootstrapData &&
    !hasDisplayedContent &&
    !showEmptyState &&
    (isUpcomingError || isPastError || isSentError) &&
    !isFetchingUpcoming &&
    !isFetchingPast &&
    !isFetchingSent;

  const showInitialState = !showEmptyState && !hasDisplayedContent;

  const scrollRef = useRef<ScrollView | null>(null);
  const upcomingY = useRef(0);
  const pastY = useRef(0);
  const sentY = useRef(0);

  const scrollTo = (y: number) => {
    const target = Math.max(0, y - 12);
    scrollRef.current?.scrollTo({ y: target, animated: true });
  };

  const scrollToAfterLayout = (y: number) => {
    scrollTo(y);
    requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(y)));
  };

  const deleteAlarm = useCallback(
    (
      alarmId: string | null,
      recurring: boolean,
      comment?: string | undefined,
    ) => {
      const isDeleting = !!deletingId;
      if (!alarmId || isDeleting) return;
      if (isDeleting) return;
      setDeletingId(alarmId);

      deleteMutation.mutate(
        { id: alarmId, comment },
        {
          onError: err => {
            console.warn('Failed to delete alarm', err);
            Alert.alert(
              'Delete failed',
              'Unable to delete alarm. Please try again.',
            );
            setDeletingId(null);
          },
          onSuccess: async () => {
            console.log('deleting local alarm');

            if (Platform.OS === 'ios') {
              try {
                if (recurring) {
                  await cancelRecurringAlarmIos(alarmId);
                } else {
                  await cancelAlarms(alarmId);
                }
              } catch {}

              await removeAlarm(alarmId);
            } else if (recurring) {
              await cancelRecurringAlarmAndroid(alarmId);
            } else {
              await cancelLocalAlarm(alarmId);
            }

            try {
              const cacheKey = `alarm_cache_${alarmId}`;
              await AsyncStorage.removeItem(cacheKey);
              console.log('[MyAlarmsScreen] Removed alarm cache:', cacheKey);
              await loadLocalSnoozedAlarms();
            } catch (e) {
              console.warn('[MyAlarmsScreen] Failed to remove alarm cache', e);
            }
          },
          onSettled: () => {
            setDeletingId(null);
          },
        },
      );
    },
    [deleteMutation, deletingId, loadLocalSnoozedAlarms],
  );

  const handleDeleteAlarm = useCallback(
    (alarm: Alarm) => {
      Alert.alert(
        'Delete Alarm',
        'Are you sure you want to delete the alarm? This will also remove all media that was sent to you.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteAlarm(alarm.id, alarm.recurring);
            },
          },
        ],
      );
    },
    [deleteAlarm],
  );

  const handleCreateAlarm = async () => {
    try {
      await requestBatteryOptimizationPermission();
      navigation.navigate('MainContentNavigation', {
        screen: 'CreateAlarmScreen',
      });
    } catch (error) {
      Alert.alert(
        'Permission Error',
        'There was an issue requesting battery optimization permission. Please try again.',
      );
    }
  };
  useEffect(() => {
    try {
      SoundPlayer.stop();
    } catch (e) {}
  }, []);

  return (
    <View className="flex-1 w-full">
      <LoaderModal isVisible={!!deletingId} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={
          showEmptyState || showInitialState
            ? { flexGrow: 1, paddingBottom: 60 }
            : { alignItems: 'center', paddingBottom: 30 }
        }
      >
        {showEmptyState ? (
          <EmptyAlarms />
        ) : showInitialState ? (
          <MyAlarmsInitialState mode={showErrorState ? 'error' : 'loading'} />
        ) : (
          <View className="w-full px-4">
            <NextAlarm nextAlarm={displayedNext} />
            {displayedUpcoming.length !== 0 && (
              <View
                onLayout={e => {
                  upcomingY.current = e.nativeEvent.layout.y;
                }}
              >
                <UpcomingAlarms
                  alarmList={displayedUpcoming}
                  handleDeleteAlarm={handleDeleteAlarm}
                  deletingId={deletingId}
                />
              </View>
            )}
            {displayedPast.length !== 0 && (
              <View
                onLayout={e => {
                  pastY.current = e.nativeEvent.layout.y;
                }}
              >
                <PastAlarms
                  alarmList={displayedPast}
                  handleDeleteAlarm={handleDeleteAlarm}
                  deletingId={deletingId}
                  onExpand={() => scrollToAfterLayout(pastY.current)}
                />
              </View>
            )}
            {displayedSent.length !== 0 && (
              <View
                onLayout={e => {
                  sentY.current = e.nativeEvent.layout.y;
                }}
              >
                <SentAlarms
                  alarmList={displayedSent}
                  handleDeleteAlarm={handleDeleteAlarm}
                  deletingId={deletingId}
                  onExpand={() => scrollToAfterLayout(sentY.current)}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>
      {/* Clock button */}
      <View className="relative w-full mb-[43px] px-4">
        <View className="w-full h-[3px] bg-white" />
        <LinearGradient
          colors={['#3C1053', '#550844']}
          style={{
            position: 'absolute',
            top: -34,
            left: '50%',
            width: 68,
            height: 68,
            borderRadius: 34,
            justifyContent: 'center',
            alignItems: 'center',
            // glass-like border and shadow
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 12,
            transform: [{ translateX: -17 }],
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: 34,
            }}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 20,
              borderTopLeftRadius: 34,
              borderTopRightRadius: 34,
            }}
          />
          <TouchableOpacity onPress={handleCreateAlarm} activeOpacity={0.7}>
            <ClockAddAlarmIcon />
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>
  );
};
