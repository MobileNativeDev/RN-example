import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Alarm } from '@appTypes/types';
import {
  getAlarm,
  getUpcomingAlarms,
  rejectFriendAlarm,
  updateFriendAlarm,
} from '@api/alarms';
import { ChooseFriendAndData } from '@components/createAlarm/ChooseFriendAndData';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Recurring } from '@components/createAlarm/Recuring';
import { LinierButton } from '@components/customComponents/LinierButton';
import {
  useFocusEffect,
  useRoute,
  useNavigation,
} from '@react-navigation/native';
import UserIcon from '@assets/svg/UserIcon.svg';
import { useQueryClient } from '@tanstack/react-query';
import {
  handleAcceptAlarm,
  scheduledAtToLocal,
} from '@utils/notificationFunctions';
import { LoaderModal } from '@components/LoaderModal';
import { WakeMethodsList } from '@screens/previewAlarms/components/WakeMethodsList';
import logger from '@utils/logger';
import { useSelector } from 'react-redux';
import { selectUserId } from '@store/auth/selectors';
import {
  isFutureOneTimeAlarm,
  normalizeDate,
  normalizeTime,
  parseReceivedLocal,
} from '@utils/time';
import { Alert } from '@utils/alert';
import { isDuplicateAlarm } from '@utils/createAlarmUtils';
import SoundPlayer from 'react-native-sound-player';
import { stopPlayer } from '@services/ios-services/nativePlayer';
import { setActivePlayer } from '@utils/playerManager';

const noop = () => {};
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

const normalizeRecurringDay = (day: unknown) => {
  if (typeof day === 'number') {
    return DAY_NAMES[day] ?? null;
  }

  const normalized = String(day ?? '')
    .trim()
    .toUpperCase();

  return DAY_NAMES.includes(normalized as (typeof DAY_NAMES)[number])
    ? normalized
    : null;
};

const buildRecurringDaysPayload = (days: string[]) =>
  days
    .map(day => String(day).trim().toUpperCase())
    .filter((day): day is (typeof DAY_NAMES)[number] =>
      DAY_NAMES.includes(day as (typeof DAY_NAMES)[number]),
    );

