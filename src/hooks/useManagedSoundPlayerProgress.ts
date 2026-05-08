import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SoundPlayer from 'react-native-sound-player';

type ManagedProgressOptions = {
  initialDuration?: number;
  tickMs?: number;
  syncIntervalMs?: number;
};

type StartTrackingOptions = {
  position?: number;
  duration?: number;
  syncNow?: boolean;
};

type ResetTrackingOptions = {
  duration?: number;
};

type SnapshotOptions = {
  position?: number;
  duration?: number;
};

const MIN_UPDATE_DIFF_SEC = 0.02;

const toFiniteNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const normalizeDuration = (value: unknown) => {
  const normalized = toFiniteNumber(value);
  if (normalized === null || normalized <= 0) {
    return null;
  }

  return normalized;
};

const clampPosition = (value: number, duration: number) => {
  const next = Math.max(value, 0);
  if (duration > 0) {
    return Math.min(next, duration);
  }

  return next;
};

export const useManagedSoundPlayerProgress = ({
  initialDuration = 0,
  tickMs = 100,
  syncIntervalMs = 1000,
}: ManagedProgressOptions = {}) => {
  const initialDurationValue = normalizeDuration(initialDuration) ?? 0;
  const [duration, setDuration] = useState(initialDurationValue);
  const [currentTime, setCurrentTime] = useState(0);

  const durationRef = useRef(initialDurationValue);
  const currentTimeRef = useRef(0);
  const runningRef = useRef(false);
  const sessionRef = useRef(0);
  const tickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const basePositionRef = useRef(0);
  const startedAtRef = useRef(0);

  const clearTickTimer = useCallback(() => {
    if (!tickTimerRef.current) {
      return;
    }

    clearTimeout(tickTimerRef.current);
    tickTimerRef.current = null;
  }, []);

  const clearSyncTimer = useCallback(() => {
    if (!syncTimerRef.current) {
      return;
    }

    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    clearTickTimer();
    clearSyncTimer();
  }, [clearSyncTimer, clearTickTimer]);

  const commitDuration = useCallback((nextDuration: number) => {
    if (Math.abs(durationRef.current - nextDuration) < MIN_UPDATE_DIFF_SEC) {
      durationRef.current = nextDuration;
      return;
    }

    durationRef.current = nextDuration;
    setDuration(prev =>
      Math.abs(prev - nextDuration) < MIN_UPDATE_DIFF_SEC ? prev : nextDuration,
    );
  }, []);

  const commitCurrentTime = useCallback((nextCurrentTime: number) => {
    const clamped = clampPosition(nextCurrentTime, durationRef.current);
    currentTimeRef.current = clamped;
    setCurrentTime(prev =>
      Math.abs(prev - clamped) < MIN_UPDATE_DIFF_SEC ? prev : clamped,
    );
  }, []);

  const applySnapshot = useCallback(
    ({ position, duration: nextDuration }: SnapshotOptions) => {
      const normalizedDuration = normalizeDuration(nextDuration);
      if (normalizedDuration !== null) {
        commitDuration(normalizedDuration);
      }

      const normalizedPosition = toFiniteNumber(position);
      if (normalizedPosition !== null) {
        commitCurrentTime(normalizedPosition);
      }
    },
    [commitCurrentTime, commitDuration],
  );

  const readDerivedPosition = useCallback(() => {
    if (!runningRef.current) {
      return currentTimeRef.current;
    }

    const elapsedSec = (Date.now() - startedAtRef.current) / 1000;
    return basePositionRef.current + elapsedSec;
  }, []);

  const syncFromPlayer = useCallback(
    async (expectedSession?: number) => {
      const session = expectedSession ?? sessionRef.current;

      try {
        const info = await SoundPlayer.getInfo();
        if (session !== sessionRef.current) {
          return;
        }

        const normalizedDuration = normalizeDuration(info?.duration);
        if (normalizedDuration !== null) {
          commitDuration(normalizedDuration);
        }

        const normalizedPosition = toFiniteNumber(info?.currentTime);
        if (normalizedPosition !== null) {
          const clamped = clampPosition(
            normalizedPosition,
            durationRef.current,
          );
          commitCurrentTime(clamped);

          if (runningRef.current) {
            basePositionRef.current = clamped;
            startedAtRef.current = Date.now();
          }
        }
      } catch {}
    },
    [commitCurrentTime, commitDuration],
  );

  const scheduleSync = useCallback(
    (session: number) => {
      if (!runningRef.current || syncIntervalMs <= 0) {
        return;
      }

      syncTimerRef.current = setTimeout(async () => {
        if (!runningRef.current || session !== sessionRef.current) {
          return;
        }

        await syncFromPlayer(session);
        scheduleSync(session);
      }, syncIntervalMs);
    },
    [syncFromPlayer, syncIntervalMs],
  );

  const scheduleTick = useCallback(
    (session: number) => {
      if (!runningRef.current) {
        return;
      }

      tickTimerRef.current = setTimeout(() => {
        if (!runningRef.current || session !== sessionRef.current) {
          return;
        }

        const derivedPosition = clampPosition(
          readDerivedPosition(),
          durationRef.current,
        );
        commitCurrentTime(derivedPosition);

        if (durationRef.current > 0 && derivedPosition >= durationRef.current) {
          runningRef.current = false;
          clearTimers();
          return;
        }

        scheduleTick(session);
      }, tickMs);
    },
    [clearTimers, commitCurrentTime, readDerivedPosition, tickMs],
  );

  const setProgressSnapshot = useCallback(
    ({ position, duration: nextDuration }: SnapshotOptions) => {
      applySnapshot({ position, duration: nextDuration });

      if (runningRef.current) {
        basePositionRef.current = currentTimeRef.current;
        startedAtRef.current = Date.now();
      }
    },
    [applySnapshot],
  );

  const setDurationHint = useCallback(
    (nextDuration?: number | null) => {
      const normalized = normalizeDuration(nextDuration);
      if (normalized === null) {
        return;
      }

      applySnapshot({
        position: currentTimeRef.current,
        duration: normalized,
      });

      if (runningRef.current) {
        basePositionRef.current = currentTimeRef.current;
        startedAtRef.current = Date.now();
      }
    },
    [applySnapshot],
  );

  const startTracking = useCallback(
    ({
      position,
      duration: nextDuration,
      syncNow = true,
    }: StartTrackingOptions = {}) => {
      const session = sessionRef.current + 1;
      sessionRef.current = session;

      clearTimers();
      runningRef.current = true;

      applySnapshot({ position, duration: nextDuration });
      basePositionRef.current = currentTimeRef.current;
      startedAtRef.current = Date.now();

      scheduleTick(session);
      scheduleSync(session);

      if (syncNow) {
        void syncFromPlayer(session);
      }
    },
    [applySnapshot, clearTimers, scheduleSync, scheduleTick, syncFromPlayer],
  );

  const pauseTracking = useCallback(
    (position?: number) => {
      sessionRef.current += 1;
      clearTimers();

      const nextPosition =
        toFiniteNumber(position) ??
        clampPosition(readDerivedPosition(), durationRef.current);

      runningRef.current = false;
      commitCurrentTime(nextPosition);
      basePositionRef.current = nextPosition;
      startedAtRef.current = 0;
    },
    [clearTimers, commitCurrentTime, readDerivedPosition],
  );

  const resetTracking = useCallback(
    ({ duration: nextDuration }: ResetTrackingOptions = {}) => {
      sessionRef.current += 1;
      clearTimers();

      runningRef.current = false;
      basePositionRef.current = 0;
      startedAtRef.current = 0;

      const normalizedDuration = normalizeDuration(nextDuration) ?? 0;
      durationRef.current = normalizedDuration;
      currentTimeRef.current = 0;

      setDuration(prev =>
        Math.abs(prev - normalizedDuration) < MIN_UPDATE_DIFF_SEC
          ? prev
          : normalizedDuration,
      );
      setCurrentTime(prev => (prev < MIN_UPDATE_DIFF_SEC ? prev : 0));
    },
    [clearTimers],
  );

  const completeTracking = useCallback(
    (nextDuration?: number) => {
      sessionRef.current += 1;
      clearTimers();

      runningRef.current = false;

      const normalizedDuration =
        normalizeDuration(nextDuration) ?? durationRef.current;
      const completedDuration = Math.max(
        normalizedDuration,
        currentTimeRef.current,
      );

      durationRef.current = completedDuration;
      currentTimeRef.current = completedDuration;
      basePositionRef.current = completedDuration;
      startedAtRef.current = 0;

      setDuration(prev =>
        Math.abs(prev - completedDuration) < MIN_UPDATE_DIFF_SEC
          ? prev
          : completedDuration,
      );
      setCurrentTime(prev =>
        Math.abs(prev - completedDuration) < MIN_UPDATE_DIFF_SEC
          ? prev
          : completedDuration,
      );
    },
    [clearTimers],
  );

  useEffect(() => clearTimers, [clearTimers]);

  const progressRatio = useMemo(() => {
    if (duration <= 0) {
      return 0;
    }

    return Math.min(currentTime / duration, 1);
  }, [currentTime, duration]);

  const remainingTime = useMemo(
    () => Math.max(duration - currentTime, 0),
    [currentTime, duration],
  );

  return {
    currentTime,
    duration,
    progressRatio,
    remainingTime,
    setDurationHint,
    setProgressSnapshot,
    startTracking,
    pauseTracking,
    resetTracking,
    completeTracking,
    syncFromPlayer,
  } as const;
};

export default useManagedSoundPlayerProgress;
