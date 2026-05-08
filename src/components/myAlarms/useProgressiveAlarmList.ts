import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

type Params = {
  enabled: boolean;
  initialCount?: number;
  batchSize?: number;
};

export const useProgressiveAlarmList = <T,>(
  data: T[],
  { enabled, initialCount = 12, batchSize = 12 }: Params,
) => {
  const [visibleCount, setVisibleCount] = useState(
    enabled ? Math.min(initialCount, data.length) : 0,
  );

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (!enabled) {
      setVisibleCount(0);
      return () => {};
    }

    const total = data.length;
    const firstChunk = Math.min(initialCount, total);
    setVisibleCount(prev => {
      if (prev <= 0) return firstChunk;
      return Math.max(Math.min(prev, total), firstChunk);
    });

    if (total <= firstChunk) {
      return () => {};
    }

    const scheduleNextBatch = () => {
      InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;

        timer = setTimeout(() => {
          if (cancelled) return;

          setVisibleCount(prev => {
            const next = Math.min(prev + batchSize, total);
            if (next < total) {
              scheduleNextBatch();
            }
            return next;
          });
        }, 16);
      });
    };

    scheduleNextBatch();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [batchSize, data, enabled, initialCount]);

  return enabled ? data.slice(0, visibleCount) : [];
};

export default useProgressiveAlarmList;
