import { ScrollView, View, ActivityIndicator } from 'react-native';
import { Alert } from '@utils/alert';
import { Alarm } from '@appTypes/types';
import { useUploadAlarmAssets } from '@hooks/useUploadAlarmAssets';
import { useUpdateSelfAlarm } from '@hooks/useAlarms';
import { ChooseFriendAndData } from '@components/createAlarm/ChooseFriendAndData';
import { useCallback, useState } from 'react';
import { Recurring } from '@components/createAlarm/Recuring';
import { LinierButton } from '@components/customComponents/LinierButton';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectUserId } from '@store/auth/selectors';
import { useAlarmData } from './utils/useAlarmData';
import {
  AlarmChangesSavedWithWarningError,
  saveAlarmChanges,
} from './utils/saveAlarmChanges';
import { AlarmInfoHeader } from './components/AlarmInfoHeader';
import { WakeMethodsList } from './components/WakeMethodsList';
import { WakeMethodMediaOverride } from './utils/wakeMethodOverrides';
import SoundPlayer from 'react-native-sound-player';
import { stopPlayer } from '@services/ios-services/nativePlayer';
import { setActivePlayer } from '@utils/playerManager';

const normalizeWakeMethods = (alarm?: Alarm | null) => {
  const value = (alarm as any)?.wakeMethods;
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
};

