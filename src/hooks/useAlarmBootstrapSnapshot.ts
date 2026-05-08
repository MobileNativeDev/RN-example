import { useEffect, useState } from 'react';

import {
  readAlarmBootstrap,
  subscribeToAlarmBootstrap,
} from '@services/alarmBootstrap/storage';
import { AlarmBootstrapSnapshot } from '@services/alarmBootstrap/types';

export const useAlarmBootstrapSnapshot = (
  userId: string | null,
): AlarmBootstrapSnapshot | null => {
  const [snapshot, setSnapshot] = useState<AlarmBootstrapSnapshot | null>(() =>
    readAlarmBootstrap(userId),
  );

  useEffect(() => {
    setSnapshot(readAlarmBootstrap(userId));

    if (!userId) {
      return () => {};
    }

    return subscribeToAlarmBootstrap(userId, () => {
      setSnapshot(readAlarmBootstrap(userId));
    });
  }, [userId]);

  return snapshot;
};
