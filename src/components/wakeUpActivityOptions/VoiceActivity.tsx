import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import SoundPlayer from 'react-native-sound-player';
import LinearGradient from 'react-native-linear-gradient';
import VoiceIconWhite from '../../../assets/svg/VoiceIconWhite.svg';
import { isIos } from '@utils/condition';
import { startPlayer, stopPlayer } from '@services/ios-services/nativePlayer';
import { formatTime } from '@utils/time';
import { downloadRemoteMediaToTemp } from '@utils/media';
import useManagedSoundPlayerProgress from '@hooks/useManagedSoundPlayerProgress';
import logger from '@utils/logger';
import {
  getVoiceDisplayName,
  getVoiceDurationSec,
} from '@utils/voiceDisplayName';

export const VoiceActivity = ({
  voiceUri,
  voiceName,
  autoPlay = true,
  controllable = false,
}: {
  voiceUri: string | string[] | null;
  voiceName?: string | null;
  autoPlay?: boolean;
  controllable?: boolean;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const durationRef = useRef(0);
  const currentPositionRef = useRef<number>(0);
  const canResumeRef = useRef(false);
  const playRequestIdRef = useRef(0);
  const cachedPathsRef = useRef<Map<string, string>>(new Map());

  const uris = useMemo(() => {
    return Array.isArray(voiceUri)
      ? voiceUri.filter(Boolean)
      : voiceUri
      ? [voiceUri]
      : [];
  }, [voiceUri]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentVoiceTitle = useMemo(
    () =>
      getVoiceDisplayName(uris[currentIndex] ?? null, voiceName) ||
      'Voice_record',
    [currentIndex, voiceName, uris],
  );
  const currentTrackDurationHint = useMemo(
    () => getVoiceDurationSec(uris[currentIndex] ?? null, voiceName) ?? 0,
    [currentIndex, voiceName, uris],
  );
  const {
    duration,
    currentTime,
    progressRatio,
    remainingTime,
    setDurationHint,
    setProgressSnapshot,
    startTracking,
    pauseTracking,
    resetTracking,
    completeTracking,
    syncFromPlayer,
  } = useManagedSoundPlayerProgress({
    initialDuration: currentTrackDurationHint,
    tickMs: 100,
    syncIntervalMs: 1000,
  });
  const showProgressFooter = controllable && Platform.OS === 'android';

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    currentPositionRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    setDurationHint(currentTrackDurationHint);
  }, [currentTrackDurationHint, setDurationHint]);

  useEffect(() => {
    if (!uris.length) return;
    const remotes = uris.filter(
      u => u.startsWith('http://') || u.startsWith('https://'),
    );
    if (!remotes.length) return;

    let cancelled = false;
    Promise.all(
      remotes.map(async u => {
        const local = await downloadRemoteMediaToTemp(u, 'voice');
        if (!cancelled && local) {
          cachedPathsRef.current.set(u, local);
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [uris]);

  const resolveUri = useCallback(
    (uri: string): string => cachedPathsRef.current.get(uri) ?? uri,
    [],
  );

  const stopSoundPlayer = useCallback(async (pauseOnly = false) => {
    if (pauseOnly && typeof (SoundPlayer as any).pause === 'function') {
      await (SoundPlayer as any).pause();
      return;
    }

    await SoundPlayer.stop();
  }, []);

  useEffect(() => {
    let subFinish: any;
    try {
      subFinish = SoundPlayer.addEventListener('FinishedPlaying', () => {
        pauseTracking(durationRef.current);
        completeTracking(durationRef.current);
        canResumeRef.current = false;
        setIsPlaying(false);
        currentPositionRef.current = durationRef.current;
      });
    } catch {}
    return () => {
      try {
        subFinish?.remove?.();
      } catch {}
    };
  }, [completeTracking, pauseTracking]);

  const stopPlaybackFully = useCallback(async () => {
    playRequestIdRef.current += 1;
    resetTracking({ duration: currentTrackDurationHint });
    setIsPlaying(false);
    try {
      await stopPlayer();
    } catch {}
    try {
      await stopSoundPlayer();
    } catch {}
    canResumeRef.current = false;
  }, [currentTrackDurationHint, resetTracking, stopSoundPlayer]);

  const stopPlayback = useCallback(async () => {
    playRequestIdRef.current += 1;
    pauseTracking(currentPositionRef.current);
    setIsPlaying(false);
    try {
      await stopPlayer();
    } catch {}
    try {
      await stopSoundPlayer(!isIos);
    } catch {}
    canResumeRef.current =
      !isIos && typeof (SoundPlayer as any).resume === 'function';
  }, [pauseTracking, stopSoundPlayer]);

  const playAt = useCallback(
    async (index: number, startFrom?: number) => {
      if (!uris.length) return;
      const idx = Math.max(0, Math.min(index, uris.length - 1));
      const rawUri = uris[idx];
      const uriToPlay = resolveUri(rawUri);
      const nextPosition =
        typeof startFrom === 'number' && startFrom > 0 ? startFrom : 0;
      const nextDurationHint = getVoiceDurationSec(rawUri, voiceName) ?? 0;
      const requestId = playRequestIdRef.current + 1;

      try {
        playRequestIdRef.current = requestId;
        canResumeRef.current = false;
        currentPositionRef.current = nextPosition;
        setCurrentIndex(idx);
        setProgressSnapshot({
          position: nextPosition,
          duration: nextDurationHint,
        });
        setIsPlaying(true);
        pauseTracking(nextPosition);
        try {
          await stopPlayer();
        } catch {}
        try {
          await stopSoundPlayer();
        } catch {}

        const isLocal =
          !uriToPlay.startsWith('http://') && !uriToPlay.startsWith('https://');
        if (isIos && isLocal) {
          await startPlayer(uriToPlay);
        } else {
          await SoundPlayer.playUrl(uriToPlay);
        }

        if (requestId !== playRequestIdRef.current) {
          try {
            await stopSoundPlayer();
          } catch {}
          return;
        }

        startTracking({
          position: nextPosition,
          duration: nextDurationHint,
          syncNow: true,
        });

        if (startFrom && (SoundPlayer as any).seek) {
          setTimeout(() => {
            try {
              (SoundPlayer as any).seek(startFrom);
            } catch {}
            void syncFromPlayer();
          }, 50);
        }
      } catch (e) {
        logger.warn('[VoiceActivity] playAt failed', e);
        resetTracking({ duration: nextDurationHint });
        setIsPlaying(false);
      }
    },
    [
      pauseTracking,
      resetTracking,
      resolveUri,
      setProgressSnapshot,
      startTracking,
      stopSoundPlayer,
      syncFromPlayer,
      uris,
      voiceName,
    ],
  );

  const resumePlayback = useCallback(async () => {
    const resumeSupported =
      !isIos && typeof (SoundPlayer as any).resume === 'function';
    const requestId = playRequestIdRef.current + 1;
    const isAtEnd =
      currentPositionRef.current > 0 &&
      durationRef.current > 0 &&
      currentPositionRef.current >= durationRef.current - 0.5;

    if (isAtEnd) {
      canResumeRef.current = false;
      currentPositionRef.current = 0;
      setProgressSnapshot({ position: 0 });
    }

    if (!canResumeRef.current || !resumeSupported) {
      const startFrom =
        !isAtEnd && currentPositionRef.current > 0
          ? currentPositionRef.current
          : undefined;
      void playAt(currentIndex, startFrom);
      return;
    }

    try {
      playRequestIdRef.current = requestId;
      setIsPlaying(true);
      await (SoundPlayer as any).resume();
      if (requestId !== playRequestIdRef.current) {
        try {
          await stopSoundPlayer();
        } catch {}
        return;
      }
      canResumeRef.current = false;
      startTracking({
        position: currentPositionRef.current,
        duration: durationRef.current,
        syncNow: true,
      });
    } catch (e) {
      logger.warn('[VoiceActivity] resumePlayback failed', e);
      setIsPlaying(false);
    }
  }, [
    currentIndex,
    playAt,
    setProgressSnapshot,
    startTracking,
    stopSoundPlayer,
  ]);

  useEffect(() => {
    canResumeRef.current = false;
    currentPositionRef.current = 0;
    resetTracking({
      duration: getVoiceDurationSec(uris[0] ?? null, voiceName) ?? 0,
    });
    if (!uris.length || !autoPlay) return;
    void playAt(0);
    return () => {
      void stopPlaybackFully();
    };
  }, [autoPlay, playAt, resetTracking, stopPlaybackFully, uris, voiceName]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        void stopPlaybackFully();
      };
    }, [stopPlaybackFully]),
  );

  return (
    <View className="w-full max-h-[370px]">
      <LinearGradient
        colors={['rgba(84, 7, 67, 1)', 'rgba(181, 29, 150, 1)']}
        className="rounded-xl h-full justify-center items-center"
      >
        <View className="absolute z-30">
          {controllable ? (
            <TouchableOpacity
              onPress={() => {
                if (isPlaying) {
                  void stopPlayback();
                } else {
                  void resumePlayback();
                }
              }}
            >
              {isPlaying ? (
                <Text className="font-bold text-[80px] text-white">||</Text>
              ) : (
                <VoiceIconWhite />
              )}
            </TouchableOpacity>
          ) : (
            <VoiceIconWhite />
          )}
        </View>
        <View
          className="w-full flex-1 justify-end"
          style={{
            overflow: 'hidden',
          }}
          pointerEvents="box-none"
        >
          <LinearGradient
            colors={['rgba(1,1,1,0)', 'rgba(1,1,1,0.35)', 'rgba(1,1,1,1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
            }}
          >
            <View className="px-4 pb-2">
              <Text className={`text-white ${isIos ? 'mb-3' : ''}`}>
                {currentVoiceTitle}
              </Text>
              {showProgressFooter && (
                <View className="w-full mt-2">
                  <View className="h-[3px] bg-white rounded-full justify-center">
                    <View
                      className="h-[7px] rounded-full"
                      style={{
                        width: duration > 0 ? `${progressRatio * 100}%` : '0%',
                        backgroundColor: '#CB30E0',
                      }}
                    />
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-white mt-2">
                      {formatTime(currentTime)}
                    </Text>
                    <Text className="text-white mt-2">
                      -{formatTime(remainingTime)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
};
