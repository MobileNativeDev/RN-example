import {
  Text,
  TouchableOpacity,
  View,
  Platform,
  Linking,
  Image,
  InteractionManager,
  StyleSheet,
} from 'react-native';
import { Alert } from '@utils/alert';
import { PermissionsAndroid } from 'react-native';
import MicrofonIcon from '../../../../assets/svg/MicrofonIcon.svg';
import { CustomButton } from '@components/customComponents/CustomButton';
import { useRef, useState, useEffect } from 'react';
import { pick } from '@react-native-documents/picker';
import AudioRecord from 'react-native-audio-record';
import SoundPlayer from 'react-native-sound-player';
import { OptionContainer } from './OptionContainer';
import VoiceIcon from '../../../../assets/svg/VoiceIcon.svg';
import TrashIcon from '../../../../assets/svg/TrashIcon.svg';
import {
  getActivePlayer,
  setActivePlayer,
  subscribeActivePlayer,
} from '@utils/playerManager';
import LinearGradient from 'react-native-linear-gradient';
import DeleteIcon from '../../../../assets/svg/DeleteIcon.svg';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '@appTypes/navigationTypes';
import { createNavCallback } from '@utils/navCallbackStore';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { getVoiceDisplayName } from '@utils/voiceDisplayName';
import togglePlay from './functions/togglePlay';

type PermissionStatus = 'granted' | 'denied' | 'blocked';
const MAX_RECORDING_DURATION_SEC = 60;

const renderPlaybackIcon = (isPlaying: boolean) => {
  if (isPlaying) {
    return <View style={styles.stopIndicator} />;
  }

  return <View style={styles.playIndicator} />;
};