export const NotificationAlarmDetailScreen = () => {
  const route = useRoute();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const myUserId = useSelector(selectUserId);

  const { alarm } = (route.params ?? {}) as {
    alarm?: {
      alarmId: string;
      owner?: {
        name?: string;
        avatarUrl?: string | null;
      } | null;
      scheduledAt?: string;
      friendshipId?: string;
    } | null;
  };
  const initialScheduled = alarm?.scheduledAt
    ? new Date(alarm.scheduledAt)
    : null;
  const [chosenDate, setChosenDate] = useState<string>(
    initialScheduled ? initialScheduled.toISOString().slice(0, 10) : '',
  );
  const [chosenTime, setChosenTime] = useState<string>(
    initialScheduled
      ? `${String(initialScheduled.getUTCHours()).padStart(2, '0')}:${String(
          initialScheduled.getUTCMinutes(),
        ).padStart(2, '0')}`
      : '',
  );
  const [recurring, setRecurring] = useState(false);

  const [alarmData, setAlarmData] = useState<Alarm | null>(null);

  const [recurringDays, setRecurringDays] = useState<string[]>(
    Array.isArray(alarmData?.recurringDays)
      ? (alarmData?.recurringDays as any[]).map(String)
      : [],
  );

  useEffect(() => {
    const idToLoad = alarm?.alarmId;
    if (idToLoad) {
      const load = async () => {
        try {
          const dto = await getAlarm(idToLoad);
          setAlarmData(dto);
          if (dto) {
            setChosenDate(
              dto.scheduledAt
                ? new Date(dto.scheduledAt).toISOString().slice(0, 10)
                : '',
            );
            setChosenTime(
              dto.scheduledAt
                ? `${String(new Date(dto.scheduledAt).getUTCHours()).padStart(
                    2,
                    '0',
                  )}:${String(
                    new Date(dto.scheduledAt).getUTCMinutes(),
                  ).padStart(2, '0')}`
                : '',
            );
            setRecurring(Boolean(dto.recurring));
            try {
              if (
                Array.isArray((dto as any).recurringDays) &&
                (dto as any).recurringDays.length > 0
              ) {
                const daysArr = (dto as any).recurringDays
                  .map((d: any) => normalizeRecurringDay(d))
                  .filter(Boolean);
                setRecurringDays(daysArr as any);
              } else {
                if (
                  Array.isArray((dto as any).days) &&
                  (dto as any).days.length > 0
                ) {
                  const daysArr = (dto as any).days
                    .map((d: any) => normalizeRecurringDay(d))
                    .filter(Boolean);
                  setRecurringDays(daysArr as any);
                } else if ((dto as any).days) {
                  const normalizedDay = normalizeRecurringDay(
                    (dto as any).days,
                  );
                  setRecurringDays(normalizedDay ? [normalizedDay] : []);
                }
              }
            } catch {}
          } else {
            setChosenDate(
              alarm?.scheduledAt
                ? new Date(alarm.scheduledAt).toISOString().slice(0, 10)
                : '',
            );
            setChosenTime(
              alarm?.scheduledAt
                ? `${String(new Date(alarm.scheduledAt).getUTCHours()).padStart(
                    2,
                    '0',
                  )}:${String(
                    new Date(alarm.scheduledAt).getUTCMinutes(),
                  ).padStart(2, '0')}`
                : '',
            );
            setRecurring(false);
          }
        } catch (err) {
          logger.warn('Failed to load alarm details', err);
          setChosenDate(
            alarm?.scheduledAt
              ? new Date(alarm.scheduledAt).toISOString().slice(0, 10)
              : '',
          );
          setChosenTime(
            alarm?.scheduledAt
              ? `${String(new Date(alarm.scheduledAt).getUTCHours()).padStart(
                  2,
                  '0',
                )}:${String(
                  new Date(alarm.scheduledAt).getUTCMinutes(),
                ).padStart(2, '0')}`
              : alarm?.scheduledAt || '',
          );
          setRecurring(false);
        }
      };

      load();
    }
  }, [alarm]);

  const [isLoading, setIsLoading] = useState(false);
  const isPendingApproval = useMemo(
    () => alarmData?.approvalStatus === 'PENDING',
    [alarmData?.approvalStatus],
  );
  const stopNotificationDetailMediaPlayback = useCallback(async () => {
    try {
      setActivePlayer(null);
    } catch {}

    try {
      await stopPlayer();
    } catch {}

    try {
      await SoundPlayer.stop();
    } catch {}
  }, []);
  const scheduledLocalTime = useMemo(
    () =>
      scheduledAtToLocal({
        scheduledAt: alarmData?.scheduledAt || alarm?.scheduledAt,
        timezone: alarmData?.timezone,
      }),
    [alarm?.scheduledAt, alarmData?.scheduledAt, alarmData?.timezone],
  );

  useFocusEffect(
    useCallback(() => {
      void stopNotificationDetailMediaPlayback();

      return () => {
        void stopNotificationDetailMediaPlayback();
      };
    }, [stopNotificationDetailMediaPlayback]),
  );

  const handleAcceptAlarmFriend = useCallback(
    async (alarmId: string) => {
      try {
        const updatedDate = normalizeDate(chosenDate);
        const updatedTime = normalizeTime(chosenTime);

        if (recurring && recurringDays.length === 0) {
          Alert.alert(
            'Missing recurring days',
            'Please select at least one day for a recurring alarm.',
          );
          return;
        }

        if (
          updatedDate &&
          updatedTime &&
          !isFutureOneTimeAlarm(updatedDate, updatedTime)
        ) {
          Alert.alert('Error', 'Date and time must be in the future.');
          return;
        }

        const upcoming =
          queryClient.getQueryData<any[]>(['alarms', 'upcoming']) ??
          (await getUpcomingAlarms());

        if (
          updatedDate &&
          updatedTime &&
          isDuplicateAlarm(updatedDate, updatedTime, upcoming || [])
        ) {
          Alert.alert('Cancelled', 'You already have an alarm for this time', [
            { text: 'Change time', style: 'default' },
            { text: 'OK', style: 'cancel' },
          ]);
          return;
        }

        setIsLoading(true);

        if (updatedDate && updatedTime) {
          const recurringDaysPayload =
            recurring && recurringDays.length > 0
              ? buildRecurringDaysPayload(recurringDays)
              : undefined;

          await updateFriendAlarm(alarmId, {
            date: updatedDate,
            time: updatedTime,
            timezone:
              alarmData?.timezone ||
              Intl.DateTimeFormat().resolvedOptions().timeZone,
            recurringDays: recurringDaysPayload,
          });
        }

        await handleAcceptAlarm(alarmId, undefined, () => {});
        await queryClient.invalidateQueries({ queryKey: ['notifications'] });
        await queryClient.invalidateQueries({
          queryKey: ['alarms', 'upcoming'],
        });
        await queryClient.invalidateQueries({ queryKey: ['alarms', 'next'] });
        navigation.goBack();
      } catch (e) {
        logger.warn('handleAcceptAlarm failed', e);
      } finally {
        setIsLoading(false);
      }
    },
    [
      alarmData?.timezone,
      chosenDate,
      chosenTime,
      navigation,
      queryClient,
      recurring,
      recurringDays,
    ],
  );
  const handleDeclineAlarm = useCallback(
    async (alarmId: string) => {
      try {
        setIsLoading(true);

        await rejectFriendAlarm(alarmId);
        await queryClient.invalidateQueries({ queryKey: ['notifications'] });
        navigation.goBack();
      } catch (e) {
        logger.warn('handleDeclineAlarm failed', e);
      } finally {
        setIsLoading(false);
      }
    },
    [navigation, queryClient],
  );
  const hasAlarmFired = (() => {
    const scheduledMillis = parseReceivedLocal(scheduledLocalTime?.localIso);
    if (typeof scheduledMillis === 'number') {
      return scheduledMillis <= Date.now();
    }

    return alarmData?.scheduledAt
      ? new Date(alarmData.scheduledAt).getTime() <= Date.now()
      : false;
  })();
  const isOwner = Boolean(
    myUserId &&
      (alarmData?.ownerId === myUserId || alarmData?.createdById === myUserId),
  );
  const isMissedPendingAlarm = isPendingApproval && hasAlarmFired;
  const canRespondToAlarmRequest =
    isPendingApproval && !isOwner && !hasAlarmFired;
  const canEditSchedule = canRespondToAlarmRequest;
  const shouldHideWakeMethods =
    !isOwner &&
    !!alarmData &&
    (alarmData.approvalStatus === 'PENDING' ||
      alarmData.approvalStatus === 'ACCEPTED') &&
    !hasAlarmFired;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}>
      <View className="py-5 flex-1 px-4">
        <LoaderModal isVisible={isLoading} />
        <View className="bg-whiteWithTransparentColor p-[10px] rounded-2xl mb-[10px] flex-row items-center">
          {alarm?.owner?.avatarUrl ? (
            <Image
              source={{ uri: alarm.owner.avatarUrl }}
              className="w-[48px] h-[48px] rounded-full"
            />
          ) : (
            <View className="w-[48px] h-[48px] rounded-full bg-white/10 items-center justify-center">
              <UserIcon />
            </View>
          )}
          <Text className="text-white font-regular text-[17px] ml-3">
            Created by {alarm?.owner?.name || 'Unknown'}
          </Text>
        </View>
        <ChooseFriendAndData
          isForMe={true}
          chosenDate={chosenDate}
          setChosenDate={setChosenDate}
          chosenTime={chosenTime}
          setChosenTime={setChosenTime}
          disabled={!canEditSchedule}
        />
        {alarmData?.recurring && (
          <Recurring
            recurring={recurring}
            setRecurring={setRecurring}
            selectedDays={recurringDays}
            onChangeDays={setRecurringDays}
            disabled={!canEditSchedule}
          />
        )}
        {shouldHideWakeMethods ? (
          <View className="flex-1  justify-center items-center p-5 rounded-2xl my-3">
            <Text className="text-white font-semibold text-2xl">
              It will be surprise
            </Text>
          </View>
        ) : (
          <View className="my-3">
            <WakeMethodsList
              wakeMethods={
                Array.isArray(alarmData?.wakeMethods)
                  ? (alarmData as any).wakeMethods
                  : []
              }
              alarmData={alarmData}
              isOwner={isOwner}
              canShowMedia={true}
              openable={true}
              imageUri={null}
              puzzleSoundUri={null}
              voiceUri={null}
              songUri={null}
              videoUri={null}
              videoLink={null}
              puzzleDeleted={false}
              voiceDeleted={false}
              videoDeleted={false}
              songDeleted={false}
              setImageUri={noop}
              setPuzzleSoundUri={noop}
              setVoiceUri={noop}
              setSongUri={noop}
              setVideoUri={noop}
              setVideoLink={noop}
              setPuzzleDeleted={noop}
              setVoiceDeleted={noop}
              setVideoDeleted={noop}
              setSongDeleted={noop}
            />
          </View>
        )}

        {alarmData && isMissedPendingAlarm && (
          <View className="flex-1 justify-end">
            <View className="border border-orange-500 rounded-md px-[10px] py-3 items-center justify-center">
              <Text className="text-orange-500 font-regular text-sm">
                Missed alarm
              </Text>
            </View>
          </View>
        )}

        {alarmData && canRespondToAlarmRequest && (
          <View className="flex-1 justify-end">
            <LinierButton
              title="Accept"
              onPress={async () => {
                await handleAcceptAlarmFriend(alarm?.friendshipId || '');
              }}
              borderColor={true}
            />
            <View className="h-3" />
            <TouchableOpacity
              onPress={() => {
                handleDeclineAlarm(alarm?.friendshipId || '');
              }}
              className={`p-5 flex-row justify-center items-center w-full bg-whiteWithTransparentColor rounded-2xl border border-white/50`}
            >
              <Text className={`font-semibold text-[17px] text-white`}>
                Decline
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};
