import { VOICES } from '../generated/voiceList';

const stripExtension = (value: string) =>
  value.replace(/\.[a-z0-9]+$/i, '').trim();

const normalizeVoiceKey = (value: string) =>
  stripExtension(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '');

const extractVoiceStem = (value: string) => {
  try {
    const decoded = decodeURIComponent(value.split('?')[0] ?? '');
    const filename = decoded.split('/').pop() || decoded;
    return stripExtension(filename);
  } catch {
    return stripExtension(value);
  }
};

const isTechnicalVoiceStem = (value: string) => {
  const stem = extractVoiceStem(value).toLowerCase();

  if (!stem) return true;

  if (/^recording[_-]?\d+(?:[_-][a-z0-9]+)*$/i.test(stem)) {
    return true;
  }

  if (/^voice[_-]?record(?:[_-][a-z0-9]+)*$/i.test(stem)) {
    return false;
  }

  if (/^alarm[_-][a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(stem)) {
    return true;
  }

  if (/^[a-f0-9]{16,}$/i.test(stem)) {
    return true;
  }

  if (
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(stem)
  ) {
    return true;
  }

  if (/^(?:[a-f0-9]{4,}-){2,}[a-f0-9]{4,}$/i.test(stem)) {
    return true;
  }

  if (/^\d{10,}$/.test(stem)) {
    return true;
  }

  return false;
};

const getVoiceStemCandidates = (
  source: string | number | null | undefined,
  fallback?: string | null,
) => {
  const sourceStem =
    typeof source === 'string' ? extractVoiceStem(source) : null;
  const fallbackStem = fallback ? extractVoiceStem(fallback) : null;

  return {
    sourceStem,
    fallbackStem,
    ordered: [sourceStem, fallbackStem].filter((value): value is string =>
      Boolean(value?.trim()),
    ),
  };
};

const voiceDisplayNameByKey = new Map(
  VOICES.flatMap(voice => {
    const candidates = [voice.name, voice.displayName];

    return candidates
      .map(
        candidate => [normalizeVoiceKey(candidate), voice.displayName] as const,
      )
      .filter(([key]) => key.length > 0);
  }),
);

const voiceByKey = new Map<string, (typeof VOICES)[number]>(
  VOICES.flatMap(voice => {
    const candidates = [voice.name, voice.displayName];

    return candidates
      .map(candidate => [normalizeVoiceKey(candidate), voice] as const)
      .filter(([key]) => key.length > 0);
  }),
);

const findVoiceBySource = (
  source: string | number | null | undefined,
  fallback?: string | null,
) => {
  if (typeof source === 'number') {
    return VOICES.find(voice => voice.uri === source) ?? null;
  }

  const { ordered: candidates } = getVoiceStemCandidates(source, fallback);

  for (const candidate of candidates) {
    const match = voiceByKey.get(normalizeVoiceKey(candidate));
    if (match) {
      return match;
    }
  }

  return null;
};

export const getVoiceDisplayName = (
  source: string | number | null | undefined,
  fallback?: string | null,
): string | null => {
  const matchedVoice = findVoiceBySource(source, fallback);
  if (matchedVoice?.displayName) {
    return matchedVoice.displayName;
  }

  const {
    sourceStem,
    fallbackStem,
    ordered: candidates,
  } = getVoiceStemCandidates(source, fallback);

  for (const candidate of candidates) {
    const match = voiceDisplayNameByKey.get(normalizeVoiceKey(candidate));
    if (match) {
      return match;
    }
  }

  const firstReadableCandidate = candidates.find(
    candidate => !isTechnicalVoiceStem(candidate),
  );

  return firstReadableCandidate ?? fallbackStem ?? sourceStem ?? null;
};

export const getVoiceDurationSec = (
  source: string | number | null | undefined,
  fallback?: string | null,
): number | null => findVoiceBySource(source, fallback)?.durationSec ?? null;
