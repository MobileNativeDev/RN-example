import { Alarm } from '@appTypes/types';

export const ALARM_BOOTSTRAP_VERSION = 2;
export const ALARM_BOOTSTRAP_PAST_PREVIEW_LIMIT = 48;
export const ALARM_BOOTSTRAP_SENT_PREVIEW_LIMIT = 12;

export type AlarmBootstrapCounts = {
  upcoming: number;
  past: number;
  sent: number;
};

export type AlarmBootstrapSnapshot = {
  version: number;
  userId: string;
  updatedAt: number;
  next: Alarm | null;
  upcoming: Alarm[];
  pastPreview: Alarm[];
  sentPreview: Alarm[];
  counts: AlarmBootstrapCounts;
};

export type AlarmBootstrapQueryStatus = 'pending' | 'error' | 'success';

export type AlarmBootstrapQuerySource<T> = {
  data: T | undefined;
  status: AlarmBootstrapQueryStatus;
};

export type AlarmBootstrapQueryData = {
  next: AlarmBootstrapQuerySource<unknown | null>;
  upcoming: AlarmBootstrapQuerySource<unknown[]>;
  past: AlarmBootstrapQuerySource<unknown[]>;
  sent: AlarmBootstrapQuerySource<unknown[]>;
};
