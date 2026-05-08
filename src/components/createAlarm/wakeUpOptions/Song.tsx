import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Platform,
  PermissionsAndroid,
  Linking,
  InteractionManager,
  StyleSheet,
} from 'react-native';
import { Alert } from '@utils/alert';
import { CustomButton } from '@components/customComponents/CustomButton';
import { pick } from '@react-native-documents/picker';
import { useRef, useState, useEffect } from 'react';
import SoundPlayer from 'react-native-sound-player';
import YoutubePlayer from 'react-native-youtube-iframe';
import { OptionContainer } from './OptionContainer';
import SongIcon from '../../../../assets/svg/SongIcon.svg';
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
import { getSongDisplayName } from '@utils/songDisplayName';
import { formatTime } from '@utils/time';
import { resolveAudioDuration } from '@utils/audioDuration';

type PermissionStatus = 'granted' | 'denied' | 'blocked';

type SongProps = {
  songUri: string | number | null;
  songName?: string | null;
  setSongUri?: (uri: string | number | null) => void;
  setSongName?: (name: string | null) => void;
  order?: number;
  onRemove?: () => void;
  open?: boolean;
  openable?: boolean;
};

const renderPlaybackIcon = (isPlaying: boolean) => {
  if (isPlaying) {
    return <View style={styles.stopIndicator} />;
  }

  return <View style={styles.playIndicator} />;
};

