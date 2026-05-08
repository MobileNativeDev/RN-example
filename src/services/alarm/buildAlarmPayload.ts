export type WakeMethodPayload =
  | {
      type: 'VOICE';
      voiceUrl: string;
      voiceName: string | null;
      videoUrl: null;
      songUrl: null;
      puzzleUrl: null;
    }
  | {
      type: 'VIDEO';
      voiceUrl: null;
      videoUrl: string;
      songUrl: null;
      puzzleUrl: null;
    }
  | {
      type: 'SONG';
      voiceUrl: null;
      videoUrl: null;
      songUrl: string;
      songName: string | null;
      puzzleUrl: null;
    }
  | {
      type: 'PUZZLE';
      voiceUrl: null;
      videoUrl: null;
      songUrl: null;
      songName: string | null;
      puzzleUrl: {
        imageUrl: string;
        soundUrl: string | null;
      };
    };

export function buildWakeMethodsPayload(
  wakeMethodsWithUrls: any[],
): WakeMethodPayload[] {
  if (!Array.isArray(wakeMethodsWithUrls)) return [];

  return wakeMethodsWithUrls
    .filter(m => {
      if (m.type === 'Voice') return !!m.voiceUri;
      if (m.type === 'Video') return !!m.videoUri || !!m.videoLink;
      if (m.type === 'Song') return !!m.songUri;
      if (m.type === 'Puzzle') return !!m.puzzleUri;
      return false;
    })
    .map(m => {
      if (m.type === 'Voice') {
        return {
          type: 'VOICE',
          voiceUrl: m.voiceUri,
          voiceName: m.voiceName || null,
          videoUrl: null,
          songUrl: null,
          puzzleUrl: null,
        };
      }

      if (m.type === 'Video') {
        return {
          type: 'VIDEO',
          voiceUrl: null,
          videoUrl: m.videoUri || m.videoLink,
          songUrl: null,
          puzzleUrl: null,
        };
      }

      if (m.type === 'Song') {
        return {
          type: 'SONG',
          voiceUrl: null,
          videoUrl: null,
          songUrl: m.songUri,
          songName: m.songName || null,
          puzzleUrl: null,
        };
      }

      // Puzzle
      return {
        type: 'PUZZLE',
        voiceUrl: null,
        videoUrl: null,
        songUrl: null,
        songName: m.songName || null,
        puzzleUrl: {
          imageUrl: m.puzzleUri,
          soundUrl: m.puzzleSoundUri || null,
        },
      };
    });
}
