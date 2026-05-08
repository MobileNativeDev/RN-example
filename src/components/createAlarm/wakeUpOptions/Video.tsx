import {
  Text,
  TouchableOpacity,
  View,
  Platform,
  ActivityIndicator,
  Linking,
  InteractionManager,
  StyleSheet,
} from 'react-native';
import { Alert } from '@utils/alert';
import { PermissionsAndroid } from 'react-native';
import BigVideoIcon from '../../../../assets/svg/BigVideoIcon.svg';
import VideoIcon from '../../../../assets/svg/VideoIcon.svg';
import { useEffect, useRef, useState } from 'react';
import { UIManager } from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import VideoPlayer from 'react-native-video';
import { ViewType } from 'react-native-video';
import YoutubePlayer from 'react-native-youtube-iframe';
// import YouTubeIcon from '../../../../assets/svg/YouTubeIcon.svg';
import { OptionContainer } from './OptionContainer';
import TrashIcon from '../../../../assets/svg/TrashIcon.svg';
// import { CustomInput } from '@components/customComponents/CustomInput';
import { CustomButton } from '@components/customComponents/CustomButton';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '@appTypes/navigationTypes';
// import { parseYouTubeVideoId } from '@utils/additionFunctions';
import LinearGradient from 'react-native-linear-gradient';
import DeleteIcon from '../../../../assets/svg/DeleteIcon.svg';
import { createNavCallback } from '@utils/navCallbackStore';
import { validateVideoSize } from '@utils/additionFunctions';
import { formatTime } from '@utils/time';
import {
  getActivePlayer,
  setActivePlayer,
  subscribeActivePlayer,
} from '@utils/playerManager';

type PermissionStatus = 'granted' | 'denied' | 'blocked';

const renderPlaybackIcon = (isPlaying: boolean) => {
  if (isPlaying) {
    return <View style={styles.pauseIndicator} />;
  }

  return <View style={styles.playIndicator} />;
};

