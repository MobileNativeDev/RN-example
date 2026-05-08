import { Switch } from '@components/createAlarm/Switch';
import { LinierButton } from '@components/customComponents/LinierButton';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChooseWakeUpWith } from '@components/createAlarm/ChooseWakeUpWith';
import { ChooseFriendAndData } from '@components/createAlarm/ChooseFriendAndData';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Recurring } from '@components/createAlarm/Recuring';
import { Alert } from '@utils/alert';
import { useCreateSelfAlarm } from '@hooks/useAlarms';
import { FOOTER_HEIGHT, isDuplicateAlarm } from '@utils/createAlarmUtils';
import { WakeUpOption } from '@components/createAlarm/types';
import { WakeUpOptionItem } from '@components/createAlarm/WakeUpOptionItem';
import { createAlarmFlow } from '@services/alarm/createAlarmFlow';
import { AlarmFlowError } from '@services/alarm/errors';
import { getUserFriendlyErrorMessage } from '@utils/networkErrors';
import { useQueryClient } from '@tanstack/react-query';
import {
  formatLocalDate,
  formatLocalTime,
  isFutureOneTimeAlarm,
} from '@utils/time';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SoundPlayer from 'react-native-sound-player';
import { setActivePlayer } from '@utils/playerManager';

const ALARM_CREATED_POPUP_KEY = 'alarm_created_popup_pending';