export const EditAlarmScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { chosenAlarm } = (route.params ?? {}) as {
    chosenAlarm: Alarm | null;
  };

  const myUserId = useSelector(selectUserId);

  const [chosenDate, setChosenDate] = useState<string>(chosenAlarm?.date || '');
  const [chosenTime, setChosenTime] = useState<string>(chosenAlarm?.time || '');
  const [recurring, setRecurring] = useState(chosenAlarm?.recurring || false);
  const [recurringDays, setRecurringDays] = useState<string[]>([]);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [puzzleSoundUri, setPuzzleSoundUri] = useState<string | number | null>(
    null,
  );
  const [puzzleSongName, setPuzzleSongName] = useState<string | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | number | null>(null);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const [songUri, setSongUri] = useState<string | number | null>(null);
  const [songName, setSongName] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoLink, setVideoLink] = useState<string | null>(null);

  const [voiceDeleted, setVoiceDeleted] = useState(false);
  const [songDeleted, setSongDeleted] = useState(false);
  const [puzzleDeleted, setPuzzleDeleted] = useState(false);
  const [videoDeleted, setVideoDeleted] = useState(false);

  const [saving, setSaving] = useState(false);
  const [voiceOverrides, setVoiceOverrides] = useState<
    Record<string, WakeMethodMediaOverride>
  >({});
  const [songOverrides, setSongOverrides] = useState<
    Record<string, WakeMethodMediaOverride>
  >({});

  const stopEditMediaPlayback = useCallback(async () => {
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

  const alarmData = useAlarmData(
    chosenAlarm,
    setChosenDate,
    setRecurring,
    setImageUri,
    setPuzzleSoundUri,
    setPuzzleSongName,
    setVideoUri,
    setVideoLink,
    setVoiceUri,
    setVoiceName,
    setSongUri,
    setSongName,
    setRecurringDays,
  );

  const updateMutation = useUpdateSelfAlarm();
  const { uploadAssets } = useUploadAlarmAssets();

  const isOwner = Boolean(
    myUserId &&
      (alarmData?.ownerId === myUserId || alarmData?.createdById === myUserId),
  );

  const openable = isOwner;

  const scheduledAtStr = alarmData?.scheduledAt || chosenAlarm?.scheduledAt;
  const scheduledAtEpoch = scheduledAtStr
    ? isNaN(Date.parse(String(scheduledAtStr)))
      ? undefined
      : Date.parse(String(scheduledAtStr))
    : undefined;
  const hasPlayed = scheduledAtEpoch ? Date.now() >= scheduledAtEpoch : true;
  const canShowMedia = isOwner || hasPlayed;

  const wakeMethods = (() => {
    const detailedWakeMethods = normalizeWakeMethods(alarmData);
    if (detailedWakeMethods.length > 0) return detailedWakeMethods;
    return normalizeWakeMethods(chosenAlarm);
  })();

  useFocusEffect(
    useCallback(() => {
      void stopEditMediaPlayback();

      return () => {
        void stopEditMediaPlayback();
      };
    }, [stopEditMediaPlayback]),
  );

  const handleSaveChanges = async () => {
    if (!chosenAlarm) return;

    if (recurring && recurringDays.length === 0) {
      Alert.alert(
        'Missing recurring days',
        'Please select at least one day for a recurring alarm.',
      );
      return;
    }

    setSaving(true);
    try {
      await saveAlarmChanges({
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
        onSuccess: _updated => {
          Alert.alert('Success', 'Alarm updated successfully');
          navigation.goBack();
        },
      });
    } catch (err) {
      console.error('[EditAlarmScreen] Save failed:', err);
      if (err instanceof AlarmChangesSavedWithWarningError) {
        Alert.alert(
          'Saved with warning',
          'Alarm changes were saved, but local alarm sync may need a refresh.',
        );
        navigation.goBack();
        return;
      }
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}>
      <View className="py-5 flex-1 px-4">
        <AlarmInfoHeader alarm={chosenAlarm} />

        <ChooseFriendAndData
          isForMe={true}
          chosenDate={chosenDate}
          setChosenDate={setChosenDate}
          chosenTime={chosenTime}
          disableDate={recurring}
          setChosenTime={setChosenTime}
        />

        <Recurring
          recurring={recurring}
          setRecurring={setRecurring}
          selectedDays={recurringDays}
          onChangeDays={setRecurringDays}
        />

        <View className="my-3">
          <WakeMethodsList
            wakeMethods={wakeMethods}
            alarmData={alarmData}
            isOwner={isOwner}
            canShowMedia={canShowMedia}
            openable={openable}
            imageUri={imageUri}
            puzzleSoundUri={puzzleSoundUri}
            puzzleSongName={puzzleSongName}
            voiceUri={voiceUri}
            voiceName={voiceName}
            voiceOverrides={voiceOverrides}
            songUri={songUri}
            songName={songName}
            songOverrides={songOverrides}
            videoUri={videoUri}
            videoLink={videoLink}
            puzzleDeleted={puzzleDeleted}
            voiceDeleted={voiceDeleted}
            videoDeleted={videoDeleted}
            songDeleted={songDeleted}
            setImageUri={setImageUri}
            setPuzzleSoundUri={setPuzzleSoundUri}
            setPuzzleSongName={setPuzzleSongName}
            setVoiceUri={setVoiceUri}
            setVoiceName={setVoiceName}
            setVoiceOverride={(methodKey, patch) =>
              setVoiceOverrides(prev => ({
                ...prev,
                [methodKey]: {
                  ...prev[methodKey],
                  ...patch,
                },
              }))
            }
            setSongUri={setSongUri}
            setSongName={setSongName}
            setSongOverride={(methodKey, patch) =>
              setSongOverrides(prev => ({
                ...prev,
                [methodKey]: {
                  ...prev[methodKey],
                  ...patch,
                },
              }))
            }
            setVideoUri={setVideoUri}
            setVideoLink={setVideoLink}
            setPuzzleDeleted={setPuzzleDeleted}
            setVoiceDeleted={setVoiceDeleted}
            setVideoDeleted={setVideoDeleted}
            setSongDeleted={setSongDeleted}
          />
        </View>

        <View className="flex-1 justify-end">
          <LinierButton
            title={saving ? <ActivityIndicator color="#fff" /> : 'Save Changes'}
            onPress={handleSaveChanges}
            borderColor={true}
            disabled={saving}
          />
          <View className="h-3" />
          <LinierButton
            title="Cancel"
            onPress={() => navigation.goBack()}
            borderColor={true}
          />
        </View>
      </View>
    </ScrollView>
  );
};
