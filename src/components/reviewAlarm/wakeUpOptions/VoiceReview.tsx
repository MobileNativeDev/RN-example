import {
  Text,
  TouchableOpacity,
  View,
  Platform,
  Linking,
  InteractionManager,
} from 'react-native';
import { Alert } from '@utils/alert';
import { PermissionsAndroid, NativeModules } from 'react-native';
import MicrofonIcon from '../../../../assets/svg/MicrofonIcon.svg';
import { CustomButton } from '@components/customComponents/CustomButton';
import { useRef, useState } from 'react';
import { pick } from '@react-native-documents/picker';
import AudioRecord from 'react-native-audio-record';
import Video, { VideoRef } from 'react-native-video';

type PermissionStatus = 'granted' | 'denied' | 'blocked';

export const VoiceReview = ({
  voiceUri,
  setVoiceUri,
}: {
  voiceUri: string | null;
  setVoiceUri?: (uri: string | null) => void;
  order?: number;
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<VideoRef | null>(null);

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
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
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
      // If react-native-permissions native module is present, prefer it.
      const nm: any = NativeModules || {};
      const hasNativeRNPerm = !!(
        nm.RNPermissions ||
        nm.RNPermissionsModule ||
        nm.RNPermissionsSpec ||
        nm.RNPermissionsProxy ||
        nm.RNPPermissions
      );
      if (hasNativeRNPerm) {
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const perms = require('react-native-permissions');
          if (
            perms &&
            perms.request &&
            perms.check &&
            perms.PERMISSIONS &&
            perms.RESULTS
          ) {
            const micPerm = perms.PERMISSIONS.IOS?.MICROPHONE;
            if (micPerm) {
              const status = await perms.check(micPerm);
              if (status === perms.RESULTS.GRANTED || status === 'granted')
                return 'granted';
              const res = await perms.request(micPerm);
              if (res === perms.RESULTS.GRANTED || res === 'granted') {
                return 'granted';
              }
              if (res === perms.RESULTS.BLOCKED || res === 'blocked') {
                return 'blocked';
              }
              return 'denied';
            }
          }
        } catch (e) {
          console.log('react-native-permissions failed, falling back', e);
        }
      }

      // Fallback: try to trigger native prompt via AudioRecord start/stop
      try {
        const options = {
          sampleRate: 8000,
          channels: 1,
          bitsPerSample: 16,
          wavFile: `perm_test_${Date.now()}.wav`,
        };
        try {
          AudioRecord.init(options);
          await AudioRecord.start();
          await new Promise(resolve => setTimeout(resolve, 300));
          await AudioRecord.stop();
          return 'granted';
        } catch (err) {
          console.log('iOS mic permission trigger error', err);
        }
      } catch (err) {
        console.log('iOS mic permission fallback error', err);
      }

      Alert.alert(
        'Microphone permission',
        'Microphone access is required to record audio. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ],
      );
      return 'blocked';
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
      // For iOS, permissions are handled automatically by the system
      return 'granted';
    }
    return 'granted';
  };

  const startRecording = async () => {
    const permissionStatus = await requestRecordingPermission();
    if (permissionStatus !== 'granted') {
      if (Platform.OS === 'android') {
        showPermissionAlert(permissionStatus, 'microphone');
      }
      return;
    }

    try {
      setIsRecording(true);

      // Initialize audio recording with options
      const options = {
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        wavFile: `recording_${Date.now()}.wav`,
      };

      AudioRecord.init(options);
      AudioRecord.start();
    } catch (error) {
      console.log('Recording setup error:', error);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to setup recording');
    }
  };

  const stopRecording = async () => {
    if (isRecording) {
      try {
        const audioFile = await AudioRecord.stop();
        setIsRecording(false);
        setVoiceUri?.(audioFile);
      } catch (error) {
        console.log('Recording stop error:', error);
        setIsRecording(false);
        Alert.alert('Error', 'Failed to stop recording');
      }
    }
  };

  const handlePickAudio = async () => {
    const permissionStatus = await requestAudioPermission();
    if (permissionStatus !== 'granted') {
      if (Platform.OS === 'android') {
        showPermissionAlert(permissionStatus, 'audio');
      }
      return;
    }
    try {
      const result = await pick({
        type: ['audio/*'],
        allowMultiSelection: false,
        copyTo: 'cachesDirectory',
      });

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

        // Prefer fileCopyUri (local cache copy) over content:// URI for better compatibility
        const uri = (file as any).fileCopyUri || file.uri;
        setVoiceUri?.(uri);
      }
    } catch (e) {
      // user cancelled or error
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
    if (!voiceUri) return;
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      // restart from beginning when re-playing
      try {
        playerRef.current?.seek?.(0);
      } catch {}
      setIsPlaying(true);
    }
  };

  return (
    <View>
      <Text className="text-white font-semibold text-lg">Voice</Text>
      <View className="mt-[10px]">
        {voiceUri ? (
          <View
            className="border-2 border-white flex-row p-5 items-center"
            style={{
              borderRadius: 12,
            }}
          >
            <TouchableOpacity
              onPress={onTogglePlay}
              className="rounded-full w-[33px] h-[33px] justify-center items-center mr-4 border border-white"
              style={{
                backgroundColor: 'rgba(181, 29, 150, 0.3)',
              }}
            >
              <Text className="text-white text-sm font-bold">
                {isPlaying ? '||' : '▶'}
              </Text>
            </TouchableOpacity>

            <View className="flex-1">
              <Text className="text-white font-semibold text-base">
                Voice_record - {Math.floor(duration / 60)}:
                {String(Math.floor(duration % 60)).padStart(2, '0')}
              </Text>
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
            </View>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={!voiceUri ? 0.7 : 1}
            className="border border-dashed border-white justify-center items-center flex-row p-5"
            style={{
              borderStyle: 'dashed',
              overflow: 'hidden',
              borderRadius: 12,
            }}
            onPress={
              !voiceUri
                ? () => {
                    handlePickAudio();
                  }
                : undefined
            }
          >
            <MicrofonIcon width={32} height={32} />
            <Text className="text-border2Color font-semibold text-lg ml-2">
              {isRecording ? 'Recording...' : 'Tap to upload voice'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="mb-5">
        <CustomButton
          title={isRecording ? 'Stop Recording' : 'Record'}
          onPress={handleRecord}
          textStyle="text-white font-regular text-[17px]"
          style="my-[10px] border-white"
        />
        <CustomButton
          title="Choose from the list"
          onPress={handlePickAudio}
          textStyle="text-white font-regular text-[17px]"
          style="border-white"
        />
      </View>
      {voiceUri ? (
        <View>
          <Video
            ref={playerRef}
            source={{ uri: voiceUri }}
            paused={!isPlaying}
            playInBackground
            ignoreSilentSwitch="ignore"
            onLoad={data => {
              setDuration(data.duration);
            }}
            onProgress={data => {
              setCurrentTime(data.currentTime);
            }}
            onEnd={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            onError={() => {
              setIsPlaying(false);
              Alert.alert(
                'Playback error',
                'Failed to play the selected sound.',
              );
            }}
            style={{ width: 0, height: 0 }}
          />
        </View>
      ) : null}
    </View>
  );
};
