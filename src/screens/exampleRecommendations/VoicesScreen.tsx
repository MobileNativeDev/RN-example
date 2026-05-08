import { LinierButton } from '@components/customComponents/LinierButton';
import { setActivePlayer } from '@utils/playerManager';
import { Text, TouchableOpacity, View, FlatList, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import SoundPlayer from 'react-native-sound-player';
import { useNavigation } from '@react-navigation/native';
import { VOICES } from '../../generated/voiceList';
import { takeNavCallback } from '@utils/navCallbackStore';
import { formatTime } from '@utils/time';
import { resolveVoicePath } from '@utils/media';
import useSoundPlayerProgress from '@hooks/useSoundPlayerProgress';
import logger from '@utils/logger';

type Voice = {
  id: string;
  name: string;
  uri: any;
  displayName: string;
  durationSec?: number;
  cover: any | null;
};

export const VoicesScreen: React.FC = () => {
  const navigation = useNavigation() as any;
  const route: any = useRoute();
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
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

  const playVoice = async (voice: Voice) => {
    try {
      setActivePlayer(playerIdRef.current);

      try {
        if (typeof voice.uri === 'number') {
          const nameWithoutExt = voice.name.replace(
            /\.mp3$|\.wav$|\.m4a$/i,
            '',
          );
          SoundPlayer.playSoundFile(nameWithoutExt, 'mp3');
        } else if (typeof voice.uri === 'string') {
          SoundPlayer.playUrl(voice.uri);
        }
      } catch (e) {
        logger.warn('[VoicesScreen] failed to start playback', e);
      }

      setTimeout(async () => {
        try {
          await refresh();
          setIsPlaying(true);
          start();
        } catch (error) {
          logger.warn('[VoicesScreen] failed to read playback info', error);
        }
      }, 120);
    } catch (error) {
      logger.warn('[VoicesScreen] playVoice failed', error);
      setIsPlaying(false);
    }
  };

  const onTogglePlay = async () => {
    if (!selectedVoice) return;

    try {
      if (isPlaying) {
        SoundPlayer.stop();
        stop();
        setIsPlaying(false);
        return;
      }
      if (selectedVoice) {
        await playVoice(selectedVoice);
      }
    } catch (error) {
      logger.warn('[VoicesScreen] toggle playback failed', error);
      setIsPlaying(false);
    }
  };

  const onVoiceSelect = (voice: Voice) => {
    if (selectedVoice?.id === voice.id) {
      onTogglePlay();
    } else {
      try {
        SoundPlayer.stop();
      } catch {}
      stop();
      setIsPlaying(false);
      setSelectedVoice(voice);
      setCurrentTime(0);
      setDuration(0);
      playVoice(voice);
    }
  };

  const onSelectOnly = (voice: Voice) => {
    if (selectedVoice?.id === voice.id) return;

    try {
      SoundPlayer.stop();
    } catch {}
    stop();
    setIsPlaying(false);
    setSelectedVoice(voice);
    setCurrentTime(0);
    setDuration(0);
  };

  const keyExtractor = useCallback((item: Voice) => item.id, []);
  const renderVoiceListItem = useCallback(
    ({ item }: { item: Voice }) => {
      const isSelected = selectedVoice?.id === item.id;
      const isCurrentlyPlaying = isSelected && isPlaying;
      const displayDuration = duration > 0 ? duration : item.durationSec ?? 0;

      const content = (
        <View className="flex-row items-center p-3" style={{ gap: 12 }}>
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
            onPress={() => onVoiceSelect(item)}
            activeOpacity={0.7}
          >
            <View
              className="border border-border2Color rounded-full items-center justify-center"
              style={{
                width: 33,
                height: 33,
                backgroundColor: isSelected
                  ? 'rgba(181, 29, 150, 0.5)'
                  : 'rgba(181, 29, 150, 0.3)',
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
          <View className="flex-1">
            <Text className="text-white text-sm font-regular" numberOfLines={1}>
              {item.displayName}
            </Text>
            {!isSelected && (
              <Text className="text-border2Color text-xs font-regular mt-1">
                {formatTime(item.durationSec ?? 0)}
              </Text>
            )}
            {isSelected && (
              <View className="mt-2">
                <View className="h-[3px] bg-white rounded-full justify-center">
                  <View
                    className="h-[7px] rounded-full"
                    style={{
                      width:
                        displayDuration > 0
                          ? `${Math.min(
                              (currentTime / displayDuration) * 100,
                              100,
                            )}%`
                          : '0%',
                      backgroundColor: '#CB30E0',
                    }}
                  />
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-border2Color text-xs font-regular">
                    {formatTime(currentTime)}
                  </Text>
                  <Text className="text-border2Color text-xs font-regular">
                    {formatTime(displayDuration)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      );

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onSelectOnly(item)}
        >
          {isSelected ? (
            <View className="border border-white rounded-xl mb-3">
              <LinearGradient
                colors={[`rgba(84,7,67,1)`, `rgba(181,29,150,1)`]}
                className="rounded-xl"
              >
                {content}
              </LinearGradient>
            </View>
          ) : (
            <View className="mb-3 border border-border2Color rounded-xl bg-whiteWithTransparentColor">
              {content}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [
      currentTime,
      duration,
      isPlaying,
      selectedVoice,
      onVoiceSelect,
      onSelectOnly,
    ],
  );

  return (
    <View className="flex-1">
      <FlatList
        data={VOICES}
        keyExtractor={keyExtractor}
        renderItem={renderVoiceListItem}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
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
            title="Add Voice"
            onPress={async () => {
              if (selectedVoice) {
                try {
                  const callbackId = route?.params?.callbackId as
                    | string
                    | undefined;
                  try {
                    const cb = takeNavCallback(callbackId);
                    if (typeof cb === 'function') {
                      const realVoiceUri = await resolveVoicePath(
                        selectedVoice.uri,
                        selectedVoice.name,
                      );

                      cb({
                        uri: realVoiceUri,
                        id: selectedVoice.id,
                        name: selectedVoice.displayName || selectedVoice.name,
                      });
                    }
                  } catch (e) {
                    logger.error('[VoicesScreen] callback failed', e);
                  }
                } catch (e) {
                  logger.error('[VoicesScreen] voice selection failed', e);
                }
                navigation.goBack();
              }
            }}
            disabled={!selectedVoice}
          />
        </View>
      </View>
    </View>
  );
};
