import {
  Text,
  TouchableOpacity,
  View,
  Platform,
  TextInput,
  Linking,
  InteractionManager,
} from 'react-native';
import { Alert } from '@utils/alert';
// Dimensions/PixelRatio not needed for video picker
import { PermissionsAndroid } from 'react-native';
import BigVideoIcon from '../../../../assets/svg/BigVideoIcon.svg';
import { useState } from 'react';
import { UIManager } from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import VideoPlayer from 'react-native-video';
import YouTubeIcon from '../../../../assets/svg/YouTubeIcon.svg';
import TrashIcon from '../../../../assets/svg/TrashIcon.svg';

type PermissionStatus = 'granted' | 'denied' | 'blocked';

export const VideoReview = ({
  videoUri,
  setVideoUri,
  videoLink,
  setVideoLink,
  setWakeUpWith,
}: {
  videoUri: string | null;
  setVideoUri?: (uri: string | null) => void;
  videoLink?: string | null;
  setVideoLink?: (link: string | null) => void;
  order?: number;
  setWakeUpWith?: React.Dispatch<React.SetStateAction<string[]>>;
}) => {
  const [, setBoxWidth] = useState<number | null>(null);

  console.log('videoUri', videoUri);

  const showGalleryPermissionAlert = (status: PermissionStatus) => {
    const message =
      status === 'blocked'
        ? 'Gallery access is blocked. Please enable it in Settings to choose media.'
        : 'Gallery access is required to select media.';

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
      const res = await ImagePicker.openPicker({
        mediaType: 'video',
      });
      setVideoUri?.(res.path);
    } catch (e) {}
  };

  const videoSupported = !!UIManager.getViewManagerConfig('RCTVideo');

  return (
    <View>
      <Text className="text-white font-semibold text-lg">Video</Text>

      <View className="mt-[10px]">
        {videoUri ? (
          videoSupported ? (
            <VideoPlayer
              source={{ uri: videoUri || videoLink || '' }}
              style={{
                width: '100%',
                height: 230,
                borderWidth: 2,
                borderColor: 'white',
                borderRadius: 12,
                overflow: 'hidden',
              }}
              resizeMode="cover"
              controls
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: 230,
                borderWidth: 2,
                borderColor: 'white',
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.2)',
              }}
            >
              <Text className="text-white">
                Video preview not available (native module not linked)
              </Text>
            </View>
          )
        ) : (
          <TouchableOpacity
            activeOpacity={!videoUri ? 0.7 : 1}
            className="border border-white  justify-center items-center py-5"
            style={{
              borderStyle: 'dashed',
              overflow: 'hidden',
              borderRadius: 12,
            }}
            onPress={!videoUri ? handlePickImage : undefined}
            onLayout={e => setBoxWidth(e.nativeEvent.layout.width)}
          >
            <BigVideoIcon />
            <Text className="text-border2Color font-semibold">
              Tap to upload video
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {/* {!videoUri && (
        <View className="my-5 ">
          <Text className="mb-[10px] font-regular text-[15px] text-white">
            Or paste link on your video here:
          </Text>
          <View className="relative">
            <TextInput
              value={videoLink || ''}
              onChangeText={text => setVideoLink && setVideoLink(text)}
              className="border border-white rounded-xl p-[10px] text-white"
              placeholder="Paste video link"
              placeholderTextColor={'white'}
            />
            <View className="absolute right-3 top-1">
              <YouTubeIcon />
            </View>
          </View>
        </View>
      )} */}
      {setWakeUpWith && (
        <TouchableOpacity
          onPress={() =>
            setWakeUpWith(prev => {
              return prev.filter(item => item !== 'Video');
            })
          }
          activeOpacity={0.7}
          className="mt-3 mb-5 border border-redTextColor rounded-xl py-3 items-center flex-row justify-center"
        >
          <TrashIcon />
          <Text className="text-lg font-semibold text-redTextColor ml-2">
            Delete
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
