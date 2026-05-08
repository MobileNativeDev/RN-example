import {
  Text,
  TouchableOpacity,
  View,
  Image,
  Platform,
  Linking,
  InteractionManager,
} from 'react-native';
import { Alert } from '@utils/alert';
import { Dimensions, PixelRatio } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import BigPuzzleIcon from '../../../../assets/svg/BigPuzzleIcon.svg';
import { CustomButton } from '@components/customComponents/CustomButton';
import { useEffect, useRef, useState } from 'react';
import ImagePicker from 'react-native-image-crop-picker';
import { pick } from '@react-native-documents/picker';
import Video, { VideoRef } from 'react-native-video';
import { requestAudioPermission } from '@utils/permissions';

type PermissionStatus = 'granted' | 'denied' | 'blocked';

export const PuzzleReview = ({
  puzzleUri,
  setPuzzleUri,
}: {
  puzzleUri: { imageUri: string | null; soundUri: string | null } | null;
  setPuzzleUri?: (
    uri: { imageUri: string | null; soundUri: string | null } | null,
  ) => void;
}) => {
  const [boxWidth, setBoxWidth] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<VideoRef | null>(null);

  const showGalleryPermissionAlert = (status: PermissionStatus) => {
    const message =
      status === 'blocked'
        ? 'Gallery access is blocked. Please enable it in Settings to choose a picture.'
        : 'Gallery access is required to select a picture.';

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        Alert.alert(
          'Gallery permission required',
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

  const requestGalleryPermission = async (): Promise<PermissionStatus> => {
    if (Platform.OS === 'android') {
      const permission =
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const granted = await PermissionsAndroid.request(permission, {
        title: 'Gallery Permission',
        message: 'App needs access to your gallery to select a picture.',
        buttonPositive: 'OK',
      });
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return 'granted';
      }
      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return 'blocked';
      }
      return 'denied';
    }
    return 'granted';
  };

  const handlePickImage = async () => {
    const permissionStatus = await requestGalleryPermission();
    if (permissionStatus !== 'granted') {
      if (Platform.OS === 'android') {
        showGalleryPermissionAlert(permissionStatus);
      }
      return;
    }
    try {
      const fallbackWidth = Dimensions.get('window').width;
      const layoutWidthDp = boxWidth ?? fallbackWidth;
      const targetWidth = Math.max(
        1,
        PixelRatio.getPixelSizeForLayoutSize(layoutWidthDp),
      );
      const targetHeight = Math.max(
        1,
        PixelRatio.getPixelSizeForLayoutSize(230),
      );
      const res = await ImagePicker.openPicker({
        mediaType: 'photo',
        cropping: true,
        width: targetWidth,
        height: targetHeight,
        freeStyleCropEnabled: false,
        compressImageQuality: 0.8,
        compressImageMaxWidth: 800,
        compressImageMaxHeight: 800,
      });
      setPuzzleUri?.({
        imageUri: res.path,
        soundUri: puzzleUri?.soundUri || null,
      });
    } catch (e) {
      // user cancelled or error
    }
  };
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const handlePickSound = async () => {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission denied',
        'Audio access is required to select a sound.',
      );
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
            `Selected sound file is ${sizeInMB.toFixed(
              2,
            )}MB. Maximum allowed size is 1MB. Please choose a shorter audio.`,
          );
          return;
        }

        const uri = (file as any).fileCopyUri || file.uri;
        setPuzzleUri?.({
          imageUri: puzzleUri?.imageUri || null,
          soundUri: uri,
        });
        // Reset player state for new selection
        setIsPlaying(false);
        try {
          playerRef.current?.seek?.(0);
        } catch {}
      }
    } catch (e) {
      // user cancelled or error
    }
  };

  // Stop playback if sound removed or puzzle cleared
  useEffect(() => {
    if (!puzzleUri?.soundUri) {
      setIsPlaying(false);
      try {
        playerRef.current?.seek?.(0);
      } catch {}
    }
  }, [puzzleUri?.soundUri]);

  const onTogglePlay = () => {
    if (!puzzleUri?.soundUri) return;
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
      <View className="mt-[10px]">
        {puzzleUri?.imageUri ? (
          <Image
            source={
              typeof puzzleUri.imageUri === 'number'
                ? { uri: Image.resolveAssetSource(puzzleUri.imageUri).uri }
                : { uri: puzzleUri.imageUri || '' }
            }
            style={{
              width: '100%',
              height: 230,
              borderWidth: 2,
              borderColor: 'white',
              borderRadius: 12,
              overflow: 'hidden',
            }}
            resizeMode="cover"
          />
        ) : (
          <TouchableOpacity
            activeOpacity={!puzzleUri?.imageUri ? 0.7 : 1}
            className="border border-white h-[178px] justify-center items-center"
            style={{
              borderStyle: 'dashed',
              overflow: 'hidden',
              borderRadius: 12,
            }}
            onPress={!puzzleUri?.imageUri ? handlePickImage : undefined}
            onLayout={e => setBoxWidth(e.nativeEvent.layout.width)}
          >
            <BigPuzzleIcon />
            <Text className="text-border2Color font-semibold">
              Tap to upload picture
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <>
        <CustomButton
          title="Choose from the list"
          onPress={() => {
            handlePickImage();
          }}
          textStyle="text-white font-regular text-[17px]"
          style="my-3 border-white"
        />
        {puzzleUri?.soundUri && (
          <View className="mb-3">
            <View
              className="border border-white flex-row p-5 items-center"
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
                  Puzzle_sound - {Math.floor(duration / 60)}:
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
            <Video
              ref={playerRef}
              source={{
                uri:
                  typeof puzzleUri.soundUri === 'number'
                    ? Image.resolveAssetSource(puzzleUri.soundUri).uri
                    : puzzleUri.soundUri || '',
              }}
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
        )}
        <CustomButton
          title="Choose a sound"
          onPress={handlePickSound}
          textStyle="text-white font-regular text-[17px]"
          style="border-white"
        />
      </>
    </View>
  );
};
