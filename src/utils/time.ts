import { scheduledAtToLocal } from './notificationFunctions';

export const formatTo12Hour = (time24?: string | null) => {
  if (!time24) return '--:--';
  const t = String(time24).trim();
  // If already contains AM/PM, return normalized
  if (/\b(am|pm)\b/i.test(t)) return t;
  // Expect formats like HH:mm or HH:mm:ss
  const m = t.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!m) return t;
  let hh = parseInt(m[1], 10);
  const mm = m[2];
  const period = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${String(hh).padStart(2, '0')}:${mm} ${period}`;
};

export default formatTo12Hour;

/**
 * Formats a Date or date string into "Mon, D" format, e.g. "Oct, 24".
 * Accepts a Date object or any string parseable by `new Date()`.
 * Returns an empty string for invalid inputs.
 */
export const formatToMonthDay = (
  dateInput?: Date | string | null,
  includeYear: boolean = false,
) => {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(String(dateInput));
  if (Number.isNaN(d.getTime())) return '';
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const year = d.getFullYear();
  return includeYear ? `${month}, ${day} ${year}` : `${month}, ${day}`;
};

export const formatLocalDate = (iso?: string) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const formatLocalTime = (iso?: string) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
};
// exported above

export const formatTime = (secs: number): string => {
  if (!Number.isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
};

export const parseTimeToDate = (input?: string | null): Date | null => {
  if (!input) return null;

  const parsedDate = new Date(input);
  if (!Number.isNaN(parsedDate.getTime())) return parsedDate;

  const ampm = input.match(/^\s*(\d{1,2})[:.](\d{2})\s*(AM|PM)\s*$/i);
  if (ampm) {
    let hours = parseInt(ampm[1], 10);
    const minutes = parseInt(ampm[2], 10);
    const meridiem = ampm[3].toUpperCase();

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  const plain = input.match(/^\s*(\d{1,2})[:.](\d{2})\s*$/);
  if (plain) {
    const hours = parseInt(plain[1], 10);
    const minutes = parseInt(plain[2], 10);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  return null;
};

export const isFutureOneTimeAlarm = (date: string, time: string) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return true;
  }

  const scheduledAt = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return scheduledAt.getTime() > Date.now();
};

export const formatDateDDMMYYYY = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(
    date.getMonth() + 1,
  )}/${date.getFullYear()}`;
};

export const normalizeDate = (input?: string | null) => {
  if (!input) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
};

export const normalizeTime = (input?: string | null) => {
  if (!input) return undefined;
  const plainMatch = input.match(/^\s*(\d{1,2})[:.](\d{2})\s*$/);
  if (plainMatch) {
    const hours = parseInt(plainMatch[1], 10);
    const minutes = parseInt(plainMatch[2], 10);
    if (
      Number.isFinite(hours) &&
      Number.isFinite(minutes) &&
      hours >= 0 &&
      hours <= 23 &&
      minutes >= 0 &&
      minutes <= 59
    ) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
        2,
        '0',
      )}`;
    }
  }
  const d = new Date(input);
  if (isNaN(d.getTime())) return undefined;
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
};

export const formatDateString = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d.toLocaleString('en', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`; // e.g. 6 Nov, 2025
  } catch (e) {
    return '';
  }
};

export const formatTimeString = (timeStr?: string) => {
  if (!timeStr) return '';
  try {
    if (timeStr.includes('T')) {
      const hasExplicitTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(timeStr);

      if (hasExplicitTimezone) {
        const d = new Date(timeStr);
        if (isNaN(d.getTime())) return '';
        const h = d.getHours();
        const m = d.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        const minute = String(m).padStart(2, '0');
        return `${hour12}:${minute} ${ampm}`;
      }

      const match = timeStr.match(/T(\d{2}):(\d{2})/);
      if (!match) return '';
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (Number.isNaN(h) || Number.isNaN(m)) return '';
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const minute = String(m).padStart(2, '0');
      return `${hour12}:${minute} ${ampm}`; // e.g. 4:15 AM
    }
    // Fallback: parse simple HH:MM or HH:MM:SS strings
    const parts = timeStr.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return '';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const minute = String(m).padStart(2, '0');
    return `${hour12}:${minute} ${ampm}`; // e.g. 4:15 AM
  } catch (e) {
    return '';
  }
};

export const formatFullDateTime = (iso?: string, timezone?: string) => {
  if (!iso) return '';
  try {
    const localTime = scheduledAtToLocal({
      scheduledAt: iso,
      timezone: timezone,
    });

    const d = new Date(localTime?.localIso || iso);
    const hours = d.getUTCHours();
    const minutes = d.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const time = `${displayHours}:${minutes
      .toString()
      .padStart(2, '0')} ${ampm}`;
    const day = d.getUTCDate();
    const month = d.toLocaleString('en', { month: 'short', timeZone: 'UTC' });
    const year = d.getUTCFullYear();
    return `${time}, ${day} ${month}, ${year}`;
  } catch {
    return String(iso);
  }
};

export const parseReceivedLocal = (v: any): number | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    if (/^\d+$/.test(v)) return Number(v);
    try {
      const s = v;
      const y = parseInt(s.slice(0, 4), 10);
      const m = parseInt(s.slice(5, 7), 10);
      const d = parseInt(s.slice(8, 10), 10);
      const hh = parseInt(s.slice(11, 13), 10);
      const mm = parseInt(s.slice(14, 16), 10);
      const ss = parseInt(s.slice(17, 19), 10) || 0;
      return new Date(y, m - 1, d, hh, mm, ss).getTime();
    } catch {}
  }
  return undefined;
};

export const buildLocalTimestamp = (
  date?: string,
  time?: string,
): number | undefined => {
  if (!date || !time) return undefined;
  const dateParts = date.split('-').map(s => parseInt(s, 10));
  const timeParts = time.split(':').map(s => parseInt(s, 10));
  if (dateParts.length !== 3 || timeParts.length < 2) return undefined;
  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;
  return new Date(year, month - 1, day, hour, minute, 0).getTime();
};

export const dayNameToIndex: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

export const getNextDateStringForRecurring = (
  days: string[],
  timeStr?: string,
) => {
  const dayIdxs = days
    .map(d => String(d).toUpperCase())
    .map(d => dayNameToIndex[d])
    .filter((n): n is number => typeof n === 'number');
  if (dayIdxs.length === 0) return new Date().toISOString().slice(0, 10);

  const [hh = '0', mm = '0'] = (timeStr || '00:00').split(':');
  const hour = parseInt(hh, 10) || 0;
  const minute = parseInt(mm, 10) || 0;

  const now = new Date();
  for (let offset = 0; offset < 7; offset++) {
    const dt = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      hour,
      minute,
      0,
    );
    if (dayIdxs.includes(dt.getDay())) {
      if (offset > 0) return dt.toISOString().slice(0, 10);
      if (dt.getTime() > Date.now()) return dt.toISOString().slice(0, 10);
    }
  }

  for (let offset = 1; offset <= 7; offset++) {
    const dt = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      hour,
      minute,
      0,
    );
    if (dayIdxs.includes(dt.getDay())) return dt.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
};

export const getTodayTimestamp = (payload: {
  time: string;
}): number | undefined => {
  const now = new Date();
  const todayDateStr = `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayTs = buildLocalTimestamp(todayDateStr, payload.time);
  return todayTs;
};
