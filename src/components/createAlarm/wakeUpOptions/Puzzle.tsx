import {
  Text,
  TouchableOpacity,
  View,
  Image,
  Platform,
  ActivityIndicator,
  Linking,
  InteractionManager,
  StyleSheet,
} from 'react-native';
import { Alert } from '@utils/alert';
import { Dimensions, PixelRatio } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';
import BigPuzzleIcon from '../../../../assets/svg/BigPuzzleIcon.svg';
import PuzzleIcon from '../../../../assets/svg/PuzzleIcon.svg';
import { CustomButton } from '@components/customComponents/CustomButton';
import { useEffect, useRef, useState } from 'react';
import ImagePicker from 'react-native-image-crop-picker';
// import Video, { VideoRef } from 'react-native-video';
import SoundPlayer from 'react-native-sound-player';
import { OptionContainer } from './OptionContainer';
import TrashIcon from '../../../../assets/svg/TrashIcon.svg';
import {
  getActivePlayer,
  setActivePlayer,
  subscribeActivePlayer,
} from '@utils/playerManager';
import { formatTime } from '@utils/time';
import Svg, { Line } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import EditIcon from '../../../../assets/svg/EditIcon.svg';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '@appTypes/navigationTypes';

import { SONGS } from '../../../generated/songsList';
import { createNavCallback } from '@utils/navCallbackStore';
import { resolveSongPath } from '@utils/media';
import { getSongDisplayName } from '@utils/songDisplayName';
import { resolveAudioDuration } from '@utils/audioDuration';

type PermissionStatus = 'granted' | 'denied' | 'blocked';

const renderPlaybackIcon = (isPlaying: boolean) => {
  if (isPlaying) {
    return <View style={styles.stopIndicator} />;
  }

  return <View style={styles.playIndicator} />;
};