export function Song({
  songUri,
  songName,
  setSongUri,
  setSongName,
  order,
  onRemove,
  open,
  openable,
}: SongProps) {
  const navigation = useNavigation<AuthNavigationProp>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [inputText, setInputText] = useState<string>(
    songName || (typeof songUri === 'string' ? songUri : ''),
  );
  const [youtubeId, setYoutubeId] = useState<string | null>(null);

  const [playing, setPlaying] = useState(false);
  const [youtubeReady] = useState(false);
  const playerIdRef = useRef<string>(
    `song-${order ?? Date.now()}-${Math.random()}`,
  );
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldShowFooter = Boolean(
    (!songUri && !youtubeId && setSongUri) || onRemove,
  );

  useEffect(() => {
    const unsub = subscribeActivePlayer((activeId: string | null) => {
      if (activeId !== playerIdRef.current) {
        try {
          SoundPlayer.stop();
        } catch {}
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        setPlaying(false);
        setIsPlaying(false);
      }
    });
    // ensure no accidental auto-resume after HMR/reload
    setPlaying(false);
    setIsPlaying(false);
    return unsub;
  }, []);

  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  // when songUri changes, stop any current playback
  useEffect(() => {
    let cancelled = false;

    try {
      SoundPlayer.stop();
    } catch {}
    stopProgressTimer();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (!songUri) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const nextDuration = await resolveAudioDuration(songUri, songName);

      if (!cancelled) {
        setDuration(nextDuration ?? 0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [songUri]);

  useEffect(() => {
    if (songName) {
      setInputText(songName);
      return;
    }

    if (typeof songUri === 'string') {
      setInputText(songUri);
      return;
    }

    setInputText('');
  }, [songName, songUri]);

  // Listen for native finished event to reset state
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
      const types =
        Platform.OS === 'ios'
          ? ['public.mp3', 'public.wav', 'com.apple.m4a-audio', 'public.audio']
          : ['audio/*', '*/*'];
      const result = await pick({
        type: types,
        allowMultiSelection: false,
        copyTo: 'cachesDirectory',
      });

      if (result && result[0]) {
        const file = result[0];
        const sizeInMB = (file.size || 0) / (1024 * 1024);

        if (sizeInMB > 10) {
          Alert.alert(
            'File too large',
            `Selected song file is ${sizeInMB.toFixed(
              2,
            )}MB. Maximum allowed size is 10MB. Please choose a shorter audio.`,
          );
          return;
        }

        const uri = (file as any).fileCopyUri || file.uri;
        setSongUri?.(uri);
        const selectedSongName =
          getSongDisplayName(uri, (file as any)?.name || null) ||
          (typeof (file as any)?.name === 'string'
            ? String((file as any).name).replace(/\.[^/.]+$/, '')
            : null);
        setSongName?.(selectedSongName);
        // Clear any previous YouTube selection and set a friendly display name
        setYoutubeId(null);
        if (selectedSongName) {
          setInputText(selectedSongName);
        } else if ((file as any)?.name) {
          setInputText((file as any).name as string);
        } else {
          try {
            const base = uri?.split('?')[0] ?? '';
            const nameGuess = decodeURIComponent(base.split('/').pop() || '');
            if (nameGuess) setInputText(nameGuess);
          } catch {}
        }
        // Reset player state for new selection
        setIsPlaying(false);
        setDuration(0);
        setCurrentTime(0);
        try {
          SoundPlayer.stop();
        } catch {}
      }
    } catch (e) {
      // user cancelled or error
    }
  };

  const onTogglePlay = () => {
    if (youtubeId) {
      setPlaying(p => !p);
      return;
    }
    if (!songUri) return;
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
        if (typeof songUri === 'number') {
          // For bundled assets, we need the filename without extension
          // Since we don't have the name stored, try to get it from the component's inputText or derive from resolved path
          try {
            const resolved = Image.resolveAssetSource(songUri);
            // Extract filename from uri path (e.g., ".../Imagine Dragons - Wake Up.mp3")
            const filename = resolved.uri.split('/').pop()?.split('?')[0] || '';
            const nameWithoutExt = filename.replace(
              /\.mp3$|\.wav$|\.m4a$/i,
              '',
            );
            console.log('Playing bundled asset:', nameWithoutExt);
            SoundPlayer.playSoundFile(nameWithoutExt, 'mp3');
          } catch (e) {
            console.log('Failed to play bundled asset', e);
            Alert.alert('Playback error', 'Failed to play bundled audio.');
            return;
          }
        } else if (typeof songUri === 'string') {
          let playTarget = songUri;
          if (
            !songUri.startsWith('file://') &&
            !songUri.startsWith('content://') &&
            !songUri.startsWith('http://') &&
            !songUri.startsWith('https://')
          ) {
            playTarget = `file://${songUri}`;
          }
          console.log('Playing URL:', playTarget);
          SoundPlayer.playUrl(playTarget);
        } else {
          Alert.alert('Playback error', 'No valid audio source to play.');
          return;
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

  // const onSubmit = () => {
  //   const id = parseYouTubeVideoId(inputText);
  //   if (id) {
  //     setYoutubeId(id);
  //     setYoutubeReady(false);
  //     setSongUri?.(`https://www.youtube.com/watch?v=${id}`);
  //     return;
  //   }
  // };

  const playerReady = youtubeId ? true : songUri ? true : false;
  const isActivePlaying = youtubeId ? playing : isPlaying;

  const getDisplayTitle = (): string => {
    if (youtubeId) return 'YouTube audio';

    if (songName?.trim()) {
      return songName.trim();
    }

    const resolvedTitle = getSongDisplayName(songUri, inputText);
    if (resolvedTitle) {
      return resolvedTitle;
    }

    return 'Song';
  };

  const handleExampleSongs = () => {
    const cbId = createNavCallback(
      (payload: {
        uri: string | number | null;
        id?: string;
        name?: string;
      }) => {
        setSongUri?.(payload.uri ?? null);
        setSongName?.(payload.name?.trim() || null);
      },
    );
    navigation.navigate('MainContentNavigation', {
      screen: 'SongsScreen',
      params: { callbackId: cbId },
    });
  };
  console.log('Selected songUri (raw):', songUri);

  return (
    <OptionContainer
      title="Song"
      order={order}
      icon={<SongIcon width={32} height={32} />}
      open={open}
      openable={openable}
    >
      <View className={shouldShowFooter ? 'pb-5' : 'pb-3'}>
        {!songUri && !youtubeId && (
          <TouchableOpacity
            activeOpacity={!songUri ? 0.7 : 1}
            className={`border border-dashed border-white justify-center items-center flex-row p-4 ${
              songUri ? 'bg-whiteWithTransparentColor' : ''
            }`}
            style={styles.uploadCard}
            onPress={
              !songUri
                ? () => {
                    handlePickSound();
                  }
                : undefined
            }
          >
            <SongIcon width={32} height={32} opacity={0.2} />
            <View className="ml-2">
              <Text className="text-border2Color font-semibold text-lg">
                Tap to upload Song
              </Text>
              <Text className="text-border2Color font-regular text-sm ">
                Limit file size to 10MB
              </Text>
            </View>
          </TouchableOpacity>
        )}
        {/* {!songUri && !youtubeId && (
          <CustomInput
            value={inputText || ''}
            onChangeText={text => setInputText && setInputText(text)}
            textPlaceholder="Paste link on music here"
            placeholder="https://music.youtube.com/"
            passwordIcon={<YouTubeIcon />}
            styles="border border-whiteWithTransparentColor rounded-xl"
            onSubmitEditing={onSubmit}
            returnKeyType="search"
            blurOnSubmit={true}
          />
        )} */}
        {(youtubeId || songUri) && (
          <View className="w-full items-center mb-2 border border-white rounded-xl p-3 bg-whiteWithTransparentColor">
            <View
              className="flex-row items-center w-full"
              style={styles.mediaRow}
            >
              <TouchableOpacity
                onPress={() => {
                  if (youtubeId) {
                    const next = !playing;
                    try {
                      if (next) setActivePlayer(playerIdRef.current);
                      else if (getActivePlayer() === playerIdRef.current)
                        setActivePlayer(null);
                    } catch {}
                    setPlaying(p => !p);
                    return;
                  }
                  onTogglePlay();
                }}
                disabled={youtubeId ? false : !playerReady}
                className="border border-white rounded-full items-center justify-center"
                style={{
                  ...styles.playButton,
                  opacity: youtubeId
                    ? youtubeReady
                      ? 1
                      : 0.4
                    : playerReady
                    ? 1
                    : 0.4,
                }}
                activeOpacity={0.7}
              >
                {renderPlaybackIcon(isActivePlaying)}
              </TouchableOpacity>
              <View className="flex-1">
                <View className="flex-1 flex-row justify-between items-center mb-1">
                  <Text
                    className="text-white text-sm max-w-[60%] font-regular"
                    numberOfLines={1}
                  >
                    {getDisplayTitle()}
                    {!youtubeId && ' - '}
                  </Text>
                  {!youtubeId && (
                    <Text className="text-border2Color text-sm font-regular">
                      {`${formatTime(currentTime)} / ${
                        duration > 0 ? formatTime(duration) : '0:00'
                      }`}
                    </Text>
                  )}
                </View>
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
              {setSongUri && (
                <TouchableOpacity
                  onPress={() => {
                    setSongUri?.(null);
                    setSongName?.(null);
                    setYoutubeId(null);
                    setIsPlaying(false);
                    setDuration(0);
                    setCurrentTime(0);
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
          </View>
        )}
        {youtubeId && (
          <View style={styles.hiddenYoutubePlayer}>
            <YoutubePlayer height={180} videoId={youtubeId} play={false} />
          </View>
        )}

        {shouldShowFooter ? (
          <View className="mt-4 pt-4 border-t border-border1Color">
            {!youtubeId && !songUri && (
              <CustomButton
                title={'Example Songs'}
                onPress={() => {
                  handleExampleSongs();
                }}
                textStyle="text-white font-regular text-[17px]"
                style="mb-4 border-white bg-whiteWithTransparentColor"
              />
            )}
            {onRemove && (
              <TouchableOpacity
                onPress={() => {
                  setSongUri?.(null);
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
            )}
          </View>
        ) : null}
      </View>
    </OptionContainer>
  );
}

const styles = StyleSheet.create({
  hiddenYoutubePlayer: {
    height: 180,
    opacity: 0.02,
  },
  mediaRow: {
    gap: 12,
  },
  playButton: {
    width: 33,
    height: 33,
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