export const Voice = ({
  voiceUri,
  voiceName,
  setVoiceUri,
  setVoiceName,
  order,
  onRemove,
  open,
  openable,
}: {
  voiceUri: string | number | null;
  voiceName?: string | null;
  setVoiceUri?: (uri: string | number | null) => void;
  setVoiceName?: (name: string | null) => void;
  order?: number;
  onRemove?: () => void;
  open?: boolean;
  openable?: boolean;
}) => {
  const navigation = useNavigation<AuthNavigationProp>();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [isRecorded, setIsRecorded] = useState(false);
  const shouldShowFooter = Boolean((!voiceUri && setVoiceUri) || onRemove);
  const resolvedVoiceTitle =
    getVoiceDisplayName(
      voiceUri,
      voiceName || (isRecorded ? 'Voice_record' : null),
    ) ||
    (Platform.OS === 'ios' && isRecorded
      ? 'Voice_record'
      : duration > 0
      ? `Voice_record - ${Math.floor(duration / 60)}:${String(
          Math.floor(duration % 60),
        ).padStart(2, '0')}`
      : 'Voice_record');

  const playerIdRef = useRef<string>(
    `voice-${order ?? Date.now()}-${Math.random()}`,
  );
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  useEffect(() => {
    const unsub = subscribeActivePlayer((activeId: string | null) => {
      if (activeId !== playerIdRef.current) {
        try {
          SoundPlayer.stop();
        } catch {}
        stopProgressTimer();
        setIsPlaying(false);
      }
    });
    setIsPlaying(false);
    return unsub;
  }, []);

  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // when voiceUri changes, stop any current playback
  useEffect(() => {
    try {
      SoundPlayer.stop();
    } catch {}
    stopProgressTimer();
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    try {
      stopRecording();
    } catch {}
  }, [voiceUri]);

  useEffect(() => {
    let subFinish: any;
    let subError: any;
    try {
      subFinish = SoundPlayer.addEventListener('FinishedPlaying', () => {
        stopProgressTimer();
        setIsPlaying(false);
        setCurrentTime(0);
        try {
          if (getActivePlayer() === playerIdRef.current) setActivePlayer(null);
        } catch {}
      });
    } catch {}
    return () => {
      try {
        subFinish?.remove?.();
      } catch {}
      try {
        subError?.remove?.();
      } catch {}
    };
  }, []);

  useEffect(() => {
    return () => {
      try {
        stopRecording();
      } catch {}
    };
  }, []);

  const showPermissionAlert = (
    status: PermissionStatus,
    kind: 'microphone' | 'audio',
  ) => {
    const isMicrophone = kind === 'microphone';
    const title = isMicrophone
      ? 'Microphone permission required'
      : 'Audio permission required';
    const message =
      status === 'blocked'
        ? isMicrophone
          ? 'Microphone access is blocked. Please enable it in Settings to record audio.'
          : 'Audio access is blocked. Please enable it in Settings to choose a recording.'
        : isMicrophone
        ? 'Microphone access is required to record audio.'
        : 'Audio access is required to select a voice recording.';

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        Alert.alert(
          title,
          message,
          status === 'blocked'
            ? [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => Linking.openSettings(),
                },
              ]
            : [{ text: 'OK' }],
        );
      }, 250);
    });
  };

  const requestRecordingPermission = async (): Promise<PermissionStatus> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'App needs access to your microphone to record audio.',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return 'granted';
      }

      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return 'blocked';
      }

      return 'denied';
    } else if (Platform.OS === 'ios') {
      try {
        const micPerm = PERMISSIONS.IOS.MICROPHONE;

        console.log('micPerm', micPerm);

        const status = await check(micPerm);
        console.log('status', status);

        if (status === RESULTS.GRANTED) {
          return 'granted';
        }

        if (status === RESULTS.BLOCKED) {
          Alert.alert(
            'Microphone permission',
            'Microphone access is blocked. Please enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          return 'blocked';
        }

        const result = await request(micPerm);
        if (result === RESULTS.GRANTED) {
          return 'granted';
        }

        if (result === RESULTS.BLOCKED) {
          return 'blocked';
        }

        return 'denied';
      } catch (e) {
        console.log('react-native-permissions error:', e);
        Alert.alert(
          'Permission Error',
          'Failed to request microphone permission. Please check app permissions in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return 'blocked';
      }
    }
    return 'granted';
  };

  const requestAudioPermission = async (): Promise<PermissionStatus> => {
    if (Platform.OS === 'android') {
      const permission =
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const granted = await PermissionsAndroid.request(permission, {
        title: 'Audio Permission',
        message:
          'App needs access to your audio files to select a voice recording.',
        buttonPositive: 'OK',
      });
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return 'granted';
      }

      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return 'blocked';
      }

      return 'denied';
    } else if (Platform.OS === 'ios') {
      return 'granted';
    }
    return 'granted';
  };

  const startRecording = async () => {
    const permissionStatus = await requestRecordingPermission();
    console.log('recordingPermissionStatus', permissionStatus);

    if (permissionStatus !== 'granted') {
      if (Platform.OS === 'android') {
        showPermissionAlert(permissionStatus, 'microphone');
      }
      return;
    }

    try {
      setIsRecording(true);
      setRecordingElapsed(0);
      recordingStartedAtRef.current = Date.now();
      stopRecordingTimer();
      recordingTimerRef.current = setInterval(() => {
        if (recordingStartedAtRef.current) {
          const elapsed = Math.floor(
            (Date.now() - recordingStartedAtRef.current) / 1000,
          );
          setRecordingElapsed(elapsed);
        }
      }, 1000);

      const options = {
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        wavFile: `recording_${Date.now()}.wav`,
      };

      console.log('Initializing AudioRecord with options:', options);
      AudioRecord.init(options);
      AudioRecord.start();
      console.log('Recording started successfully');
    } catch (error) {
      console.log('Recording setup error:', error);
      setIsRecording(false);
      stopRecordingTimer();
      recordingStartedAtRef.current = null;
      Alert.alert('Error', 'Failed to setup recording');
    }
  };
  useEffect(() => {
    if (isRecording && recordingElapsed >= MAX_RECORDING_DURATION_SEC) {
      stopRecording();
      Alert.alert(
        'Recording stopped',
        'Maximum recording duration of 1 minute reached.',
      );
    }
  }, [isRecording, recordingElapsed]);

  const stopRecording = async () => {
    if (isRecording) {
      try {
        const audioFile = await AudioRecord.stop();
        setIsRecording(false);
        stopRecordingTimer();
        recordingStartedAtRef.current = null;
        setRecordingElapsed(0);
        setVoiceUri?.(audioFile);
        setVoiceName?.('Voice_record');
        setIsRecorded(true);
      } catch (error) {
        setIsRecording(false);
        stopRecordingTimer();
        recordingStartedAtRef.current = null;
        Alert.alert('Error', 'Failed to stop recording');
      }
    }
  };

  const handlePickAudio = async () => {
    try {
      await stopRecording();
    } catch {}
    const permissionStatus = await requestAudioPermission();
    if (permissionStatus !== 'granted') {
      if (Platform.OS === 'android') {
        showPermissionAlert(permissionStatus, 'audio');
      }
      return;
    }

    try {
      const pickerOptions: any = {
        allowMultiSelection: false,
        copyTo: 'cachesDirectory',
      };

      if (Platform.OS === 'ios') {
        pickerOptions.type = [
          'public.mp3',
          'com.apple.m4a-audio',
          'public.wav',
          'public.audio',
        ];
      } else {
        pickerOptions.type = ['audio/*', '*/*'];
      }

      const result = await pick(pickerOptions);

      if (result && result[0]) {
        const file = result[0];
        const sizeInMB = (file.size || 0) / (1024 * 1024);

        if (sizeInMB > 1) {
          Alert.alert(
            'File too large',
            `Selected voice file is ${sizeInMB.toFixed(
              2,
            )}MB. Maximum allowed size is 1MB. Please choose a shorter recording.`,
          );
          return;
        }

        const uri = (file as any).fileCopyUri || file.uri;
        const resolvedName = getVoiceDisplayName(
          uri,
          (file as any).name || null,
        );
        setVoiceUri?.(uri);
        setVoiceName?.(resolvedName || null);
        setIsRecorded(false);
      }
    } catch (e) {
      console.log('pick audi error', e);
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const onTogglePlay = () => {
    if (Platform.OS === 'ios' && typeof voiceUri === 'string' && isRecorded) {
      togglePlay({
        voiceUri,
        isPlaying,
        setIsPlaying,
        playerId: playerIdRef.current,
        setActivePlayer,
      });
    } else {
      if (isPlaying) {
        SoundPlayer.stop();
        stopProgressTimer();
        setIsPlaying(false);
        setActivePlayer(null);
      } else {
        setActivePlayer(playerIdRef.current);
        try {
          if (typeof voiceUri === 'number') {
            const resolved = Image.resolveAssetSource(voiceUri);
            const filename = resolved.uri.split('/').pop()?.split('?')[0] || '';
            const nameWithoutExt = filename.replace(
              /\.mp3$|\.wav$|\.m4a$/i,
              '',
            );
            console.log('Playing bundled voice asset:', nameWithoutExt);
            SoundPlayer.playSoundFile(nameWithoutExt, 'mp3');
          } else {
            SoundPlayer.playUrl(voiceUri as string);

            progressTimerRef.current = setInterval(async () => {
              try {
                const info = await SoundPlayer.getInfo();
                if (typeof info?.duration === 'number')
                  setDuration(info.duration);
                if (typeof info?.currentTime === 'number')
                  setCurrentTime(info.currentTime);
              } catch {}
            }, 300);
            setIsPlaying(true);
          }
        } catch (e) {
          Alert.alert('Playback error', `Failed to play the selected sound.`);
          setIsPlaying(false);
          return;
        }
      }
    }
  };

  const handleExampleVoice = () => {
    (async () => {
      try {
        await stopRecording();
      } catch {}

      const cbId = createNavCallback(
        (payload: {
          uri: string | number | null;
          id?: string;
          name?: string;
        }) => {
          setVoiceUri?.(payload.uri ?? null);
          setVoiceName?.(payload.name ?? null);
          setIsRecorded(false);
        },
      );
      navigation.navigate('MainContentNavigation', {
        screen: 'VoicesScreen',
        params: { callbackId: cbId },
      });
    })();
  };

  return (
    <OptionContainer
      title="Voice"
      order={order}
      icon={<VoiceIcon width={32} height={32} />}
      open={open}
      openable={openable}
    >
      <View className={shouldShowFooter ? undefined : 'pb-5'}>
        <View className="mt-[10px]">
          {voiceUri ? (
            <View
              className="border-2 border-white flex-row py-5 px-[10px] items-center"
              style={styles.previewCard}
            >
              <TouchableOpacity
                onPress={onTogglePlay}
                className="rounded-full w-[33px] h-[33px] justify-center items-center mr-4 border border-white"
                style={styles.playButton}
              >
                {renderPlaybackIcon(isPlaying)}
              </TouchableOpacity>

              <View className="flex-1">
                {isRecording ? (
                  <Text className="text-white font-semibold text-base">
                    Recording... {Math.floor(recordingElapsed / 60)}:
                    {String(recordingElapsed % 60).padStart(2, '0')}
                  </Text>
                ) : (
                  <Text className="text-white font-semibold text-base">
                    {resolvedVoiceTitle}
                  </Text>
                )}
                {isRecorded && Platform.OS === 'ios' ? null : (
                  <View className="mt-2 h-1 bg-gray-400 rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width:
                          duration > 0
                            ? `${(currentTime / duration) * 100}%`
                            : '0%',
                        backgroundColor: '#B51D96',
                      }}
                    />
                  </View>
                )}
              </View>
              {setVoiceUri && (
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await stopRecording();
                    } catch {}
                    setVoiceUri?.(null);
                    setVoiceName?.(null);
                    setIsPlaying(false);
                    setDuration(0);
                    setCurrentTime(0);
                    setIsRecorded(false);
                  }}
                  className="ml-4 border w-[35px] h-[35px] rounded-lg items-center justify-center border-white"
                  style={{
                    boxShadow: ' 0 1px 30px 0 rgba(69, 42, 124, 0.1)',
                  }}
                >
                  <LinearGradient
                    colors={['#540743', '#B51D96']}
                    className="w-full h-full rounded-lg items-center justify-center"
                  >
                    <DeleteIcon />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={!voiceUri ? 0.7 : 1}
              className={`border border-dashed border-white justify-center items-center flex-row p-5 ${
                voiceUri ? 'bg-whiteWithTransparentColor' : ''
              }`}
              style={styles.uploadCard}
              onPress={
                !voiceUri
                  ? () => {
                      handlePickAudio();
                    }
                  : undefined
              }
            >
              <MicrofonIcon width={32} height={32} />
              <View className="ml-2">
                <Text className="text-border2Color font-semibold text-lg">
                  Tap to upload voice
                </Text>
                <Text className="text-border2Color font-regular text-sm ">
                  Limit file size to 1MB
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {shouldShowFooter ? (
          <View className="border-t border-border2Color mt-4 pt-[6px]">
            {!voiceUri && setVoiceUri ? (
              <>
                <CustomButton
                  title={
                    isRecording
                      ? `Stop Recording (${Math.floor(
                          recordingElapsed / 60,
                        )}:${String(recordingElapsed % 60).padStart(2, '0')})`
                      : 'Record'
                  }
                  onPress={handleRecord}
                  textStyle="text-white font-regular text-[17px]"
                  style="my-[10px] border-white bg-whiteWithTransparentColor"
                />
                <CustomButton
                  title="Example Voices"
                  onPress={handleExampleVoice}
                  textStyle="text-white font-regular text-[17px]"
                  style="border-white bg-whiteWithTransparentColor"
                />
              </>
            ) : null}
          </View>
        ) : null}
        {onRemove && (
          <TouchableOpacity
            onPress={async () => {
              try {
                await stopRecording();
              } catch {}
              setVoiceUri?.(null);
              setIsPlaying(false);
              setDuration(0);
              setCurrentTime(0);
              onRemove();
            }}
            activeOpacity={0.7}
            className="mt-3 mb-5 border border-redColor rounded-xl py-3 items-center flex-row justify-center bg-whiteWithTransparentColor"
          >
            <TrashIcon color="#FF5F57" />
            <Text className="text-lg font-semibold text-redColor ml-2">
              Delete Option
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </OptionContainer>
  );
};

const styles = StyleSheet.create({
  playButton: {
    backgroundColor: 'rgba(181, 29, 150, 0.3)',
  },
  playIndicator: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftColor: 'white',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 2,
  },
  previewCard: {
    borderRadius: 12,
  },
  stopIndicator: {
    width: 10,
    height: 10,
    backgroundColor: 'white',
    borderRadius: 2,
  },
  uploadCard: {
    borderStyle: 'dashed',
    overflow: 'hidden',
    borderRadius: 12,
  },
});
