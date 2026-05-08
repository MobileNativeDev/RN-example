import {
  getWakeMethodOverrideKey,
  WakeMethodMediaOverride,
} from './wakeMethodOverrides';
import { getSongDisplayName } from '@utils/songDisplayName';

const isLocalFile = (uri: string | number | null): boolean => {
  if (!uri || typeof uri === 'number') return false;
  const str = String(uri).toLowerCase();
  return (
    str.startsWith('file://') ||
    str.startsWith('content://') ||
    (!str.startsWith('http://') && !str.startsWith('https://'))
  );
};

export interface ProcessedWakeMethod {
  type: string;
  voiceUrl?: string | null;
  voiceName?: string | null;
  videoUrl?: string | null;
  songUrl?: string | null;
  songName?: string | null;
  puzzleUrl?: { imageUrl: string | null; soundUrl: string | null } | null;
  _originalLocalPath?: string;
  _originalLocalImagePath?: string;
  _originalLocalSoundPath?: string;
}

export const processWakeMethods = (
  wakeMethods: any[],
  mediaState: {
    imageUri: string | null;
    puzzleSoundUri: string | number | null;
    puzzleSongName: string | null;
    voiceUri: string | number | null;
    voiceName: string | null;
    voiceOverrides?: Record<string, WakeMethodMediaOverride>;
    songUri: string | number | null;
    songName: string | null;
    songOverrides?: Record<string, WakeMethodMediaOverride>;
    videoUri: string | null;
    voiceDeleted: boolean;
    songDeleted: boolean;
    puzzleDeleted: boolean;
    videoDeleted: boolean;
  },
): ProcessedWakeMethod[] => {
  const voiceMethodCount = wakeMethods.filter((method: any) => {
    const type =
      typeof method === 'string' ? method.toUpperCase() : method?.type;
    return type === 'VOICE';
  }).length;
  const songMethodCount = wakeMethods.filter((method: any) => {
    const type =
      typeof method === 'string' ? method.toUpperCase() : method?.type;
    return type === 'SONG';
  }).length;

  return wakeMethods.map((m: any, idx: number) => {
    const type = typeof m === 'string' ? m.toUpperCase() : m.type;
    const cachedMethod: any = m;
    const method: any = {
      type,
    };

    if (type === 'PUZZLE') {
      if (mediaState.puzzleDeleted) {
        method.puzzleUrl = null;
        method.songName = null;
      } else {
        const currentImageUri =
          cachedMethod.localPuzzleImagePath ||
          cachedMethod.puzzleUrl?.imageUrl ||
          null;
        const currentSoundUri =
          cachedMethod.localPuzzleSoundPath ||
          cachedMethod.puzzleUrl?.soundUrl ||
          null;

        const newImageUri = mediaState.imageUri || currentImageUri;
        const newSoundUri = mediaState.puzzleSoundUri || currentSoundUri;
        const explicitPuzzleSongName =
          typeof mediaState.puzzleSongName === 'string' &&
          mediaState.puzzleSongName.trim().length > 0
            ? mediaState.puzzleSongName.trim()
            : null;
        const cachedPuzzleSongName =
          newSoundUri === currentSoundUri
            ? cachedMethod.songName || null
            : null;
        const derivedPuzzleSongName = newSoundUri
          ? getSongDisplayName(
              newSoundUri,
              explicitPuzzleSongName || cachedPuzzleSongName,
            )
          : null;

        method.puzzleUrl = {
          imageUrl: isLocalFile(newImageUri)
            ? newImageUri
            : newImageUri === cachedMethod.localPuzzleImagePath
            ? cachedMethod.puzzleUrl?.imageUrl
            : newImageUri,
          soundUrl: isLocalFile(newSoundUri)
            ? newSoundUri
            : newSoundUri === cachedMethod.localPuzzleSoundPath
            ? cachedMethod.puzzleUrl?.soundUrl
            : newSoundUri,
        };
        method.songName = newSoundUri
          ? explicitPuzzleSongName ||
            derivedPuzzleSongName ||
            cachedPuzzleSongName
          : null;
        if (
          isLocalFile(newImageUri) &&
          newImageUri !== cachedMethod.localPuzzleImagePath
        ) {
          method._originalLocalImagePath = newImageUri;
        }
        if (
          isLocalFile(newSoundUri) &&
          newSoundUri !== cachedMethod.localPuzzleSoundPath
        ) {
          method._originalLocalSoundPath = newSoundUri;
        }
      }
    } else if (type === 'VOICE') {
      const overrideKey = getWakeMethodOverrideKey(cachedMethod, idx);
      const voiceOverride = mediaState.voiceOverrides?.[overrideKey];
      const hasVoiceUriOverride = Boolean(
        voiceOverride &&
          Object.prototype.hasOwnProperty.call(voiceOverride, 'uri'),
      );
      const hasVoiceNameOverride = Boolean(
        voiceOverride &&
          Object.prototype.hasOwnProperty.call(voiceOverride, 'name'),
      );
      const useGlobalVoiceState = voiceMethodCount === 1;

      if (
        voiceOverride?.deleted ||
        (useGlobalVoiceState && mediaState.voiceDeleted)
      ) {
        method.voiceUrl = null;
        method.voiceName = null;
      } else {
        const currentVoiceUri =
          cachedMethod.localVoicePath || cachedMethod.voiceUrl || null;
        const newVoiceUri = hasVoiceUriOverride
          ? voiceOverride?.uri ?? null
          : useGlobalVoiceState
          ? mediaState.voiceUri || currentVoiceUri
          : currentVoiceUri;
        const nextVoiceName = hasVoiceNameOverride
          ? typeof voiceOverride?.name === 'string' &&
            voiceOverride.name.trim().length > 0
            ? voiceOverride.name.trim()
            : null
          : useGlobalVoiceState &&
            typeof mediaState.voiceName === 'string' &&
            mediaState.voiceName.trim().length > 0
          ? mediaState.voiceName.trim()
          : cachedMethod.voiceName || null;

        console.log('[processWakeMethods] VOICE check:', {
          voiceUri: mediaState.voiceUri,
          voiceOverride,
          currentVoiceUri,
          newVoiceUri,
          cachedLocalPath: cachedMethod.localVoicePath,
          cachedUrl: cachedMethod.voiceUrl,
          isLocal: isLocalFile(newVoiceUri),
        });
        method.voiceUrl =
          isLocalFile(newVoiceUri) &&
          newVoiceUri !== cachedMethod.localVoicePath
            ? newVoiceUri
            : newVoiceUri === cachedMethod.localVoicePath
            ? cachedMethod.voiceUrl
            : newVoiceUri;
        method.voiceName = nextVoiceName;

        if (
          isLocalFile(newVoiceUri) &&
          newVoiceUri !== cachedMethod.localVoicePath
        ) {
          method._originalLocalPath = newVoiceUri;
        }
      }
    } else if (type === 'VIDEO') {
      if (mediaState.videoDeleted) {
        method.videoUrl = null;
      } else {
        const currentVideoUri =
          cachedMethod.localVideoPath || cachedMethod.videoUrl || null;
        const newVideoUri = mediaState.videoUri || currentVideoUri;

        console.log('[processWakeMethods] VIDEO check:', {
          videoUri: mediaState.videoUri,
          currentVideoUri,
          newVideoUri,
          cachedLocalPath: cachedMethod.localVideoPath,
          cachedUrl: cachedMethod.videoUrl,
          isLocal: isLocalFile(newVideoUri),
        });
        method.videoUrl =
          isLocalFile(newVideoUri) &&
          newVideoUri !== cachedMethod.localVideoPath
            ? newVideoUri
            : newVideoUri === cachedMethod.localVideoPath
            ? cachedMethod.videoUrl
            : newVideoUri;

        if (
          isLocalFile(newVideoUri) &&
          newVideoUri !== cachedMethod.localVideoPath
        ) {
          method._originalLocalPath = newVideoUri;
        }
      }
    } else if (type === 'SONG') {
      const overrideKey = getWakeMethodOverrideKey(cachedMethod, idx);
      const songOverride = mediaState.songOverrides?.[overrideKey];
      const hasSongUriOverride = Boolean(
        songOverride &&
          Object.prototype.hasOwnProperty.call(songOverride, 'uri'),
      );
      const hasSongNameOverride = Boolean(
        songOverride &&
          Object.prototype.hasOwnProperty.call(songOverride, 'name'),
      );
      const useGlobalSongState = songMethodCount === 1;

      if (
        songOverride?.deleted ||
        (useGlobalSongState && mediaState.songDeleted)
      ) {
        method.songUrl = null;
        method.songName = null;
      } else {
        const currentSongUri =
          cachedMethod.localSongPath || cachedMethod.songUrl || null;
        const newSongUri = hasSongUriOverride
          ? songOverride?.uri ?? null
          : useGlobalSongState
          ? mediaState.songUri || currentSongUri
          : currentSongUri;
        const nextSongName = hasSongNameOverride
          ? typeof songOverride?.name === 'string' &&
            songOverride.name.trim().length > 0
            ? songOverride.name.trim()
            : null
          : useGlobalSongState &&
            typeof mediaState.songName === 'string' &&
            mediaState.songName.trim().length > 0
          ? mediaState.songName.trim()
          : cachedMethod.songName || null;

        method.songUrl =
          isLocalFile(newSongUri) && newSongUri !== cachedMethod.localSongPath
            ? newSongUri
            : newSongUri === cachedMethod.localSongPath
            ? cachedMethod.songUrl
            : newSongUri;
        method.songName = nextSongName;

        if (
          isLocalFile(newSongUri) &&
          newSongUri !== cachedMethod.localSongPath
        ) {
          method._originalLocalPath = newSongUri;
        }
      }
    }

    return method;
  });
};
