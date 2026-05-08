import { ScrollView, Text, View } from 'react-native';
import { Alert } from '@utils/alert';
import { Alarm } from '@appTypes/types';
import { ChooseFriendAndData } from '@components/createAlarm/ChooseFriendAndData';
import { Recurring } from '@components/createAlarm/Recuring';
import { CustomButton } from '@components/customComponents/CustomButton';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { cloneAlarm, getAlarm } from '@api/alarms';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingWakeMethodsList } from './components/LoadingWakeMethodsList';
import { WakeMethodsList } from './components/WakeMethodsList';
import logger from '@utils/logger';
import { getUserFriendlyErrorMessage } from '@utils/networkErrors';
import SoundPlayer from 'react-native-sound-player';
import { stopPlayer } from '@services/ios-services/nativePlayer';
import { setActivePlayer } from '@utils/playerManager';

const noop = () => {};

const normalizeWakeMethods = (alarm?: Alarm | null) => {
  const value = (alarm as any)?.wakeMethods;
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
};

export const PreviewAlarmScreen = () => {
  const queryClient = useQueryClient();
  const route = useRoute();
  const navigation = useNavigation();
  const { chosenAlarm } = (route.params ?? {}) as {
    chosenAlarm: Alarm | null;
  };
  const [cloning, setCloning] = useState(false);

  const [chosenDate, setChosenDate] = useState<string>(chosenAlarm?.date || '');
  const [chosenTime, setChosenTime] = useState<string>(chosenAlarm?.time || '');
  const [recurring, setRecurring] = useState(chosenAlarm?.recurring || false);
  const [listFriendsIsOpen, setListFriendsIsOpen] = useState(false);
  const [alarmData, setAlarmData] = useState<Alarm | null>(null);
  const [isAlarmDetailsLoading, setIsAlarmDetailsLoading] = useState(false);
  const [chosenFriend, setChosenFriend] = useState<string>(
    alarmData?.friendUserId || '',
  );
  const wakeMethods = useMemo(() => {
    const detailedWakeMethods = normalizeWakeMethods(alarmData);
    if (detailedWakeMethods.length > 0) return detailedWakeMethods;
    return normalizeWakeMethods(chosenAlarm);
  }, [alarmData, chosenAlarm]);

  console.log('alarmData', alarmData);

  const stopPreviewMediaPlayback = useCallback(async () => {
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

  useFocusEffect(
    useCallback(() => {
      void stopPreviewMediaPlayback();

      return () => {
        void stopPreviewMediaPlayback();
      };
    }, [stopPreviewMediaPlayback]),
  );

  useEffect(() => {
    if (chosenAlarm) {
      setChosenDate(chosenAlarm.date || '');
      setChosenTime(chosenAlarm.time || '');
      setRecurring(chosenAlarm.recurring || false);
      setChosenFriend(alarmData?.friendUserId || '');
    }
  }, [chosenAlarm, alarmData]);

  const loadAlarmDetails = useCallback(async () => {
    if (!chosenAlarm) return;

    setIsAlarmDetailsLoading(true);
    try {
      const dto = await getAlarm(chosenAlarm.id);
      setAlarmData(dto);
      if (dto) {
        setChosenDate(
          dto.scheduledAt
            ? new Date(dto.scheduledAt).toISOString().slice(0, 10)
            : chosenAlarm.date || '',
        );
        setChosenTime(
          dto.scheduledAt
            ? `${String(new Date(dto.scheduledAt).getHours()).padStart(
                2,
                '0',
              )}:${String(new Date(dto.scheduledAt).getMinutes()).padStart(
                2,
                '0',
              )}`
            : chosenAlarm.time || '',
        );
        setRecurring(dto.recurring || chosenAlarm.recurring || false);
      } else {
        setChosenDate(chosenAlarm.date || '');
        setChosenTime(chosenAlarm.time || '');
        setRecurring(chosenAlarm.recurring || false);
      }
    } catch (err) {
      logger.warn('Failed to load alarm details', err);
      setChosenDate(chosenAlarm.date || '');
      setChosenTime(chosenAlarm.time || '');
      setRecurring(chosenAlarm.recurring || false);
    } finally {
      setIsAlarmDetailsLoading(false);
    }
  }, [chosenAlarm]);

  useEffect(() => {
    void loadAlarmDetails();
  }, [loadAlarmDetails]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClone = useCallback(async () => {
    if (!chosenAlarm) return;
    try {
      setCloning(true);
      const tz =
        Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone ||
        'Europe/Kyiv';
      const payload: any = {};
      if (chosenFriend) payload.friendUserId = chosenFriend;
      if (chosenDate) {
        let dateOnly = chosenDate;
        try {
          if (
            String(chosenDate).includes('T') ||
            String(chosenDate).length > 10
          ) {
            const d = new Date(chosenDate);
            if (!isNaN(d.getTime())) dateOnly = d.toISOString().slice(0, 10);
          }
        } catch (e) {}
        payload.date = dateOnly;
      }
      if (chosenTime) {
        let timeOnly = chosenTime;
        try {
          if (
            String(chosenTime).includes('T') ||
            String(chosenTime).length > 5
          ) {
            const dt = new Date(chosenTime);
            if (!isNaN(dt.getTime())) {
              timeOnly = `${String(dt.getHours()).padStart(2, '0')}:${String(
                dt.getMinutes(),
              ).padStart(2, '0')}`;
            }
          }
        } catch (e) {}
        payload.time = timeOnly;
      }
      if (tz) payload.timezone = tz;
      payload.recurring = recurring;
      payload.pieces = 9;
      logger.debug('payload', payload);

      const newAlarm = await cloneAlarm(chosenAlarm.id, payload);
      logger.debug(newAlarm);

      if (newAlarm) {
        Alert.alert(
          'Alarm created',
          'Please wait until your friend accepts your request.',
          [
            {
              text: 'To my Alarms',
              style: 'cancel',
              onPress: () => {
                navigation.goBack();
              },
            },
          ],
        );
      }
      queryClient.invalidateQueries({ queryKey: ['alarms'] });
      queryClient.invalidateQueries({ queryKey: ['alarms', 'sent'] });
    } catch (err) {
      const status = (err as any)?.response?.status;
      const data = (err as any)?.response?.data;
      logger.warn('Clone failed', status, data, err);

      const serverMessage = getUserFriendlyErrorMessage(
        err,
        'Unable to clone alarm.',
      );

      const lowerMsg = String(serverMessage).toLowerCase();
      if (lowerMsg.includes('scheduledat') && lowerMsg.includes('future')) {
        Alert.alert(
          'Invalid date/time',
          'Selected date and time must be in the future.',
        );
      } else {
        Alert.alert('Clone failed', String(serverMessage));
      }
    } finally {
      setCloning(false);
    }
  }, [
    chosenAlarm,
    chosenDate,
    chosenFriend,
    chosenTime,
    navigation,
    queryClient,
    recurring,
  ]);

  return (
    <ScrollView
      className="flex-1 "
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View className="py-5 flex-1 px-4 ">
        <View className="bg-[#AE1B90] p-[10px] rounded-2xl mb-[10px]">
          <Text className="text-white font-regular text-xs">
            {chosenAlarm?.time} {chosenAlarm?.date}
          </Text>
          <Text className="text-white font-regular text-xs">
            Created by {chosenAlarm?.createdBy}
          </Text>
        </View>
        <ChooseFriendAndData
          isForMe={false}
          listFriendsIsOpen={listFriendsIsOpen}
          setListFriendsIsOpen={setListFriendsIsOpen}
          chosenFriend={chosenFriend}
          setChosenFriend={value => setChosenFriend(value || '')}
          chosenDate={chosenDate}
          setChosenDate={setChosenDate}
          chosenTime={chosenTime}
          setChosenTime={setChosenTime}
        />
        {chosenAlarm?.recurring && (
          <Recurring recurring={recurring} setRecurring={setRecurring} />
        )}
        <View className="my-3">
          {isAlarmDetailsLoading && wakeMethods.length > 0 ? (
            <LoadingWakeMethodsList wakeMethods={wakeMethods} />
          ) : (
            <WakeMethodsList
              wakeMethods={wakeMethods}
              alarmData={alarmData}
              isOwner={false}
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
          )}
        </View>
        <View className="flex-1 justify-end ">
          <View style={{ gap: 8 }}>
            <CustomButton
              title={'Cancel'}
              onPress={() => {
                handleCancel();
              }}
              style="border-white mb-[10px]"
              textStyle="text-white font-bold"
            />
            <CustomButton
              title={cloning ? 'Sending...' : 'Send request'}
              onPress={() => {
                handleClone();
              }}
              style="border-white mb-[10px]"
              textStyle="text-white font-bold"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
