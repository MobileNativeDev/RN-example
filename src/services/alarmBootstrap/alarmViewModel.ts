import { DateTime } from 'luxon';

import type { components } from '@api/types.generated';
import { Alarm } from '@appTypes/types';

import {
  ALARM_BOOTSTRAP_PAST_PREVIEW_LIMIT,
  ALARM_BOOTSTRAP_SENT_PREVIEW_LIMIT,
  ALARM_BOOTSTRAP_VERSION,
  AlarmBootstrapQueryData,
  AlarmBootstrapSnapshot,
} from './types';

type AlarmDto =
  | components['schemas']['FriendAlarmResponseDto']
  | components['schemas']['SelfAlarmResponseDto']
  | Record<string, any>;

const statusMap: Record<string, Alarm['status']> = {
  ACCEPTED: 'Accepted',
  PENDING: 'Pending',
  REJECTED: 'Declined',
  VIEWED: 'Viewed',
};

const mapWakeMethod = (method: string) => {
  if (method === 'PUZZLE') return 'Puzzle';
  if (method === 'VOICE') return 'Voice';
  if (method === 'VIDEO') return 'Video';
  if (method === 'SONG') return 'Song';
  return method;
};

const normalizeWakeMethods = (value: unknown) => {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
};

const formatDays = (days: unknown): string | undefined => {
  try {
    if (!days) return undefined;

    if (Array.isArray(days)) {
      const mapped = days
        .map(value =>
          String(value || '')
            .toLowerCase()
            .replace(/^[a-z]/, char => char.toUpperCase()),
        )
        .filter(Boolean);

      return mapped.length > 0 ? mapped.join(', ') : undefined;
    }

    if (typeof days === 'string' && days.trim().length > 0) {
      return days
        .split(/[,;\s]+/)
        .map(value =>
          String(value || '')
            .toLowerCase()
            .replace(/^[a-z]/, char => char.toUpperCase()),
        )
        .filter(Boolean)
        .join(', ');
    }
  } catch {}

  return undefined;
};

const resolveLocalDateTime = (scheduledAt: unknown, timezone: string) => {
  if (scheduledAt == null) return null;

  try {
    const raw = String(scheduledAt);
    const naiveMatch = raw.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    const naive = naiveMatch ? naiveMatch[1] : raw;

    let dt = DateTime.fromISO(naive, { zone: timezone });

    if (!dt.isValid) {
      if (/^\d+$/.test(raw)) {
        dt = DateTime.fromMillis(parseInt(raw, 10), { zone: 'utc' }).setZone(
          timezone,
        );
      } else {
        dt = DateTime.fromISO(raw, { zone: 'utc' }).setZone(timezone);
      }
    }

    const local = dt.toUTC().setZone(DateTime.local().zoneName);

    return {
      date: local.toISODate() || '',
      time: local.toFormat('HH:mm'),
    };
  } catch {
    return null;
  }
};

const mapAlarmList = (list: unknown) => {
  if (!Array.isArray(list)) return [] as Alarm[];
  return list
    .map(item => mapAlarmDtoToViewModel(item as AlarmDto))
    .filter(item => Boolean(item.id));
};

const filterUpcomingAlarms = (list: Alarm[]) =>
  list.filter(
    alarm => alarm.status !== 'Pending' && alarm.status !== 'Declined',
  );

const hasResolvedQuery = ({
  data,
  status,
}: {
  data: unknown;
  status: string;
}) => data !== undefined || status === 'success';

export const mapAlarmDtoToViewModel = (alarm: AlarmDto): Alarm => {
  const rawAlarm = alarm as Record<string, any>;
  let date = rawAlarm['date'] ?? '';
  let time = rawAlarm['time'] ?? '';
  const timezone = rawAlarm['timezone'] || 'UTC';

  if (rawAlarm['type'] === 'FRIEND') {
    const local = resolveLocalDateTime(rawAlarm['scheduledAt'], timezone);
    date = local?.date || '';
    time = local?.time || '';
  } else if ((!date || !time) && rawAlarm['scheduledAt']) {
    const iso = String(rawAlarm['scheduledAt']);
    date = iso.slice(0, 10);
    time = iso.slice(11, 16);
  }

  const recurring =
    (rawAlarm['frequency'] || '').toString().toUpperCase() === 'RECURRING' ||
    !!rawAlarm['recurring'];
  const createdBy =
    rawAlarm['createdById'] ||
    rawAlarm['ownerId'] ||
    rawAlarm['createdBy'] ||
    'Unknown';
  const status =
    statusMap[rawAlarm['approvalStatus']?.toString().toUpperCase()] || null;
  const wakeMethods = normalizeWakeMethods(
    rawAlarm['wakeMethods'] ?? rawAlarm['wakeUpWith'],
  ).map((method: any) =>
    mapWakeMethod(
      String(
        typeof method === 'string' ? method : method?.type || '',
      ).toUpperCase(),
    ),
  );

  return {
    id: String(rawAlarm['id'] || rawAlarm['alarmId'] || ''),
    alarmId: rawAlarm['alarmId'] ? String(rawAlarm['alarmId']) : undefined,
    date,
    days: formatDays(rawAlarm['recurringDays']),
    owner: rawAlarm['owner'] || null,
    ownerId: rawAlarm['ownerId'] || null,
    recurring,
    time,
    createdBy,
    createdById: rawAlarm['createdById'] || null,
    status: status as Alarm['status'],
    wakeMethods,
    timezone,
    type: rawAlarm['type'] || null,
    friendUserId: rawAlarm['friendUserId'] || null,
    approvalStatus: rawAlarm['approvalStatus'] || null,
  };
};

export const buildAlarmBootstrapSnapshot = (
  queryData: AlarmBootstrapQueryData,
  userId: string,
): AlarmBootstrapSnapshot | null | undefined => {
  const allQueriesResolved =
    hasResolvedQuery(queryData.next) &&
    hasResolvedQuery(queryData.upcoming) &&
    hasResolvedQuery(queryData.past) &&
    hasResolvedQuery(queryData.sent);

  if (!allQueriesResolved) {
    return undefined;
  }

  const nextMapped =
    queryData.next.data == null
      ? null
      : mapAlarmDtoToViewModel(queryData.next.data as AlarmDto);
  const next = nextMapped?.status === 'Pending' ? null : nextMapped;
  const upcoming = filterUpcomingAlarms(mapAlarmList(queryData.upcoming.data));
  const past = mapAlarmList(queryData.past.data);
  const sent = mapAlarmList(queryData.sent.data);

  const counts = {
    upcoming: upcoming.length,
    past: past.length,
    sent: sent.length,
  };

  const hasRenderableData =
    !!next || counts.upcoming > 0 || counts.past > 0 || counts.sent > 0;

  if (!hasRenderableData) {
    return null;
  }

  return {
    version: ALARM_BOOTSTRAP_VERSION,
    userId,
    updatedAt: Date.now(),
    next,
    upcoming,
    pastPreview: past.slice(0, ALARM_BOOTSTRAP_PAST_PREVIEW_LIMIT),
    sentPreview: sent.slice(0, ALARM_BOOTSTRAP_SENT_PREVIEW_LIMIT),
    counts,
  };
};