export const Video = ({
  videoUri,
  setVideoUri,
  // videoLink,
  setVideoLink,
  order,
  onRemove,
  open,
  openable,
}: {
  videoUri: string | null;
  setVideoUri?: (uri: string | null) => void;
  videoLink?: string | null;
  setVideoLink?: (link: string | null) => void;
  order?: number;
  onRemove?: () => void;
  open?: boolean;
  openable?: boolean;
}) => {
  const [, setBoxWidth] = useState<number | null>(null);
  const navigation = useNavigation<AuthNavigationProp>();
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [vDuration, setVDuration] = useState(0);
  const [vTime, setVTime] = useState(0);
  const [playerKey, setPlayerKey] = useState(0);
  // const [youtubeReady, setYoutubeReady] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const shouldShowFooter = Boolean(
    (!videoUri && !youtubeId && setVideoUri) || onRemove,
  );
  const playerIdRef = useRef<string>(
    `video-${order ?? Date.now()}-${Math.random()}`,
  );
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
  const videoRef = useRef<any>(null);

  const hardStopPreview = (resetPosition = true) => {
    setIsPlaying(false);

    if (resetPosition) {
      setVTime(0);
      setPlayerKey(k => k + 1);
    }

    try {
      if (getActivePlayer() === playerIdRef.current) {
        setActivePlayer(null);
      }
    } catch {}
  };

  useEffect(() => {
    const unsub = subscribeActivePlayer((activeId: string | null) => {
      if (activeId !== playerIdRef.current) {
        setIsPlaying(false);
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!videoUri) {
      hardStopPreview();
      setVDuration(0);
    }
  }, [videoUri]);

  useEffect(() => {
    if (!open) {
      hardStopPreview();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      try {
        if (getActivePlayer() === playerIdRef.current) {
          setActivePlayer(null);
        }
      } catch {}
    };
  }, []);

  const handlePickImage = async () => {
    const permissionStatus = await requestGalleryPermission();
    if (permissionStatus !== 'granted') {
      if (Platform.OS === 'android') {
        showGalleryPermissionAlert(permissionStatus);
      }
      return;
    }
    setVideoLoading(true);
    try {
      const res = await ImagePicker.openPicker({
        mediaType: 'video',
      });
      const pickedPath = res.path;

      const ok = await validateVideoSize(pickedPath);
      if (!ok) {
        return;
      }

      console.log('[Video] validation passed, setting videoUri');
      setVideoUri?.(pickedPath);
      setVideoLink?.(null);
      setYoutubeId(null);
    } catch (e) {
      console.warn('[Video] pick cancelled or failed', e);
    } finally {
      setVideoLoading(false);
    }
  };

  const videoSupported = !!UIManager.getViewManagerConfig('RCTVideo');

  // const onSubmit = () => {
  //   const id = parseYouTubeVideoId(videoLink || '');
  //   if (id) {
  //     setYoutubeId(id);
  //     // setYoutubeReady(false);
  //     setVideoLink?.(`https://www.youtube.com/watch?v=${id}`);
  //     return;
  //   }
  // };

  const handleExampleVideo = () => {
    const cbId = createNavCallback(
      (payload: { uri: string | null; id?: string; name?: string }) => {
        setVideoUri?.(payload.uri ?? null);
      },
    );
    navigation.navigate('MainContentNavigation', {
      screen: 'VideosScreen',
      params: { callbackId: cbId },
    });
  };

  const renderDeleteButton = () => (
    <View pointerEvents="box-none" style={styles.floatingDeleteWrapper}>
      <TouchableOpacity
        onPress={() => {
          setVideoUri?.(null);
          setVideoLink?.(null);
          setYoutubeId(null);
        }}
        className="ml-4 border w-[30px] h-[30px] rounded-lg items-center justify-center border-white"
        style={{
          boxShadow: ' 0 1px 30px 0 rgba(69, 42, 124, 0.1)',
        }}
      >
        <LinearGradient
          colors={['#540743', '#B51D96']}
          className="w-full h-full rounded-lg items-center justify-center"
        >
          <DeleteIcon width={20} height={20} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <OptionContainer
      title="Video"
      order={order}
      icon={<VideoIcon width={32} height={32} />}
      open={open}
      openable={openable}
    >
      <View className={shouldShowFooter ? 'pb-4' : 'pb-5'}>
        <View className="">
          {videoLoading ? (
            <View
              style={styles.mediaFrame}
              className="justify-center items-center"
            >
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          ) : videoUri ? (
            videoSupported ? (
              <View style={styles.mediaFrame}>
                <VideoPlayer
                  key={playerKey}
                  ref={videoRef}
                  source={{ uri: videoUri || '' }}
                  style={styles.fullSize}
                  resizeMode="cover"
                  viewType={
                    Platform.OS === 'android' ? ViewType.TEXTURE : undefined
                  }
                  paused={!isPlaying}
                  muted={!isPlaying}
                  playInBackground={false}
                  playWhenInactive={false}
                  onLoad={data => {
                    setVDuration(data.duration ?? 0);
                  }}
                  onProgress={data => {
                    setVTime(data.currentTime ?? 0);
                  }}
                  onEnd={() => {
                    setIsPlaying(false);
                    // stay at end; next play will remount player
                  }}
                />
                <View pointerEvents="box-none" style={styles.absoluteCentered}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isPlaying) {
                        hardStopPreview(false);
                        return;
                      }
                      if (vDuration > 0 && vTime >= vDuration - 0.5) {
                        setPlayerKey(k => k + 1);
                        setVTime(0);
                      }
                      setActivePlayer(playerIdRef.current);
                      setIsPlaying(true);
                    }}
                    style={styles.playOverlayButton}
                  >
                    {renderPlaybackIcon(isPlaying)}
                  </TouchableOpacity>
                  <View style={styles.timeBadge}>
                    <Text className="text-white text-xs">{`${formatTime(
                      vTime,
                    )} / ${
                      vDuration > 0 ? formatTime(vDuration) : '0:00'
                    }`}</Text>
                  </View>
                  {renderDeleteButton()}
                </View>
              </View>
            ) : (
              <View style={styles.unsupportedPreview}>
                <Text className="text-white">
                  Video preview not available (native module not linked)
                </Text>
              </View>
            )
          ) : youtubeId ? (
            <View className="relative" style={styles.youtubeFrame}>
              <YoutubePlayer height={'180'} videoId={youtubeId} play={false} />
              {renderDeleteButton()}
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              className="border border-white  justify-center items-center py-5 flex-row"
              style={styles.uploadCard}
              onPress={handlePickImage}
              onLayout={e => setBoxWidth(e.nativeEvent.layout.width)}
            >
              <BigVideoIcon width={44} height={44} />
              <View className="ml-4">
                <Text className="text-border2Color font-semibold">
                  Tap to upload video
                </Text>
                <Text className="text-border2Color font-regular text-sm">
                  Limit file size to 60MB
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        {/* {!videoUri && !youtubeId && (
          <View className="mt-4">
            <CustomInput
              value={videoLink || ''}
              onChangeText={text => setVideoLink && setVideoLink(text)}
              textPlaceholder="Or paste link on youtube video here"
              placeholder="https://youtube.com/"
              passwordIcon={<YouTubeIcon />}
              styles="border border-whiteWithTransparentColor rounded-xl"
              returnKeyType="search"
              blurOnSubmit={true}
              onSubmitEditing={onSubmit}
            />
          </View>
        )} */}
        {shouldShowFooter ? (
          <View className="mt-4 border-t border-border2Color pt-4">
            {!videoUri && !youtubeId && setVideoUri ? (
              <>
                {/* <CustomButton
                  title="Record the video"
                  onPress={() => {
                    navigation.navigate('MainContentNavigation', {
                      screen: 'RecordVideoScreen',
                      params: {
                        onRecorded: (video: {
                          uri: string;
                          duration: number;
                          thumbnail?: string;
                        }) => {
                          setVideoUri?.(video.uri);
                          setVideoLink?.(null);
                        },
                      },
                    });
                  }}
                  textStyle="text-white font-regular text-[17px]"
                  style="border-white bg-whiteWithTransparentColor mb-3"
                /> */}
                <CustomButton
                  title={'Example Videos'}
                  onPress={() => {
                    handleExampleVideo();
                  }}
                  textStyle="text-white font-regular text-[17px]"
                  style="mb-[10px] border-white bg-whiteWithTransparentColor"
                />
              </>
            ) : null}
            {onRemove && (
              <TouchableOpacity
                onPress={() => onRemove()}
                activeOpacity={0.7}
                className="border border-redColor rounded-xl py-3 items-center flex-row justify-center bg-whiteWithTransparentColor"
              >
                <TrashIcon color="#FF5F57" />
                <Text className="text-lg font-semibold text-redColor ml-2">
                  Delete Option
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </View>
    </OptionContainer>
  );
};

const styles = StyleSheet.create({
  absoluteCentered: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingDeleteWrapper: {
    position: 'absolute',
    right: 22,
    top: 22,
  },
  fullSize: {
    width: '100%',
    height: '100%',
  },
  mediaFrame: {
    width: '100%',
    height: 230,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  pauseIndicator: {
    width: 14,
    height: 14,
    backgroundColor: 'white',
    borderRadius: 3,
  },
  playIndicator: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftColor: 'white',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 2,
  },
  playOverlayButton: {
    width: 77,
    height: 77,
    borderRadius: 76,
    backgroundColor: 'rgba(85, 8, 68, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  unsupportedPreview: {
    width: '100%',
    height: 180,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  uploadCard: {
    borderStyle: 'dashed',
    overflow: 'hidden',
    borderRadius: 12,
  },
  youtubeFrame: {
    width: '100%',
    height: 180,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
