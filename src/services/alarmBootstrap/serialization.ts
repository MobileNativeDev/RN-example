import { ALARM_BOOTSTRAP_VERSION, AlarmBootstrapSnapshot } from './types';

export const serializeAlarmBootstrapSnapshot = (
  snapshot: AlarmBootstrapSnapshot,
) => JSON.stringify(snapshot);

export const deserializeAlarmBootstrapSnapshot = (
  raw: string | null | undefined,
  expectedUserId?: string | null,
) => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AlarmBootstrapSnapshot;

    if (
      parsed?.version !== ALARM_BOOTSTRAP_VERSION ||
      typeof parsed?.userId !== 'string'
    ) {
      return null;
    }

    if (expectedUserId && parsed.userId !== expectedUserId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};
