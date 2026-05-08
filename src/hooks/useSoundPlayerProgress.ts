import { useCallback, useEffect, useRef } from 'react';
import SoundPlayer from 'react-native-sound-player';

type SoundInfo = {
  duration?: number;
  currentTime?: number;
};

type Params = {
  intervalMs?: number;
  onProgress: (info: SoundInfo) => void;
};

export const useSoundPlayerProgress = ({
  intervalMs = 500,
  onProgress,
}: Params) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    try {
      const info = await SoundPlayer.getInfo();
      onProgress(info ?? {});
    } catch {
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onProgress]);

  const start = useCallback(() => {
    stop();
    isActiveRef.current = true;
    void refresh();

    const scheduleNext = () => {
      if (!isActiveRef.current) {
        return;
      }

      timerRef.current = setTimeout(async () => {
        await refresh();
        scheduleNext();
      }, intervalMs);
    };

    scheduleNext();
  }, [intervalMs, refresh, stop]);

  useEffect(() => stop, [stop]);

  return {
    start,
    stop,
    refresh,
  } as const;
};

export default useSoundPlayerProgress;