export const CreateAlarmScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const friendId = (route as any)?.params?.friendId as string | undefined;
  const queryClient = useQueryClient();
  const [isForMe, setIsForMe] = useState(!Boolean(friendId));
  const [recurring, setRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [wakeUpWith, setWakeUpWith] = useState<WakeUpOption[]>([]);
  const [openOptionId, setOpenOptionId] = useState<string | null>(null);
  const [chosenFriend, setChosenFriend] = useState<string>(friendId || '');
  const [chosenDate, setChosenDate] = useState<string>();
  const [chosenTime, setChosenTime] = useState<string>();
  const [listFriendsIsOpen, setListFriendsIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addOptionsModalVisible, setAddOptionsModalVisible] = useState(false);

  const stopWakeMethodPreview = useCallback(() => {
    try {
      setActivePlayer(null);
    } catch {}

    try {
      SoundPlayer.stop();
    } catch {}
  }, []);

  useEffect(() => {
    return () => {
      stopWakeMethodPreview();
    };
  }, [stopWakeMethodPreview]);

  useEffect(() => {
    try {
      if (recurring) {
        const now = new Date();
        const todayIso = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).toISOString();
        setChosenDate(todayIso);
      }
    } catch (e) {
      // ignore
    }
  }, [recurring]);

  const createSelfMutation = useCreateSelfAlarm();

  const hasAnyUri = useMemo(() => {
    return wakeUpWith.some(
      opt =>
        opt.puzzleUri?.imageUri ||
        opt.puzzleUri?.soundUri ||
        opt.songUri ||
        opt.voiceUri ||
        opt.videoUri ||
        opt.videoLink,
    );
  }, [wakeUpWith]);
  const allOptionsHaveMedia = useMemo(() => {
    return (
      wakeUpWith.length > 0 &&
      wakeUpWith.every(opt => {
        if (opt.type === 'Puzzle') {
          return !!opt.puzzleUri?.imageUri && !!opt.puzzleUri?.soundUri;
        }
        if (opt.type === 'Song') {
          return !!opt.songUri;
        }
        if (opt.type === 'Voice') {
          return !!opt.voiceUri;
        }
        if (opt.type === 'Video') {
          return !!opt.videoUri || !!opt.videoLink;
        }
        return false;
      })
    );
  }, [wakeUpWith]);

  const lacksRecurringDays =
    recurring && (!recurringDays || recurringDays.length === 0);

  const isDisabled = isForMe
    ? !chosenDate ||
      !chosenTime ||
      wakeUpWith.length === 0 ||
      lacksRecurringDays
    : !chosenDate ||
      !chosenTime ||
      !chosenFriend ||
      wakeUpWith.length === 0 ||
      lacksRecurringDays;

  const updateOptionData = (
    id: string,
    updates: Partial<Omit<WakeUpOption, 'id' | 'type'>>,
  ) => {
    setWakeUpWith(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const removeOption = (id: string) => {
    setWakeUpWith(prev => prev.filter(item => item.id !== id));
    setOpenOptionId(prev => (prev === id ? null : prev));
  };

  const createAlarmHandler = async () => {
    if (!chosenDate || !chosenTime) return;
    stopWakeMethodPreview();

    if (recurring && recurringDays.length === 0) {
      Alert.alert(
        'Missing recurring days',
        'Please select at least one day for a recurring alarm.',
      );
      return;
    }

    const dateOnly = formatLocalDate(chosenDate);
    const timeOnly = formatLocalTime(chosenTime);

    if (
      !recurring &&
      dateOnly &&
      timeOnly &&
      !isFutureOneTimeAlarm(dateOnly, timeOnly)
    ) {
      Alert.alert('Error', 'Date and time must be in the future.');
      return;
    }

    const isDuplicate =
      isForMe &&
      isDuplicateAlarm(
        dateOnly || '',
        timeOnly || '',
        queryClient.getQueryData(['alarms', 'upcoming']) || [],
      );

    if (isDuplicate) {
      Alert.alert(
        'Cancelled',
        'Alarm creation was cancelled because another alarm already exists at this time.',
      );
      return;
    }
    setLoading(true);

    try {
      await createAlarmFlow({
        isForMe,
        wakeUpWith,
        recurring,
        recurringDays,
        chosenDate,
        chosenTime,
        createSelfMutation,
        chosenFriend,
      });
      if (!isForMe) {
        await queryClient.invalidateQueries({ queryKey: ['alarms', 'sent'] });
        Alert.alert('Request sent', 'Alarm request sent to your friend');
      } else {
        await AsyncStorage.setItem(ALARM_CREATED_POPUP_KEY, 'true');
      }
      navigation.goBack();
    } catch (e) {
      console.warn(e);

      if (e instanceof AlarmFlowError) {
        const details = (e as any).details;

        let userMessage = e.message;

        if (details?.failedOption?.serverResponse?.message) {
          userMessage = details.failedOption.serverResponse.message;
        } else if (details?.failedOption?.reason) {
          userMessage = details.failedOption.reason;
        }

        if (userMessage.toLowerCase().includes('must be in the future')) {
          userMessage = 'Date and time must be in the future.';
        }

        if (
          userMessage.toLowerCase().includes('unable to detect a project id')
        ) {
          userMessage = 'Server configuration error. Please try again later.';
        }

        userMessage = getUserFriendlyErrorMessage(
          userMessage,
          'Something went wrong. Please try again.',
        );

        Alert.alert('Error', userMessage);
        return;
      }

      Alert.alert('Unexpected Error', 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + 24 }}
      >
        <View className="px-4">
          <Switch forMe={isForMe} onChange={setIsForMe} disabled={false} />

          <ChooseFriendAndData
            isForMe={isForMe}
            listFriendsIsOpen={listFriendsIsOpen}
            setListFriendsIsOpen={setListFriendsIsOpen}
            chosenFriend={chosenFriend}
            setChosenFriend={value => setChosenFriend(value || '')}
            chosenDate={chosenDate}
            setChosenDate={setChosenDate}
            disableDate={recurring}
            chosenTime={chosenTime}
            setChosenTime={setChosenTime}
          />

          <Recurring
            recurring={recurring}
            setRecurring={setRecurring}
            selectedDays={recurringDays}
            onChangeDays={setRecurringDays}
          />
          <View className="my-5 border-t border-border2Color" />
          <Text className="text-white font-semibold text-[17px]">
            Wake up with:
          </Text>
          {wakeUpWith.length > 0 ? (
            <View className="mt-4">
              {wakeUpWith.map((option, idx) => (
                <WakeUpOptionItem
                  key={option.id}
                  option={option}
                  order={idx}
                  open={openOptionId === option.id}
                  onRemove={removeOption}
                  onUpdate={updateOptionData}
                />
              ))}
            </View>
          ) : (
            <Text className="text-border2Color text-[17px] font-semibold mt-8 mb-5 text-center">
              List is empty, let's add your first option
            </Text>
          )}

          {wakeUpWith.length < 4 && (
            <TouchableOpacity
              onPress={() => {
                setAddOptionsModalVisible(true);
              }}
              activeOpacity={0.7}
              className="rounded-[12px] mt-3 mb-5 p-4 border border-white bg-whiteWithTransparentColor self-center"
            >
              <View className="flex-row items-center">
                <Text className="text-[24px] text-white">+</Text>
                <Text className="text-white text-[17px] ml-1 font-semibold">
                  Add Option
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <ChooseWakeUpWith
            wakeMethods={wakeUpWith.map(o => o.type)}
            setWakeUpWith={(type: 'Voice' | 'Video' | 'Song' | 'Puzzle') => {
              const id = Date.now().toString() + Math.random();
              const newOption: WakeUpOption = {
                id,
                type,
                puzzleUri: null,
                songUri: null,
                songName: null,
                voiceUri: null,
                voiceName: null,
                videoUri: null,
                videoLink: null,
              };
              setWakeUpWith(prev => [...prev, newOption]);
              setOpenOptionId(id);
            }}
            isVisible={addOptionsModalVisible}
            onClose={() => {
              setAddOptionsModalVisible(false);
            }}
            height={394}
          />
        </View>
      </ScrollView>

      <View
        className="z-1000 border-t border-border2Color"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingVertical: 16,
          backgroundColor: '#4D0B49',
        }}
        pointerEvents="box-none"
      >
        <View>
          <LinierButton
            title={
              loading ? 'Loading...' : isForMe ? 'Set alarm' : 'Send request'
            }
            onPress={() => {
              if (hasAnyUri) {
                createAlarmHandler();
              }
            }}
            disabled={
              isDisabled || !hasAnyUri || !allOptionsHaveMedia || loading
            }
          />
        </View>
      </View>
    </View>
  );
};
