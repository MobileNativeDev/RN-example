import { SONGS } from '../generated/songsList';

const stripExtension = (value: string) =>
  value.replace(/\.[a-z0-9]+$/i, '').trim();

const normalizeSongKey = (value: string) =>
  stripExtension(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '');

const extractSongStem = (value: string) => {
  try {
    const decoded = decodeURIComponent(value.split('?')[0] ?? '');
    const filename = decoded.split('/').pop() || decoded;
    return stripExtension(filename);
  } catch {
    return stripExtension(value);
  }
};

const isTechnicalSongStem = (value: string) => {
  const stem = extractSongStem(value).toLowerCase();

  if (!stem) return true;

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

  if (
    /^(?:tmp|temp|cache|document|audio|file|import|export|picker|pick|copy|attachment)(?:[_-][a-z0-9]+)+$/i.test(
      stem,
    )
  ) {
    return true;
  }

  if (/^\d{10,}$/.test(stem)) {
    return true;
  }

  return false;
};

const getSongStemCandidates = (
  source: string | number | null | undefined,
  fallback?: string | null,
) => {
  const sourceStem =
    typeof source === 'string' ? extractSongStem(source) : null;
  const fallbackStem = fallback ? extractSongStem(fallback) : null;

  return {
    sourceStem,
    fallbackStem,
    ordered: [sourceStem, fallbackStem].filter((value): value is string =>
      Boolean(value?.trim()),
    ),
  };
};

const songDisplayNameByKey = new Map(
  SONGS.flatMap(song => {
    const candidates = [song.name, song.displayName];

    return candidates
      .map(
        candidate => [normalizeSongKey(candidate), song.displayName] as const,
      )
      .filter(([key]) => key.length > 0);
  }),
);

const songByKey = new Map<string, (typeof SONGS)[number]>(
  SONGS.flatMap(song => {
    const candidates = [song.name, song.displayName];

    return candidates
      .map(candidate => [normalizeSongKey(candidate), song] as const)
      .filter(([key]) => key.length > 0);
  }),
);

const findSongBySource = (
  source: string | number | null | undefined,
  fallback?: string | null,
) => {
  if (typeof source === 'number') {
    return SONGS.find(song => song.uri === source) ?? null;
  }

  const { ordered: candidates } = getSongStemCandidates(source, fallback);

  for (const candidate of candidates) {
    const match = songByKey.get(normalizeSongKey(candidate));
    if (match) {
      return match;
    }
  }

  return null;
};

export const getSongDisplayName = (
  source: string | number | null | undefined,
  fallback?: string | null,
): string | null => {
  const matchedSong = findSongBySource(source, fallback);
  if (matchedSong?.displayName) {
    return matchedSong.displayName;
  }

  const {
    sourceStem,
    fallbackStem,
    ordered: candidates,
  } = getSongStemCandidates(source, fallback);

  for (const candidate of candidates) {
    const match = songDisplayNameByKey.get(normalizeSongKey(candidate));
    if (match) {
      return match;
    }
  }

  if (fallbackStem && !isTechnicalSongStem(fallbackStem)) {
    return fallbackStem;
  }

  if (sourceStem && !isTechnicalSongStem(sourceStem)) {
    return sourceStem;
  }

  return candidates[0] ?? null;
};

export const getSongDurationSec = (
  source: string | number | null | undefined,
  fallback?: string | null,
): number | null => findSongBySource(source, fallback)?.durationSec ?? null;
