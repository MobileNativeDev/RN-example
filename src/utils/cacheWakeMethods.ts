import {
  copyVideoToAppStorage,
  copySoundToAppStorage,
  copyImageToAppStorage,
  normalizeUri,
} from '@utils/additionFunctions';

type WakeMethod = {
  type: 'VIDEO' | 'VOICE' | 'SONG' | 'PUZZLE';
  videoUrl?: string;
  voiceUrl?: string;
  voiceName?: string | null;
  songUrl?: string;
  songName?: string | null;
  puzzleUrl?: {
    imageUrl?: string;
    soundUrl?: string;
  };

  localVideoPath?: string;
  localVoicePath?: string;
  localSongPath?: string;
  localPuzzleImagePath?: string;
  localPuzzleSoundPath?: string;
};

const isYoutubeLink = (url: string) => {
  const lower = url.toLowerCase();
  return lower.includes('youtube') || lower.includes('youtu.be');
};

export async function cacheWakeMethodsLocally(
  wakeMethods: WakeMethod[],
): Promise<WakeMethod[]> {
  if (!Array.isArray(wakeMethods)) return wakeMethods;

  await Promise.all(
    wakeMethods.map(async method => {
      try {
        // VIDEO
        if (method.type === 'VIDEO' && method.videoUrl) {
          if (isYoutubeLink(method.videoUrl)) {
            method.localVideoPath = method.videoUrl;
            return;
          }

          const localPath = await copyVideoToAppStorage(
            normalizeUri(method.videoUrl),
          );

          method.localVideoPath = localPath;
          return;
        }

        // VOICE
        if (method.type === 'VOICE' && method.voiceUrl) {
          const localPath = await copySoundToAppStorage(
            normalizeUri(method.voiceUrl),
          );

          method.localVoicePath = localPath;
          return;
        }

        // SONG
        if (method.type === 'SONG' && method.songUrl) {
          if (isYoutubeLink(method.songUrl)) {
            method.localSongPath = method.songUrl;
            return;
          }

          const localPath = await copySoundToAppStorage(
            normalizeUri(method.songUrl),
          );

          method.localSongPath = localPath;
          return;
        }

        // PUZZLE
        if (method.type === 'PUZZLE' && method.puzzleUrl) {
          const { imageUrl, soundUrl } = method.puzzleUrl;

          if (imageUrl) {
            method.localPuzzleImagePath = await copyImageToAppStorage(
              normalizeUri(imageUrl),
            );
          }

          if (soundUrl) {
            method.localPuzzleSoundPath = await copySoundToAppStorage(
              normalizeUri(soundUrl),
            );
          }

          return;
        }
      } catch (err) {
        console.warn(
          `[cacheWakeMethodsLocally] Failed to cache ${method.type}:`,
          err,
        );
      }
    }),
  );

  return wakeMethods;
}
