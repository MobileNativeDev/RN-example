import { useCallback } from 'react';
import {
  uploadMediaPuzzle,
  uploadMediaVideo,
  uploadMediaVoice,
  uploadMediaSong,
} from '../api/alarms';

type WakeMethod = {
  type: 'VOICE' | 'VIDEO' | 'SONG' | 'PUZZLE' | string;
  voiceUrl?: string | null;
  voiceName?: string | null;
  videoUrl?: string | null;
  songUrl?: string | null;
  songName?: string | null;
  puzzleUrl?: { imageUrl: string | null; soundUrl?: string | null } | null;
};

const normalizeUri = (u: string) => {
  if (!u) return u as any;
  const lower = u.toLowerCase();
  if (
    lower.startsWith('file://') ||
    lower.startsWith('content://') ||
    lower.startsWith('http://') ||
    lower.startsWith('https://')
  )
    return u;
  return `file://${u}`;
};

export const useUploadAlarmAssets = () => {
  const uploadAssets = useCallback(
    async (
      _alarmId: string,
      wakeMethods: WakeMethod[],
    ): Promise<WakeMethod[]> => {
      const updated: WakeMethod[] = [];

      for (const m of wakeMethods) {
        const type = (m.type || '').toString().toUpperCase();
        if (
          type === 'PUZZLE' &&
          ((m.puzzleUrl?.imageUrl &&
            !/^https?:\/\//.test(m.puzzleUrl.imageUrl)) ||
            (m.puzzleUrl?.soundUrl &&
              !/^https?:\/\//.test(m.puzzleUrl.soundUrl)))
        ) {
          const tryA = async () => {
            const fd = new FormData();
            if (
              m.puzzleUrl?.imageUrl &&
              !/^https?:\/\//.test(m.puzzleUrl.imageUrl)
            ) {
              const imgUri = normalizeUri(m.puzzleUrl.imageUrl);
              fd.append('puzzle', {
                uri: imgUri,
                name: 'puzzle.jpg',
                type: 'image/jpeg',
              } as any);
            }
            if (
              m.puzzleUrl?.soundUrl &&
              !/^https?:\/\//.test(m.puzzleUrl.soundUrl)
            ) {
              const sndUri = normalizeUri(m.puzzleUrl.soundUrl);
              fd.append('song', {
                uri: sndUri,
                name: 'puzzle_sound.mp3',
                type: 'audio/mpeg',
              } as any);
            }
            return uploadMediaPuzzle(fd);
          };
          const tryB = async () => {
            const fd = new FormData();
            if (
              m.puzzleUrl?.imageUrl &&
              !/^https?:\/\//.test(m.puzzleUrl.imageUrl)
            ) {
              const imgUri = normalizeUri(m.puzzleUrl.imageUrl);
              fd.append('image', {
                uri: imgUri,
                name: 'puzzle.jpg',
                type: 'image/jpeg',
              } as any);
            }
            if (
              m.puzzleUrl?.soundUrl &&
              !/^https?:\/\//.test(m.puzzleUrl.soundUrl)
            ) {
              const sndUri = normalizeUri(m.puzzleUrl.soundUrl);
              fd.append('sound', {
                uri: sndUri,
                name: 'puzzle_sound.mp3',
                type: 'audio/mpeg',
              } as any);
            }
            return uploadMediaPuzzle(fd);
          };
          const tryC = async () => {
            const fd = new FormData();
            if (
              m.puzzleUrl?.imageUrl &&
              !/^https?:\/\//.test(m.puzzleUrl.imageUrl)
            ) {
              const imgUri = normalizeUri(m.puzzleUrl.imageUrl);
              fd.append('file', {
                uri: imgUri,
                name: 'puzzle.jpg',
                type: 'image/jpeg',
              } as any);
            }
            return uploadMediaPuzzle(fd);
          };

          let resp: any;
          try {
            resp = await tryA();
          } catch (e) {
            try {
              resp = await tryB();
            } catch (e2) {
              resp = await tryC();
            }
          }

          const wm = resp?.wakeMethod || resp?.data?.wakeMethod;
          const newImageUrl =
            wm?.puzzleUrl?.imageUrl || m.puzzleUrl?.imageUrl || null;
          const newSoundUrl =
            wm?.puzzleUrl?.soundUrl ?? m.puzzleUrl?.soundUrl ?? null;
          updated.push({
            ...m,
            type: 'PUZZLE',
            puzzleUrl: { imageUrl: newImageUrl, soundUrl: newSoundUrl },
          });
          continue;
        }

        if (
          type === 'VIDEO' &&
          m.videoUrl &&
          !/^https?:\/\//.test(m.videoUrl)
        ) {
          const fileUri = normalizeUri(m.videoUrl);
          const tryA = async () => {
            const fd = new FormData();
            fd.append('video', {
              uri: fileUri,
              name: 'video.mp4',
              type: 'video/mp4',
            } as any);
            return uploadMediaVideo(fd);
          };
          const tryB = async () => {
            const fd = new FormData();
            fd.append('file', {
              uri: fileUri,
              name: 'video.mp4',
              type: 'video/mp4',
            } as any);
            return uploadMediaVideo(fd);
          };

          let resp: any;
          try {
            resp = await tryA();
          } catch (e) {
            resp = await tryB();
          }

          const newUrl =
            resp?.videoUrl || resp?.url || resp?.data?.url || m.videoUrl;
          updated.push({ ...m, type: 'VIDEO', videoUrl: newUrl });
          continue;
        }

        if (
          type === 'VOICE' &&
          m.voiceUrl &&
          !/^https?:\/\//.test(m.voiceUrl)
        ) {
          const fileUri = normalizeUri(m.voiceUrl);
          const tryA = async () => {
            const fd = new FormData();
            fd.append('voice', {
              uri: fileUri,
              name: 'voice.m4a',
              type: 'audio/mp4',
            } as any);
            return uploadMediaVoice(fd);
          };
          const tryB = async () => {
            const fd = new FormData();
            fd.append('file', {
              uri: fileUri,
              name: 'voice.m4a',
              type: 'audio/mp4',
            } as any);
            return uploadMediaVoice(fd);
          };

          let resp: any;
          try {
            resp = await tryA();
          } catch (e) {
            resp = await tryB();
          }

          const newUrl =
            resp?.voiceUrl || resp?.url || resp?.data?.url || m.voiceUrl;
          updated.push({
            ...m,
            type: 'VOICE',
            voiceUrl: newUrl,
            voiceName: m.voiceName || null,
          });
          continue;
        }

        if (type === 'SONG' && m.songUrl && !/^https?:\/\//.test(m.songUrl)) {
          const fileUri = normalizeUri(m.songUrl);
          const tryA = async () => {
            const fd = new FormData();
            fd.append('song', {
              uri: fileUri,
              name: 'song.mp3',
              type: 'audio/mpeg',
            } as any);
            return uploadMediaSong(fd);
          };
          const tryB = async () => {
            const fd = new FormData();
            fd.append('file', {
              uri: fileUri,
              name: 'song.mp3',
              type: 'audio/mpeg',
            } as any);
            return uploadMediaSong(fd);
          };

          let resp: any;
          try {
            resp = await tryA();
          } catch (e) {
            resp = await tryB();
          }

          const newUrl =
            resp?.songUrl || resp?.url || resp?.data?.url || m.songUrl;
          updated.push({
            ...m,
            type: 'SONG',
            songUrl: newUrl,
            songName: m.songName || null,
          });
          continue;
        }

        updated.push({ ...m, type: type as any });
      }

      return updated;
    },
    [],
  );

  return { uploadAssets };
};
