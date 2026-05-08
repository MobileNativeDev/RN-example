import { createMMKV } from 'react-native-mmkv';

import { AlarmBootstrapSnapshot } from './types';
import {
  deserializeAlarmBootstrapSnapshot,
  serializeAlarmBootstrapSnapshot,
} from './serialization';

const STORAGE_ID = 'example-alarm-bootstrap';
const STORAGE_PREFIX = 'alarms_bootstrap_v1:';

const storage = createMMKV({ id: STORAGE_ID });

const getAlarmBootstrapKey = (userId: string) => `${STORAGE_PREFIX}${userId}`;

export const readAlarmBootstrap = (userId?: string | null) => {
  if (!userId) return null;
  return deserializeAlarmBootstrapSnapshot(
    storage.getString(getAlarmBootstrapKey(userId)),
    userId,
  );
};

export const writeAlarmBootstrap = (snapshot: AlarmBootstrapSnapshot) => {
  storage.set(
    getAlarmBootstrapKey(snapshot.userId),
    serializeAlarmBootstrapSnapshot(snapshot),
  );
};

export const clearAlarmBootstrap = (userId?: string | null) => {
  if (userId) {
    storage.remove(getAlarmBootstrapKey(userId));
    return;
  }

  storage
    .getAllKeys()
    .filter((key: string) => key.startsWith(STORAGE_PREFIX))
    .forEach((key: string) => storage.remove(key));
};

export const subscribeToAlarmBootstrap = (
  userId: string,
  callback: () => void,
) => {
  const targetKey = getAlarmBootstrapKey(userId);
  const listener = storage.addOnValueChangedListener((changedKey: string) => {
    if (changedKey === targetKey) {
      callback();
    }
  });

  return () => {
    listener.remove();
  };
};
