import { LinierButton } from '@components/customComponents/LinierButton';
import { setActivePlayer } from '@utils/playerManager';
import {
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import { Alert } from '@utils/alert';
import LinearGradient from 'react-native-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import SoundPlayer from 'react-native-sound-player';
import { useNavigation } from '@react-navigation/native';
import { SONGS } from '../../generated/songsList';
import { pick } from '@react-native-documents/picker';
import { requestAudioPermission } from '@utils/permissions';
import { takeNavCallback } from '@utils/navCallbackStore';
import CheckIcon from '../../../assets/svg/CheckIcon.svg';
import { formatTime } from '@utils/time';
import { resolveSongPath } from '@utils/media';
import useSoundPlayerProgress from '@hooks/useSoundPlayerProgress';
import logger from '@utils/logger';
import { getSongDisplayName } from '@utils/songDisplayName';

type Song = {
  id: string;
  name: string;
  uri: any;
  displayName: string;
  durationSec?: number;
  cover: any | null;
};

export const SongsScreen: React.FC = () => {
  const navigation = useNavigation() as any;
  const route: any = useRoute();
  const { ownSongs, puzzleUri, setPuzzleUri, setInputText } =
    route.params || {};
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const playerIdRef = useRef('example-songs-player');
  const { start, stop, refresh } = useSoundPlayerProgress({
    intervalMs: 500,
    onProgress: info => {
      setDuration(info.duration ?? 0);
      setCurrentTime(info.currentTime ?? 0);
    },
  });

  useEffect(() => {
    const onFinished = () => {
      setIsPlaying(false);
      stop();
      setCurrentTime(0);
    };

    const finishListener = SoundPlayer.addEventListener(
      'FinishedPlaying',
      onFinished as any,
    );

    return () => {
      try {
        SoundPlayer.stop();
      } catch {}
      finishListener.remove?.();
      stop();
    };
  }, [stop]);

  const playSong = async (song: Song) => {
    try {
      setActivePlayer(playerIdRef.current);

      try {
        let playTarget: string | null = null;

        if (typeof song.uri === 'number') {
          playTarget = await resolveSongPath(song.uri, song.name);
        } else if (typeof song.uri === 'string') {
          playTarget = song.uri;
          if (
            !playTarget.startsWith('file://') &&
            !playTarget.startsWith('content://') &&
            !playTarget.startsWith('http://') &&
            !playTarget.startsWith('https://')
          ) {
            playTarget = `file://${playTarget}`;
          }
        }

        if (!playTarget) {
          throw new Error('No playable song source');
        }

        SoundPlayer.playUrl(playTarget);
      } catch (e) {
        logger.warn('[SongsScreen] failed to start playback', e);
      }

      setTimeout(async () => {
        try {
          await refresh();
          setIsPlaying(true);
          start();
        } catch (error) {
          logger.warn('[SongsScreen] failed to read playback info', error);
        }
      }, 120);
    } catch (error) {
      logger.warn('[SongsScreen] playSong failed', error);
      setIsPlaying(false);
    }
  };

  const onTogglePlay = async () => {
    if (!selectedSong) return;

    try {
      if (isPlaying) {
        SoundPlayer.stop();
        stop();
        setIsPlaying(false);
        return;
      }
      if (selectedSong) {
        await playSong(selectedSong);
      }
    } catch (error) {
      logger.warn('[SongsScreen] toggle playback failed', error);
      setIsPlaying(false);
    }
  };

  const onSongSelect = (song: Song) => {
    if (selectedSong?.id === song.id) {
      onTogglePlay();
    } else {
      try {
        SoundPlayer.stop();
      } catch {}
      stop();
      setIsPlaying(false);
      setSelectedSong(song);
      setCurrentTime(0);
      setDuration(0);
      playSong(song);
    }
  };

  const onSelectOnly = (song: Song) => {
    if (selectedSong?.id === song.id) return;

    try {
      SoundPlayer.stop();
    } catch {}
    stop();
    setIsPlaying(false);
    setSelectedSong(song);
    setCurrentTime(0);
    setDuration(0);
  };

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
        const MAX_MB = 10;

        if (sizeInMB > MAX_MB) {
          Alert.alert(
            'File too large',
            `Selected sound file is ${sizeInMB.toFixed(
              2,
            )}MB. Maximum allowed size is ${MAX_MB}MB. Please choose a shorter audio.`,
          );
          return;
        }

        const uri = (file as any).fileCopyUri || file.uri;
        const pickedName = (file as any).name as string | undefined;
        const selectedSongName =
          getSongDisplayName(uri, pickedName || null) ||
          (typeof pickedName === 'string'
            ? pickedName.replace(/\.[^/.]+$/, '')
            : null);
        setPuzzleUri?.({
          imageUri: puzzleUri?.imageUri || null,
          soundUri: uri,
        });
        if (selectedSongName) {
          if (typeof setInputText === 'function')
            setInputText(selectedSongName);
        } else if (pickedName) {
          if (typeof setInputText === 'function') setInputText(pickedName);
        } else {
          try {
            const base = uri?.split('?')[0] ?? '';
            const nameGuess = decodeURIComponent(base.split('/').pop() || '');
            if (nameGuess && typeof setInputText === 'function')
              setInputText(nameGuess);
          } catch {}
        }

        // Build a Song object for the picked file and set it as selected so UI updates
        try {
          const nameFinal = pickedName
            ? pickedName
            : (() => {
                try {
                  const base = uri?.split('?')[0] ?? '';
                  return decodeURIComponent(
                    base.split('/').pop() || 'picked_song',
                  );
                } catch {
                  return 'picked_song';
                }
              })();

          const display =
            selectedSongName || nameFinal.replace(/\.[^/.]+$/, '');
          const pickedSong: Song = {
            id: `own-${Date.now()}`,
            name: nameFinal,
            uri,
            displayName: display,
            cover: null,
          };

          setSelectedSong(pickedSong);

          const callbackId = route?.params?.callbackId as string | undefined;
          if (callbackId) {
            try {
              const cb = takeNavCallback(callbackId);
              if (typeof cb === 'function') {
                cb({
                  uri,
                  id: pickedSong.id,
                  name: pickedSong.displayName || pickedSong.name,
                });
              }
            } catch (e) {}
            navigation.goBack();
            return;
          }

          // also inform caller if explicit setter was passed
          if (typeof setPuzzleUri === 'function') {
            try {
              setPuzzleUri({
                imageUri: puzzleUri?.imageUri || null,
                soundUri: uri,
              });
            } catch {}
          }

          // start playing the picked song locally in SongsScreen
          setIsPlaying(false);
          setTimeout(() => onTogglePlay(), 80);
        } catch (err) {
          // ignore
        }
      }
    } catch (e) {
      // user cancelled or error
    }
  };

  const keyExtractor = useCallback((item: Song) => item.id, []);
  const renderSongListItem = useCallback(
    ({ item }: { item: Song }) => {
      const isSelected = selectedSong?.id === item.id;
      const isCurrentlyPlaying = isSelected && isPlaying;
      const displayDuration = duration > 0 ? duration : item.durationSec ?? 0;

      const content = (
        <View className="flex-row items-center" style={{ gap: 12 }}>
          {item.cover ? (
            <Image
              source={item.cover}
              style={{ width: 54, height: 54, borderRadius: 6 }}
            />
          ) : (
            <Image
              source={require('../../../assets/img/defaultSongCover.png')}
              style={{ width: 54, height: 54, borderRadius: 6 }}
            />
          )}
          <TouchableOpacity
            onPress={() => onSongSelect(item)}
            activeOpacity={0.7}
            className="absolute z-10 left-[10px]"
            style={{ width: 33, height: 33 }}
          >
            <View
              className="border border-white rounded-full items-center justify-center"
              style={{
                width: 33,
                height: 33,
                backgroundColor: 'rgb(181, 29, 150)',
              }}
            >
              {isCurrentlyPlaying ? (
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
            </View>
          </TouchableOpacity>
          <View className="flex-1 justify-between flex-row items-center">
            <View className="flex-1 mr-3">
              <Text className="text-white text-sm font-regular">
                {item.displayName}
              </Text>
              {!isSelected && (
                <Text className="text-border2Color text-xs font-regular mt-1">
                  {formatTime(item.durationSec ?? 0)}
                </Text>
              )}
              {isSelected && (
                <View className="mt-1">
                  {/* <View className="h-[3px] bg-white rounded-full justify-center">
                <View
                className="h-[7px] rounded-full"
                style={{
                  width:
                  duration > 0
                  ? `${Math.min((currentTime / duration) * 100, 100)}%`
                  : '0%',
                  backgroundColor: '#CB30E0',
                  }}
                  />
                  </View> */}
                  <View className="flex-row justify-between">
                    <Text className="text-border2Color text-xs font-regular">
                      {formatTime(currentTime)} /{formatTime(displayDuration)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {isSelected ? (
              <View className="w-6 h-6 rounded-full border border-white justify-center items-center bg-[#B51D96]">
                <CheckIcon />
              </View>
            ) : (
              <View className="w-6 h-6 rounded-full border border-white" />
            )}
          </View>
        </View>
      );

      return (
        <TouchableOpacity
          onPress={() => onSelectOnly(item)}
          activeOpacity={0.7}
        >
          {/* {isSelected ? (
          <LinearGradient
            colors={[`rgba(84,7,67,1)`, `rgba(181,29,150,1)`]}
            className="border border-white"
            style={{
              marginBottom: 12,
              borderRadius: 12,
              padding: 12,
            }}
          >
            {content}
          </LinearGradient>
        ) : ( */}
          <View
            className={`mb-3 border rounded-xl p-3 bg-whiteWithTransparentColor ${
              isSelected ? 'border-2 border-white' : 'border-border2Color'
            }`}
          >
            {content}
          </View>
          {/* )} */}
        </TouchableOpacity>
      );
    },
    [
      currentTime,
      duration,
      isPlaying,
      selectedSong,
      onSongSelect,
      onSelectOnly,
    ],
  );

  return (
    <View className="flex-1">
      {ownSongs && (
        <View className="mx-4 border-b border-border1Color">
          <LinearGradient
            colors={['#E92F80', '#F1679B']}
            className="rounded-2xl border w-44 h-10 mt-4 mb-3 self-center"
            style={{
              borderColor: 'rgba(1, 1, 1, 1)',
              shadowColor: 'rgba(0,0,0,0.35)',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              className={`flex-1 justify-center items-center`}
              onPress={() => {
                handlePickSound();
              }}
            >
              <Text
                className={`font-semibold text-[17px] text-white text-center`}
              >
                Choose own sound
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
      <FlatList
        data={SONGS}
        keyExtractor={keyExtractor}
        renderItem={renderSongListItem}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
      />

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
            title="Add Song"
            onPress={async () => {
              if (selectedSong) {
                try {
                  const callbackId = route?.params?.callbackId as
                    | string
                    | undefined;
                  try {
                    const cb = takeNavCallback(callbackId);
                    if (typeof cb === 'function') {
                      const realSongUri = await resolveSongPath(
                        selectedSong.uri,
                        selectedSong.name,
                      );

                      cb({
                        uri: realSongUri,
                        id: selectedSong.id,
                        name: selectedSong.displayName || selectedSong.name,
                      });
                    }
                  } catch (e) {
                    logger.error('[SongsScreen] callback failed', e);
                  }
                } catch (e) {
                  logger.error('[SongsScreen] media path resolution failed', e);
                  // Still go back, but without song
                  navigation.goBack();
                }
                navigation.goBack();
              }
            }}
            disabled={!selectedSong}
          />
        </View>
      </View>
    </View>
  );
};
