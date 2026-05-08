import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Linking,
  InteractionManager,
} from 'react-native';
import { Alert } from '@utils/alert';
import { CustomButton } from '@components/customComponents/CustomButton';
import { pick } from '@react-native-documents/picker';
import { useRef, useState } from 'react';
import Video, { VideoRef } from 'react-native-video';

type PermissionStatus = 'granted' | 'denied' | 'blocked';

export const SongReview = ({
  songUri,
  setSongUri,
}: {
  songUri: string | null;
  setSongUri?: (uri: string | null) => void;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<VideoRef | null>(null);

  const showAudioPermissionAlert = (status: PermissionStatus) => {
    const message =
      status === 'blocked'
        ? 'Audio access is blocked. Please enable it in Settings to choose a sound.'
        : 'Audio access is required to select a sound.';

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        Alert.alert(
          'Audio permission required',
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

  const requestAudioPermission = async (): Promise<PermissionStatus> => {
    if (Platform.OS !== 'android') {
      return 'granted';
    }

    const permission =
      Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

    const result = await PermissionsAndroid.request(permission, {
      title: 'Audio Permission',
      message: 'App needs access to your audio files to select a sound.',
      buttonPositive: 'OK',
    });

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return 'granted';
    }

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return 'blocked';
    }

    return 'denied';
  };

  const handlePickSound = async () => {
    const permissionStatus = await requestAudioPermission();
    if (permissionStatus !== 'granted') {
      if (Platform.OS === 'android') {
        showAudioPermissionAlert(permissionStatus);
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

        if (sizeInMB > 20) {
          Alert.alert(
            'File too large',
            `Selected song file is ${sizeInMB.toFixed(
              20,
            )}MB. Maximum allowed size is 20MB. Please choose a shorter audio.`,
          );
          return;
        }

        const uri = (file as any).fileCopyUri || file.uri;
        setSongUri?.(uri);
        // Reset player state for new selection
        setIsPlaying(false);
        setDuration(0);
        setCurrentTime(0);
        try {
          playerRef.current?.seek?.(0);
        } catch {}
      }
    } catch (e) {
      // user cancelled or error
    }
  };

  const onTogglePlay = () => {
    if (!songUri) return;
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      try {
        playerRef.current?.seek?.(0);
      } catch {}
      setIsPlaying(true);
    }
  };

  return (
    <View>
      <Text className="text-white font-semibold text-lg">Song</Text>

      {/* <View className="my-5 ">
        <Text className="mb-[10px] font-regular text-[15px] text-white">
          Paste link on music here:
        </Text>
        <TextInput
          value={songUri || ''}
          onChangeText={text => setSongUri && setSongUri(text)}
          className="border border-white rounded-xl p-[10px] text-white"
          placeholder="https://"
          placeholderTextColor={'white'}
        />
      </View> */}
      {songUri && songUri?.length > 30 && (
        <View className="w-full items-center mb-2 border border-white rounded-xl p-3">
          <View className="flex-row items-center w-full" style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={onTogglePlay}
              className="border border-white rounded-full items-center justify-center"
              style={{
                width: 33,
                height: 33,
                backgroundColor: 'rgba(181, 29, 150, 0.3)',
              }}
              activeOpacity={0.7}
            >
              {isPlaying ? (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: 'white',
                    borderRadius: 2,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 8,
                    borderTopWidth: 5,
                    borderBottomWidth: 5,
                    borderLeftColor: 'white',
                    borderTopColor: 'transparent',
                    borderBottomColor: 'transparent',
                    marginLeft: 2,
                  }}
                />
              )}
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-white text-[13px] mb-1">
                Song -{' '}
                {duration > 0
                  ? `${Math.floor(duration / 60)}:${String(
                      Math.floor(duration % 60),
                    ).padStart(2, '0')}`
                  : '0:00'}
              </Text>
              <View className="h-1 bg-gray-400 rounded-full w-full">
                <View
                  className="h-1 bg-white rounded-full"
                  style={{
                    width:
                      duration > 0
                        ? `${(currentTime / duration) * 100}%`
                        : '0%',
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      )}
      <CustomButton
        title="Choose from the list"
        onPress={() => {
          handlePickSound();
        }}
        textStyle="text-white font-regular text-[17px]"
        style="my-[10px] border-white"
      />
      {songUri ? (
        <View className="justify-center items-center">
          <Video
            ref={playerRef}
            source={{ uri: songUri }}
            paused={!isPlaying}
            playInBackground
            ignoreSilentSwitch="ignore"
            onLoad={data => setDuration(data.duration)}
            onProgress={data => setCurrentTime(data.currentTime)}
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
