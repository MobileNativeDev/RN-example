import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import SoundPlayer from 'react-native-sound-player';
import LinearGradient from 'react-native-linear-gradient';
import SongIconWhite from '../../../assets/svg/SongIconWhite.svg';
import { parseYouTubeVideoId } from '@utils/additionFunctions';
import YoutubePlayer from 'react-native-youtube-iframe';
import { formatTime } from '@utils/time';
import { isIos } from '@utils/condition';
import { startPlayer, stopPlayer } from '@services/ios-services/nativePlayer';
import { downloadRemoteMediaToTemp } from '@utils/media';
import useManagedSoundPlayerProgress from '@hooks/useManagedSoundPlayerProgress';
import logger from '@utils/logger';
import { getSongDisplayName, getSongDurationSec } from '@utils/songDisplayName';

export const SongActivity = ({
  songUri,
  songName,
  autoPlay = true,
  controllable,
}: {
  songUri: string | string[] | null;
  songName?: string | null;
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
    return Array.isArray(songUri)
      ? songUri.filter(Boolean)
      : songUri
      ? [songUri]
      : [];
  }, [songUri]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSongTitle = useMemo(
    () =>
      songName?.trim() ||
      getSongDisplayName(uris[currentIndex] ?? null) ||
      'Song',
    [currentIndex, songName, uris],
  );
  const currentTrackDurationHint = useMemo(
    () => getSongDurationSec(uris[currentIndex] ?? null, songName) ?? 0,
    [currentIndex, songName, uris],
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
        const local = await downloadRemoteMediaToTemp(u, 'song');
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

  const playAt = useCallback(
    async (index: number, startFrom?: number) => {
      if (!uris.length) return;
      const idx = Math.max(0, Math.min(index, uris.length - 1));
      const rawUri = uris[idx];
      const uriToPlay = resolveUri(rawUri);
      const nextPosition =
        typeof startFrom === 'number' && startFrom > 0 ? startFrom : 0;
      const nextDurationHint = getSongDurationSec(rawUri, songName) ?? 0;
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

        if (
          typeof startFrom === 'number' &&
          startFrom > 0 &&
          (SoundPlayer as any).seek
        ) {
          setTimeout(() => {
            try {
              (SoundPlayer as any).seek(startFrom);
            } catch {}
            void syncFromPlayer();
          }, 50);
        }
      } catch (e: any) {
        logger.warn('[SongActivity] playAt failed', e, 'uri=', uriToPlay);
        resetTracking({ duration: nextDurationHint });
        setIsPlaying(false);
      }
    },
    [
      pauseTracking,
      resetTracking,
      resolveUri,
      setProgressSnapshot,
      songName,
      startTracking,
      stopSoundPlayer,
      syncFromPlayer,
      uris,
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
    } catch (e: any) {
      logger.warn('[SongActivity] resumePlayback failed', e);
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
    setCurrentIndex(0);
    canResumeRef.current = false;
    currentPositionRef.current = 0;
    resetTracking({
      duration: getSongDurationSec(uris[0] ?? null, songName) ?? 0,
    });
    if (uris.length > 0 && autoPlay) {
      void playAt(0);
    }
  }, [autoPlay, playAt, resetTracking, songName, uris]);

  useEffect(() => {
    let sub: any;
    try {
      sub = SoundPlayer.addEventListener('FinishedPlaying', () => {
        canResumeRef.current = false;
        pauseTracking(durationRef.current);
        completeTracking(durationRef.current);
        currentPositionRef.current = durationRef.current;
        setTimeout(() => {
          setCurrentIndex(prev => {
            const next = prev + 1;
            if (next >= uris.length) {
              setIsPlaying(false);
              return prev;
            }
            playAt(next);
            return next;
          });
        }, 100);
      });
    } catch {}
    return () => {
      try {
        sub?.remove?.();
      } catch {}
      pauseTracking(currentPositionRef.current);
    };
  }, [completeTracking, pauseTracking, playAt, uris]);

  useEffect(() => {
    return () => {
      void stopPlaybackFully();
    };
  }, [stopPlaybackFully]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        void stopPlaybackFully();
      };
    }, [stopPlaybackFully]),
  );

  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  useEffect(() => {
    const sourceForParse = Array.isArray(songUri) ? songUri[0] : songUri || '';
    const id = parseYouTubeVideoId(sourceForParse);
    setYoutubeId(id ?? null);
  }, [songUri]);

  return (
    <View className="w-full h-auto max-h-[370px]">
      {!youtubeId && (
        <LinearGradient
          colors={['rgba(84, 7, 67, 1)', 'rgba(181, 29, 150, 1)']}
          className="rounded-xl h-full justify-center items-center"
        >
          <View className="absolute" style={{ zIndex: 50, elevation: 50 }}>
            {controllable ? (
              <TouchableOpacity
                activeOpacity={0.7}
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
                  <SongIconWhite />
                )}
              </TouchableOpacity>
            ) : (
              <SongIconWhite />
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
                  {currentSongTitle}
                </Text>
                {showProgressFooter && (
                  <View className="w-full mt-2">
                    <View className="h-[3px] bg-white rounded-full justify-center">
                      <View
                        className="h-[7px] rounded-full"
                        style={{
                          width:
                            duration > 0 ? `${progressRatio * 100}%` : '0%',
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
      )}
      {youtubeId && (
        <View style={{ height: 200 }}>
          <YoutubePlayer height={200} videoId={youtubeId} play={false} />
        </View>
      )}
    </View>
  );
};