export const Puzzle = ({
  puzzleUri,
  songName,
  setPuzzleUri,
  setSongName,
  order,
  onRemove,
  open,
  openable,
}: {
  puzzleUri: {
    imageUri: string | null;
    soundUri: string | number | null;
  } | null;
  songName?: string | null;
  setPuzzleUri?: (
    uri: { imageUri: string | null; soundUri: string | number | null } | null,
  ) => void;
  setSongName?: (name: string | null) => void;
  order?: number;
  onRemove?: () => void;
  open?: boolean;
  openable?: boolean;
}) => {
  const navigation = useNavigation<AuthNavigationProp>();

  const [boxWidth, setBoxWidth] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerIdRef = useRef<string>(
    `puzzle-${order ?? Date.now()}-${Math.random()}`,
  );
  const [imageLoading, setImageLoading] = useState(false);

  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // duration and currentTime must be declared before effects that use them
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [inputText, setInputText] = useState<string>(
    songName ||
      (typeof puzzleUri?.soundUri === 'string'
        ? (puzzleUri?.soundUri as string)
        : ''),
  );

  useEffect(() => {
    const unsub = subscribeActivePlayer((activeId: string | null) => {
      if (activeId !== playerIdRef.current) {
        // another player became active -> stop this one
        try {
          SoundPlayer.stop();
        } catch {}
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        setIsPlaying(false);
      }
    });
    // ensure no accidental auto-resume after HMR/reload
    setIsPlaying(false);
    return unsub;
  }, []);

  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    try {
      SoundPlayer.stop();
    } catch {}
    stopProgressTimer();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (!puzzleUri?.soundUri) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const nextDuration = await resolveAudioDuration(
        puzzleUri.soundUri,
        inputText,
      );

      if (!cancelled) {
        setDuration(nextDuration ?? 0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [puzzleUri?.soundUri]);

  useEffect(() => {
    if (songName) {
      setInputText(songName);
      return;
    }

    if (typeof puzzleUri?.soundUri === 'string') {
      setInputText(puzzleUri.soundUri);
      return;
    }

    setInputText('');
  }, [songName, puzzleUri?.soundUri]);

  useEffect(() => {
    let subFinish: any;
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
    };
  }, []);

  const onTogglePlay = () => {
    if (!puzzleUri?.soundUri) return;
    if (isPlaying) {
      try {
        SoundPlayer.stop();
      } catch {}
      stopProgressTimer();
      setIsPlaying(false);
      try {
        if (getActivePlayer() === playerIdRef.current) setActivePlayer(null);
      } catch {}
    } else {
      try {
        setActivePlayer(playerIdRef.current);
      } catch {}
      try {
        SoundPlayer.stop();
      } catch {}
      try {
        const raw = puzzleUri?.soundUri ?? '';

        if (typeof raw === 'number') {
          // For bundled assets, use playSoundFile which works in production
          try {
            const resolved = Image.resolveAssetSource(raw);
            const filename = resolved.uri.split('/').pop()?.split('?')[0] || '';
            const nameWithoutExt = filename.replace(
              /\.mp3$|\.wav$|\.m4a$/i,
              '',
            );
            console.log('Playing bundled puzzle sound:', nameWithoutExt);
            SoundPlayer.playSoundFile(nameWithoutExt, 'mp3');
          } catch (e) {
            console.log('Failed to play bundled puzzle sound', e);
            Alert.alert('Playback error', 'Failed to play the selected sound.');
            return;
          }
        } else if (typeof raw === 'string') {
          // For remote URLs or file:// paths, use playUrl
          let rawStr = raw;
          const uri =
            rawStr.startsWith('file://') ||
            rawStr.startsWith('content://') ||
            rawStr.startsWith('http://') ||
            rawStr.startsWith('https://')
              ? rawStr
              : `file://${rawStr}`;
          console.log('Playing puzzle URL:', uri);
          SoundPlayer.playUrl(uri);
        }
      } catch (e) {
        Alert.alert('Playback error', 'Failed to play the selected sound.');
        return;
      }
      stopProgressTimer();
      progressTimerRef.current = setInterval(async () => {
        try {
          const info = await SoundPlayer.getInfo();
          if (typeof info?.duration === 'number') setDuration(info.duration);
          if (typeof info?.currentTime === 'number')
            setCurrentTime(info.currentTime);
        } catch {}
      }, 300);
      setIsPlaying(true);
    }
  };

  // cleanup on unmount: stop playback and clear timer
  useEffect(() => {
    return () => {
      try {
        SoundPlayer.stop();
      } catch {}
      stopProgressTimer();
    };
  }, []);

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

  const handlePickImage = async () => {
    const permissionStatus = await requestGalleryPermission();
    if (permissionStatus !== 'granted') {
      if (Platform.OS === 'android') {
        showGalleryPermissionAlert(permissionStatus);
      }
      return;
    }
    setImageLoading(true);
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
      try {
        let sizeBytes: number | undefined = (res as any).size;
        if (!sizeBytes) {
          let p = (res as any).path || (res as any).uri || '';
          if (typeof p === 'string' && p.startsWith('file://'))
            p = p.replace('file://', '');
          if (p) {
            try {
              const stat = await RNFS.stat(p);
              sizeBytes = Number(stat.size) || undefined;
            } catch (e) {}
          }
        }
        const sizeMB = sizeBytes ? sizeBytes / (1024 * 1024) : 0;
        const MAX_MB = 10;
        if (sizeMB > MAX_MB) {
          Alert.alert(
            'File too large',
            `Selected image is ${sizeMB.toFixed(
              2,
            )}MB. Maximum allowed size is ${MAX_MB}MB.`,
          );
          return;
        }
      } catch (e) {}
      const realSongUri = await resolveSongPath(SONGS[0].uri, SONGS[0].name);
      const fallbackSongName =
        getSongDisplayName(SONGS[0].uri, SONGS[0].name) ||
        SONGS[0].displayName ||
        SONGS[0].name;
      setPuzzleUri?.({
        imageUri: res.path,
        soundUri:
          puzzleUri?.soundUri ||
          (SONGS && SONGS.length > 0 ? realSongUri : null),
      });
      if (!puzzleUri?.soundUri) {
        setSongName?.(fallbackSongName || null);
      }
    } catch (e: any) {
      console.log('error', e);
      // Ignore silent cancellation, but alert on real failures
      const code = e?.code || e?.message;
      const isCancelled =
        code === 'E_PICKER_CANCELLED' ||
        code === 'User cancelled image selection' ||
        code === 'Canceled';
      if (!isCancelled) {
        try {
          Alert.alert(
            'Image selection failed',
            'We could not load the selected picture. Please try again or choose another image.',
          );
        } catch {}
      }
    } finally {
      setImageLoading(false);
    }
  };
  // (duplicate declarations removed — duration/currentTime declared earlier)

  const handleExampleSongs = () => {
    const cbId = createNavCallback(
      (payload: {
        uri: string | number | null;
        id?: string;
        name?: string;
      }) => {
        const resolvedSongName =
          getSongDisplayName(payload.uri, payload.name || null) || null;
        setPuzzleUri?.({
          imageUri: puzzleUri?.imageUri || null,
          soundUri: payload.uri ?? null,
        });
        setSongName?.(resolvedSongName);

        // set inputText (display name) from payload.name or derive from uri
        try {
          if (resolvedSongName) {
            setInputText(resolvedSongName);
          } else if (payload.uri) {
            let uriStr: any = payload.uri;
            if (typeof uriStr === 'number') {
              try {
                uriStr = Image.resolveAssetSource(uriStr).uri || '';
              } catch {
                uriStr = '';
              }
            }
            try {
              const base = (uriStr || '').split('?')[0] ?? '';
              const name = decodeURIComponent(base.split('/').pop() || '');
              if (name) setInputText(name.replace(/\.[^/.]+$/, ''));
            } catch {}
          }
        } catch {}
      },
    );
    navigation.navigate('MainContentNavigation', {
      screen: 'SongsScreen',
      params: { callbackId: cbId, ownSongs: true },
    });
  };

  // const handlePickSound = async () => {
  //   const hasPermission = await requestAudioPermission();
  //   if (!hasPermission) {
  //     Alert.alert(
  //       'Permission denied',
  //       'Audio access is required to select a sound.',
  //     );
  //     return;
  //   }
  //   try {
  //     const result = await pick({
  //       type: ['audio/*'],
  //       allowMultiSelection: false,
  //       copyTo: 'cachesDirectory',
  //     });

  //     if (result && result[0]) {
  //       const file = result[0];
  //       const sizeInMB = (file.size || 0) / (1024 * 1024);
  //       const MAX_MB = 10;

  //       if (sizeInMB > MAX_MB) {
  //         Alert.alert(
  //           'File too large',
  //           `Selected sound file is ${sizeInMB.toFixed(
  //             2,
  //           )}MB. Maximum allowed size is ${MAX_MB}MB. Please choose a shorter audio.`,
  //         );
  //         return;
  //       }

  //       const uri = (file as any).fileCopyUri || file.uri;
  //       setPuzzleUri?.({
  //         imageUri: puzzleUri?.imageUri || null,
  //         soundUri: uri,
  //       });
  //       if ((file as any)?.name) {
  //         setInputText((file as any).name as string);
  //       } else {
  //         try {
  //           const base = uri?.split('?')[0] ?? '';
  //           const nameGuess = decodeURIComponent(base.split('/').pop() || '');
  //           if (nameGuess) setInputText(nameGuess);
  //         } catch {}
  //       }
  //       // Reset player state for new selection
  //       setIsPlaying(false);
  //     }
  //   } catch (e) {
  //     // user cancelled or error
  //   }
  // };

  const getDisplayTitle = (): string => {
    const resolvedTitle = getSongDisplayName(
      puzzleUri?.soundUri,
      songName || inputText,
    );
    if (resolvedTitle) {
      return resolvedTitle;
    }

    return 'Song';
  };

  const handleExamplePuzzle = async () => {
    const realSongUri = await resolveSongPath(SONGS[0].uri, SONGS[0].name);
    const fallbackSongName =
      getSongDisplayName(SONGS[0].uri, SONGS[0].name) ||
      SONGS[0].displayName ||
      SONGS[0].name;

    const cbId = createNavCallback(
      (payload: { uri: string | null; id?: string; name?: string }) => {
        setPuzzleUri?.({
          imageUri: payload.uri ?? null,
          soundUri:
            puzzleUri?.soundUri ||
            (SONGS && SONGS.length > 0 ? realSongUri : null),
        });
        if (!puzzleUri?.soundUri) {
          setSongName?.(fallbackSongName || null);
        }
      },
    );
    navigation.navigate('MainContentNavigation', {
      screen: 'PicturesScreen',
      params: { callbackId: cbId },
    });
  };

  const resolvedImageSource: any = (() => {
    try {
      if (!puzzleUri?.imageUri) return { uri: '' };
      if (typeof puzzleUri.imageUri === 'number') {
        return { uri: Image.resolveAssetSource(puzzleUri.imageUri).uri };
      }
      return { uri: puzzleUri.imageUri || '' };
    } catch {
      return { uri: '' };
    }
  })();

  return (
    <OptionContainer
      title="Puzzle"
      order={order}
      icon={<PuzzleIcon width={32} height={32} />}
      open={open}
      openable={openable}
    >
      <View className="pb-4">
        <View className="">
          {imageLoading ? (
            <View
              style={styles.imageFrame}
              className="justify-center items-center"
            >
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          ) : puzzleUri?.imageUri ? (
            <View className="relative">
              <Image
                source={resolvedImageSource}
                style={styles.imageFrame}
                resizeMode="cover"
              />

              <View pointerEvents="box-none" style={styles.imageOverlay}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setPuzzleUri?.(null);
                    setSongName?.(null);
                  }}
                  style={styles.deleteCircle}
                >
                  <TrashIcon color="#ffffff" />
                </TouchableOpacity>
              </View>
              <Svg height="4" width="100%" style={styles.horizontalLineTop}>
                <Line
                  x1="0"
                  y1="1"
                  x2="100%"
                  y2="1"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="4"
                  strokeDasharray="4 4"
                />
              </Svg>
              <Svg height="4" width="100%" style={styles.horizontalLineBottom}>
                <Line
                  x1="0"
                  y1="1"
                  x2="100%"
                  y2="1"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="4"
                  strokeDasharray="4 4"
                />
              </Svg>

              <Svg height="100%" width="4" style={styles.verticalLineLeft}>
                <Line
                  x1="1"
                  y1="0"
                  x2="1"
                  y2="100%"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="4"
                  strokeDasharray="4 4"
                />
              </Svg>
              <Svg height="100%" width="4" style={styles.verticalLineRight}>
                <Line
                  x1="1"
                  y1="0"
                  x2="1"
                  y2="100%"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="4"
                  strokeDasharray="4 4"
                />
              </Svg>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={!puzzleUri?.imageUri ? 0.7 : 1}
              className="border border-white py-4 flex-row justify-center items-center"
              style={styles.uploadCard}
              onPress={!puzzleUri?.imageUri ? handlePickImage : undefined}
              onLayout={e => setBoxWidth(e.nativeEvent.layout.width)}
            >
              <BigPuzzleIcon width={44} height={44} />
              <View className="ml-4">
                <Text className="text-border2Color font-semibold">
                  Tap to upload picture
                </Text>
                <Text className="text-border2Color font-regular text-sm">
                  Limit file size to 10MB
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {puzzleUri?.soundUri && (
            <View className="mt-3 bg-whiteWithTransparentColor rounded-xl">
              <View
                className="border border-white flex-row py-5 px-[10px] items-center"
                style={styles.soundCard}
              >
                <TouchableOpacity
                  onPress={() => {
                    onTogglePlay();
                  }}
                  disabled={!puzzleUri?.soundUri}
                  className="border border-white rounded-full items-center justify-center"
                  style={styles.soundPlayButton}
                  activeOpacity={0.7}
                >
                  {renderPlaybackIcon(
                    getActivePlayer() === playerIdRef.current || isPlaying,
                  )}
                </TouchableOpacity>

                <View className="flex-1 ml-2">
                  <View className="flex-1 flex-row justify-between items-center ">
                    <Text
                      className="text-white text-sm max-w-[60%] font-regular"
                      numberOfLines={1}
                    >
                      {getDisplayTitle()}
                    </Text>
                    <Text className="text-border2Color text-sm font-regular">
                      {`${formatTime(currentTime)} / ${
                        duration > 0 ? formatTime(duration) : '0:00'
                      }`}
                    </Text>
                  </View>
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
                {setPuzzleUri && (
                  <TouchableOpacity
                    onPress={() => {
                      // setPuzzleUri?.({
                      //   imageUri: puzzleUri?.imageUri || null,
                      //   soundUri: null,
                      // });
                      handleExampleSongs();
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
                      <EditIcon />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
        {onRemove && (
          <View className="mt-4 pt-4 border-t border-border1Color">
            {!puzzleUri?.imageUri && (
              <CustomButton
                title="Example Pictures"
                onPress={async () => {
                  await handleExamplePuzzle();
                }}
                textStyle="text-white font-regular text-[17px]"
                style="mb-4 border-white bg-whiteWithTransparentColor"
              />
            )}

            {/* {!puzzleUri?.soundUri && (
            <CustomButton
              title={'Choose a sound'}
              onPress={() => {
                handlePickSound();
              }}
              textStyle="text-white font-regular text-[17px]"
              style="border-white bg-whiteWithTransparentColor mb-4"
            />
          )} */}

            <TouchableOpacity
              onPress={() => {
                setPuzzleUri?.(null);
                setSongName?.(null);
                setIsPlaying(false);
                setDuration(0);
                setCurrentTime(0);
                onRemove();
              }}
              activeOpacity={0.7}
              className="border border-redColor rounded-xl py-3 items-center flex-row justify-center bg-whiteWithTransparentColor"
            >
              <TrashIcon color="#FF5F57" />
              <Text className="text-lg font-semibold text-redColor ml-2">
                Delete Option
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </OptionContainer>
  );
};

const styles = StyleSheet.create({
  deleteCircle: {
    width: 70,
    height: 70,
    borderRadius: 76,
    backgroundColor: 'rgba(85, 8, 68, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalLineBottom: {
    position: 'absolute',
    top: '66.6%',
  },
  horizontalLineTop: {
    position: 'absolute',
    top: '33.3%',
  },
  imageFrame: {
    width: '100%',
    height: 230,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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
  soundCard: {
    borderRadius: 12,
  },
  soundPlayButton: {
    width: 33,
    height: 33,
    backgroundColor: 'rgba(181, 29, 150, 0.3)',
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
  verticalLineLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33.3%',
  },
  verticalLineRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66.6%',
  },
});
